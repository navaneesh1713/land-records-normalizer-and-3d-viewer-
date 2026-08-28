/**
 * Test harness for normalizeRecord — 5 records covering the required edge cases.
 * Run: node src/utils/normalizeRecord.test.js
 */
import { normalizeRecord } from './normalizeRecord.js';

const TEST_CASES = [
  // ── 1. Clean input ─────────────────────────────────────────────────
  {
    label: '1 — Clean input (all fields present and well-formed)',
    input: {
      village: 'Kadugodi',
      tehsil: 'Bengaluru East',
      district: 'Bengaluru Urban',
      khasra_number: '139/1A',
      survey_number: 'SY-669-1A',
      owner_name: 'Amit Gowda',
      classification: 'commercial',
      status: 'verified',
    },
  },

  // ── 2. Missing tehsil ──────────────────────────────────────────────
  {
    label: '2 — Missing tehsil (empty string)',
    input: {
      village: 'Whitefield',
      tehsil: '',
      district: 'Bengaluru Urban',
      khasra_number: '204/3',
      survey_number: 'SY-812-3',
      owner_name: 'Priya Nair',
      classification: 'house',
      status: 'disputed',
    },
  },

  // ── 3. Garbled classification that matches nothing ─────────────────
  {
    label: '3 — Garbled classification (no keyword hit → default residential)',
    input: {
      village: 'Varthur',
      tehsil: 'Bengaluru East',
      district: 'Bengaluru Urban',
      khasra_number: '57/2B',
      survey_number: 'SY-441-2B',
      owner_name: 'Ravi Kumar',
      classification: 'xz77%%blurb!!',
      status: 'verified',
    },
  },

  // ── 4. Missing owner_name ──────────────────────────────────────────
  {
    label: '4 — Missing owner_name (null → "Unknown")',
    input: {
      village: 'Hoskote',
      tehsil: 'Bengaluru East',
      district: 'bengaluru urban',
      khasra_number: '310/1',
      survey_number: 'SY-990-1',
      owner_name: null,
      classification: 'factory area',
      status: '',
    },
  },

  // ── 5. Mixed-case village name ─────────────────────────────────────
  {
    label: '5 — Mixed-case village + whitespace, status absent',
    input: {
      village: '  kaDUGOdi  vilLAGE  ',
      tehsil: '  bENGALuru   eaST',
      district: 'BENGALURU URBAN',
      khasra_number: '999/X',
      survey_number: 'SY-001-X',
      owner_name: '  Sunita Menon  ',
      classification: 'empty unused land',
    },
  },
];

// ── Run & print ──────────────────────────────────────────────────────────
console.log('='.repeat(72));
console.log('  normalizeRecord() — 5 Test Cases');
console.log('='.repeat(72));

for (const { label, input } of TEST_CASES) {
  const output = normalizeRecord(input);
  console.log(`\n▸ ${label}`);
  console.log('  INPUT :', JSON.stringify(input));
  console.log('  OUTPUT:', JSON.stringify(output, null, 2));
}

console.log('\n' + '='.repeat(72));
console.log('  All 5 tests executed.\n');
