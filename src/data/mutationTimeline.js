/**
 * mutationTimeline.js — Historical Cadastral Mutation & Land Partition Timeline Data.
 * 
 * Demonstrates the 3D temporal evolution of Kadugodi Survey No. 124 / Khasra 42
 * from rural agricultural open land (2012) to converted residential layout (2018)
 * to multi-story G+2 vertical cadastre under SVAMITVA (2024).
 */

export const CADASTRAL_TIMELINE_YEARS = [2012, 2018, 2024];

export const TIMELINE_SNAPSHOTS = {
  2012: {
    year: 2012,
    title: 'Agricultural Land Title (Jamabandi Era)',
    subtitle: 'Single Unpartitioned Agricultural Parcel #124',
    revenue_scheme: 'Bhoomi RTC v1.0',
    total_area_sqm: 2150.0,
    total_owners: 1,
    primary_owner: 'Late Jagannath Sharma (Ancestral)',
    land_use: 'Agricultural (Dry Crop / Ragi)',
    mutation_entry: 'MUT-2004-9912 (Inheritance Mutation)',
    notes: 'Single open agricultural cadastre with zero multi-story structures. Surface boundary mapped with revenue chains.',
    features: [
      {
        type: 'Feature',
        properties: {
          plot_id: 'AGRI-PARCEL-124-2012',
          osm_way_id: 1042001,
          village: 'Kadugodi',
          tehsil: 'Bengaluru East',
          district: 'Bengaluru Urban',
          footprint_area_sqm: 1680.0,
          floor_height_m: 0.5,
          classification: 'agricultural',
          status: 'verified',
          floors: [
            {
              floor_number: 1,
              divisions: [
                {
                  unit_id: 'AGRI-124-MAIN',
                  owner_name: 'Late Jagannath Sharma',
                  survey_number: 'Sy. No. 124',
                  khasra_number: 'KH-124',
                  khata_number: 'KHT-0012',
                  classification: 'agricultural',
                  status: 'verified',
                  carpet_area_sqm: 1680.0,
                  division_index: 1,
                  division_share: 1.0,
                  is_synthetic: false,
                },
              ],
            },
          ],
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [77.76080, 12.99860, 0],
              [77.76185, 12.99850, 0],
              [77.76180, 12.99790, 0],
              [77.76075, 12.99800, 0],
              [77.76080, 12.99860, 0],
            ],
          ],
        },
      },
    ],
  },

  2018: {
    year: 2018,
    title: 'Land Conversion & Partition (DC Conversion)',
    subtitle: 'Subdivided into 2 Ground-Level Residential Plots',
    revenue_scheme: 'Bhoomi RTC v2.5 / BDA Layout Sanction',
    total_area_sqm: 1200.0,
    total_owners: 2,
    primary_owner: 'Ramesh Kumar Sharma & Suresh Venkatakrishnan',
    land_use: 'Residential (Ground Plinth Sanctioned)',
    mutation_entry: 'MUT-2018-4421 (Partition & Non-Agri Conversion)',
    notes: 'Land conversion sanctioned under Sec 95 KLR Act. Subdivided into independent Khasra 42/1 and 42/2.',
    features: [
      {
        type: 'Feature',
        properties: {
          plot_id: 'SVAMITVA-KA-BLR-0042-01',
          village: 'Kadugodi',
          tehsil: 'Bengaluru East',
          district: 'Bengaluru Urban',
          footprint_area_sqm: 420.5,
          floor_height_m: 3.5,
          classification: 'residential',
          status: 'verified',
          floors: [
            {
              floor_number: 1,
              divisions: [
                {
                  unit_id: 'KA-BLR-0042-01-F1-D1',
                  owner_name: 'Ramesh Kumar Sharma',
                  survey_number: 'Sy. No. 124/1',
                  khasra_number: 'KH-124-1A',
                  khata_number: 'KHT-8842',
                  classification: 'residential',
                  status: 'verified',
                  carpet_area_sqm: 420.5,
                  division_index: 1,
                  division_share: 1.0,
                  is_synthetic: false,
                },
              ],
            },
          ],
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [77.761245, 12.998412, 0],
              [77.761580, 12.998390, 0],
              [77.761550, 12.998120, 0],
              [77.761210, 12.998150, 0],
              [77.761245, 12.998412, 0],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          plot_id: 'SVAMITVA-KA-BLR-0042-02',
          village: 'Kadugodi',
          tehsil: 'Bengaluru East',
          district: 'Bengaluru Urban',
          footprint_area_sqm: 580.0,
          floor_height_m: 3.5,
          classification: 'commercial',
          status: 'verified',
          floors: [
            {
              floor_number: 1,
              divisions: [
                {
                  unit_id: 'KA-BLR-0042-02-F1-D1',
                  owner_name: 'Suresh Venkatakrishnan',
                  survey_number: 'Sy. No. 124/2',
                  khasra_number: 'KH-124-2A',
                  khata_number: 'KHT-8844',
                  classification: 'commercial',
                  status: 'verified',
                  carpet_area_sqm: 580.0,
                  division_index: 1,
                  division_share: 1.0,
                  is_synthetic: false,
                },
              ],
            },
          ],
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [77.761720, 12.998400, 0],
              [77.762080, 12.998370, 0],
              [77.762040, 12.998060, 0],
              [77.761680, 12.998090, 0],
              [77.761720, 12.998400, 0],
            ],
          ],
        },
      },
    ],
  },
};
