/**
 * Reach Citizen Utilities
 * Shared helpers for device detection and coordinate resolution
 * used by ParcelSidebar, LandDatabaseDashboard, and ReachCitizenModal.
 */

/**
 * Detect if the current device is a mobile phone / tablet.
 * On mobile, clicking "Reach Citizen" directly opens Google Maps navigation.
 * On desktop/laptop, it opens the QR code modal for mobile camera scanning.
 */
export function isMobileDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  // 1. Modern Client Hints API (Chrome Android, etc.)
  if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
    if (navigator.userAgentData.mobile) return true;
  }

  // 2. User-Agent regex check for true mobile phones & tablets
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;
  if (mobileRegex.test(ua)) {
    return true;
  }

  // 3. Screen size + coarse pointer check (finger touch primary, not laptop trackpads)
  const isCoarsePointer = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth <= 768;

  return Boolean(isCoarsePointer && isSmallScreen);
}

/**
 * Smart fallback coordinate lookup based on known locality names across India.
 */
export function lookupCoordsFromUnit(unit) {
  const text = `${unit?.building_name || ''} ${unit?.locality || ''} ${unit?.village || ''} ${unit?.village_city || ''} ${unit?.district || ''} ${unit?.state || ''} ${unit?.pincode || ''}`.toLowerCase();

  // Bangalore / Kadugodi / Whitefield
  if (text.includes('kadugodi') || text.includes('whitefield') || text.includes('560067')) {
    return { lat: 12.9982, lng: 77.7607 };
  }
  // Hyderabad & surrounding IT corridors
  if (text.includes('hafeezpet') || text.includes('hafizpet')) {
    return { lat: 17.4938, lng: 78.3533 };
  }
  if (text.includes('mehdipatnam') || text.includes('500028')) {
    return { lat: 17.3916, lng: 78.4410 };
  }
  if (text.includes('kondapur')) {
    return { lat: 17.4699, lng: 78.3578 };
  }
  if (text.includes('miyapur')) {
    return { lat: 17.4968, lng: 78.3614 };
  }
  if (text.includes('gachibowli')) {
    return { lat: 17.4401, lng: 78.3489 };
  }
  if (text.includes('hitec') || text.includes('madhapur')) {
    return { lat: 17.4483, lng: 78.3808 };
  }
  if (text.includes('hyderabad') || text.includes('telangana')) {
    return { lat: 17.3850, lng: 78.4867 };
  }
  // Varanasi / UP Bhulekh seed records
  if (text.includes('shivpur') || text.includes('varanasi') || text.includes('221003')) {
    return { lat: 25.3587, lng: 82.9739 };
  }
  // Pune / Wagholi seed records
  if (text.includes('wagholi') || text.includes('pune') || text.includes('412207')) {
    return { lat: 18.5793, lng: 73.9806 };
  }
  // Bengaluru Urban general
  if (text.includes('bengaluru') || text.includes('bangalore') || text.includes('karnataka')) {
    return { lat: 12.9716, lng: 77.5946 };
  }
  // Mumbai / Maharashtra
  if (text.includes('mumbai') || text.includes('thane') || text.includes('maharashtra')) {
    return { lat: 19.0760, lng: 72.8777 };
  }
  // Delhi / NCR
  if (text.includes('delhi') || text.includes('noida') || text.includes('gurgaon')) {
    return { lat: 28.6139, lng: 77.2090 };
  }
  // Default to Kadugodi, Bengaluru (primary project dataset location)
  return { lat: 12.9982, lng: 77.7607 };
}

/**
 * Resolve the destination coordinates from a unit / cadastral record.
 * Tries: explicit lat/lng coords → GeoJSON coordinates → polygon vertices → locality lookup → default.
 */
export function resolveDestination(unit) {
  const fallback = lookupCoordsFromUnit(unit);

  let lat = null;
  let lng = null;

  if (unit?.latitude != null && !isNaN(Number(unit.latitude))) {
    lat = Number(unit.latitude);
  } else if (unit?.lat != null && !isNaN(Number(unit.lat))) {
    lat = Number(unit.lat);
  } else if (Array.isArray(unit?.polygon) && unit.polygon[0]?.[0]?.[1] != null) {
    lat = Number(unit.polygon[0][0][1]);
  } else if (Array.isArray(unit?.coordinates) && unit.coordinates[1] != null) {
    lat = Number(unit.coordinates[1]);
  }

  if (unit?.longitude != null && !isNaN(Number(unit.longitude))) {
    lng = Number(unit.longitude);
  } else if (unit?.lng != null && !isNaN(Number(unit.lng))) {
    lng = Number(unit.lng);
  } else if (Array.isArray(unit?.polygon) && unit.polygon[0]?.[0]?.[0] != null) {
    lng = Number(unit.polygon[0][0][0]);
  } else if (Array.isArray(unit?.coordinates) && unit.coordinates[0] != null) {
    lng = Number(unit.coordinates[0]);
  }

  if (lat == null || isNaN(lat)) lat = fallback.lat;
  if (lng == null || isNaN(lng)) lng = fallback.lng;

  return { lat: Number(lat), lng: Number(lng) };
}

/**
 * Build a Google Maps navigation deep-link URL for the given destination.
 * When origin is omitted, Google Maps automatically routes from the device's live GPS location!
 */
export function buildNavigationUrl(destLat, destLng, travelMode = 'driving') {
  const numLat = Number(destLat);
  const numLng = Number(destLng);
  return `https://www.google.com/maps/dir/?api=1&destination=${numLat},${numLng}&travelmode=${travelMode}`;
}

/**
 * Handle the "Reach Citizen" button click with smart device detection:
 *  - Mobile device → directly navigates to Google Maps navigation (launches Maps app)
 *  - Laptop / Desktop → displays the interactive QR Code modal to scan with mobile camera
 */
export function handleReachCitizenClick(unit, showModalFn) {
  const { lat, lng } = resolveDestination(unit);
  
  const hasExactCoords = (unit?.latitude != null || unit?.lat != null || unit?.polygon != null || unit?.coordinates != null);
  
  const addressParts = [
    unit?.building_name,
    unit?.house_number && (String(unit.house_number).toLowerCase().includes('no') ? unit.house_number : `No. ${unit.house_number}`),
    unit?.street_name,
    unit?.locality,
    unit?.village || unit?.village_city,
    unit?.tehsil && unit.tehsil !== unit.village ? `Tehsil ${unit.tehsil}` : null,
    unit?.district,
    unit?.state,
    unit?.pincode,
    'India',
  ].filter(Boolean);
  const fullAddress = addressParts.join(', ');

  const destinationQuery = hasExactCoords ? `${lat},${lng}` : encodeURIComponent(fullAddress || `${lat},${lng}`);
  const url = `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}&travelmode=driving`;

  if (isMobileDevice()) {
    // On mobile: directly open Google Maps navigation
    window.location.href = url;
  } else {
    // On laptop/desktop: show the QR code modal
    if (typeof showModalFn === 'function') {
      showModalFn();
    }
  }
}

