/**
 * Test harness for geocodeRecord — 4 records covering different geocoding quality.
 *
 * 1. Kadugodi, Bengaluru East, Bengaluru Urban   — well-known suburb, expect Tier A
 * 2. Hoskote, Bengaluru Rural, Bengaluru Rural    — real taluk town, expect Tier A/B
 * 3. Devanahalli, Bengaluru Rural, Bengaluru Rural — known town (airport area), expect A/B
 * 4. Xzqblorp, Bengaluru East, Bengaluru Urban    — deliberately misspelled, expect Tier C
 *
 * Run: node src/utils/geocodeRecord.test.js
 */

import { geocodeRecord } from './geocodeRecord.js';
import { normalizeRecord } from './normalizeRecord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Load .env manually (Node doesn't auto-load .env) ─────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const envPath    = path.resolve(__dirname, '../../.env');

function loadEnv(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* ignore */ }
}

loadEnv(envPath);
const MAPPLS_STATIC_KEY = process.env.MAPPLS_STATIC_KEY || process.env.MAPPLS_API_KEY || '';

// ── Test records ─────────────────────────────────────────────────────────

const TEST_RECORDS = [
  {
    label: '1 — Kadugodi (well-known Bengaluru suburb, expect Tier A)',
    raw: {
      village: 'kadugodi',
      tehsil: 'bengaluru east',
      district: 'bengaluru urban',
      khasra_number: '139/1A',
      survey_number: 'SY-669-1A',
      owner_name: 'Amit Gowda',
      classification: 'residential',
      status: 'verified',
    },
  },
  {
    label: '2 — Hoskote (real taluk town near Bengaluru, expect Tier A or B)',
    raw: {
      village: 'hoskote',
      tehsil: 'hoskote',
      district: 'bengaluru rural',
      khasra_number: '310/1',
      survey_number: 'SY-990-1',
      owner_name: 'Ravi Kumar',
      classification: 'agricultural',
      status: 'verified',
    },
  },
  {
    label: '3 — Devanahalli (known town, airport area, expect Tier A or B)',
    raw: {
      village: 'devanahalli',
      tehsil: 'devanahalli',
      district: 'bengaluru rural',
      khasra_number: '44/7',
      survey_number: 'SY-101-7',
      owner_name: 'Meera Reddy',
      classification: 'commercial',
      status: 'disputed',
    },
  },
  {
    label: '4 — Xzqblorp (deliberately misspelled/vague, expect Tier C)',
    raw: {
      village: 'xzqblorp',
      tehsil: 'bengaluru east',
      district: 'bengaluru urban',
      khasra_number: '999/X',
      survey_number: 'SY-001-X',
      owner_name: 'Test Person',
      classification: 'vacant',
      status: 'unverified',
    },
  },
];

// ── Run ──────────────────────────────────────────────────────────────────

console.log('='.repeat(72));
console.log('  Dual-Geocoder Test — 4 Records');
console.log('  Mappls Static Key:', MAPPLS_STATIC_KEY ? `${MAPPLS_STATIC_KEY.slice(0, 8)}...` : '(not set)');
console.log('='.repeat(72));

(async () => {
  const rawRecords = TEST_RECORDS.map((t) => t.raw);
  const results = [];
  for (let i = 0; i < rawRecords.length; i++) {
    const raw = rawRecords[i];
    const normalized = normalizeRecord(raw);
    const geo = await geocodeRecord(normalized, MAPPLS_STATIC_KEY);
    results.push({ normalized, geo });
  }

  console.log('\n' + '═'.repeat(72));
  console.log('  FINAL RESULTS SUMMARY');
  console.log('═'.repeat(72));

  results.forEach((r, i) => {
    const test = TEST_RECORDS[i];
    const g = r.geo;
    console.log(`\n▸ ${test.label}`);
    console.log(`  Village (normalized): "${r.normalized.village}"`);
    console.log(`  Tier:           ${g.tier}`);
    console.log(`  Chosen Source:  ${g.chosen_source || 'none'}`);
    console.log(`  Lat/Lng:        ${g.lat != null ? `${g.lat}, ${g.lng}` : 'n/a'}`);
    console.log(`  Ladder Rung:    ${g.ladder_rung_used || 'n/a'}`);
    console.log(`  Has Boundary:   ${g.boundary_polygon ? 'yes (' + g.boundary_polygon.type + ')' : 'no'}`);

    // Explain why this tier was assigned
    let reason = '';
    switch (g.tier) {
      case 'A':
        reason = 'Village/suburb-level place type with tight bounding box (< 0.02°)';
        break;
      case 'B':
        reason = 'Tehsil/taluk-level type, or fallback candidate with moderately small bbox';
        break;
      case 'C':
        reason = 'District-level only, large bounding box, or no geocoder returned a result';
        break;
    }
    console.log(`  Reason:         ${reason}`);
  });

  console.log('\n' + '='.repeat(72));
  console.log('  Test complete.\n');
})();
