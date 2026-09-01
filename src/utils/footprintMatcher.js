/**
 * Deterministic Footprint Matcher & Procedural Generator.
 *
 * For each Tier A/B record with a resolved geocoding point/boundary:
 * 1. Queries OpenStreetMap Overpass for building=* ways within the bounding box.
 * 2. If real footprints exist: selects one DETERMINISTICALLY via hash(khasra_number) % count.
 *    Sets is_synthetic: false and records osm_way_id.
 * 3. If zero footprints exist: procedurally generates a rectangular polygon with position
 *    derived deterministically from the hash within the search boundary box.
 *    Sets is_synthetic: true and osm_way_id: null.
 *
 * Zero random() calls — 100% deterministic & byte-identical on repeated runs.
 */

import area from '@turf/area';
import { polygon } from '@turf/helpers';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
];

// Cache Overpass query results by bbox key to prevent redundant HTTP requests
const overpassCache = new Map();

/**
 * Deterministic 32-bit FNV-1a hash of a string.
 * Returns an unsigned 32-bit integer [0, 4294967295].
 */
export function hashString(str = '') {
  const s = String(str ?? '').trim();
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Derive normalized floats [0, 1) from hash seeds for deterministic positioning.
 */
export function deriveDeterministicOffsets(key) {
  const hx = hashString(`${key}:offsetX`);
  const hy = hashString(`${key}:offsetY`);
  const hw = hashString(`${key}:width`);
  const hh = hashString(`${key}:height`);

  return {
    uX: hx / 4294967295,
    uY: hy / 4294967295,
    uW: hw / 4294967295,
    uH: hh / 4294967295,
  };
}

/**
 * Calculate bounding box [south, west, north, east] from a geocoded record.
 */
export function getSearchBBox(geo, defaultTier = 'B') {
  const tier = geo?.tier || defaultTier;
  const lat = Number(geo?.lat);
  const lng = Number(geo?.lng);

  // Always center search radius around exact geocoded point (e.g. Hafeezpet pin)
  const radiusDeg = tier === 'A' ? 0.0015 : 0.0025;

  if (!isNaN(lat) && !isNaN(lng)) {
    return {
      south: lat - radiusDeg,
      west: lng - radiusDeg,
      north: lat + radiusDeg,
      east: lng + radiusDeg,
    };
  }

  // Fallback to boundary polygon extent if point is absent
  if (geo?.boundary_polygon && geo.boundary_polygon.coordinates) {
    const coords = geo.boundary_polygon.coordinates;
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;

    const flattenCoords = (arr) => {
      if (typeof arr[0] === 'number' && typeof arr[1] === 'number') {
        const [x, y] = arr;
        if (x < minLng) minLng = x;
        if (x > maxLng) maxLng = x;
        if (y < minLat) minLat = y;
        if (y > maxLat) maxLat = y;
      } else {
        arr.forEach(flattenCoords);
      }
    };
    flattenCoords(coords);

    if (minLng < maxLng && minLat < maxLat) {
      const spanLat = Math.min(0.025, maxLat - minLat);
      const spanLng = Math.min(0.025, maxLng - minLng);
      const cLat = (minLat + maxLat) / 2;
      const cLng = (minLng + maxLng) / 2;

      return {
        south: cLat - spanLat / 2,
        west: cLng - spanLng / 2,
        north: cLat + spanLat / 2,
        east: cLng + spanLng / 2,
      };
    }
  }

  return {
    south: 17.4938 - radiusDeg,
    west: 78.3533 - radiusDeg,
    north: 17.4938 + radiusDeg,
    east: 78.3533 + radiusDeg,
  };
}

/**
 * Query Overpass for building=* ways within a bounding box.
 */
export async function fetchOverpassBuildings(bbox) {
  const bboxKey = `${bbox.south.toFixed(6)},${bbox.west.toFixed(6)},${bbox.north.toFixed(6)},${bbox.east.toFixed(6)}`;

  if (overpassCache.has(bboxKey)) {
    return overpassCache.get(bboxKey);
  }

  const query = `
    [out:json][timeout:25];
    (
      way["building"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    );
    out geom;
  `.trim();

  let elements = [];
  let fetchError = null;

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': 'LandParcel3DFootprintMatcher/1.0',
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const result = await response.json();
          elements = result?.elements || [];
          fetchError = null;
          break;
        }
      } catch (err) {
        fetchError = err;
      }
    }

  if (fetchError && elements.length === 0) {
    console.warn(`[Overpass] All endpoints failed for bbox [${bboxKey}]:`, fetchError.message);
  }

  // Parse and filter valid polygon geometries
  const validFootprints = [];

  for (const el of elements) {
    if (el.type !== 'way' || !Array.isArray(el.geometry) || el.geometry.length < 3) {
      continue;
    }

    const ring = el.geometry.map((node) => [node.lon, node.lat]);

    // Ensure ring is closed
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]]);
    }

    if (ring.length < 4) continue;

    try {
      const poly = polygon([ring]);
      const calculatedArea = area(poly);

      // Keep realistic building footprints (20 m² to 5,000 m²)
      if (calculatedArea >= 20 && calculatedArea <= 5000) {
        validFootprints.push({
          osm_id: el.id,
          geometry: {
            type: 'Polygon',
            coordinates: [ring],
          },
          area_sqm: parseFloat(calculatedArea.toFixed(1)),
        });
      }
    } catch {
      // Ignore invalid geometry
    }
  }

  // CRITICAL FOR DETERMINISM: Sort footprints by osm_id ascending so array order is 100% stable
  validFootprints.sort((a, b) => (a.osm_id > b.osm_id ? 1 : a.osm_id < b.osm_id ? -1 : 0));

  overpassCache.set(bboxKey, validFootprints);
  return validFootprints;
}

