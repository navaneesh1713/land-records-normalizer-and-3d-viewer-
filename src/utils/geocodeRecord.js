/**
 * Dual-geocoder address resolution module.
 *
 * For each normalized record, builds 3 address query candidates (village+tehsil+district,
 * village+district, district-only), calls BOTH Nominatim and Mappls geocoding APIs
 * serially with caching, and assigns a precision tier (A / B / C).
 *
 * Standalone module — no rendering or UI coupling.
 * Builds on top of normalizeRecord.js.
 */

// No local imports needed — normalization is done by the caller (pipeline.js).

// ── Configuration ────────────────────────────────────────────────────────

const NOMINATIM_BASE   = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_DELAY  = 1100; // ms between Nominatim calls (respect 1 req/sec)

// Mappls geocode endpoint — uses static access_token query param on search.mappls.com
const MAPPLS_GEOCODE_BASE = 'https://search.mappls.com/search/address/geocode';

// Place-type sets for tier classification
const VILLAGE_LEVEL_TYPES = new Set([
  'village', 'town', 'suburb', 'hamlet', 'neighbourhood', 'isolated_dwelling',
  'quarter', 'city_block', 'residential', 'allotments', 'station', 'bus_stop',
  'industrial', 'commercial', 'place', 'amenity', 'building', 'landuse', 'highway', 'railway',
]);

const TEHSIL_LEVEL_TYPES = new Set([
  'city', 'municipality', 'borough', 'county', 'administrative',
  'city_district', 'subdistrict', 'tehsil', 'taluk', 'block',
]);

const BBOX_TIER_A_THRESHOLD = 0.02;  // ~2 km per side in degrees

// ── In-memory caches ─────────────────────────────────────────────────────

const nominatimCache = new Map();  // queryString → raw JSON response
const mapplsCache    = new Map();  // queryString → raw JSON response

// ── Rate-limiter ─────────────────────────────────────────────────────────

let lastNominatimCallMs = 0;

async function sleepUntilNominatimReady() {
  const now = Date.now();
  const elapsed = now - lastNominatimCallMs;
  if (elapsed < NOMINATIM_DELAY) {
    await new Promise((r) => setTimeout(r, NOMINATIM_DELAY - elapsed));
  }
}

// ── Nominatim geocoder ───────────────────────────────────────────────────

/**
 * Query Nominatim for an address string. Returns raw JSON (first result) or null.
 * Serialized: will sleep to respect the 1 req/sec rate limit.
 */
async function queryNominatim(queryString) {
  if (nominatimCache.has(queryString)) {
    return nominatimCache.get(queryString);
  }

  await sleepUntilNominatimReady();
  lastNominatimCallMs = Date.now();

  const params = new URLSearchParams({
    q: queryString,
    format: 'jsonv2',
    polygon_geojson: '1',
    addressdetails: '1',
    limit: '1',
    countrycodes: 'in',
  });

  try {
    const resp = await fetch(`${NOMINATIM_BASE}?${params}`, {
      headers: {
        'User-Agent': 'LandParcel3DViewer/1.0 (geocoding module)',
        'Accept': 'application/json',
      },
    });

    if (!resp.ok) {
      console.warn(`  [Nominatim] HTTP ${resp.status} for "${queryString}"`);
      nominatimCache.set(queryString, null);
      return null;
    }

    const data = await resp.json();
    const result = Array.isArray(data) && data.length > 0 ? data[0] : null;
    nominatimCache.set(queryString, result);
    return result;
  } catch (err) {
    console.warn(`  [Nominatim] fetch error for "${queryString}":`, err.message);
    nominatimCache.set(queryString, null);
    return null;
  }
}

// ── Mappls geocoder ──────────────────────────────────────────────────────

/**
 * Query Mappls Atlas geocoding API. Returns raw JSON (first copResult) or null.
 */
