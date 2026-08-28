/**
 * Test Harness for Tier Partitioning & Unplaced Records.
 *
 * Tests:
 * 1. Unit Test with mixed mock geocoded results (Tier A, Tier B, Tier C)
 *    - Asserts schema conformance of unplaced_records
 *    - Asserts no overlap between placed_records and unplaced_records
 *    - Asserts total input count === placed_count + unplaced_count (no lost records)
 *
 * 2. End-to-End Pipeline Test with real geocoded records (Kadugodi, Hoskote, Devanahalli, Xzqblorp)
 *
 * Run: node src/utils/partitionRecords.test.js
 */

import { partitionGeocodedRecords } from './partitionRecords.js';
import { geocodeRecord } from './geocodeRecord.js';
import { normalizeRecord } from './normalizeRecord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

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

console.log('='.repeat(78));
console.log('  TEST 1: Schema Conformance & Partition Invariance (Mocked Tiers)');
console.log('='.repeat(78));

const mockGeocodedSet = [
  {
    normalized: {
      village: 'Kadugodi',
      tehsil: 'Bengaluru East',
      district: 'Bengaluru Urban',
      khasra_number: '101/A',
      survey_number: 'SY-101-A',
      owner_name: 'Amit Gowda',
      classification: 'residential',
      status: 'verified',
    },
    geo: {
      tier: 'A',
      chosen_source: 'nominatim',
      lat: 12.9957,
      lng: 77.7579,
      boundary_polygon: null,
      ladder_rung_used: 1,
    },
  },
  {
    normalized: {
      village: 'Hoskote',
      tehsil: 'Hoskote',
      district: 'Bengaluru Rural',
      khasra_number: '202/B',
      survey_number: 'SY-202-B',
      owner_name: 'Ravi Kumar',
      classification: 'agricultural',
      status: 'verified',
    },
    geo: {
      tier: 'B',
      chosen_source: 'nominatim',
      lat: 13.0730,
      lng: 77.7921,
      boundary_polygon: null,
      ladder_rung_used: 2,
    },
  },
  {
    normalized: {
      village: 'Devanahalli',
      tehsil: 'Devanahalli',
      district: 'Bengaluru Rural',
      khasra_number: '303/C',
      survey_number: 'SY-303-C',
      owner_name: 'Meera Reddy',
      classification: 'commercial',
      status: 'disputed',
    },
    geo: {
      tier: 'B',
      chosen_source: 'nominatim',
      lat: 13.2483,
      lng: 77.7134,
      boundary_polygon: null,
      ladder_rung_used: 2,
    },
  },
  {
    normalized: {
      village: 'Xzqblorp',
      tehsil: 'Bengaluru East',
      district: 'Bengaluru Urban',
      khasra_number: '404/D',
      survey_number: 'SY-404-D',
      owner_name: 'Unknown Person',
      classification: 'vacant',
      status: 'unverified',
    },
    geo: {
      tier: 'C',
      chosen_source: 'nominatim',
      lat: 12.9461,
      lng: 77.5503,
      boundary_polygon: null,
      ladder_rung_used: 3,
    },
  },
  {
    normalized: {
      village: 'Nonexistent Village',
      tehsil: 'Unknown Tehsil',
      district: 'Nowhere District',
      khasra_number: '505/E',
      survey_number: 'SY-505-E',
      owner_name: 'Ghost Owner',
      classification: 'industrial',
      status: 'unverified',
    },
    geo: {
      tier: 'C',
      chosen_source: null,
      lat: null,
      lng: null,
      boundary_polygon: null,
      ladder_rung_used: null,
    },
  },
];

const mockPartition = partitionGeocodedRecords(mockGeocodedSet);

console.log('\n📊 Partition Summary:');
console.log(`   • Total Input Records:     ${mockPartition.summary.total_input}`);
console.log(`   • Placed Records (A & B):  ${mockPartition.summary.placed_count}`);
console.log(`   • Unplaced Records (C):    ${mockPartition.summary.unplaced_count}`);
console.log(`   • Tier breakdown:          A=${mockPartition.summary.tier_counts.A}, B=${mockPartition.summary.tier_counts.B}, C=${mockPartition.summary.tier_counts.C}`);

// Verification assertions
const totalHandled = mockPartition.placed_records.length + mockPartition.unplaced_records.length;
if (totalHandled !== mockGeocodedSet.length) {
  throw new Error(`Record count mismatch! Input ${mockGeocodedSet.length} != Placed+Unplaced ${totalHandled}`);
}

const placedKeys = new Set(mockPartition.placed_records.map((r) => r.normalized.khasra_number));
const unplacedKeys = new Set(mockPartition.unplaced_records.map((r) => r.khasra_number));
for (const k of placedKeys) {
  if (unplacedKeys.has(k)) {
    throw new Error(`OVERLAP DETECTED! Khasra ${k} appears in both placed and unplaced sets!`);
  }
}

