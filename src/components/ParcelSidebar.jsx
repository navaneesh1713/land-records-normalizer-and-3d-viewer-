import React, { useState } from 'react';
import { X, User, CheckCircle2, AlertTriangle, HelpCircle, Sparkles, Building2, Layers, Copy, Check, Hash, FileDown, Loader2, QrCode, Navigation, MapPin, ShieldCheck, Fingerprint, RefreshCw, ExternalLink } from 'lucide-react';
import { formatArea } from '../utils/geoUtils';
import { CLASSIFICATION_COLORS } from '../utils/colorUtils';
import { generatePropertyCardPDF } from '../utils/pdfGenerator';
import { generateULPIN, getMaskedAadhaar, verifyAadhaarWithUIDAI } from '../utils/ulpinService';
import ReachCitizenModal from './ReachCitizenModal';
import { handleReachCitizenClick } from '../utils/reachCitizenUtils';
import { useLanguage } from '../context/LanguageContext';

export default function ParcelSidebar({ unit, onClose, metadata }) {
  const [copiedField, setCopiedField] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showReachModal, setShowReachModal] = useState(false);
  const [isVerifyingAadhaar, setIsVerifyingAadhaar] = useState(false);
  const [aadhaarState, setAadhaarState] = useState(() => ({
    isVerified: unit?.aadhaar_verified || unit?.status === 'verified',
    number: unit?.aadhaar_number || getMaskedAadhaar(unit?.owner_name || 'Citizen'),
    txnId: unit?.aadhaar_auth_txnid || (unit?.status === 'verified' ? 'UIDAI-KYC-940182' : null),
  }));
  const { t } = useLanguage();

  if (!unit) return null;

  // Derive 14-digit ULPIN (Bhu-Aadhaar)
  const ulpinNumber = unit.ulpin || generateULPIN(unit.longitude || 77.728, unit.latitude || 12.985, unit.state || 'Karnataka', unit.survey_number || unit.khasra_number || '1');
  const dilrmpStatus = unit.dilrmp_sync_status || (unit.status === 'verified' ? 'synced' : 'pending');
  const dilrmpTxnId = unit.dilrmp_txn_id || (dilrmpStatus === 'synced' ? 'DILRMP-MIS-2026-891024' : null);

  const handleVerifyAadhaar = async () => {
    try {
      setIsVerifyingAadhaar(true);
      const res = await verifyAadhaarWithUIDAI(aadhaarState.number, unit.owner_name);
      setAadhaarState({
        isVerified: true,
        number: res.maskedAadhaar,
        txnId: res.authTransactionId,
      });
    } catch (err) {
      console.error('Aadhaar verification error:', err);
    } finally {
      setIsVerifyingAadhaar(false);
    }
  };

  const classificationMeta = CLASSIFICATION_COLORS[unit.classification?.toLowerCase()] || CLASSIFICATION_COLORS.vacant;

  const handleCopy = (text, fieldName) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 1800);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPdf(true);
      await generatePropertyCardPDF(unit, metadata);
    } catch (err) {
      console.error('[PDF] Download failed:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'verified':
        return (
          <span className="status-badge status-verified">
            <CheckCircle2 size={13} />
            <span>{t('status_verified', 'Verified Record')}</span>
          </span>
        );
      case 'disputed':
        return (
          <span className="status-badge status-disputed">
            <AlertTriangle size={13} />
            <span>{t('status_disputed', 'Disputed Record')}</span>
          </span>
        );
      default:
        return (
          <span className="status-badge status-unverified">
            <HelpCircle size={13} />
            <span>{t('status_unverified', 'Unverified Record')}</span>
          </span>
        );
    }
  };

  return (
    <aside className="parcel-sidebar glass-panel animate-slide-in">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-title-group">
          <div className="sidebar-type-tag" style={{ color: classificationMeta.hex }}>
            <Layers size={14} />
            <span>{t('floor', 'Floor')} {unit.floor_number} • {classificationMeta.name}</span>
          </div>
          <h2 className="sidebar-id">{unit.unit_id || t('unit_details', 'Unit Details')}</h2>
        </div>
        <button onClick={onClose} className="sidebar-close-btn" aria-label="Close unit details">
          <X size={18} />
        </button>
      </div>

      {/* Badges strip */}
      <div className="sidebar-badges-strip" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {getStatusBadge(unit.status)}
        {unit.is_synthetic && (
          <span className="status-badge status-synthetic">
            <Sparkles size={12} />
            <span>{t('simulated_floor', 'Simulated Floor')}</span>
          </span>
        )}
        <span
          className="status-badge"
          style={{
            background: dilrmpStatus === 'synced' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: dilrmpStatus === 'synced' ? '#34d399' : '#fbbf24',
            border: `1px solid ${dilrmpStatus === 'synced' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            fontSize: '11px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '6px',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={11} className={dilrmpStatus === 'synced' ? '' : 'animate-spin-slow'} />
          <span>{dilrmpStatus === 'synced' ? 'DILRMP-MIS Synced' : 'DILRMP Sync Pending'}</span>
        </span>
      </div>

      {/* Unit Properties List */}
      <div className="sidebar-body">
        {/* National Spatial Identifier (ULPIN / Bhu-Aadhaar) */}
        <div
          className="ulpin-highlight-card"
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '14px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <ShieldCheck size={13} color="#38bdf8" />
              <span>ULPIN (Bhu-Aadhaar)</span>
            </div>
            <span style={{ fontSize: '10px', color: '#94a3b8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
              14-Digit Standard
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.12em' }}>
              {ulpinNumber}
            </span>
            <button
              onClick={() => handleCopy(ulpinNumber, 'ulpin')}
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                borderRadius: '6px',
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600,
              }}
              title="Copy 14-Digit ULPIN Code"
            >
              {copiedField === 'ulpin' ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
              <span>{copiedField === 'ulpin' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          {dilrmpTxnId && (
            <div style={{ marginTop: '8px', fontSize: '10.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>DILRMP Txn:</span>
              <code style={{ color: '#cbd5e1', fontSize: '10px' }}>{dilrmpTxnId}</code>
            </div>
          )}
        </div>

        {/* Citizen Aadhaar e-KYC Verification Card */}
        <div
          className="aadhaar-verification-card"
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: `1px solid ${aadhaarState.isVerified ? 'rgba(52, 211, 153, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: aadhaarState.isVerified ? '#34d399' : '#fbbf24', textTransform: 'uppercase' }}>
              <Fingerprint size={13} />
              <span>Aadhaar e-KYC Link</span>
            </div>
            {aadhaarState.isVerified ? (
              <span style={{ fontSize: '10px', color: '#34d399', background: 'rgba(52, 211, 153, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <CheckCircle2 size={10} /> UIDAI Certified
              </span>
            ) : (
              <span style={{ fontSize: '10px', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                Pending Verification
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.08em' }}>
                {aadhaarState.number}
              </div>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                Linked to: <strong>{unit.owner_name || 'Land Titleholder'}</strong>
              </div>
            </div>

            {!aadhaarState.isVerified ? (
              <button
                onClick={handleVerifyAadhaar}
                disabled={isVerifyingAadhaar}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: isVerifyingAadhaar ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
                }}
              >
                {isVerifyingAadhaar ? (
                  <>
                    <Loader2 size={12} className="spinner" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={12} />
                    <span>Verify e-KYC</span>
                  </>
                )}
              </button>
            ) : (
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600, display: 'block' }}>Auth OK</span>
                <span style={{ fontSize: '9px', color: '#64748b', fontFamily: 'monospace' }}>{aadhaarState.txnId || 'UIDAI-2026-OK'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="prop-section-title">{t('floor_unit_attributes', 'Floor Unit Attributes')}</div>

        <div className="prop-grid">
          {/* Owner Name */}
          <div className="prop-card full-width">
            <div className="prop-label">
              <User size={12} style={{ display: 'inline', marginRight: 4 }} />
              {t('titleholder', 'Unit Owner / Titleholder')}
            </div>
            <div className="prop-value font-medium text-slate-100">{unit.owner_name || '—'}</div>
          </div>

          {/* Floor Number */}
          <div className="prop-card">
            <div className="prop-label">{t('floor_level', 'Floor Level')}</div>
            <div className="prop-value font-mono text-indigo-300">
              {t('level', 'Level')} {unit.floor_number} (of {unit.total_floors || '—'})
            </div>
          </div>

          {/* Classification */}
          <div className="prop-card">
            <div className="prop-label">{t('classification', 'Classification')}</div>
            <div className="prop-value capitalize" style={{ color: classificationMeta.hex }}>
              {unit.classification || '—'}
            </div>
          </div>

          {/* Khasra Number */}
          <div className="prop-card">
            <div className="prop-label">{t('khasra_number', 'Khasra Number')}</div>
            <div className="prop-value-row">
              <span className="prop-value">{unit.khasra_number || '—'}</span>
              {unit.khasra_number && (
                <button
                  className="prop-copy-btn"
                  onClick={() => handleCopy(unit.khasra_number, 'khasra')}
                  title="Copy Khasra Number"
                >
                  {copiedField === 'khasra' ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                </button>
              )}
            </div>
          </div>

          {/* Survey Number */}
          <div className="prop-card">
            <div className="prop-label">{t('survey_number', 'Survey Number')}</div>
            <div className="prop-value-row">
              <span className="prop-value">{unit.survey_number || '—'}</span>
              {unit.survey_number && (
                <button
                  className="prop-copy-btn"
                  onClick={() => handleCopy(unit.survey_number, 'survey')}
                  title="Copy Survey Number"
                >
                  {copiedField === 'survey' ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                </button>
              )}
            </div>
          </div>

          {/* Parent Building / Plot ID */}
          <div className="prop-card full-width">
            <div className="prop-label">
              <Building2 size={12} style={{ display: 'inline', marginRight: 4 }} />
              {t('plot_building_id', 'Plot / Building ID')}
            </div>
            <div className="prop-value text-slate-300 font-mono text-xs">{unit.plot_id || unit.building_id || '—'}</div>
          </div>

          {/* Division Information if available */}
          {unit.division_share !== undefined && (
            <div className="prop-card full-width">
              <div className="prop-label">
                <Hash size={12} style={{ display: 'inline', marginRight: 4 }} />
                {t('floor_division_share', 'Floor Division Share')}
              </div>
              <div className="prop-value text-emerald-400 font-mono text-xs">
                Division {unit.division_index || 1} • {typeof unit.division_share === 'number' ? `${(unit.division_share * 100).toFixed(1)}% of floor` : '100%'}
              </div>
            </div>
          )}

          {/* Building Footprint Area */}
          <div className="prop-card full-width">
            <div className="prop-label">{t('building_footprint_area', 'Building Footprint Area')}</div>
            <div className="prop-value text-indigo-300 font-mono">
              {formatArea(unit.footprint_area_sqm)}
            </div>
          </div>

          {/* Location details */}
          <div className="prop-card">
            <div className="prop-label">{t('village', 'Village')}</div>
            <div className="prop-value">{unit.village || '—'}</div>
          </div>

          <div className="prop-card">
            <div className="prop-label">{t('tehsil', 'Tehsil')}</div>
            <div className="prop-value">{unit.tehsil || '—'}</div>
          </div>
        </div>

        {/* Actions: Reach Citizen & Download Property Card PDF */}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Action 1: Reach Citizen / Live GPS Navigation */}
          <button
            className="sidebar-reach-btn"
            onClick={() => handleReachCitizenClick(unit, () => setShowReachModal(true))}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '12px 14px',
              background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.2s ease',
            }}
            title="Launch field route navigation to this citizen's land parcel with QR code and Google Map"
          >
            <Navigation size={15} />
            <span>{t('reach_citizen', 'Reach Citizen')}</span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <QrCode size={11} />
              <span>{t('map_and_qr', 'MAP & QR')}</span>
            </span>
          </button>

          {/* Action 2: Generate Official Property Card PDF */}
          <button
            className="sidebar-pdf-btn"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            title="Generate SVAMITVA / RoR Land Title Certificate PDF with QR Code"
          >
            {isGeneratingPdf ? (
              <Loader2 size={15} className="spinner" />
            ) : (
              <FileDown size={15} />
            )}
            <span>{isGeneratingPdf ? t('generating_certificate', 'Generating Certificate...') : t('download_property_card', 'Download Property Card (PDF)')}</span>
            <QrCode size={13} style={{ marginLeft: 'auto', opacity: 0.8 }} />
          </button>
        </div>
      </div>

      {/* Reach Citizen Modal */}
      {showReachModal && (
        <ReachCitizenModal
          unit={unit}
          onClose={() => setShowReachModal(false)}
        />
      )}
    </aside>
  );
}