/**
 * Procedurally generate a deterministic rectangular footprint inside a bounding box.
 */
export function generateSyntheticFootprint(bbox, hashKey, baseCenter) {
  const { uX, uY, uW, uH } = deriveDeterministicOffsets(hashKey);

  // Realistic building size: width ~12m to 20m, height ~10m to 16m
  // In degrees at ~13° latitude: 1m ≈ 0.000009°
  const widthDeg = 0.00010 + uW * 0.00008;   // ~11m - 20m
  const heightDeg = 0.00009 + uH * 0.00006;  // ~10m - 16m

  // Safe inner bounding region
  const spanLng = (bbox.east - bbox.west);
  const spanLat = (bbox.north - bbox.south);

  // Center position: bounded within [bbox.west + margin, bbox.east - margin]
  const centerLng = bbox.west + widthDeg + uX * Math.max(0, spanLng - widthDeg * 2);
  const centerLat = bbox.south + heightDeg + uY * Math.max(0, spanLat - heightDeg * 2);

  const halfW = widthDeg / 2;
  const halfH = heightDeg / 2;

  // 5-point counter-clockwise closed polygon ring: [SW, SE, NE, NW, SW]
  const ring = [
    [centerLng - halfW, centerLat - halfH],
    [centerLng + halfW, centerLat - halfH],
    [centerLng + halfW, centerLat + halfH],
    [centerLng - halfW, centerLat + halfH],
    [centerLng - halfW, centerLat - halfH],
  ];

  const poly = polygon([ring]);
  const calculatedArea = parseFloat(area(poly).toFixed(1));

  return {
    osm_way_id: null,
    is_synthetic: true,
    footprint_area_sqm: calculatedArea,
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  };
}

/**
 * Main Deterministic Footprint Resolver for a Tier A/B record.
 *
 * @param {object} record - Object containing normalized record fields and geo result
 * @returns {Promise<object>} Resolved footprint details
 */
export async function resolveBuildingFootprint(record) {
  const normalized = record.normalized || record;
  const geo = record.geo || record;

  const uniqueHashKey = String(
    normalized.khasra_number || normalized.survey_number || normalized.unit_id || 'UNKNOWN'
  ).trim();

  const hashVal = hashString(uniqueHashKey);
  const bbox = getSearchBBox(geo, geo.tier || 'B');

  // Step 1: Query Overpass within geocoded boundary bbox
  const candidates = await fetchOverpassBuildings(bbox);

  // Step 2: Real footprints found -> Pick deterministically via hash % count
  if (candidates.length > 0) {
    const chosenIndex = hashVal % candidates.length;
    const selected = candidates[chosenIndex];

    return {
      osm_way_id: String(selected.osm_id),
      is_synthetic: false,
      footprint_area_sqm: selected.area_sqm,
      geometry: selected.geometry,
      selection_method: 'overpass_deterministic',
      candidate_count: candidates.length,
      chosen_index: chosenIndex,
      hash_used: hashVal,
      hash_key: uniqueHashKey,
    };
  }

  // Step 3: Zero footprints found -> Procedurally generate synthetic rectangular footprint
  const synthetic = generateSyntheticFootprint(bbox, uniqueHashKey, { lat: geo.lat, lng: geo.lng });

  return {
    osm_way_id: null,
    is_synthetic: true,
    footprint_area_sqm: synthetic.footprint_area_sqm,
    geometry: synthetic.geometry,
    selection_method: 'procedural_synthetic',
    candidate_count: 0,
    chosen_index: null,
    hash_used: hashVal,
    hash_key: uniqueHashKey,
  };
}
