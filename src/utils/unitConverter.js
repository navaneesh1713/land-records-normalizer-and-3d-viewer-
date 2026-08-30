/**
 * unitConverter.js — Indian Land Revenue & Standard Spatial Unit Converter.
 * 
 * Accurately converts between standard metric/imperial units and regional land units:
 *   - Gunta / Guntha (Karnataka, Maharashtra, Telangana)
 *   - Bigha / Biswa / Katha (UP, Bihar, Rajasthan, WB, Assam)
 *   - Cent / Ground / Ankanam (Tamil Nadu, Kerala, Andhra Pradesh)
 *   - Acre / Hectare / Square Meter / Square Feet / Square Yard (National Standard)
 */

// Conversion factors to Base Unit: SQUARE METERS (sqm)
export const AREA_UNITS_TO_SQM = {
  sqm: 1.0,
  sqft: 0.092903,
  sqyd: 0.836127,
  acre: 4046.8564224,
  hectare: 10000.0,
  gunta: 101.17141,      // 1 Gunta = 1089 sq ft = 1/40 Acre (Karnataka/MH)
  bigha_pucca: 2529.285, // 1 Pucca Bigha = 27225 sq ft = 0.625 Acre (UP/Bihar/Raj)
  bigha_kaccha: 843.095, // 1 Kaccha Bigha = 9075 sq ft (North India)
  biswa: 126.464,        // 1 Biswa = 1/20 Bigha = 1361.25 sq ft (UP/Bihar)
  katha: 66.8903,        // 1 Katha / Cottah = 720 sq ft (Bengal/Bihar/Assam)
  cent: 40.4686,         // 1 Cent = 435.6 sq ft = 1/100 Acre (TN/Kerala/AP)
  ground: 222.967,       // 1 Ground = 2400 sq ft (Tamil Nadu / Chennai)
  ankanam: 6.6890,       // 1 Ankanam = 72 sq ft (Andhra Pradesh)
};

export const UNIT_METADATA = {
  sqm: { label: 'Square Meters (m²)', region: 'Metric Standard', symbol: 'm²' },
  sqft: { label: 'Square Feet (sq ft)', region: 'Imperial Standard', symbol: 'sq ft' },
  sqyd: { label: 'Square Yards / Gaj', region: 'National Standard', symbol: 'sq yd' },
  gunta: { label: 'Gunta / Guntha', region: 'Karnataka, Maharashtra, Telangana', symbol: 'Gunta' },
  cent: { label: 'Cent', region: 'Tamil Nadu, Kerala, Andhra Pradesh', symbol: 'Cent' },
  bigha_pucca: { label: 'Bigha (Pucca)', region: 'Uttar Pradesh, Bihar, Rajasthan, MP', symbol: 'Bigha' },
  biswa: { label: 'Biswa', region: 'Uttar Pradesh, Haryana, Punjab', symbol: 'Biswa' },
  katha: { label: 'Katha / Cottah', region: 'West Bengal, Bihar, Assam', symbol: 'Katha' },
  ground: { label: 'Ground', region: 'Tamil Nadu (Chennai)', symbol: 'Ground' },
  ankanam: { label: 'Ankanam', region: 'Andhra Pradesh (Rayalaseema)', symbol: 'Ankanam' },
  acre: { label: 'Acre', region: 'National Agricultural Standard', symbol: 'Acre' },
  hectare: { label: 'Hectare', region: 'International Standard', symbol: 'Ha' },
};

/**
 * Convert any land area value between units.
 * 
 * @param {number} value - Input quantity
 * @param {string} fromUnit - Key from AREA_UNITS_TO_SQM
 * @param {string} toUnit - Key from AREA_UNITS_TO_SQM
 * @returns {number} Converted value
 */
export function convertLandArea(value, fromUnit = 'sqm', toUnit = 'sqft') {
  if (value === null || value === undefined || isNaN(value)) return 0;
  const fromFactor = AREA_UNITS_TO_SQM[fromUnit] || 1.0;
  const toFactor = AREA_UNITS_TO_SQM[toUnit] || 1.0;

  // Convert to sqm first, then to target unit
  const inSqm = value * fromFactor;
  return Number((inSqm / toFactor).toFixed(4));
}

/**
 * Convert a square-meter measurement into a full summary across all Indian regional units.
 * 
 * @param {number} sqmMeters - Area in square meters
 * @returns {Array<{ unitKey: string, label: string, region: string, value: string, symbol: string }>}
 */
export function getRegionalUnitBreakdown(sqmMeters) {
  if (!sqmMeters || isNaN(sqmMeters)) return [];

  const keys = ['sqm', 'sqft', 'sqyd', 'gunta', 'cent', 'bigha_pucca', 'biswa', 'katha', 'acre', 'hectare'];

  return keys.map((k) => {
    const meta = UNIT_METADATA[k] || { label: k, region: '', symbol: k };
    const val = convertLandArea(sqmMeters, 'sqm', k);
    let formattedVal = '';

    if (val >= 1000) {
      formattedVal = val.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    } else if (val >= 1) {
      formattedVal = val.toFixed(2);
    } else {
      formattedVal = val.toFixed(4);
    }

    return {
      unitKey: k,
      label: meta.label,
      region: meta.region,
      symbol: meta.symbol,
      value: formattedVal,
    };
  });
}

/**
 * Calculate great-circle distance between two coordinates in meters (Haversine formula).
 * 
 * @param {[number, number]} coord1 - [lng, lat]
 * @param {[number, number]} coord2 - [lng, lat]
 * @returns {number} Distance in meters
 */
export function calculateHaversineDistance(coord1, coord2) {
  if (!coord1 || !coord2) return 0;
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate total path distance and segment breakdown from an array of coordinates.
 * 
 * @param {Array<[number, number]>} points - Array of [lng, lat]
 * @returns {{ totalDistanceMeters: number, totalDistanceFeet: number, segments: Array<number> }}
 */
export function calculatePolylineDistance(points = []) {
  if (!Array.isArray(points) || points.length < 2) {
    return { totalDistanceMeters: 0, totalDistanceFeet: 0, segments: [] };
  }

  let totalMeters = 0;
  const segments = [];

  for (let i = 0; i < points.length - 1; i++) {
    const dist = calculateHaversineDistance(points[i], points[i + 1]);
    segments.push(dist);
    totalMeters += dist;
  }

  return {
    totalDistanceMeters: Number(totalMeters.toFixed(2)),
    totalDistanceFeet: Number((totalMeters * 3.28084).toFixed(2)),
    segments,
  };
}
