import React, { useState, useEffect } from 'react';
import {
  X, Navigation, MapPin, QrCode, ExternalLink, Copy, Check, Car, Bike, Footprints,
  Compass, ShieldCheck, User, Phone, CheckCircle2, LocateFixed, RefreshCw
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { useLanguage } from '../context/LanguageContext';

export default function ReachCitizenModal({ unit, onClose, destinationCoords }) {
  const [copied, setCopied] = useState(false);
  const [officerLocation, setOfficerLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('locating'); // 'locating' | 'ready' | 'denied'
  const [travelMode, setTravelMode] = useState('driving'); // 'driving' | 'bicycling' | 'walking'
  const [mapType, setMapType] = useState('m'); // 'm' (standard) | 'k' (satellite)
  const { t } = useLanguage();

  // Smart fallback lookup if coordinates are not attached directly to unit
  const lookupCoords = () => {
    const text = `${unit?.building_name || ''} ${unit?.locality || ''} ${unit?.village || ''} ${unit?.district || ''} ${unit?.pincode || ''}`.toLowerCase();
    if (text.includes('kadugodi') || text.includes('whitefield') || text.includes('560067')) {
      return { lat: 12.9982, lng: 77.7607 };
    }
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
    return null;
  };

  const resolvedFallback = lookupCoords();
  const destLat = destinationCoords?.lat || (unit?.latitude && !isNaN(unit.latitude) ? unit.latitude : null) || (unit?.polygon?.[0]?.[0]?.[1]) || resolvedFallback?.lat || 12.9982;
  const destLng = destinationCoords?.lng || (unit?.longitude && !isNaN(unit.longitude) ? unit.longitude : null) || (unit?.polygon?.[0]?.[0]?.[0]) || resolvedFallback?.lng || 77.7607;

  // Build full formatted address string for Google Maps query
  const addressParts = [
    unit?.building_name,
    unit?.house_number && (unit.house_number.toLowerCase().includes('no') ? unit.house_number : `No. ${unit.house_number}`),
    unit?.street_name,
    unit?.locality,
    unit?.village,
    unit?.tehsil && unit.tehsil !== unit.village ? `Tehsil ${unit.tehsil}` : null,
    unit?.district,
    unit?.state,
    unit?.pincode,
    'India',
  ].filter(Boolean);

  const fullAddress = addressParts.join(', ');

  // Generate universal Google Maps Navigation deep-link URL (instantly opens Google Maps App on Android & iOS)
  const navigationUrl = officerLocation
    ? `https://www.google.com/maps/dir/?api=1&origin=${officerLocation.lat},${officerLocation.lng}&destination=${destLat},${destLng}&travelmode=${travelMode}`
    : `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=${travelMode}`;

  // Direct Google Maps location view URL
  const directMapsUrl = `https://maps.google.com/?q=${destLat},${destLng}`;

  // Embedded Google Map URL
  const embedMapUrl = `https://maps.google.com/maps?q=${destLat},${destLng}&t=${mapType}&z=17&ie=UTF8&iwloc=&output=embed`;

  // Get Patwari / Revenue Officer current device location via browser Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOfficerLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocationStatus('ready');
      },
      (err) => {
        console.warn('[ReachCitizen] Geolocation denied or unavailable:', err.message);
        setLocationStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Compute straight-line / Haversine distance in kilometers
  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const distanceKm = officerLocation
    ? calculateDistanceKm(officerLocation.lat, officerLocation.lng, destLat, destLng)
    : null;

  // Estimate duration based on travel mode
  const getEstimatedDuration = (distKm, mode) => {
    if (!distKm) return null;
    const num = parseFloat(distKm);
    let speedKmh = 35; // default driving in city
    if (mode === 'bicycling') speedKmh = 16;
    if (mode === 'walking') speedKmh = 4.5;
    const hours = num / speedKmh;
    const mins = Math.max(2, Math.round(hours * 60));
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h} hr ${m} min`;
    }
    return `${mins} mins`;
  };

  const estimatedDuration = getEstimatedDuration(distanceKm, travelMode);

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(navigationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="reach-citizen-backdrop animate-fade-in" onClick={onClose}>
      <div
        className="reach-citizen-modal glass-panel animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '94%',
          maxWidth: '920px',
          maxHeight: '90vh',
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 35px rgba(99, 102, 241, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'linear-gradient(90deg, rgba(79, 70, 229, 0.15) 0%, rgba(15, 23, 42, 0) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
              }}
            >
              <Navigation size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#ffffff' }}>
                  {t('reach_citizen_title', 'Reach Citizen • Field Navigation & QR')}
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  {t('live_gps_routing', 'LIVE GPS ROUTING')}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                {unit?.khasra_number ? `${t('khasra_number', 'Khasra')}: ${unit.khasra_number} • ` : ''}{t('survey_number', 'Survey No')}: {unit?.survey_number || '—'} • {unit?.owner_name || t('registered_citizen', 'Citizen')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            title="Close navigation modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body - 2 Columns */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 320px) 1fr',
            gap: '24px',
          }}
        >
          {/* LEFT COLUMN: QR Code & Mobile Navigation Details */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: 'rgba(30, 41, 59, 0.5)',
              padding: '20px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            {/* QR Card */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: '#ffffff',
                padding: '16px',
                borderRadius: '14px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
              }}
            >
              <div style={{ padding: '6px', background: '#ffffff', borderRadius: '8px' }}>
                <QRCode
                  value={navigationUrl}
                  size={170}
                  level="M"
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                />
              </div>
              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#1e293b',
                }}
              >
                <QrCode size={13} color="#4f46e5" />
                <span>{t('scan_with_mobile', 'SCAN WITH MOBILE CAMERA')}</span>
              </div>
            </div>

            {/* Travel Mode Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('travel_mode', 'Travel Mode')}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '6px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '4px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {[
                  { mode: 'driving', label: t('drive', 'Drive'), icon: Car },
                  { mode: 'bicycling', label: t('bike', 'Bike'), icon: Bike },
                  { mode: 'walking', label: t('walk', 'Walk'), icon: Footprints },
                ].map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    onClick={() => setTravelMode(mode)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '8px 4px',
                      borderRadius: '7px',
                      border: 'none',
                      background: travelMode === mode ? '#4f46e5' : 'transparent',
                      color: travelMode === mode ? '#ffffff' : '#94a3b8',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Route Distance Stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                padding: '12px 14px',
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: '12px',
                border: '1px solid rgba(99, 102, 241, 0.2)',
              }}
            >
              <div>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>{t('est_distance', 'EST. DISTANCE')}</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                  {distanceKm ? `${distanceKm} km` : t('calculating', 'Calculating...')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>{t('est_duration', 'EST. DURATION')}</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                  {estimatedDuration || '—'}
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a
                href={navigationUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                  transition: 'all 0.2s',
                }}
              >
                <ExternalLink size={15} />
                <span>{t('open_in_google_maps', 'Open in Google Maps')}</span>
              </a>

              <button
                onClick={handleCopyLink}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                <span>{copied ? t('directions_link_copied', 'Directions Link Copied!') : t('copy_navigation_url', 'Copy Navigation URL')}</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Embedded Google Map & Citizen Profile */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Destination Citizen Summary Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'rgba(30, 41, 59, 0.6)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#818cf8',
                  }}
                >
                  <User size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                    {unit?.owner_name || t('registered_citizen', 'Registered Citizen')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {fullAddress}
                  </div>
                </div>
              </div>

              {/* Map Type Switcher */}
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  padding: '3px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <button
                  onClick={() => setMapType('m')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: mapType === 'm' ? '#4f46e5' : 'transparent',
                    color: mapType === 'm' ? '#ffffff' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t('roadmap', 'Roadmap')}
                </button>
                <button
                  onClick={() => setMapType('k')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: mapType === 'k' ? '#4f46e5' : 'transparent',
                    color: mapType === 'k' ? '#ffffff' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t('satellite', 'Satellite')}
                </button>
              </div>
            </div>

            {/* Embedded Google Map Iframe */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                flex: 1,
                minHeight: '380px',
                borderRadius: '14px',
                overflow: 'hidden',
                border: '1.5px solid rgba(99, 102, 241, 0.3)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
              }}
            >
              <iframe
                title="Google Maps Location"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '380px' }}
                loading="lazy"
                allowFullScreen
                src={embedMapUrl}
              />

              {/* Floating Coordinates Pill */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  background: 'rgba(15, 23, 42, 0.88)',
                  backdropFilter: 'blur(10px)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#38bdf8',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                }}
              >
                <MapPin size={12} color="#38bdf8" />
                <span>GPS: {Number(destLat).toFixed(5)}° N, {Number(destLng).toFixed(5)}° E</span>
              </div>
            </div>

            {/* GPS Tip Note */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                color: '#94a3b8',
                padding: '0 4px',
              }}
            >
              <LocateFixed size={13} color="#4f46e5" />
              <span>
                {locationStatus === 'ready'
                  ? t('gps_connected', 'Your live field coordinates are connected for turn-by-turn routing.')
                  : t('scan_instruction', 'Scan the QR code with your mobile camera to launch direct navigation in your phone.')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
