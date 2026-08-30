import * as turf from '@turf/turf';

/**
 * violationDetector.js — Spatial Encroachment & FAR (Floor Area Ratio) Violation Analysis Engine.
 * 
 * Complies with Indian Municipal / Urban Development Authority bye-laws:
 *   - Model Building Bye-Laws (MBBL) 2016 / BBMP / DDA
 *   - SVAMITVA Spatial Property Verification Standards
 */

// Permissible FAR (Floor Area Ratio) by land-use classification
export const ZONING_FAR_LIMITS = {
  residential: { max_far: 2.0, max_ground_coverage: 0.65, min_setback_m: 1.5 },
  commercial: { max_far: 2.75, max_ground_coverage: 0.70, min_setback_m: 2.0 },
  industrial: { max_far: 1.50, max_ground_coverage: 0.60, min_setback_m: 3.0 },
  agricultural: { max_far: 0.50, max_ground_coverage: 0.25, min_setback_m: 4.0 },
  public: { max_far: 2.25, max_ground_coverage: 0.60, min_setback_m: 2.5 },
};

/**
 * Perform comprehensive spatial compliance analysis on all building features.
 * 
 * @param {Array<object>} features - GeoJSON Features representing buildings with floors
 * @param {object} options - Custom threshold overrides
 * @returns {object} Analysis results with per-building audits, overall statistics, and encroachment GeoJSON
 */
