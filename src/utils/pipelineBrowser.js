/**
 * Browser-friendly pipeline entry point.
 *
 * Wraps the core pipeline (which uses only browser-compatible APIs: fetch, @turf/*)
 * and provides the Mappls API key from Vite environment variables.
 *
 * Used by App.jsx when a user drops raw OCR-style records into the UI.
 */

import { runFullPipeline } from './pipeline.js';

/**
 * Detect whether a parsed JSON payload is raw OCR-style input (an array of
 * flat land records) versus an already-assembled FeatureCollection.
 *
 * @param {any} parsed - The parsed JSON
 * @returns {'raw_records' | 'feature_collection' | 'unknown'}
 */
export function detectInputShape(parsed) {
  if (!parsed || typeof parsed !== 'object') return 'unknown';

  // Already-assembled FeatureCollection
  if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
    return 'feature_collection';
  }

  // Raw OCR array: top-level array of objects with at least village or district
  if (Array.isArray(parsed) && parsed.length > 0) {
    const first = parsed[0];
    if (first && typeof first === 'object' && (first.village || first.district || first.khasra_number)) {
      return 'raw_records';
    }
  }

  return 'unknown';
}

/**
 * Run the full 10-stage pipeline in the browser.
 *
 * @param {Array<object>} rawRecords - Flat array of raw OCR-style land records
 * @param {function} [onProgress] - Optional callback: (stage, detail) => void
 * @returns {Promise<{ featureCollection: object, unplaced_records: Array<object>, stats: object }>}
 */
export async function runBrowserPipeline(rawRecords, onProgress = null) {
  const mapplsKey = import.meta.env.VITE_MAPPLS_STATIC_KEY || '';
  return runFullPipeline(rawRecords, mapplsKey, onProgress);
}
