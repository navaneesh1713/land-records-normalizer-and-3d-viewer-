/**
 * Tier Partitioning Module.
 *
 * Routes geocoded land records based on their precision tier:
 * - Tier A & B records proceed to the main pipeline (placed_records).
 * - Tier C records are rejected from main features and routed to unplaced_records
 *   with reason: "geocode_insufficient" and best_tier_reached: "C".
 *
 * Standalone module — preserves upstream geocoding logic and enforces clean separation.
 */

/**
 * Format a Tier C record into the exact unplaced_records schema.
 *
 * @param {object} normalized - Normalized land record
 * @param {object} geo - Geocoding result
 * @returns {object} Unplaced record shape
 */
export function formatUnplacedRecord(normalized, geo) {
  return {
    khasra_number: normalized.khasra_number ?? '',
    survey_number: normalized.survey_number ?? '',
    owner_name: normalized.owner_name ?? 'Unknown',
    classification: normalized.classification ?? 'residential',
    village: normalized.village ?? '',
    tehsil: normalized.tehsil ?? '',
    district: normalized.district ?? '',
    reason: 'geocode_insufficient',
    best_tier_reached: geo?.tier || 'C',
  };
}

/**
 * Partition an array of already-geocoded records into placed and unplaced sets.
 *
 * @param {Array<{normalized: object, geo: object}>} geocodedResults
 * @returns {{ placed_records: Array, unplaced_records: Array, summary: object }}
 */
export function partitionGeocodedRecords(geocodedResults = []) {
  const placed_records = [];
  const unplaced_records = [];

  for (const item of geocodedResults) {
    const { normalized, geo } = item;
    const tier = geo?.tier || 'C';

    if (tier === 'A' || tier === 'B') {
      placed_records.push({
        normalized,
        geo,
      });
    } else {
      unplaced_records.push(formatUnplacedRecord(normalized, geo));
    }
  }

  return {
    placed_records,
    unplaced_records,
    summary: {
      total_input: geocodedResults.length,
      placed_count: placed_records.length,
      unplaced_count: unplaced_records.length,
      tier_counts: {
        A: placed_records.filter((r) => r.geo.tier === 'A').length,
        B: placed_records.filter((r) => r.geo.tier === 'B').length,
        C: unplaced_records.length,
      },
    },
  };
}
