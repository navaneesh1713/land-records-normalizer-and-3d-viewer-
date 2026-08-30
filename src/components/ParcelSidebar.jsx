import React, { useState } from 'react';
import { X, User, CheckCircle2, AlertTriangle, HelpCircle, Sparkles, Building2, Layers, Copy, Check, Hash, FileDown, Loader2, QrCode } from 'lucide-react';
import { formatArea } from '../utils/geoUtils';
import { CLASSIFICATION_COLORS } from '../utils/colorUtils';
import { generatePropertyCardPDF } from '../utils/pdfGenerator';

export default function ParcelSidebar({ unit, onClose, metadata }) {
  const [copiedField, setCopiedField] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!unit) return null;

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
            <span>Verified Record</span>
          </span>
        );
      case 'disputed':
        return (
          <span className="status-badge status-disputed">
            <AlertTriangle size={13} />
            <span>Disputed Record</span>
          </span>
        );
      default:
        return (
          <span className="status-badge status-unverified">
            <HelpCircle size={13} />
            <span>Unverified Record</span>
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
            <span>Floor {unit.floor_number} • {classificationMeta.name}</span>
          </div>
          <h2 className="sidebar-id">{unit.unit_id || 'Unit Details'}</h2>
        </div>
        <button onClick={onClose} className="sidebar-close-btn" aria-label="Close unit details">
          <X size={18} />
        </button>
      </div>

      {/* Badges strip */}
      <div className="sidebar-badges-strip">
        {getStatusBadge(unit.status)}
        {unit.is_synthetic && (
          <span className="status-badge status-synthetic">
            <Sparkles size={12} />
            <span>Simulated Floor</span>
          </span>
        )}
      </div>

      {/* Unit Properties List */}
      <div className="sidebar-body">
        <div className="prop-section-title">Floor Unit Attributes</div>

        <div className="prop-grid">
          {/* Owner Name */}
          <div className="prop-card full-width">
            <div className="prop-label">
              <User size={12} style={{ display: 'inline', marginRight: 4 }} />
              Unit Owner / Titleholder
            </div>
            <div className="prop-value font-medium text-slate-100">{unit.owner_name || '—'}</div>
          </div>

          {/* Floor Number */}
          <div className="prop-card">
            <div className="prop-label">Floor Level</div>
            <div className="prop-value font-mono text-indigo-300">
              Level {unit.floor_number} (of {unit.total_floors || '—'})
            </div>
          </div>

          {/* Classification */}
          <div className="prop-card">
            <div className="prop-label">Classification</div>
            <div className="prop-value capitalize" style={{ color: classificationMeta.hex }}>
              {unit.classification || '—'}
            </div>
          </div>

          {/* Khasra Number */}
          <div className="prop-card">
            <div className="prop-label">Khasra Number</div>
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
            <div className="prop-label">Survey Number</div>
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
              Plot / Building ID
            </div>
            <div className="prop-value text-slate-300 font-mono text-xs">{unit.plot_id || unit.building_id || '—'}</div>
          </div>

          {/* Division Information if available */}
          {unit.division_share !== undefined && (
            <div className="prop-card full-width">
              <div className="prop-label">
                <Hash size={12} style={{ display: 'inline', marginRight: 4 }} />
                Floor Division Share
              </div>
              <div className="prop-value text-emerald-400 font-mono text-xs">
                Division {unit.division_index || 1} • {typeof unit.division_share === 'number' ? `${(unit.division_share * 100).toFixed(1)}% of floor` : '100%'}
              </div>
            </div>
          )}

          {/* Building Footprint Area */}
          <div className="prop-card full-width">
            <div className="prop-label">Building Footprint Area</div>
            <div className="prop-value text-indigo-300 font-mono">
              {formatArea(unit.footprint_area_sqm)}
            </div>
          </div>

          {/* Location details */}
          <div className="prop-card">
            <div className="prop-label">Village</div>
            <div className="prop-value">{unit.village || '—'}</div>
          </div>

          <div className="prop-card">
            <div className="prop-label">Tehsil</div>
            <div className="prop-value">{unit.tehsil || '—'}</div>
          </div>
        </div>

        {/* Action: Generate Official Property Card PDF */}
        <div style={{ marginTop: '16px' }}>
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
            <span>{isGeneratingPdf ? 'Generating Certificate...' : 'Download Property Card (PDF)'}</span>
            <QrCode size={13} style={{ marginLeft: 'auto', opacity: 0.8 }} />
          </button>
        </div>
      </div>
    </aside>
  );
}
