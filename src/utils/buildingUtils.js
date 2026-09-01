/**
 * Utility to flatten multi-story building features into discrete 3D floor slices.
 * 
 * Supports target schema:
 *   building (Feature) -> floors[] -> divisions[]
 * 
 * Each division on a floor is extruded into a discrete 3D spatial slice
 * based on its floor_number, floor_height_m, and division_share.
 * 
 * Also retains backward-compatibility with flat units[] array if present.
 */

function lerpPoint(p1, p2, t) {
  return [
    p1[0] + (p2[0] - p1[0]) * t,
    p1[1] + (p2[1] - p1[1]) * t
  ];
}

/**
 * Subdivide a 2D ring for a division based on start and end ratio [0, 1].
 */
function sliceRingForDivision(baseRing, startRatio, endRatio) {
  if (startRatio <= 0 && endRatio >= 1) {
    return baseRing;
  }

  // If 4-point quadrilateral (standard OSM closed box [p0, p1, p2, p3, p0])
  if (baseRing.length === 5) {
    const [p0, p1, p2, p3] = baseRing;
    const pStartBottom = lerpPoint(p0, p1, startRatio);
    const pEndBottom = lerpPoint(p0, p1, endRatio);
    const pStartTop = lerpPoint(p3, p2, startRatio);
    const pEndTop = lerpPoint(p3, p2, endRatio);

    return [pStartBottom, pEndBottom, pEndTop, pStartTop, pStartBottom];
  }

  // Fallback for N-vertex polygon: bounding box interpolation
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const pt of baseRing) {
    if (pt[0] < minX) minX = pt[0];
    if (pt[0] > maxX) maxX = pt[0];
    if (pt[1] < minY) minY = pt[1];
    if (pt[1] > maxY) maxY = pt[1];
  }

  const spanX = maxX - minX;
  const spanY = maxY - minY;

  // Split along longest axis
  if (spanX >= spanY) {
    const splitMinX = minX + spanX * startRatio;
    const splitMaxX = minX + spanX * endRatio;
    return baseRing.map((pt) => {
      const clampedX = Math.max(splitMinX, Math.min(splitMaxX, pt[0]));
      return [clampedX, pt[1]];
    });
  } else {
    const splitMinY = minY + spanY * startRatio;
    const splitMaxY = minY + spanY * endRatio;
    return baseRing.map((pt) => {
      const clampedY = Math.max(splitMinY, Math.min(splitMaxY, pt[1]));
      return [pt[0], clampedY];
    });
  }
}

