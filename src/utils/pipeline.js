/**
 * End-to-End Land Parcel 3D Pipeline.
 *
 * Coordinates:
 * 1. Normalization (normalizeRecord.js)
 * 2. Address Ladder Geocoding (geocodeRecord.js)
 * 3. Tier Partitioning (partitionRecords.js) -> Separates Tier A/B from Tier C
 * 4. Deterministic Footprint Matching & Procedural Generation (footprintMatcher.js)
 * 5. Building, Floor, and Division Assembly -> Generates valid FeatureCollection & unplaced_records
 *
 * Strictly adheres to target-parcel-schema.json.
 */

import area from '@turf/area';
import { polygon } from '@turf/helpers';
import { normalizeRecord } from './normalizeRecord.js';
import { geocodeRecord } from './geocodeRecord.js';
import { partitionGeocodedRecords, formatUnplacedRecord } from './partitionRecords.js';
import { resolveBuildingFootprint, hashString } from './footprintMatcher.js';

/**
 * Compute the most frequent (majority) value in an array of strings.
 * Returns "" if no values exist or if there is no clear majority.
 */
function computeMajorityValue(values = []) {
  const valid = values.map((v) => String(v || '').trim()).filter(Boolean);
  if (valid.length === 0) return '';

  const freq = new Map();
  for (const v of valid) {
    freq.set(v, (freq.get(v) || 0) + 1);
  }

  let maxCount = 0;
  let majorityVal = '';
  for (const [val, count] of freq.entries()) {
    if (count > maxCount) {
      maxCount = count;
      majorityVal = val;
    }
  }

  return majorityVal;
}

/**
 * Assemble placed records and their footprints into GeoJSON Features with floors[] and divisions[].
 *
 * @param {Array<{record: object, footprint: object}>} placedWithFootprints
 * @returns {Array<object>} Array of GeoJSON Building Feature objects
 */
export function assembleBuildingFeatures(placedWithFootprints = []) {
  // Group records by footprint identity: osm_way_id for real, or geometry string/hash for synthetic
  const buildingGroups = new Map();

  placedWithFootprints.forEach((item, index) => {
    const { normalized, geo, footprint, raw } = item;
    const isSynthetic = Boolean(footprint.is_synthetic);

    let groupKey;
    if (!isSynthetic && footprint.osm_way_id) {
      groupKey = `OSM-${footprint.osm_way_id}`;
    } else {
      // Use coordinate signature or explicit plot_link if provided in raw fixture
      const coordSig = JSON.stringify(footprint.geometry.coordinates[0][0]);
      groupKey = raw?.plot_link ? `LINK-${raw.plot_link}` : `GEN-${coordSig}`;
    }

    if (!buildingGroups.has(groupKey)) {
      buildingGroups.set(groupKey, {
        groupKey,
        isSynthetic,
        footprint,
        normalizedFirst: normalized,
        geoFirst: geo,
        items: [],
      });
    }

    buildingGroups.get(groupKey).items.push(item);
  });

  const features = [];
  let groupIndex = 0;

  for (const group of buildingGroups.values()) {
    groupIndex++;
    const { isSynthetic, footprint, items } = group;

    // Determine building location attributes (from majority/first item in group)
    const village = items[0].normalized.village || '';
    const tehsil = items[0].normalized.tehsil || '';
    const district = items[0].normalized.district || '';

    // Derive plot_id
    let plotId;
    if (!isSynthetic && footprint.osm_way_id) {
      plotId = `PLOT-OSM-${footprint.osm_way_id}`;
    } else {
      const hash = hashString(`${village}:${tehsil}:${district}:${groupIndex}`);
      plotId = `PLOT-GEN-${String(hash).slice(0, 8)}`;
    }

    // Compute exact footprint area via Turf.js
    const poly = polygon(footprint.geometry.coordinates);
    const calculatedArea = parseFloat(area(poly).toFixed(1));

    // Organize items into floors and divisions.
    // If ANY item has an explicit floor_number, use those directly.
    // If NONE do, sort by khasra_number (fallback survey_number) lexicographically
    // and assign sequential floor numbers. Items sharing the same khasra go on
    // the same floor as co-divisions. (Anomaly #5 fix)
    const floorMap = new Map();

    const hasAnyExplicitFloor = items.some(
      (it) => Number(it.raw?.floor_number) > 0 || Number(it.normalized?.floor_number) > 0
    );

    if (hasAnyExplicitFloor) {
      // Use explicit floor numbers
      items.forEach((it) => {
        const floorNum = Number(it.raw?.floor_number) || Number(it.normalized?.floor_number) || 1;
        if (!floorMap.has(floorNum)) floorMap.set(floorNum, []);
        floorMap.get(floorNum).push(it);
      });
    } else {
      // Deterministic auto-assignment: sort by khasra (fallback survey), group same-khasra on same floor
      const sortedItems = [...items].sort((a, b) => {
        const aKey = (a.normalized.khasra_number || a.normalized.survey_number || '').toLowerCase();
        const bKey = (b.normalized.khasra_number || b.normalized.survey_number || '').toLowerCase();
        return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
      });

      let currentFloor = 0;
      let prevKhasra = null;
      for (const it of sortedItems) {
        const khasra = (it.normalized.khasra_number || it.normalized.survey_number || '').trim();
        if (khasra !== prevKhasra) {
          currentFloor++;
          prevKhasra = khasra;
        }
        if (!floorMap.has(currentFloor)) floorMap.set(currentFloor, []);
        floorMap.get(currentFloor).push(it);
      }
    }

    // Sort floors ascending
    const sortedFloorNums = Array.from(floorMap.keys()).sort((a, b) => a - b);
    const floors = sortedFloorNums.map((floorNum) => {
      const floorItems = floorMap.get(floorNum);
      const totalDivisionsOnFloor = floorItems.length;
      const equalShare = parseFloat((1 / totalDivisionsOnFloor).toFixed(4));

      const divisions = floorItems.map((it, dIdx) => {
        const divIndex = dIdx + 1;
        const norm = it.normalized;

        return {
          unit_id: it.raw?.unit_id || `${plotId}-F${floorNum}-D${divIndex}`,
          khasra_number: norm.khasra_number || '',
          survey_number: norm.survey_number || '',
          owner_name: norm.owner_name || 'Unknown',
          classification: norm.classification || 'residential',
          status: norm.status || 'unverified',
          division_index: divIndex,
          division_share: it.raw?.division_share ? Number(it.raw.division_share) : equalShare,
          is_synthetic: Boolean(it.footprint.is_synthetic || it.raw?.is_synthetic),
        };
      });

      return {
        floor_number: floorNum,
        divisions,
      };
    });

    features.push({
      type: 'Feature',
      geometry: footprint.geometry,
      properties: {
        plot_id: plotId,
        osm_way_id: isSynthetic ? null : String(footprint.osm_way_id),
        village,
        tehsil,
        district,
        floor_height_m: 3.5, // Fixed global default per requirement
        footprint_area_sqm: calculatedArea,
        floors,
      },
    });
  }

  return features;
}

