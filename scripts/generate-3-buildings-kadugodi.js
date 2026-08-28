import { fetchOverpassBuildings } from '../src/utils/footprintMatcher.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Kadugodi center bbox (~250m radius around 12.9957, 77.7579)
const bbox = {
  south: 12.993,
  west: 77.755,
  north: 12.998,
  east: 77.760,
};

async function main() {
  console.log('🔍 Querying Overpass API for real building footprints in Kadugodi...');
  const footprints = await fetchOverpassBuildings(bbox);
  console.log(`Found ${footprints.length} real building footprints in Kadugodi.`);

  if (footprints.length < 3) {
    throw new Error(`Expected at least 3 footprints, got ${footprints.length}`);
  }

  // Pick 3 real footprints (prefer 346454391 and 1310982746 if present, plus 1 more)
  const targetIds = ['346454391', '1310982746'];
  let selected = footprints.filter((f) => targetIds.includes(String(f.osm_id)));

  for (const f of footprints) {
    if (selected.length >= 3) break;
    if (!selected.some((s) => String(s.osm_id) === String(f.osm_id))) {
      selected.push(f);
    }
  }

  selected = selected.slice(0, 3);
  console.log('Selected 3 real OSM Way IDs:', selected.map((s) => s.osm_id));

  const sampleOwners = [
    ['Amit Gowda', 'Sunita Menon', 'Rajesh Sharma', 'Pooja Iyer'],
    ['Ravi Kumar', 'Meera Reddy', 'Suresh Patel', 'Kavita Nair'],
    ['Girish Patel', 'Lakshmi Hegde', 'Venkatesh Rao', 'Ananya Das'],
  ];

  const sampleKhasras = [
    ['139/1A', '139/1A', '139/1A', '139/1A'],
    ['204/1', '204/1', '204/2', '204/2'],
    ['310/1', '310/1', '310/2', '310/2'],
  ];

  const sampleSurveys = [
    ['SY-669-1A', 'SY-669-1B', 'SY-669-2A', 'SY-669-2B'],
    ['SY-882-1A', 'SY-882-1B', 'SY-882-2A', 'SY-882-2B'],
    ['SY-990-1A', 'SY-990-1B', 'SY-990-2A', 'SY-990-2B'],
  ];

  const features = selected.map((f, bIdx) => {
    const osmId = String(f.osm_id);
    const plotId = `PLOT-OSM-${osmId}`;
    const owners = sampleOwners[bIdx];
    const khasras = sampleKhasras[bIdx];
    const surveys = sampleSurveys[bIdx];

    return {
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        plot_id: plotId,
        osm_way_id: osmId,
        village: 'Kadugodi',
        tehsil: 'Bengaluru East',
        district: 'Bengaluru Urban',
        floor_height_m: 3.5,
        footprint_area_sqm: f.area_sqm,
        floors: [
          {
            floor_number: 1,
            divisions: [
              {
                unit_id: `${plotId}-F1-D1`,
                khasra_number: khasras[0],
                survey_number: surveys[0],
                owner_name: owners[0],
                classification: 'commercial',
                status: 'verified',
                division_index: 1,
                division_share: 0.5,
                is_synthetic: false,
              },
              {
                unit_id: `${plotId}-F1-D2`,
                khasra_number: khasras[1],
                survey_number: surveys[1],
                owner_name: owners[1],
                classification: 'commercial',
                status: 'verified',
                division_index: 2,
                division_share: 0.5,
                is_synthetic: false,
              },
            ],
          },
          {
            floor_number: 2,
            divisions: [
              {
                unit_id: `${plotId}-F2-D1`,
                khasra_number: khasras[2],
                survey_number: surveys[2],
                owner_name: owners[2],
                classification: 'residential',
                status: bIdx === 1 ? 'disputed' : 'verified',
                division_index: 1,
                division_share: 0.5,
                is_synthetic: false,
              },
              {
                unit_id: `${plotId}-F2-D2`,
                khasra_number: khasras[3],
                survey_number: surveys[3],
                owner_name: owners[3],
                classification: 'residential',
                status: 'verified',
                division_index: 2,
                division_share: 0.5,
                is_synthetic: false,
              },
            ],
          },
        ],
      },
    };
  });

  const featureCollection = {
    type: 'FeatureCollection',
    metadata: {
      village: 'Kadugodi',
      tehsil: 'Bengaluru East',
      district: 'Bengaluru Urban',
      generated_at: new Date().toISOString(),
      plot_count: 3,
      source: 'OpenStreetMap (Overpass API)',
    },
    features,
  };

  const filePaths = [
    path.resolve(__dirname, '../3-buildings-kadugodi.json'),
    path.resolve(__dirname, '../src/data/3-buildings-kadugodi.json'),
  ];

  for (const fp of filePaths) {
    fs.writeFileSync(fp, JSON.stringify(featureCollection, null, 2), 'utf8');
    console.log(`💾 Saved: ${fp}`);
  }

  console.log('\n✨ 3-buildings-kadugodi.json successfully generated with 3 real Overpass building footprints!');
}

main().catch((err) => {
  console.error('Error generating fixture:', err);
  process.exit(1);
});
