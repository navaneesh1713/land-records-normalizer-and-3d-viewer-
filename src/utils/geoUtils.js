/**
 * Calculate the average center [longitude, latitude] of a FeatureCollection.
 * 
 * @param {Array} features - Array of GeoJSON Polygon features
 * @returns {{ longitude: number, latitude: number, zoom: number }}
 */
export function calculateFeatureCenter(features = []) {
  if (!features || features.length === 0) {
    return { longitude: 77.5946, latitude: 12.9716, zoom: 15.5 };
  }

  let totalLng = 0;
  let totalLat = 0;
  let pointCount = 0;

  for (const feature of features) {
    const coords = feature?.geometry?.coordinates;
    if (Array.isArray(coords)) {
      // Handle Polygon or MultiPolygon
      const rings = Array.isArray(coords[0][0]) ? coords : [coords];
      for (const ring of rings) {
        for (const pt of ring) {
          if (Array.isArray(pt) && pt.length >= 2) {
            totalLng += pt[0];
            totalLat += pt[1];
            pointCount++;
          }
        }
      }
    }
  }

  if (pointCount === 0) {
    return { longitude: 77.5946, latitude: 12.9716, zoom: 15.5 };
  }

  return {
    longitude: totalLng / pointCount,
    latitude: totalLat / pointCount,
    zoom: 16
  };
}

/**
 * Format square meters to readable hectare or sq.m
 */
export function formatArea(sqm) {
  if (typeof sqm !== 'number') return 'N/A';
  if (sqm >= 10000) {
    return `${(sqm / 10000).toFixed(2)} Ha (${sqm.toLocaleString()} m²)`;
  }
  return `${sqm.toLocaleString()} m²`;
}
