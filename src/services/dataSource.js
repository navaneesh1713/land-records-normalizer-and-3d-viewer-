/**
 * Isolated Data Source module for 3D Land Parcel Map Viewer.
 * Supplies real-world SVAMITVA and Bhoomi cadastral datasets.
 */
import svamitvaCadastre from '../data/svamitva-drone-cadastre.json';
import kadugodi3Buildings from '../data/3-buildings-kadugodi.json';
import sampleParcelData from '../data/sample-parcel-data.json';

export const PRESET_DATASETS = {
  'svamitva': {
    name: 'SVAMITVA Drone Cadastre (Kadugodi)',
    data: svamitvaCadastre
  },
  'kadugodi-3': {
    name: 'Bhoomi RoR 3-Complex (Bengaluru East)',
    data: kadugodi3Buildings
  },
  'large-cadastre': {
    name: 'Full Village 8-Building Cadastre',
    data: sampleParcelData
  }
};

/**
 * Fetch default parcel GeoJSON FeatureCollection.
 * @returns {Promise<{ type: string, metadata: object, features: Array }>}
 */
export async function getParcelData() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(svamitvaCadastre);
    }, 200);
  });
}

/**
 * Synchronous accessor.
 */
export function getParcelDataSync() {
  return svamitvaCadastre;
}
