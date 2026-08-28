/**
 * Single isolated Data Source module for 3D Land Parcel Map Viewer.
 * Swapping in a different JSON file or an API call later requires NO changes
 * to the map/render components.
 */
import rawParcelData from '../data/dummy-parcel-data.json';

/**
 * Fetch parcel GeoJSON FeatureCollection.
 * Can easily be swapped to an async fetch('/api/parcels') or custom URL in future.
 *
 * @returns {Promise<{ type: string, metadata: object, features: Array }>}
 */
export async function getParcelData() {
  // Simulate minimal async loading for realism & robust state management
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(rawParcelData);
    }, 250);
  });
}

/**
 * Synchronous accessor if needed.
 */
export function getParcelDataSync() {
  return rawParcelData;
}
