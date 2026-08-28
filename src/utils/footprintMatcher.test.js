/**
 * Test Harness for Deterministic Footprint Matcher & Procedural Generator.
 *
 * Verifies:
 * 1. Byte-identical geometry determinism on repeated runs for both real and synthetic cases.
 * 2. Real Overpass footprint matching (is_synthetic: false, valid osm_way_id, deterministic index).
 * 3. Procedural synthetic generation when 0 footprints exist (is_synthetic: true, osm_way_id: null, bounded rectangle).
 *
 * Run: node src/utils/footprintMatcher.test.js
 */

import { resolveBuildingFootprint } from './footprintMatcher.js';

console.log('='.repeat(78));
console.log('  TEST 1: Real Overpass Footprint Matching (Kadugodi - Urban Area)');
console.log('='.repeat(78));

const realRecordInput = {
  normalized: {
    village: 'Kadugodi',
    tehsil: 'Bengaluru East',
    district: 'Bengaluru Urban',
    khasra_number: '139/1A',
    survey_number: 'SY-669-1A',
    owner_name: 'Amit Gowda',
    classification: 'residential',
    status: 'verified',
  },
  geo: {
    tier: 'B',
    chosen_source: 'nominatim',
    lat: 12.9957428,
    lng: 77.7579489,
    boundary_polygon: null,
    ladder_rung_used: 2,
  },
};

(async () => {
  // Run 1
  console.log('Executing Run 1 for Kadugodi record...');
  const run1 = await resolveBuildingFootprint(realRecordInput);

  console.log('Executing Run 2 for IDENTICAL Kadugodi record...');
  const run2 = await resolveBuildingFootprint(realRecordInput);

  console.log('\n📊 Run 1 Results:');
  console.log(`   • Selection Method:      ${run1.selection_method}`);
  console.log(`   • Candidate Count:       ${run1.candidate_count} buildings from Overpass`);
  console.log(`   • Hash Used:             ${run1.hash_used} (key: "${run1.hash_key}")`);
  console.log(`   • Deterministic Index:   ${run1.chosen_index} (hash % ${run1.candidate_count})`);
  console.log(`   • OSM Way ID:            ${run1.osm_way_id}`);
  console.log(`   • is_synthetic:          ${run1.is_synthetic}`);
  console.log(`   • Footprint Area:        ${run1.footprint_area_sqm} m²`);
  console.log(`   • Geometry Vertices:     ${run1.geometry.coordinates[0].length} points`);

  // Byte-identical geometry assertion
  const geom1Str = JSON.stringify(run1.geometry);
  const geom2Str = JSON.stringify(run2.geometry);
  const isByteIdentical = geom1Str === geom2Str;

  console.log(`\n🔒 Determinism Check (Run 1 vs Run 2 Geometry String Match):`);
  console.log(`   • Run 1 JSON: ${geom1Str.slice(0, 75)}...`);
  console.log(`   • Run 2 JSON: ${geom2Str.slice(0, 75)}...`);
  console.log(`   • Byte-identical match: ${isByteIdentical ? '✅ TRUE (100% Deterministic)' : '❌ FALSE'}`);

  if (!isByteIdentical) {
    throw new Error('Determinism failed: Run 1 and Run 2 geometries are not byte-identical!');
  }
  if (run1.is_synthetic !== false) {
    throw new Error(`Expected is_synthetic === false for urban record, got ${run1.is_synthetic}`);
  }
  if (!run1.osm_way_id) {
    throw new Error('Expected valid osm_way_id for real Overpass match');
  }

  console.log('\n' + '='.repeat(78));
  console.log('  TEST 2: Procedural Synthetic Generation (Empty Unmapped Remote Area)');
  console.log('='.repeat(78));

  // Remote coordinate in open desert/salt flats where zero OSM buildings exist
  const emptyAreaInput = {
    normalized: {
      village: 'Desert Outpost 7',
      tehsil: 'Pokhran',
      district: 'Jaisalmer',
      khasra_number: '777/X',
      survey_number: 'SY-888-X',
      owner_name: 'Nomad Titleholder',
      classification: 'vacant',
      status: 'unverified',
    },
    geo: {
      tier: 'B',
      chosen_source: 'nominatim',
      lat: 27.0500,
      lng: 71.4500,
      boundary_polygon: null,
      ladder_rung_used: 2,
    },
  };

  console.log('Executing Run 1 for Empty Remote Area record...');
  const synthRun1 = await resolveBuildingFootprint(emptyAreaInput);

  console.log('Executing Run 2 for IDENTICAL Empty Remote Area record...');
  const synthRun2 = await resolveBuildingFootprint(emptyAreaInput);

  console.log('\n📊 Synthetic Run 1 Results:');
  console.log(`   • Selection Method:      ${synthRun1.selection_method}`);
  console.log(`   • Candidate Count:       ${synthRun1.candidate_count} (No Overpass buildings found)`);
  console.log(`   • Hash Used:             ${synthRun1.hash_used} (key: "${synthRun1.hash_key}")`);
  console.log(`   • OSM Way ID:            ${synthRun1.osm_way_id} (null for synthetic)`);
  console.log(`   • is_synthetic:          ${synthRun1.is_synthetic}`);
  console.log(`   • Procedural Area:       ${synthRun1.footprint_area_sqm} m²`);
  console.log(`   • Coordinates:           ${JSON.stringify(synthRun1.geometry.coordinates[0])}`);

  const synthGeom1Str = JSON.stringify(synthRun1.geometry);
  const synthGeom2Str = JSON.stringify(synthRun2.geometry);
  const isSynthByteIdentical = synthGeom1Str === synthGeom2Str;

  console.log(`\n🔒 Synthetic Determinism Check (Run 1 vs Run 2 Geometry Match):`);
  console.log(`   • Run 1 JSON: ${synthGeom1Str}`);
  console.log(`   • Run 2 JSON: ${synthGeom2Str}`);
  console.log(`   • Byte-identical match: ${isSynthByteIdentical ? '✅ TRUE (100% Deterministic)' : '❌ FALSE'}`);

  if (!isSynthByteIdentical) {
    throw new Error('Synthetic determinism failed: Run 1 and Run 2 geometries are not byte-identical!');
  }
  if (synthRun1.is_synthetic !== true) {
    throw new Error(`Expected is_synthetic === true for synthetic generation, got ${synthRun1.is_synthetic}`);
  }
  if (synthRun1.osm_way_id !== null) {
    throw new Error(`Expected osm_way_id === null for synthetic generation, got ${synthRun1.osm_way_id}`);
  }
  if (synthRun1.geometry.coordinates[0].length !== 5) {
    throw new Error('Expected 5-point closed polygon ring for synthetic rectangle');
  }

  console.log('\n' + '='.repeat(78));
  console.log('  ✨ ALL DETERMINISM AND OVERPASS/SYNTHETIC TESTS PASSED SUCCESSFULLY! ✨');
  console.log('='.repeat(78));
})();
