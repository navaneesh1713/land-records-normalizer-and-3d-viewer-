/**
 * Fixed classification color lookup mapping:
 * - agricultural = green
 * - residential = orange
 * - commercial = blue
 * - industrial = purple
 * - vacant = gray
 */
export const CLASSIFICATION_COLORS = {
  agricultural: {
    name: 'Agricultural',
    hex: '#22c55e',
    rgb: [34, 197, 94],
    bgClass: 'bg-emerald-500',
    borderClass: 'border-emerald-500'
  },
  residential: {
    name: 'Residential',
    hex: '#f97316',
    rgb: [249, 115, 22],
    bgClass: 'bg-orange-500',
    borderClass: 'border-orange-500'
  },
  commercial: {
    name: 'Commercial',
    hex: '#3b82f6',
    rgb: [59, 130, 246],
    bgClass: 'bg-blue-500',
    borderClass: 'border-blue-500'
  },
  industrial: {
    name: 'Industrial',
    hex: '#a855f7',
    rgb: [168, 85, 247],
    bgClass: 'bg-purple-500',
    borderClass: 'border-purple-500'
  },
  vacant: {
    name: 'Vacant',
    hex: '#94a3b8',
    rgb: [148, 163, 184],
    bgClass: 'bg-slate-400',
    borderClass: 'border-slate-400'
  }
};

/**
 * Get RGB(A) color array for deck.gl layer
 * If is_synthetic is true, reduce opacity (alpha) to visually indicate synthetic/simulated status.
 */
export function getParcelColor(classification, isSynthetic = false) {
  const normalizedKey = (classification || 'vacant').toLowerCase();
  const colorEntry = CLASSIFICATION_COLORS[normalizedKey] || CLASSIFICATION_COLORS.vacant;
  
  // Synthetic parcels receive 140 alpha (~55% opacity) + distinct styling, verified receive 230 alpha (~90%)
  const alpha = isSynthetic ? 130 : 230;
  return [...colorEntry.rgb, alpha];
}

/**
 * Calculate 3D extrusion height scaled to visual height range.
 * Normalizes between minHeight (15m) and maxHeight (120m) on screen.
 */
export function calculateParcelElevation(areaSqm, minArea = 1000, maxArea = 25000) {
  if (typeof areaSqm !== 'number' || isNaN(areaSqm)) return 20;

  const minElevation = 25;  // meters
  const maxElevation = 140; // meters

  // Non-linear sqrt scaling provides natural visual proportions across large/small parcels
  const normalized = Math.max(0, Math.min(1, (Math.sqrt(areaSqm) - Math.sqrt(minArea)) / (Math.sqrt(maxArea) - Math.sqrt(minArea))));
  
  return minElevation + normalized * (maxElevation - minElevation);
}