export function analyzeViolations(features = [], options = {}) {
  if (!Array.isArray(features) || features.length === 0) {
    return {
      summary: { total: 0, compliant: 0, violations: 0, encroached_count: 0, far_violated_count: 0 },
      audits: [],
      encroachmentFeatures: [],
    };
  }

  const audits = [];
  const encroachmentFeatures = [];
  let compliantCount = 0;
  let farViolations = 0;
  let encroachmentCount = 0;

  for (let i = 0; i < features.length; i++) {
    const feat = features[i];
    const props = feat.properties || {};
    const geom = feat.geometry;

    if (!geom || geom.type !== 'Polygon') continue;

    const plotId = props.plot_id || `PARCEL-${i + 1}`;
    const classification = (props.classification || 'residential').toLowerCase();
    const zoningRules = ZONING_FAR_LIMITS[classification] || ZONING_FAR_LIMITS.residential;

    // ── 1. Calculate Footprint & Total Built-Up Area ──
    const footprintArea = props.footprint_area_sqm || turf.area(feat);
    const floorsCount = Array.isArray(props.floors) ? props.floors.length : (props.total_floors || 1);
    const totalBuiltUpArea = footprintArea * floorsCount;

    // Sanctioned plot area (from title deed or default footprint)
    const sanctionedPlotArea = props.sanctioned_plot_area_sqm || (footprintArea * 1.15);

    // ── 2. FAR & Ground Coverage Analysis ──
    const calculatedFAR = sanctionedPlotArea > 0 ? Number((totalBuiltUpArea / sanctionedPlotArea).toFixed(2)) : 0;
    const allowedFAR = zoningRules.max_far;
    const farExcess = Number((calculatedFAR - allowedFAR).toFixed(2));
    const isFarViolated = farExcess > 0.05; // 5% tolerance threshold

    const groundCoverageRatio = sanctionedPlotArea > 0 ? Number((footprintArea / sanctionedPlotArea).toFixed(2)) : 1.0;
    const isCoverageViolated = groundCoverageRatio > (zoningRules.max_ground_coverage + 0.05);

    // ── 3. Spatial Encroachment & Neighbor Overlap Check ──
    let hasEncroachment = false;
    let encroachedAreaSqm = 0;
    let encroachedWith = [];

    // Check intersection with all other parcels
    for (let j = 0; j < features.length; j++) {
      if (i === j) continue;
      const otherFeat = features[j];
      if (!otherFeat.geometry || otherFeat.geometry.type !== 'Polygon') continue;

      try {
        const intersection = turf.intersect(turf.featureCollection([feat, otherFeat]));
        if (intersection && intersection.geometry) {
          const overlapArea = turf.area(intersection);
          if (overlapArea > 0.5) { // Ignore micro floating-point rounding (<0.5 sqm)
            hasEncroachment = true;
            encroachedAreaSqm += overlapArea;
            const otherId = otherFeat.properties?.plot_id || `PARCEL-${j + 1}`;
            encroachedWith.push({
              neighbor_id: otherId,
              overlap_sqm: Number(overlapArea.toFixed(1)),
            });

            // Add visual encroachment red overlay polygon
            encroachmentFeatures.push({
              type: 'Feature',
              geometry: intersection.geometry,
              properties: {
                source_plot: plotId,
                target_plot: otherId,
                overlap_sqm: Number(overlapArea.toFixed(1)),
                violation_type: 'boundary_overlap',
              },
            });
          }
        }
      } catch (e) {
        // Handle invalid polygon topologies gracefully
      }
    }

    // Flag synthetic or disputed properties as flagged for ground audit
    const hasDisputedStatus = Array.isArray(props.floors)
      ? props.floors.some((fl) => Array.isArray(fl.divisions) && fl.divisions.some((d) => d.status === 'disputed'))
      : false;

    // Overall violation severity
    let severity = 'compliant';
    const violationReasons = [];

    if (isFarViolated) {
      farViolations++;
      severity = farExcess > 0.5 ? 'critical' : 'warning';
      violationReasons.push(`FAR ${calculatedFAR} exceeds maximum allowed ${allowedFAR} (+${farExcess})`);
    }

    if (hasEncroachment) {
      encroachmentCount++;
      severity = 'critical';
      violationReasons.push(`Encroaches ${encroachedAreaSqm.toFixed(1)} m² on adjacent boundary`);
    }

    if (isCoverageViolated) {
      if (severity === 'compliant') severity = 'warning';
      violationReasons.push(`Ground coverage ${(groundCoverageRatio * 100).toFixed(0)}% exceeds limit ${(zoningRules.max_ground_coverage * 100).toFixed(0)}%`);
    }

    if (hasDisputedStatus) {
      if (severity === 'compliant') severity = 'warning';
      violationReasons.push('Disputed ownership status in revenue records');
    }

    if (severity === 'compliant') {
      compliantCount++;
    }

    audits.push({
      plot_id: plotId,
      feature_index: i,
      owner_name: getFeatureOwnerName(props),
      village: props.village || '—',
      classification,
      footprint_area_sqm: Number(footprintArea.toFixed(1)),
      total_builtup_sqm: Number(totalBuiltUpArea.toFixed(1)),
      sanctioned_plot_area_sqm: Number(sanctionedPlotArea.toFixed(1)),
      floors_count: floorsCount,
      calculated_far: calculatedFAR,
      allowed_far: allowedFAR,
      far_excess: farExcess,
      is_far_violated: isFarViolated,
      has_encroachment: hasEncroachment,
      encroached_area_sqm: Number(encroachedAreaSqm.toFixed(1)),
      encroached_with: encroachedWith,
      severity,
      violation_reasons: violationReasons,
    });
  }

  return {
    summary: {
      total: features.length,
      compliant: compliantCount,
      violations: features.length - compliantCount,
      encroached_count: encroachmentCount,
      far_violated_count: farViolations,
    },
    audits,
    encroachmentFeatures: {
      type: 'FeatureCollection',
      features: encroachmentFeatures,
    },
  };
}

/**
 * Helper to get primary owner name from building properties.
 */
function getFeatureOwnerName(props) {
  if (Array.isArray(props.floors) && props.floors.length > 0) {
    const divs = props.floors[0].divisions || [];
    if (divs.length > 0 && divs[0].owner_name) {
      return divs[0].owner_name;
    }
  }
  return props.owner_name || 'Owner Unassigned';
}
