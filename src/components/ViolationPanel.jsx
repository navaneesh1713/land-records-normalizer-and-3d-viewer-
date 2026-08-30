import React, { useState, useMemo } from 'react';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2,
  X, Navigation, Layers, ChevronRight, Scale, MapPin, Eye, EyeOff
} from 'lucide-react';

/**
 * ViolationPanel — Interactive Encroachment & FAR Compliance Auditor.
 * 
 * Props:
 *   analysisResults - Return value of analyzeViolations()
 *   onSelectBuilding - (feature) => fly camera to building
 *   features - All GeoJSON features
 *   showEncroachmentOverlay - boolean
 *   onToggleEncroachmentOverlay - () => void
 *   onClose - () => void
 */
export default function ViolationPanel({
  analysisResults,
  onSelectBuilding,
  features = [],
  showEncroachmentOverlay,
  onToggleEncroachmentOverlay,
  onClose,
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'violations' | 'encroachments' | 'far'

  const { summary = {}, audits = [] } = analysisResults || {};

  const filteredAudits = useMemo(() => {
    if (filter === 'violations') return audits.filter((a) => a.severity !== 'compliant');
    if (filter === 'encroachments') return audits.filter((a) => a.has_encroachment);
    if (filter === 'far') return audits.filter((a) => a.is_far_violated);
    return audits;
  }, [audits, filter]);

  const handleCardClick = (audit) => {
    if (onSelectBuilding && features[audit.feature_index]) {
      onSelectBuilding(features[audit.feature_index]);
    }
  };

  return (
    <div className="violation-panel glass-panel">
      {/* Header */}
      <div className="violation-header">
        <div className="violation-title-group">
          <div className="violation-icon">
            <ShieldAlert size={16} />
          </div>
          <div>
            <div className="violation-title">Encroachment & FAR Auditor</div>
            <div className="violation-subtitle">Municipal Bye-Laws Compliance</div>
          </div>
        </div>
        <button onClick={onClose} className="sidebar-close-btn" title="Close Auditor">
          <X size={14} />
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="violation-kpi-grid">
        <div className="violation-kpi-card kpi-compliant">
          <div className="kpi-num">{summary.compliant || 0}</div>
          <div className="kpi-label">Compliant</div>
        </div>
        <div className="violation-kpi-card kpi-warning">
          <div className="kpi-num">{summary.far_violated_count || 0}</div>
          <div className="kpi-label">FAR Violations</div>
        </div>
        <div className="violation-kpi-card kpi-danger">
          <div className="kpi-num">{summary.encroached_count || 0}</div>
          <div className="kpi-label">Encroachments</div>
        </div>
      </div>

      {/* Map Overlay Toggle & Filter Tabs */}
      <div className="violation-controls-bar">
        <div className="violation-filter-tabs">
          <button
            className={`violation-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({audits.length})
          </button>
          <button
            className={`violation-tab ${filter === 'violations' ? 'active' : ''}`}
            onClick={() => setFilter('violations')}
          >
            Violations ({summary.violations || 0})
          </button>
          <button
            className={`violation-tab ${filter === 'encroachments' ? 'active' : ''}`}
            onClick={() => setFilter('encroachments')}
          >
            Encroachments ({summary.encroached_count || 0})
          </button>
          <button
            className={`violation-tab ${filter === 'far' ? 'active' : ''}`}
            onClick={() => setFilter('far')}
          >
            FAR ({summary.far_violated_count || 0})
          </button>
        </div>

        {onToggleEncroachmentOverlay && (
          <button
            className={`btn-control btn-overlay-toggle ${showEncroachmentOverlay ? 'active' : ''}`}
            onClick={onToggleEncroachmentOverlay}
            title="Toggle Red Encroachment Highlight Overlay on 3D Map"
          >
            {showEncroachmentOverlay ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>3D Overlay</span>
          </button>
        )}
      </div>

      {/* Audit List */}
      <div className="violation-list">
        {filteredAudits.length === 0 ? (
          <div className="violation-empty-state">
            <CheckCircle2 size={32} color="#16a34a" style={{ margin: '0 auto 8px' }} />
            <div>No violations found in this category</div>
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>All audited parcels satisfy municipal zoning & boundary limits.</p>
          </div>
        ) : (
          filteredAudits.map((audit) => {
            const isCompliant = audit.severity === 'compliant';
            const isCritical = audit.severity === 'critical';

            return (
              <div
                key={audit.plot_id}
                className={`violation-card ${isCritical ? 'card-critical' : isCompliant ? 'card-compliant' : 'card-warning'}`}
                onClick={() => handleCardClick(audit)}
              >
                {/* Top Row: Plot ID + Severity Badge */}
                <div className="violation-card-top">
                  <div className="violation-card-id">{audit.plot_id}</div>
                  <span className={`violation-badge badge-${audit.severity}`}>
                    {isCompliant ? (
                      <>
                        <ShieldCheck size={11} /> Compliant
                      </>
                    ) : isCritical ? (
                      <>
                        <AlertOctagon size={11} /> Critical
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={11} /> Warning
                      </>
                    )}
                  </span>
                </div>

                {/* Owner & Classification */}
                <div className="violation-card-meta">
                  <span className="violation-owner">{audit.owner_name}</span>
                  <span className="meta-dot">•</span>
                  <span className="capitalize">{audit.classification}</span>
                  <span className="meta-dot">•</span>
                  <span>{audit.floors_count} Floor{audit.floors_count > 1 ? 's' : ''}</span>
                </div>

                {/* FAR Meter */}
                <div className="violation-far-section">
                  <div className="violation-far-label-row">
                    <span className="violation-far-title">
                      <Scale size={11} /> FAR: {audit.calculated_far} <small>(Max: {audit.allowed_far})</small>
                    </span>
                    <span className={`violation-far-status ${audit.is_far_violated ? 'text-danger' : 'text-success'}`}>
                      {audit.is_far_violated ? `+${audit.far_excess} Excess` : 'Within Norms'}
                    </span>
                  </div>
                  <div className="violation-far-track">
                    <div
                      className={`violation-far-fill ${audit.is_far_violated ? 'fill-danger' : 'fill-success'}`}
                      style={{ width: `${Math.min((audit.calculated_far / (audit.allowed_far * 1.5)) * 100, 100)}%` }}
                    />
                    <div
                      className="violation-far-marker"
                      style={{ left: `${(audit.allowed_far / (audit.allowed_far * 1.5)) * 100}%` }}
                      title={`Permissible Limit: ${audit.allowed_far}`}
                    />
                  </div>
                </div>

                {/* Encroachment Specifics */}
                {audit.has_encroachment && (
                  <div className="violation-encroach-box">
                    <AlertOctagon size={12} color="#dc2626" />
                    <div>
                      <strong>{audit.encroached_area_sqm} m² boundary overlap</strong> with{' '}
                      {audit.encroached_with.map((n) => n.neighbor_id).join(', ')}
                    </div>
                  </div>
                )}

                {/* Violation Reasons */}
                {audit.violation_reasons.length > 0 && (
                  <ul className="violation-reasons-list">
                    {audit.violation_reasons.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                )}

                {/* Action button */}
                <div className="violation-card-action">
                  <span>Inspect in 3D Map</span>
                  <Navigation size={12} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
