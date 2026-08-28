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

// ── Main entry point ─────────────────────────────────────────────────────

/**
 * Normalize one raw OCR/NLP record into the target Division shape.
 *
 * @param {object} raw  – messy input record
 * @returns {object}    – normalized record with exactly these keys:
 *   village, tehsil, district, khasra_number, survey_number,
 *   owner_name, classification, status
 */
export function normalizeRecord(raw = {}) {
  return {
    village:         titleCase(raw.village),
    tehsil:          titleCase(raw.tehsil),
    district:        titleCase(raw.district),
    khasra_number:   raw.khasra_number != null ? String(raw.khasra_number).trim() : '',
    survey_number:   raw.survey_number != null ? String(raw.survey_number).trim() : '',
    owner_name:      (raw.owner_name && typeof raw.owner_name === 'string' && raw.owner_name.trim())
                       ? raw.owner_name.trim()
                       : 'Unknown',
    classification:  normalizeClassification(raw.classification),
    status:          normalizeStatus(raw.status),
  };
}