export function generateBuildingFloorSlices(features = []) {
  const slices = [];

  for (const feature of features) {
    const rawCoords = feature?.geometry?.coordinates;
    if (!rawCoords || !Array.isArray(rawCoords) || rawCoords.length === 0) continue;

    const buildingProps = feature.properties || {};
    const floorHeight = Number(buildingProps.floor_height_m) || 3.5;
    const plotId = buildingProps.plot_id || buildingProps.building_id || 'UNKNOWN-PLOT';

    // GeoJSON Polygon: coordinates = [ outerRing, ...holes ]
    // outerRing = [[lng, lat], [lng, lat], ...]
    const baseRing = Array.isArray(rawCoords[0]) && Array.isArray(rawCoords[0][0])
      ? rawCoords[0]   // standard Polygon outer ring
      : rawCoords;     // already a flat ring (edge-case safety)

    if (!baseRing || baseRing.length < 3) continue;

    // Compute 2D centroid from baseRing coordinates
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const pt of baseRing) {
      if (pt[0] < minLng) minLng = pt[0];
      if (pt[0] > maxLng) maxLng = pt[0];
      if (pt[1] < minLat) minLat = pt[1];
      if (pt[1] > maxLat) maxLat = pt[1];
    }
    const centerLng = Number(((minLng + maxLng) / 2).toFixed(6));
    const centerLat = Number(((minLat + maxLat) / 2).toFixed(6));

    // Case 1: Target Schema -> building.properties.floors[] -> floor.divisions[]
    if (Array.isArray(buildingProps.floors) && buildingProps.floors.length > 0) {
      const floors = buildingProps.floors;
      const totalFloors = floors.length;

      floors.forEach((floor, fIdx) => {
        const floorNum = Number(floor.floor_number) || (fIdx + 1);
        const baseElevation = (floorNum - 1) * floorHeight;
        const sliceThickness = Math.max(0.5, floorHeight - 0.15);

        const divisions = Array.isArray(floor.divisions) && floor.divisions.length > 0
          ? floor.divisions
          : [{
              unit_id: `${plotId}-F${floorNum}-D1`,
              division_index: 1,
              division_share: 1.0,
              classification: 'vacant',
              status: 'unverified',
              owner_name: 'Unassigned',
              is_synthetic: false
            }];

        let cumulativeShare = 0;
        divisions.forEach((div, dIdx) => {
          const divIndex = Number(div.division_index) || (dIdx + 1);
          const divShare = typeof div.division_share === 'number' ? div.division_share : (1 / divisions.length);
          const startRatio = cumulativeShare;
          const endRatio = Math.min(1, cumulativeShare + divShare);
          cumulativeShare = endRatio;

          const divRing2D = sliceRingForDivision(baseRing, startRatio, endRatio);
          const ring3D = divRing2D.map((pt) => [pt[0], pt[1], baseElevation]);

          slices.push({
            // Building / Plot level attributes
            plot_id: plotId,
            building_id: plotId,
            osm_way_id: buildingProps.osm_way_id,
            building_name: buildingProps.building_name || div.building_name || '',
            house_number: buildingProps.house_number || div.house_number || '',
            street_name: buildingProps.street_name || div.street_name || '',
            locality: buildingProps.locality || div.locality || '',
            village: buildingProps.village,
            tehsil: buildingProps.tehsil,
            district: buildingProps.district,
            state: buildingProps.state || div.state || '',
            pincode: buildingProps.pincode || div.pincode || '',
            latitude: centerLat,
            longitude: centerLng,
            floor_height_m: floorHeight,
            footprint_area_sqm: buildingProps.footprint_area_sqm,
            total_floors: totalFloors,

            // Floor level attributes
            floor_number: floorNum,
            total_divisions_on_floor: divisions.length,

            // Division leaf unit attributes
            unit_id: div.unit_id || `${plotId}-F${floorNum}-D${divIndex}`,
            khasra_number: div.khasra_number || div.survey_number || '',
            survey_number: div.survey_number || div.khasra_number || '',
            owner_name: div.owner_name,
            classification: div.classification,
            status: div.status,
            division_index: divIndex,
            division_share: divShare,
            is_synthetic: Boolean(div.is_synthetic),

            // 3D Geometry
            polygon: [ring3D],
            baseElevation,
            sliceThickness,
          });
        });
      });
      continue;
    }

    // Case 2: Legacy fallback -> building.properties.units[]
    const units = Array.isArray(buildingProps.units) ? buildingProps.units : [];
    units.forEach((unit, index) => {
      const floorNum = Number(unit.floor_number) || (index + 1);
      const baseElevation = (floorNum - 1) * floorHeight;
      const sliceThickness = Math.max(0.5, floorHeight - 0.15);
      const ring3D = baseRing.map((pt) => [pt[0], pt[1], baseElevation]);

      slices.push({
        plot_id: plotId,
        building_id: plotId,
        osm_way_id: buildingProps.osm_way_id,
        village: buildingProps.village,
        tehsil: buildingProps.tehsil,
        district: buildingProps.district,
        floor_height_m: floorHeight,
        footprint_area_sqm: buildingProps.footprint_area_sqm,
        total_floors: units.length,

        unit_id: unit.unit_id || `${plotId}-F${floorNum}`,
        khasra_number: unit.khasra_number,
        survey_number: unit.survey_number,
        owner_name: unit.owner_name,
        classification: unit.classification,
        status: unit.status,
        floor_number: floorNum,
        division_index: 1,
        division_share: 1.0,
        is_synthetic: Boolean(unit.is_synthetic),

        polygon: [ring3D],
        baseElevation,
        sliceThickness,
      });
    });
  }

  return slices;
}