// Verify shape of unplaced records
const requiredUnplacedKeys = [
  'khasra_number',
  'survey_number',
  'owner_name',
  'classification',
  'village',
  'tehsil',
  'district',
  'reason',
  'best_tier_reached',
];

for (const unplaced of mockPartition.unplaced_records) {
  for (const k of requiredUnplacedKeys) {
    if (!(k in unplaced)) {
      throw new Error(`Unplaced record missing required key "${k}": ${JSON.stringify(unplaced)}`);
    }
  }
  if (unplaced.reason !== 'geocode_insufficient') {
    throw new Error(`Invalid reason: expected "geocode_insufficient", got "${unplaced.reason}"`);
  }
  if (unplaced.best_tier_reached !== 'C') {
    throw new Error(`Invalid best_tier_reached: expected "C", got "${unplaced.best_tier_reached}"`);
  }
}

console.log('\n✅ Placed Records in Main Path (Tier A & B only):');
mockPartition.placed_records.forEach((r, idx) => {
  console.log(`   ${idx + 1}. [Tier ${r.geo.tier}] ${r.normalized.village} (Khasra: ${r.normalized.khasra_number}, Owner: ${r.normalized.owner_name})`);
});

console.log('\n🚫 Unplaced Records (Tier C only):');
console.log(JSON.stringify(mockPartition.unplaced_records, null, 2));

console.log('\n' + '='.repeat(78));
console.log('  TEST 2: Live Pipeline Integration Test');
console.log('='.repeat(78));

const liveRawSet = [
  {
    village: 'kadugodi',
    tehsil: 'bengaluru east',
    district: 'bengaluru urban',
    khasra_number: '139/1A',
    survey_number: 'SY-669-1A',
    owner_name: 'Amit Gowda',
    classification: 'residential',
    status: 'verified',
  },
  {
    village: 'hoskote',
    tehsil: 'hoskote',
    district: 'bengaluru rural',
    khasra_number: '310/1',
    survey_number: 'SY-990-1',
    owner_name: 'Ravi Kumar',
    classification: 'agricultural',
    status: 'verified',
  },
  {
    village: 'devanahalli',
    tehsil: 'devanahalli',
    district: 'bengaluru rural',
    khasra_number: '44/7',
    survey_number: 'SY-101-7',
    owner_name: 'Meera Reddy',
    classification: 'commercial',
    status: 'disputed',
  },
  {
    village: 'xzqblorp',
    tehsil: 'bengaluru east',
    district: 'bengaluru urban',
    khasra_number: '999/X',
    survey_number: 'SY-001-X',
    owner_name: 'Test Person',
    classification: 'vacant',
    status: 'unverified',
  },
];

(async () => {
  console.log('Running live normalization, geocoding, and tier partitioning...');
  const geocodedResults = [];
  for (const raw of liveRawSet) {
    const normalized = normalizeRecord(raw);
    const geo = await geocodeRecord(normalized, MAPPLS_STATIC_KEY);
    geocodedResults.push({ normalized, geo });
  }
  const liveResult = partitionGeocodedRecords(geocodedResults);

  console.log('\n' + '═'.repeat(78));
  console.log('  LIVE EXECUTION RESULTS');
  console.log('═'.repeat(78));

  console.log(`\n📦 Placed Records (${liveResult.placed_records.length} items):`);
  liveResult.placed_records.forEach((r, idx) => {
    console.log(`   ${idx + 1}. [Tier ${r.geo.tier}] ${r.normalized.village} (Khasra: ${r.normalized.khasra_number}, Owner: ${r.normalized.owner_name}) → Lat: ${r.geo.lat}, Lng: ${r.geo.lng}`);
  });

  console.log(`\n📁 unplaced_records (${liveResult.unplaced_records.length} items):`);
  console.log(JSON.stringify(liveResult.unplaced_records, null, 2));

  // Assertions on live run
  const livePlacedKhasras = liveResult.placed_records.map((r) => r.normalized.khasra_number);
  const liveUnplacedKhasras = liveResult.unplaced_records.map((r) => r.khasra_number);

  console.log('\n🔍 Verification Checks:');
  console.log(`   • Input records count:     ${liveRawSet.length}`);
  console.log(`   • Total routed records:    ${liveResult.placed_records.length + liveResult.unplaced_records.length}`);
  console.log(`   • Placed khasra numbers:   ${JSON.stringify(livePlacedKhasras)}`);
  console.log(`   • Unplaced khasra numbers: ${JSON.stringify(liveUnplacedKhasras)}`);

  const hasOverlap = livePlacedKhasras.some((k) => liveUnplacedKhasras.includes(k));
  if (hasOverlap) {
    throw new Error('❌ TEST FAILED: Overlap found between placed and unplaced sets!');
  }
  if (liveResult.placed_records.length + liveResult.unplaced_records.length !== liveRawSet.length) {
    throw new Error('❌ TEST FAILED: Record count mismatch, records were lost!');
  }

  console.log('\n✨ ALL TESTS PASSED: Zero overlap, zero records lost, exact unplaced shape confirmed.\n');
})();