async function queryMappls(queryString, apiKey) {
  if (!apiKey) return null;

  if (mapplsCache.has(queryString)) {
    return mapplsCache.get(queryString);
  }

  // Mappls uses access_token as a query parameter
  const url = `${MAPPLS_GEOCODE_BASE}?address=${encodeURIComponent(queryString)}&access_token=${encodeURIComponent(apiKey)}`;

  try {
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      console.warn(`  [Mappls] HTTP ${resp.status} for "${queryString}" — ${body.slice(0, 120)}`);
      mapplsCache.set(queryString, null);
      return null;
    }

    const data = await resp.json();
    let result = null;
    if (data?.copResults) {
      result = Array.isArray(data.copResults) ? (data.copResults.length > 0 ? data.copResults[0] : null) : data.copResults;
    } else if (data?.results) {
      result = Array.isArray(data.results) ? (data.results.length > 0 ? data.results[0] : null) : data.results;
    }
    mapplsCache.set(queryString, result);
    return result;
  } catch (err) {
    console.warn(`  [Mappls] fetch error for "${queryString}":`, err.message);
    mapplsCache.set(queryString, null);
    return null;
  }
}

// ── Response parsing helpers ─────────────────────────────────────────────

function parseNominatimResult(raw) {
  if (!raw) return null;

  const lat = parseFloat(raw.lat);
  const lng = parseFloat(raw.lon);
  if (isNaN(lat) || isNaN(lng)) return null;

  // Bounding box: Nominatim returns [south, north, west, east] as strings
  let bboxSizeDeg = Infinity;
  if (Array.isArray(raw.boundingbox) && raw.boundingbox.length === 4) {
    const [south, north, west, east] = raw.boundingbox.map(Number);
    bboxSizeDeg = Math.max(Math.abs(north - south), Math.abs(east - west));
  }

  // Place type from category+type or class+type or addresstype
  const placeType = (raw.type || raw.category || raw.addresstype || '').toLowerCase();
  const placeClass = (raw.class || raw.category || '').toLowerCase();

  // Address details hierarchy presence
  const address = raw.address || {};
  const hasVillageLevelAddress = Boolean(
    address.village || address.suburb || address.town || address.hamlet || address.neighbourhood || address.residential
  );
  const hasTehsilLevelAddress = Boolean(
    address.county || address.subdistrict || address.state_district || address.city || address.municipality
  );

  // GeoJSON polygon if returned
  const boundary_polygon = raw.geojson || null;

  return {
    lat,
    lng,
    bboxSizeDeg,
    placeType,
    placeClass,
    hasVillageLevelAddress,
    hasTehsilLevelAddress,
    boundary_polygon,
    source: 'nominatim',
  };
}

function parseMapplsResult(raw) {
  if (!raw) return null;

  // Mappls geocode (static key) returns administrative hierarchy + eLoc but
  // NO lat/lng. The Place Details API that resolves eLoc→coordinates requires
  // OAuth Bearer tokens, which this project's static key cannot provide.
  // So we extract hierarchy confirmation data instead.
  const lat = parseFloat(raw.latitude || raw.lat);
  const lng = parseFloat(raw.longitude || raw.lng);
  const hasCoords = !isNaN(lat) && !isNaN(lng);

  // Mappls bounding box (rarely present with static key)
  let bboxSizeDeg = Infinity;
  if (raw.boundingbox) {
    const bb = raw.boundingbox;
    if (bb.topleft && bb.bottomright) {
      const latDiff = Math.abs(bb.topleft.lat - bb.bottomright.lat);
      const lngDiff = Math.abs(bb.topleft.lng - bb.bottomright.lng);
      bboxSizeDeg = Math.max(latDiff, lngDiff);
    }
  }

  // Place type / geocode level
  const placeType = (raw.geocodeLevel || raw.type || raw.placeType || '').toLowerCase();

  // Hierarchy confirmation fields
  const hierarchy = {
    locality: raw.locality || '',
    subDistrict: raw.subDistrict || '',
    district: raw.district || '',
    city: raw.city || '',
    state: raw.state || '',
    pincode: raw.pincode || '',
    confidenceScore: raw.confidenceScore || 0,
    eLoc: raw.eLoc || null,
    geocodeLevel: raw.geocodeLevel || '',
  };

  if (hasCoords) {
    return { lat, lng, bboxSizeDeg, placeType, placeClass: '', boundary_polygon: null, source: 'mappls', hierarchy };
  }

  // Hierarchy-only result (no coordinates) — still useful for tier boosting
  if (hierarchy.eLoc || hierarchy.locality || hierarchy.district) {
    console.info(`  [Mappls] eLoc resolved (${hierarchy.eLoc || 'n/a'}) but coordinates require OAuth — hierarchy confirmation only`);
    return { lat: null, lng: null, bboxSizeDeg: Infinity, placeType, placeClass: '', boundary_polygon: null, source: 'mappls', hierarchy, hierarchyOnly: true };
  }

  return null;
}

