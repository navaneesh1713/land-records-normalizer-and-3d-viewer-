import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import area from '@turf/area';
import { polygon } from '@turf/helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default Configuration
const DEFAULT_BBOX = {
  // Kadugodi / Whitefield area in Bengaluru Urban
  south: 12.9700,
  west: 77.5920,
  north: 12.9780,
  east: 77.6000,
};

const DEFAULT_BUILDING_COUNT = 8;
const DEFAULT_OUTPUT_FILE = 'generated-parcel-data.json';
const DEFAULT_VILLAGE = 'Kadugodi';
const DEFAULT_TEHSIL = 'Bengaluru East';
const DEFAULT_DISTRICT = 'Bengaluru Urban';

// Realistic Indian Names & Attributes Pool
const FIRST_NAMES = [
  'Ramesh', 'Meera', 'Ravi', 'Ananya', 'Suresh', 'Priya', 'Rajesh', 'Sunita',
  'Amit', 'Deepa', 'Vikram', 'Pooja', 'Sanjay', 'Lakshmi', 'Karthik', 'Divya',
  'Manoj', 'Swati', 'Arvind', 'Sneha', 'Naveen', 'Kavita', 'Pradeep', 'Anjali'
];

const LAST_NAMES = [
  'Kumar', 'Sharma', 'Patel', 'Reddy', 'Venkatakrishnan', 'Iyer', 'Rao', 'Singh',
  'Gupta', 'Joshi', 'Nair', 'Desai', 'Hegde', 'Gowda', 'Bhat', 'Verma',
  'Mukherjee', 'Banerjee', 'Kulkarni', 'Pillai', 'Menon', 'Chatterjee'
];

const CLASSIFICATIONS = ['agricultural', 'residential', 'commercial', 'industrial', 'vacant'];
const STATUSES = ['verified', 'disputed', 'unverified'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomOwnerName() {
  return `${getRandomItem(FIRST_NAMES)} ${getRandomItem(LAST_NAMES)}`;
}

/**
 * Parse CLI Arguments
 * Supports:
 *   --bbox minLat,minLng,maxLat,maxLng (or south,west,north,east)
 *   --count <number>
 *   --out <filepath>
 *   --village <name>
 *   --tehsil <name>
 *   --district <name>
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    bbox: { ...DEFAULT_BBOX },
    count: DEFAULT_BUILDING_COUNT,
    outputFile: DEFAULT_OUTPUT_FILE,
    village: DEFAULT_VILLAGE,
    tehsil: DEFAULT_TEHSIL,
    district: DEFAULT_DISTRICT,
    classification: null
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bbox' && args[i + 1]) {
      const parts = args[i + 1].split(',').map(Number);
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        config.bbox = {
          south: parts[0],
          west: parts[1],
          north: parts[2],
          east: parts[3]
        };
      }
      i++;
    } else if ((args[i] === '--count' || args[i] === '-n') && args[i + 1]) {
      const n = parseInt(args[i + 1], 10);
      if (!isNaN(n) && n > 0) config.count = n;
      i++;
    } else if ((args[i] === '--out' || args[i] === '-o') && args[i + 1]) {
      config.outputFile = args[i + 1];
      i++;
    } else if (args[i] === '--classification' && args[i + 1]) {
      config.classification = args[i + 1];
      i++;
    } else if (args[i] === '--village' && args[i + 1]) {
      config.village = args[i + 1];
      i++;
    } else if (args[i] === '--tehsil' && args[i + 1]) {
      config.tehsil = args[i + 1];
      i++;
    } else if (args[i] === '--district' && args[i + 1]) {
      config.district = args[i + 1];
      i++;
    }
  }

  return config;
}

/**
 * Query Overpass API for real building ways within bounding box
 */
async function fetchOverpassBuildings(bbox) {
  const query = `
    [out:json][timeout:30];
    (
      way["building"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    );
    out geom;
  `.trim();

  const url = 'https://overpass-api.de/api/interpreter';
  console.log(`📡 Querying Overpass API for buildings in bbox: [${bbox.south}, ${bbox.west}, ${bbox.north}, ${bbox.east}]...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'LandParcel3DDataGenerator/1.0'
    },
    body: `data=${encodeURIComponent(query)}`
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Overpass API query failed (${response.status} ${response.statusText}): ${errorText}`);
  }

  const result = await response.json();
  return result?.elements || [];
}

