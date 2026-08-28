/**
 * Full Pipeline Integration Test on a 10-Record Mixed Fixture.
 *
 * Fixture composition:
 * - 3 records sharing a single building (Kadugodi, 2 floors, 2 divisions on floor 1, 1 on floor 2)
 * - 3 records with distinct real Overpass footprints (Kadugodi, Hoskote, Devanahalli)
 * - 2 records in unmapped remote areas triggering procedural synthetic generation (is_synthetic: true)
 * - 2 records failing geocoding (Tier C: misspelled/invalid) routing to unplaced_records
 *
 * Run: node src/utils/pipeline.test.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runFullPipeline } from './pipeline.js';

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

// ── 10-Record Mixed Fixture ──────────────────────────────────────────────
const MIXED_10_FIXTURE = [
  // 1, 2, 3: Sharing Plot 1 in Kadugodi (Multi-Floor & Multi-Division)
  {
    village: 'Kadugodi',
    tehsil: 'Bengaluru East',
    district: 'Bengaluru Urban',
    khasra_number: '139/1A',
    survey_number: 'SY-669-1A',
    owner_name: 'Amit Gowda',
    classification: 'commercial',
    status: 'verified',
    floor_number: 1,
    plot_link: 'KADUGODI-BLDG-1',
  },
  {
    village: 'Kadugodi',
    tehsil: 'Bengaluru East',
    district: 'Bengaluru Urban',
    khasra_number: '139/1A', // Same khasra base -> resolves same OSM footprint
    survey_number: 'SY-669-1B',
    owner_name: 'Sunita Menon',
    classification: 'residential',
    status: 'verified',
    floor_number: 1,
    plot_link: 'KADUGODI-BLDG-1',
  },
  {
    village: 'Kadugodi',
    tehsil: 'Bengaluru East',
    district: 'Bengaluru Urban',
    khasra_number: '139/1A', // Same khasra base -> resolves same OSM footprint
    survey_number: 'SY-669-2',
    owner_name: 'Rajesh Sharma',
    classification: 'residential',
    status: 'disputed',
    floor_number: 2,
    plot_link: 'KADUGODI-BLDG-1',
  },

  // 4: Distinct individual building in Kadugodi
  {
    village: 'Kadugodi',
    tehsil: 'Bengaluru East',
    district: 'Bengaluru Urban',
    khasra_number: '204/1',
    survey_number: 'SY-882-1',
    owner_name: 'Pooja Iyer',
    classification: 'residential',
    status: 'verified',
    floor_number: 1,
  },

  // 5: Real Overpass footprint in Hoskote
  {
    village: 'Hoskote',
    tehsil: 'Hoskote',
    district: 'Bengaluru Rural',
    khasra_number: '310/1',
    survey_number: 'SY-990-1',
    owner_name: 'Ravi Kumar',
    classification: 'agricultural',
    status: 'verified',
    floor_number: 1,
  },

  // 6: Real Overpass footprint in Devanahalli
  {
    village: 'Devanahalli',
    tehsil: 'Devanahalli',
    district: 'Bengaluru Rural',
    khasra_number: '44/7',
    survey_number: 'SY-101-7',
    owner_name: 'Meera Reddy',
    classification: 'commercial',
    status: 'disputed',
    floor_number: 1,
  },

  // 7: Bidaluru (Real village, Tier B, but 0 OSM building footprints -> triggers procedural synthetic generation)
  {
    village: 'Bidaluru',
    tehsil: 'Devanahalli',
    district: 'Bengaluru Rural',
    khasra_number: '777/X',
    survey_number: 'SY-888-X',
    owner_name: 'Girish Patel',
    classification: 'vacant',
    status: 'unverified',
    floor_number: 1,
  },

  // 8: Gollahalli (Real village in Bengaluru Rural, Tier B, triggers synthetic/low footprint generation)
  {
    village: 'Gollahalli',
    tehsil: 'Devanahalli',
    district: 'Bengaluru Rural',
    khasra_number: '888/Y',
    survey_number: 'SY-999-Y',
    owner_name: 'Lakshmi Hegde',
    classification: 'residential',
    status: 'verified',
    floor_number: 1,
  },

  // 9: Misspelled/Garbled Village -> Tier C -> Unplaced
  {
    village: 'Xzqblorp Unknown',
    tehsil: 'Bengaluru East',
    district: 'Bengaluru Urban',
    khasra_number: '999/Z',
    survey_number: 'SY-001-Z',
    owner_name: 'Test Person A',
    classification: 'vacant',
    status: 'unverified',
  },

  // 10: Completely Invalid Address -> Tier C -> Unplaced
  {
    village: 'Zzzqqqnonexistent',
    tehsil: 'Nowhere',
    district: 'Fictional Land',
    khasra_number: '000/0',
    survey_number: 'SY-000-0',
    owner_name: 'Ghost Record B',
    classification: 'residential',
    status: 'unverified',
  },
];

(async () => {
  console.log('='.repeat(80));
  console.log('  END-TO-END PIPELINE EXECUTION (10-RECORD MIXED FIXTURE)');
  console.log('='.repeat(80));

  const { featureCollection, unplaced_records, stats } = await runFullPipeline(
    MIXED_10_FIXTURE,
    MAPPLS_STATIC_KEY
  );

  console.log('\n' + '═'.repeat(80));
  console.log('  PIPELINE EXECUTION STATISTICS');
  console.log('═'.repeat(80));
  console.log(`   • Total Input Records:         ${stats.total_input_records}`);
  console.log(`   • Placed Records (Tier A/B):   ${stats.placed_records_count}`);
  console.log(`   • Unplaced Records (Tier C):   ${stats.unplaced_records_count}`);
  console.log(`   • Final Feature Buildings:     ${stats.features_count}`);
  console.log(`   • Real OSM Features:           ${stats.real_osm_features_count}`);
  console.log(`   • Synthetic Generated Features: ${stats.synthetic_features_count}`);

  // Write outputs to files
  const outDir = path.resolve(__dirname, '../data');
  const fcPath = path.join(outDir, 'generated-full-pipeline-parcels.json');
  const unplacedPath = path.join(outDir, 'unplaced_records.json');

  fs.writeFileSync(fcPath, JSON.stringify(featureCollection, null, 2), 'utf8');
  fs.writeFileSync(unplacedPath, JSON.stringify(unplaced_records, null, 2), 'utf8');

  console.log(`\n💾 Output Files Written:`);
  console.log(`   • FeatureCollection: ${fcPath}`);
  console.log(`   • Unplaced Records:  ${unplacedPath}`);

  // Validations
  console.log('\n' + '═'.repeat(80));
  console.log('  SCHEMA & INTEGRITY VALIDATIONS');
  console.log('═'.repeat(80));

  // 1. Metadata check
  console.log('1. Metadata check:');
  console.log(`   • plot_count:     ${featureCollection.metadata.plot_count} (must equal features.length: ${featureCollection.features.length})`);
  console.log(`   • village:        "${featureCollection.metadata.village}" (majority value)`);
  console.log(`   • tehsil:         "${featureCollection.metadata.tehsil}" (majority value)`);
  console.log(`   • district:       "${featureCollection.metadata.district}" (majority value)`);
  console.log(`   • generated_at:   ${featureCollection.metadata.generated_at}`);
  console.log(`   • source:         "${featureCollection.metadata.source}"`);

  if (featureCollection.metadata.plot_count !== featureCollection.features.length) {
    throw new Error('metadata.plot_count does not match features.length!');
  }
  if (featureCollection.metadata.source !== 'OpenStreetMap (Overpass API)') {
    throw new Error('metadata.source must be "OpenStreetMap (Overpass API)"!');
  }

  // 2. Feature Structure check
  console.log('\n2. Feature attributes & nesting check:');
  featureCollection.features.forEach((feat, idx) => {
    const p = feat.properties;
    console.log(`   Feature ${idx + 1}: ${p.plot_id} | OSM: ${p.osm_way_id || 'null (synthetic)'} | Area: ${p.footprint_area_sqm} m² | Height: ${p.floor_height_m}m | Floors: ${p.floors.length}`);
    
    p.floors.forEach((fl) => {
      console.log(`     - Floor ${fl.floor_number} (${fl.divisions.length} divisions):`);
      fl.divisions.forEach((div) => {
        console.log(`         • [Div ${div.division_index} (${(div.division_share * 100).toFixed(1)}%)] Unit: ${div.unit_id} | Owner: ${div.owner_name} | Class: ${div.classification} | Status: ${div.status} | Synthetic: ${div.is_synthetic}`);
      });
    });

    if (p.floor_height_m !== 3.5) {
      throw new Error(`Invalid floor_height_m: expected 3.5, got ${p.floor_height_m}`);
    }
    if (typeof p.footprint_area_sqm !== 'number' || p.footprint_area_sqm <= 0) {
      throw new Error(`Invalid footprint_area_sqm: ${p.footprint_area_sqm}`);
    }
    if (!p.plot_id) {
      throw new Error('Missing plot_id!');
    }
    if (feat.geometry.type !== 'Polygon') {
      throw new Error('Geometry type must be Polygon!');
    }
  });

  // 3. Unplaced Records check
  console.log('\n3. Unplaced Records verification:');
  console.log(JSON.stringify(unplaced_records, null, 2));

  if (unplaced_records.length !== 2) {
    throw new Error(`Expected exactly 2 unplaced records, got ${unplaced_records.length}`);
  }
  unplaced_records.forEach((u) => {
    if (u.reason !== 'geocode_insufficient' || u.best_tier_reached !== 'C') {
      throw new Error(`Invalid unplaced record fields: ${JSON.stringify(u)}`);
    }
  });

  console.log('\n✨ ALL PIPELINE TESTS & SCHEMA ASSERTIONS PASSED! ✨\n');
})();