// ── Tier assignment ──────────────────────────────────────────────────────

/**
 * Assign precision tier for a single parsed geocoder result + ladder rung.
 *
 * Tier A: village/town/suburb-level place type AND bbox < 0.02 deg
 * Tier B: tehsil/taluk-level, OR rung 2/3 with moderately small bbox
 * Tier C: district-level, large bbox, or no result
 */
function assignTier(parsed, ladderRung) {
  if (!parsed) return 'C';

  const { placeType, placeClass, bboxSizeDeg, hasVillageLevelAddress, hasTehsilLevelAddress } = parsed;

  // Check village-level types
  const isVillageLevel = VILLAGE_LEVEL_TYPES.has(placeType) ||
                         VILLAGE_LEVEL_TYPES.has(placeClass) ||
                         Boolean(hasVillageLevelAddress);

  // Check tehsil-level types
  const isTehsilLevel = TEHSIL_LEVEL_TYPES.has(placeType) ||
                        TEHSIL_LEVEL_TYPES.has(placeClass) ||
                        Boolean(hasTehsilLevelAddress);

  // Tier A: village/town-level AND tight bbox
  if (isVillageLevel && bboxSizeDeg < BBOX_TIER_A_THRESHOLD) {
    return 'A';
  }

  // Tier B: tehsil-level type (but NOT if it's a rung-3 fallback with huge bbox,
  //         which indicates a district-level result masquerading as "administrative")
  if (isTehsilLevel && !(ladderRung === 3 && bboxSizeDeg >= 0.1)) return 'B';
  if (ladderRung === 2 && bboxSizeDeg < 0.1) return 'B';

  // INTENTIONAL DEVIATION from original spec (documented per anomaly #3):
  // Village-level place type with bbox >= 0.02° is routed to Tier B instead of Tier C.
  // Rationale: A village-level result (even with a wider bbox) is meaningfully more
  // precise than a district-level result. Dropping it to Tier C would discard useful
  // geocoding data that still localizes to a specific named settlement.
  if (isVillageLevel && bboxSizeDeg >= BBOX_TIER_A_THRESHOLD) return 'B';

  // Rung 3 with large bbox, or any unrecognized type → Tier C
  // Tier C: district-level, large bbox, unrecognized type, or no result
  return 'C';
}

const TIER_RANK = { A: 0, B: 1, C: 2 };

function betterTier(a, b) {
  return TIER_RANK[a] <= TIER_RANK[b] ? a : b;
}

// ── Candidate builder ────────────────────────────────────────────────────

function buildCandidates(normalized) {
  const { village, tehsil, district } = normalized;
  const candidates = [];

  // Rung 1: village, tehsil, district
  if (village && tehsil && district) {
    candidates.push({ rung: 1, query: `${village}, ${tehsil}, ${district}` });
  } else if (village && district) {
    // If tehsil is missing, rung 1 degrades but we still include it
    candidates.push({ rung: 1, query: `${village}, ${district}` });
  }

  // Rung 2: village, district
  if (village && district) {
    const q = `${village}, ${district}`;
    // Avoid duplicate if rung 1 already equals this
    if (!candidates.some((c) => c.query === q)) {
      candidates.push({ rung: 2, query: q });
    }
  }

  // Rung 3: district only
  if (district) {
    candidates.push({ rung: 3, query: district });
  }

  return candidates;
}