/**
 * Main Data Generation Runner
 */
async function run() {
  const config = parseArgs();

  console.log('='.repeat(65));
  console.log('🏗️  3D Land Parcel & Building Data Generation Script');
  console.log('='.repeat(65));

  try {
    const elements = await fetchOverpassBuildings(config.bbox);
    console.log(`✅ Fetched ${elements.length} raw elements from OpenStreetMap Overpass.`);

    // Convert and filter building ways
    const validBuildings = [];

    for (const el of elements) {
      if (el.type !== 'way' || !Array.isArray(el.geometry) || el.geometry.length < 3) {
        continue;
      }

      // Convert OSM node coordinates [ {lat, lon}, ... ] to GeoJSON [ [lon, lat], ... ]
      const ring = el.geometry.map((node) => [node.lon, node.lat]);

      // Ensure ring is closed
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([first[0], first[1]]);
      }

      // Check valid polygon
      if (ring.length < 4) continue;

      try {
        const poly = polygon([ring]);
        const calculatedArea = area(poly); // square meters

        // Filter footprint area between 50 and 2000 sqm
        if (calculatedArea >= 50 && calculatedArea <= 2000) {
          validBuildings.push({
            osmId: el.id,
            geometry: {
              type: 'Polygon',
              coordinates: [ring]
            },
            areaSqm: parseFloat(calculatedArea.toFixed(1))
          });
        }
      } catch (e) {
        // Skip invalid geometries
      }
    }

    console.log(`🔍 Filtered to ${validBuildings.length} buildings with footprint area between 50 and 2,000 m².`);

    if (validBuildings.length === 0) {
      console.warn('⚠️ No buildings found within the specified area & criteria. Try expanding the bounding box.');
      return;
    }

    // Shuffle & select N buildings
    const shuffled = [...validBuildings].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(config.count, shuffled.length));

    let totalFloorUnits = 0;
    const features = [];

    selected.forEach((bldg, bIdx) => {
      const bldgId = `BUILDING-KA-2026-${String(bIdx + 1).padStart(3, '0')}`;
      const floorCount = getRandomInt(1, 4);
      const units = [];

      const baseKhasra = getRandomInt(101, 350);
      const baseSurvey = getRandomInt(400, 890);

      for (let floor = 1; floor <= floorCount; floor++) {
        totalFloorUnits++;
        units.push({
          unit_id: `PARCEL-KA-2026-${String(bIdx + 1).padStart(3, '0')}-F${floor}`,
          khasra_number: `${baseKhasra}/${floor}`,
          survey_number: `SY-${baseSurvey}-${floor}`,
          owner_name: getRandomOwnerName(),
          classification: config.classification || getRandomItem(CLASSIFICATIONS),
          status: getRandomItem(STATUSES),
          floor_number: floor,
          is_synthetic: true
        });
      }

      features.push({
        type: 'Feature',
        geometry: bldg.geometry,
        properties: {
          building_id: bldgId,
          osm_way_id: String(bldg.osmId),
          village: config.village,
          tehsil: config.tehsil,
          district: config.district,
          floor_height_m: 3.5,
          footprint_area_sqm: bldg.areaSqm,
          units: units
        }
      });
    });

    const outputData = {
      type: 'FeatureCollection',
      metadata: {
        village: config.village,
        tehsil: config.tehsil,
        district: config.district,
        generated_at: new Date().toISOString(),
        building_count: features.length,
        source: 'OpenStreetMap (Overpass API)'
      },
      features: features
    };

    // Determine output file path
    const outputPath = path.isAbsolute(config.outputFile)
      ? config.outputFile
      : path.resolve(process.cwd(), config.outputFile);

    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');

    console.log('='.repeat(65));
    console.log('📊 Generation Summary:');
    console.log(`   • Raw OSM buildings fetched: ${elements.length}`);
    console.log(`   • Filtered (50 - 2,000 m²):    ${validBuildings.length}`);
    console.log(`   • Buildings selected:         ${features.length}`);
    console.log(`   • Total floor units created:  ${totalFloorUnits}`);
    console.log(`   • Output GeoJSON written to:  ${outputPath}`);
    console.log('='.repeat(65));
    console.log('✨ Data generation complete! You can now use this file in your 3D Map app.');

  } catch (err) {
    console.error('❌ Error during data generation:', err.message);
    process.exit(1);
  }
}

run();