/**
 * Execute the full pipeline on an array of raw records.
 *
 * @param {Array<object>} rawRecords - Array of raw land records
 * @param {string} [mapplsApiKey] - Optional Mappls API key
 * @param {function} [onProgress] - Optional progress callback: (stage, detail) => void
 * @returns {Promise<{ featureCollection: object, unplaced_records: Array<object>, stats: object }>}
 */
export async function runFullPipeline(rawRecords = [], mapplsApiKey = '', onProgress = null) {
  if (onProgress) onProgress('starting', `Processing ${rawRecords.length} records...`);

  // Step 1 & 2: Normalize and Geocode each record
  const geocodedResults = [];
  for (let i = 0; i < rawRecords.length; i++) {
    if (onProgress) onProgress('geocoding', `Geocoding record ${i + 1} / ${rawRecords.length}...`);
    const raw = rawRecords[i];
    const normalized = normalizeRecord(raw);
    const geo = await geocodeRecord(normalized, mapplsApiKey);
    geocodedResults.push({ raw, normalized, geo });
  }

  // Step 3: Partition Tier A/B from Tier C
  if (onProgress) onProgress('partitioning', 'Partitioning by precision tier...');
  const placedRaw = [];
  const unplaced_records = [];

  for (const item of geocodedResults) {
    if (item.geo.tier === 'A' || item.geo.tier === 'B') {
      placedRaw.push(item);
    } else {
      unplaced_records.push(formatUnplacedRecord(item.normalized, item.geo));
    }
  }

  // Step 4: Resolve Footprints for Placed Records (Deterministic Overpass or Synthetic)
  if (onProgress) onProgress('footprints', `Resolving footprints for ${placedRaw.length} placed records...`);
  const placedWithFootprints = [];
  for (let i = 0; i < placedRaw.length; i++) {
    if (onProgress) onProgress('footprints', `Resolving footprint ${i + 1} / ${placedRaw.length}...`);
    const item = placedRaw[i];
    const footprint = await resolveBuildingFootprint({
      normalized: item.normalized,
      geo: item.geo,
    });
    placedWithFootprints.push({
      ...item,
      footprint,
    });
  }

  // Step 5: Assemble Features and Metadata
  if (onProgress) onProgress('assembling', 'Assembling building features...');
  const features = assembleBuildingFeatures(placedWithFootprints);

  // Metadata Majority Computations
  const villages = features.map((f) => f.properties.village);
  const tehsils = features.map((f) => f.properties.tehsil);
  const districts = features.map((f) => f.properties.district);

  const featureCollection = {
    type: 'FeatureCollection',
    metadata: {
      village: computeMajorityValue(villages),
      tehsil: computeMajorityValue(tehsils),
      district: computeMajorityValue(districts),
      generated_at: new Date().toISOString(),
      plot_count: features.length,
      source: 'OpenStreetMap (Overpass API)',
    },
    features,
  };

  const stats = {
    total_input_records: rawRecords.length,
    placed_records_count: placedRaw.length,
    unplaced_records_count: unplaced_records.length,
    features_count: features.length,
    synthetic_features_count: features.filter((f) => f.properties.osm_way_id === null).length,
    real_osm_features_count: features.filter((f) => f.properties.osm_way_id !== null).length,
  };

  return {
    featureCollection,
    unplaced_records,
    stats,
  };
}
