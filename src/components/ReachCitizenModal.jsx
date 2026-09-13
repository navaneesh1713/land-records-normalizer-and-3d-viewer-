import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Navigation, MapPin, QrCode, ExternalLink, Copy, Check, Car, Bike, Footprints,
  Compass, ShieldCheck, User, Phone, CheckCircle2, LocateFixed, RefreshCw
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { useLanguage } from '../context/LanguageContext';
import { resolveDestination, buildNavigationUrl } from '../utils/reachCitizenUtils';

export default function ReachCitizenModal({ unit, onClose, destinationCoords }) {
  const [copied, setCopied] = useState(false);
  const [officerLocation, setOfficerLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('locating'); // 'locating' | 'ready' | 'denied'
  const [travelMode, setTravelMode] = useState('driving'); // 'driving' | 'bicycling' | 'walking'
  const [mapType, setMapType] = useState('standard'); // 'standard' | 'satellite'
  const [mapLoadError, setMapLoadError] = useState(false);
  const { t } = useLanguage();

  // Resolve coordinates using unified resolver with fallbacks
  const resolvedCoords = resolveDestination(unit);
  const destLat = destinationCoords?.lat != null && !isNaN(Number(destinationCoords.lat))
    ? Number(destinationCoords.lat)
    : resolvedCoords.lat;
  const destLng = destinationCoords?.lng != null && !isNaN(Number(destinationCoords.lng))
    ? Number(destinationCoords.lng)
    : resolvedCoords.lng;

  // Build full formatted address string for Google Maps query
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

  // Universal Google Maps Navigation deep-link URL (starts from device's live GPS, perfect for mobile scanning)
  // If we have a full address, we prefer it over fallback coordinates for Google Maps routing precision
  const hasExactCoords = (unit?.latitude != null || unit?.lat != null || unit?.polygon != null || unit?.coordinates != null);
  const destinationQuery = hasExactCoords ? `${destLat},${destLng}` : encodeURIComponent(fullAddress || `${destLat},${destLng}`);
  const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}&travelmode=${travelMode}`;

  // Direct Google Maps location view URL
  const directMapsUrl = `https://maps.google.com/?q=${destinationQuery}`;

  // OpenStreetMap embed URLs (free, no API key required)
  // Ensure strict numeric addition so strings never cause concatenation bugs
  const numLat = Number(destLat);
  const numLng = Number(destLng);
  const embedMapUrl = mapType === 'satellite'
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(numLng - 0.005).toFixed(6)},${(numLat - 0.004).toFixed(6)},${(numLng + 0.005).toFixed(6)},${(numLat + 0.004).toFixed(6)}&layer=hot&marker=${numLat},${numLng}`
    : `https://www.openstreetmap.org/export/embed.html?bbox=${(numLng - 0.005).toFixed(6)},${(numLat - 0.004).toFixed(6)},${(numLng + 0.005).toFixed(6)},${(numLat + 0.004).toFixed(6)}&layer=mapnik&marker=${numLat},${numLng}`;


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

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(navigationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const modalJSX = (
    <div
      className="reach-citizen-backdrop animate-fade-in"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100050,
        background: 'rgba(2, 6, 23, 0.84)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="reach-citizen-modal glass-panel animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 100051,
          width: '94%',
          maxWidth: '920px',
          maxHeight: '90vh',
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
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
                background: 'linear-gradient(135deg, #0052FF 0%, #06b6d4 100%)',
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
                <QrCode size={13} color="#0052FF" />
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
                      background: travelMode === mode ? '#0052FF' : 'transparent',
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
                  background: 'linear-gradient(135deg, #2563eb 0%, #0052FF 100%)',
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
                  onClick={() => { setMapType('standard'); setMapLoadError(false); }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: mapType === 'standard' ? '#0052FF' : 'transparent',
                    color: mapType === 'standard' ? '#ffffff' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t('roadmap', 'Roadmap')}
                </button>
                <button
                  onClick={() => { setMapType('satellite'); setMapLoadError(false); }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: mapType === 'satellite' ? '#0052FF' : 'transparent',
                    color: mapType === 'satellite' ? '#ffffff' : '#94a3b8',
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
              {mapLoadError ? (
                // Graceful fallback when iframe is blocked by browser/CSP
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    minHeight: '380px',
                    gap: '14px',
                    background: 'rgba(15,23,42,0.95)',
                    color: '#94a3b8',
                    textAlign: 'center',
                    padding: '24px',
                  }}
                >
                  <MapPin size={36} color="#4f46e5" />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                      Map preview blocked by browser
                    </div>
                    <div style={{ fontSize: '12px', lineHeight: 1.6 }}>
                      Your browser content policy is blocking the map embed.<br />
                      Use the <strong style={{ color: '#60a5fa' }}>Open in Google Maps</strong> button below to navigate.
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>
                    📍 GPS: {Number(destLat).toFixed(5)}° N, {Number(destLng).toFixed(5)}° E
                  </div>
                  <a
                    href={directMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 16px', background: '#2563eb', color: '#fff',
                      borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={13} />
                    View on Google Maps
                  </a>
                </div>
              ) : (
                <iframe
                  title="OpenStreetMap Location"
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: '380px' }}
                  loading="lazy"
                  allowFullScreen
                  src={embedMapUrl}
                  onError={() => setMapLoadError(true)}
                />
              )}

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
              <LocateFixed size={13} color="#0052FF" />
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

  if (typeof document !== 'undefined') {
    return createPortal(modalJSX, document.body);
  }
  return modalJSX;
}