// ── Main entry point ─────────────────────────────────────────────────────

/**
 * Geocode a single normalized record through the 3-rung address ladder.
 * Calls both Nominatim and Mappls for each candidate, caches results,
 * assigns tier, and returns the best outcome.
 *
 * @param {object} normalizedRecord – output of normalizeRecord()
 * @param {string} mapplsApiKey     – Mappls REST API key
 * @returns {Promise<object>}       – { tier, chosen_source, lat, lng, boundary_polygon, ladder_rung_used }
 */
export async function geocodeRecord(normalizedRecord, mapplsApiKey) {
  const candidates = buildCandidates(normalizedRecord);

  let bestResult = null;  // { tier, chosen_source, lat, lng, boundary_polygon, ladder_rung_used }

  for (const { rung, query } of candidates) {
    console.log(`  🔍 Rung ${rung}: "${query}"`);

    // ── Call both geocoders serially ──
    const nomRaw    = await queryNominatim(query);
    const mapplsRaw = await queryMappls(query, mapplsApiKey);

    const nomParsed    = parseNominatimResult(nomRaw);
    const mapplsParsed = parseMapplsResult(mapplsRaw);

    const nomTier    = assignTier(nomParsed, rung);
    // For Mappls hierarchy-only results, don't assign a geometry tier
    const mapplsTier = (mapplsParsed && !mapplsParsed.hierarchyOnly) ? assignTier(mapplsParsed, rung) : 'C';

    // ── Pick the winner for this rung ──
    // Nominatim always supplies geometry. Mappls (with static key) supplies
    // hierarchy confirmation only. When Mappls confirms the same locality,
    // we boost Nominatim's tier by one level.
    let rungWinner = null;

    if (nomParsed) {
      let effectiveTier = nomTier;

      // Tier boost: if Mappls confirmed a locality/subDistrict match, upgrade B→A
      if (mapplsParsed?.hierarchy) {
        const mh = mapplsParsed.hierarchy;
        const mapplsConfirmsLocality = mh.geocodeLevel === 'locality' || mh.geocodeLevel === 'subDistrict';
        if (mapplsConfirmsLocality && effectiveTier === 'B') {
          effectiveTier = 'A';
        }
      }

      rungWinner = {
        tier: effectiveTier,
        chosen_source: 'nominatim',
        lat: nomParsed.lat,
        lng: nomParsed.lng,
        boundary_polygon: nomParsed.boundary_polygon,
        ladder_rung_used: rung,
        mappls_confirmed: Boolean(mapplsParsed?.hierarchy),
      };
    } else if (mapplsParsed && !mapplsParsed.hierarchyOnly) {
      // Mappls has actual coordinates (future-proof for if OAuth gets added)
      rungWinner = {
        tier: mapplsTier,
        chosen_source: 'mappls',
        lat: mapplsParsed.lat,
        lng: mapplsParsed.lng,
        boundary_polygon: mapplsParsed.boundary_polygon,
        ladder_rung_used: rung,
        mappls_confirmed: true,
      };
    }

    // ── Update best across all rungs ──
    if (rungWinner) {
      if (!bestResult || TIER_RANK[rungWinner.tier] < TIER_RANK[bestResult.tier]) {
        bestResult = rungWinner;
      }

      // Stop early if both geocoders provided useful data on this rung
      if (nomParsed && mapplsParsed) {
        break;
      }
    }
  }

  // If nothing worked at all → Tier C fallback
  if (!bestResult) {
    bestResult = {
      tier: 'C',
      chosen_source: null,
      lat: null,
      lng: null,
      boundary_polygon: null,
      ladder_rung_used: null,
    };
  }

  return bestResult;
}
