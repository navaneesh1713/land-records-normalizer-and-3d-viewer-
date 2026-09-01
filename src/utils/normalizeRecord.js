/**
 * Standalone normalization module for raw OCR/NLP land-record fields.
 *
 * Takes one messy record and returns a clean record whose shape matches
 * the Division leaf-unit contract in target-parcel-schema.json.
 *
 * No external API calls — pure deterministic string transforms.
 */

// ── Fixed keyword → classification lookup table ──────────────────────────
const CLASSIFICATION_KEYWORDS = {
  agricultural: [
    'agriculture', 'agricultural', 'farm', 'farming', 'field', 'crop',
    'crops', 'cultivat', 'plantation', 'orchard', 'garden', 'paddy',
    'harvest', 'grazing', 'pasture', 'arable',
  ],
  residential: [
    'residential', 'residence', 'house', 'flat', 'apartment', 'home',
    'dwelling', 'bungalow', 'villa', 'housing', 'domestic', 'living',
    'tenant', 'occupied',
  ],
  commercial: [
    'commercial', 'shop', 'store', 'market', 'retail', 'office',
    'business', 'trade', 'mall', 'showroom', 'merchant', 'bazaar',
    'restaurant', 'hotel', 'clinic',
  ],
  industrial: [
    'industrial', 'factory', 'plant', 'warehouse', 'manufacturing',
    'workshop', 'mill', 'foundry', 'refinery', 'depot', 'godown',
    'storage', 'assembly',
  ],
  vacant: [
    'vacant', 'empty', 'unused', 'barren', 'waste', 'wasteland',
    'blank', 'unoccupied', 'fallow', 'abandoned', 'derelict',
    'undeveloped', 'open plot',
  ],
};

const VALID_STATUSES = new Set(['verified', 'disputed', 'unverified']);

// ── Helpers ──────────────────────────────────────────────────────────────

/** Title-case: "bENGALuru eaST" → "Bengaluru East" */
function titleCase(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Map free-text classification to the canonical enum value.
 * Scans the lowercased input for any keyword hit; first match wins.
 * Falls back to "residential" when nothing matches.
 */
function normalizeClassification(raw) {
  if (!raw || typeof raw !== 'string') return 'residential';

  const lower = raw.toLowerCase().trim();
  if (!lower) return 'residential';

  for (const [canonical, keywords] of Object.entries(CLASSIFICATION_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return canonical;
    }
  }
  return 'residential';
}

/**
 * Map free-text status to verified | disputed | unverified.
 * Falls back to "unverified" when missing or unrecognized.
 */
function normalizeStatus(raw) {
  if (!raw || typeof raw !== 'string') return 'unverified';

  const lower = raw.toLowerCase().trim();
  if (VALID_STATUSES.has(lower)) return lower;

  // Fuzzy partial matches
  if (lower.includes('verif'))    return 'verified';
  if (lower.includes('disput'))   return 'disputed';
  return 'unverified';
}

/**
 * Normalize one raw OCR/NLP record into the target Division shape.
 *
 * @param {object} raw  – messy input record
 * @returns {object}    – normalized record with all cadastral and geospatial keys
 */
export function normalizeRecord(raw = {}) {
  // Extract intelligent fallbacks for Indian cadastral admin hierarchies
  const rawLocality = raw.locality || raw.area || raw.colony || raw.sector || '';
  const rawVillageCity = raw.village_city || raw.village || raw.city || raw.town || '';
  const rawTehsil = raw.tehsil || raw.taluk || raw.mandal || raw.subdistrict || '';
  const rawDistrict = raw.district || raw.zila || (rawVillageCity.toLowerCase().includes('bengaluru') ? 'Bengaluru Urban' : rawVillageCity);

  const cleanVillage = raw.village || (rawLocality ? rawLocality.split(',')[0].trim() : '') || (rawVillageCity ? rawVillageCity.split(',')[0].trim() : '');
  const cleanTehsil = rawTehsil || (rawLocality && rawVillageCity && rawLocality !== rawVillageCity ? rawVillageCity.split(',')[0].trim() : '');
  const cleanDistrict = rawDistrict || 'Hyderabad';
  const cleanState = raw.state || raw.province || (cleanDistrict.toLowerCase().includes('hyderabad') ? 'Telangana' : 'Karnataka');

  const khasra = raw.khasra_number != null && String(raw.khasra_number).trim() !== ''
    ? String(raw.khasra_number).trim()
    : (raw.survey_number != null ? String(raw.survey_number).trim() : '');

  const survey = raw.survey_number != null && String(raw.survey_number).trim() !== ''
    ? String(raw.survey_number).trim()
    : (raw.khasra_number != null ? String(raw.khasra_number).trim() : '');

  // Parse storeys/floors count e.g. "G+2 Storeys" -> 3, "3" -> 3, "G+1" -> 2
  let parsedFloors = 2;
  if (raw.floors != null) {
    const floorStr = String(raw.floors).toLowerCase();
    if (floorStr.includes('g+')) {
      const extra = parseInt(floorStr.replace(/[^0-9]/g, ''), 10) || 1;
      parsedFloors = 1 + extra;
    } else {
      parsedFloors = parseInt(floorStr.replace(/[^0-9]/g, ''), 10) || 2;
    }
  }

  // Parse area/size
  const rawSize = raw.size != null ? String(raw.size).replace(/[^0-9.]/g, '') : '';
  const numSize = parseFloat(rawSize) || 1200;
  const unit = String(raw.size_unit || 'sft').toLowerCase();
  let calculatedSqm = raw.area_sqm ? Number(raw.area_sqm) : null;
  if (!calculatedSqm) {
    if (unit === 'sft' || unit === 'sqft') calculatedSqm = Math.round(numSize * 0.092903 * 10) / 10;
    else if (unit === 'sqy' || unit === 'sqyd') calculatedSqm = Math.round(numSize * 0.836127 * 10) / 10;
    else if (unit === 'acr' || unit === 'acre') calculatedSqm = Math.round(numSize * 4046.86 * 10) / 10;
    else calculatedSqm = numSize;
  }

  return {
    building_name:   titleCase(raw.building_name || raw.structure_name || raw.complex || ''),
    house_number:    raw.house_number != null ? String(raw.house_number).replace(/^(no|plot|door)[:\s]*/i, '').trim() : '',
    street_name:     titleCase(raw.street_name || raw.road || raw.street || ''),
    locality:        titleCase(rawLocality),
    village:         titleCase(cleanVillage),
    tehsil:          titleCase(cleanTehsil),
    district:        titleCase(cleanDistrict),
    state:           titleCase(cleanState),
    country:         titleCase(raw.country || 'India'),
    pincode:         raw.pincode != null ? String(raw.pincode).trim() : '',
    khasra_number:   khasra,
    survey_number:   survey,
    owner_name:      (raw.owner_name && typeof raw.owner_name === 'string' && raw.owner_name.trim())
                       ? raw.owner_name.trim()
                       : 'Unknown',
    floors:          parsedFloors,
    size:            rawSize || String(numSize),
    size_unit:       unit,
    area_sqm:        calculatedSqm,
    classification:  normalizeClassification(raw.classification),
    status:          normalizeStatus(raw.status || raw.tax_status || 'verified'),
  };
}
