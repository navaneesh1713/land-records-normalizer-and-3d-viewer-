import React, { useState, useMemo } from 'react';
import {
  ShieldCheck, CheckCircle2, AlertTriangle, X, Edit3, ArrowRight,
  FileText, Check, Ban, Sparkles, User, Clock, FileCheck, Layers,
  Search, Shield, MapPin, Building, ChevronRight, HelpCircle, RotateCcw
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { auditTrailService } from '../services/auditTrailService';
import { aiFeedbackService } from '../services/aiFeedbackService';

export default function VerificationQueueModal({
  onClose,
  onApproveRecord,
  userRole = 'patwari'
}) {
  const [queue, setQueue] = useState(() => storageService.getReviewQueue());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(() => {
    const q = storageService.getReviewQueue();
    return q.length > 0 ? q[0] : null;
  });

  const [editingFields, setEditingFields] = useState(() => {
    const q = storageService.getReviewQueue();
    if (!q || q.length === 0) return {};
    const initialFields = {};
    Object.entries(q[0].fields || {}).forEach(([k, v]) => {
      initialFields[k] = v?.value !== undefined ? v.value : v;
    });
    return initialFields;
  });

  const [verifierRemarks, setVerifierRemarks] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const filteredQueue = useMemo(() => {
    if (!searchQuery.trim()) return queue;
    const q = searchQuery.toLowerCase();
    return queue.filter((item) => {
      const idMatch = item.id.toLowerCase().includes(q);
      const villageMatch = (item.village || item.fields?.village?.value || '').toLowerCase().includes(q);
      const stateMatch = (item.state || '').toLowerCase().includes(q);
      const surveyMatch = (item.fields?.survey_number?.value || item.fields?.khasra_number?.value || '').toLowerCase().includes(q);
      return idMatch || villageMatch || stateMatch || surveyMatch;
    });
  }, [queue, searchQuery]);

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    const fields = {};
    Object.entries(item.fields || {}).forEach(([k, v]) => {
      fields[k] = v?.value !== undefined ? v.value : v;
    });
    setEditingFields(fields);
    setVerifierRemarks('');
  };

  const handleFieldChange = (fieldKey, val) => {
    setEditingFields((prev) => ({
      ...prev,
      [fieldKey]: val,
    }));
  };

  const handleResetField = (fieldKey) => {
    if (!selectedItem?.fields?.[fieldKey]) return;
    const orig = selectedItem.fields[fieldKey]?.value ?? selectedItem.fields[fieldKey];
    setEditingFields((prev) => ({
      ...prev,
      [fieldKey]: orig,
    }));
  };

  const handleApprove = () => {
    if (!selectedItem) return;

    // Detect what changed and log to AI learning feedback service
    Object.entries(editingFields).forEach(([fieldKey, newVal]) => {
      const origVal = selectedItem.fields[fieldKey]?.value ?? selectedItem.fields[fieldKey];
      if (String(origVal).trim() !== String(newVal).trim()) {
        aiFeedbackService.logCorrection({
          documentId: selectedItem.id,
          state: selectedItem.state,
          field: fieldKey,
          extractedOcrValue: origVal,
          humanCorrectedValue: newVal,
          originalConfidence: selectedItem.fields[fieldKey]?.confidence || 60,
          verifiedBy: `${userRole === 'patwari' ? 'Patwari' : 'Revenue Officer'} (${userRole.toUpperCase()})`,
          errorCategory: selectedItem.fields[fieldKey]?.reason || 'Verifier Correction',
        });
      }
    });

    // Log to immutable Audit Trail
    auditTrailService.logAction({
      action: 'HUMAN_VERIFICATION_APPROVED',
      actor: userRole === 'patwari' ? 'Patwari K. Suresh' : 'Revenue Officer M. Ananth',
      role: userRole === 'patwari' ? 'Patwari / Field Verifier' : 'Revenue Officer',
      empId: userRole === 'patwari' ? 'KA-REV-8492' : 'KA-REV-RO-0041',
      targetId: `${selectedItem.id} (Survey ${editingFields.survey_number || editingFields.khasra_number || 'N/A'})`,
      details: `Verified & approved all extracted attributes. Remarks: ${verifierRemarks || 'Cross-verified with physical Village Form No. 16 register.'}`,
    });

    // Update state in storage
    const updatedQueue = storageService.updateQueueItem(
      selectedItem.id,
      editingFields,
      'APPROVED',
      userRole === 'patwari' ? 'Patwari K. Suresh' : 'Revenue Officer'
    );
    setQueue(updatedQueue);

    // Ingest into 3D Map
    if (onApproveRecord) {
      onApproveRecord({
        ...editingFields,
        _id: selectedItem.id,
        _verified: true,
      });
    }

    setSuccessToast(`Document ${selectedItem.id} verified & committed to 3D Cadastre!`);
    setTimeout(() => setSuccessToast(''), 4000);

    // Switch to next pending item if available
    const nextPending = updatedQueue.find(q => q.status === 'PENDING_REVIEW' && q.id !== selectedItem.id);
    if (nextPending) {
      handleSelectItem(nextPending);
    }
  };

  const handleReject = () => {
    if (!selectedItem) return;

    auditTrailService.logAction({
      action: 'HUMAN_VERIFICATION_REJECTED',
      actor: userRole === 'patwari' ? 'Patwari K. Suresh' : 'Revenue Officer M. Ananth',
      role: userRole === 'patwari' ? 'Patwari / Field Verifier' : 'Revenue Officer',
      targetId: selectedItem.id,
      details: `Rejected for physical ground re-survey. Reason: ${verifierRemarks || 'Discrepancy in source document'}`,
      status: 'REJECTED',
    });

    const updatedQueue = storageService.updateQueueItem(
      selectedItem.id,
      editingFields,
      'REJECTED_FOR_RESURVEY',
      userRole
    );
    setQueue(updatedQueue);

    setSuccessToast(`Document ${selectedItem.id} flagged for physical re-survey.`);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  const pendingCount = queue.filter(q => q.status === 'PENDING_REVIEW').length;

  const getConfidenceBadge = (confidence) => {
    const score = Number(confidence) || 0;
    if (score >= 80) return <span className="hitl-badge-high">{score}% High</span>;
    if (score >= 60) return <span className="hitl-badge-med">{score}% Review</span>;
    return <span className="hitl-badge-low">{score}% Low Flag</span>;
  };

  const presetRemarks = [
    'Cross-verified with physical Village Form No. 16 register.',
    'Corrected OCR spelling artefact in owner title.',
    'Validated joint share split against land record registry.',
    'Mortgage encumbrance cleared with local sub-registrar.'
  ];

  return (
    <div className="hitl-modal-backdrop animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="hitl-modal-wrapper animate-scale-in">
        
        {/* ─── Modal Top Bar ─── */}
        <div className="hitl-modal-topbar">
          <div className="hitl-modal-topbar-left">
            <div className="hitl-modal-icon-badge">
              <ShieldCheck size={22} color="#ffffff" />
            </div>
            <div>
              <div className="hitl-modal-headline">
                <h2 className="hitl-modal-title">Human-in-the-Loop (HITL) Verification Portal</h2>
                <span className="hitl-gov-tag">GOVTECH COMPLIANT</span>
              </div>
              <p className="hitl-modal-sub">
                Inspect low-confidence OCR extractions side-by-side with source scans before committing to 3D Cadastre
              </p>
            </div>
          </div>

          <div className="hitl-modal-topbar-right">
            <div className="hitl-pending-indicator">
              <div className="hitl-pulse-dot" />
              <span>{pendingCount} Pending Review</span>
            </div>
            <button onClick={onClose} className="hitl-close-btn" title="Close modal">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ─── Success Notification Banner ─── */}
        {successToast && (
          <div className="hitl-success-banner animate-slide-in">
            <CheckCircle2 size={16} color="#16a34a" />
            <span>{successToast}</span>
          </div>
        )}

        {/* ─── Modal Split Workspace ─── */}
        <div className="hitl-workspace-body">
          
          {/* Left Column: Master Queue List */}
          <div className="hitl-queue-pane">
            <div className="hitl-queue-header">
              <span className="hitl-queue-count-label">Review Queue ({queue.length})</span>
              <div className="hitl-queue-search-box">
                <Search size={13} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Filter by survey, village..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="hitl-queue-search-input"
                />
              </div>
            </div>

            <div className="hitl-queue-scroll-list">
              {filteredQueue.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                const isPending = item.status === 'PENDING_REVIEW';
                const isApproved = item.status === 'APPROVED';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className={`hitl-queue-item-card ${isSelected ? 'active-selected' : ''} ${!isPending ? 'item-resolved' : ''}`}
                  >
                    <div className="hitl-item-card-row1">
                      <span className="hitl-item-id">{item.id}</span>
                      {isPending ? (
                        <span className="hitl-status-pill pending">Needs Review</span>
                      ) : isApproved ? (
                        <span className="hitl-status-pill approved">Approved</span>
                      ) : (
                        <span className="hitl-status-pill rejected">Re-survey</span>
                      )}
                    </div>

                    <div className="hitl-item-location">
                      <strong>{item.fields?.village?.value || item.village || 'Kadugodi'}</strong> · {item.fields?.survey_number?.value || item.fields?.khasra_number?.value || 'Survey 48/2'}
                    </div>

                    <div className="hitl-item-card-row3">
                      <span className="hitl-doc-type-tag">{item.documentType}</span>
                      {getConfidenceBadge(item.overallConfidence)}
                    </div>

                    {item.flaggedReason && isPending && (
                      <div className="hitl-item-flag-reason">
                        <AlertTriangle size={12} color="#d97706" style={{ flexShrink: 0 }} />
                        <span>{item.flaggedReason}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Side-by-Side Review Workstation */}
          {selectedItem ? (
            <div className="hitl-detail-workstation">
              
              {/* Split Sub-Panes */}
              <div className="hitl-panes-grid">
                
                {/* Pane 1: Source Document Transcript */}
                <div className="hitl-source-document-pane">
                  <div className="hitl-subpane-header">
                    <div className="hitl-subpane-title">
                      <FileText size={15} color="#4f46e5" />
                      <span>Source Document Transcript</span>
                    </div>
                    <span className="hitl-state-pill">{selectedItem.state}</span>
                  </div>

                  {/* Metadata Bar */}
                  <div className="hitl-source-meta-bar">
                    <div className="hitl-meta-pill">
                      <span>District:</span> <strong>{selectedItem.district}</strong>
                    </div>
                    <div className="hitl-meta-pill">
                      <span>Taluk:</span> <strong>{selectedItem.taluk}</strong>
                    </div>
                    <div className="hitl-meta-pill">
                      <span>Format:</span> <strong>{selectedItem.documentType}</strong>
                    </div>
                  </div>

                  {/* Realistic Document Paper View */}
                  <div className="hitl-document-paper-box">
                    <div className="hitl-paper-header">
                      <span className="hitl-paper-seal">🏛️ OFFICIAL LAND RECORD EXTRACT</span>
                      <span className="hitl-paper-timestamp">OCR Ingested</span>
                    </div>
                    <pre className="hitl-paper-content">{selectedItem.sourceText}</pre>
                  </div>

                  {/* AI Extraction Warning Callout */}
                  <div className="hitl-ai-callout-box">
                    <Sparkles size={16} color="#6366f1" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div className="hitl-ai-callout-title">AI Extraction Note</div>
                      <div className="hitl-ai-callout-msg">
                        {selectedItem.flaggedReason || 'Uncertain Owner Name spelling requiring Patwari verification'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pane 2: Interactive Field-by-Field Editor */}
                <div className="hitl-attributes-editor-pane">
                  <div className="hitl-subpane-header">
                    <div className="hitl-subpane-title">
                      <Edit3 size={15} color="#10b981" />
                      <span>Editable Extracted Attributes (Field-by-Field)</span>
                    </div>
                  </div>

                  <div className="hitl-fields-scroll-container">
                    {Object.entries(selectedItem.fields || {}).map(([key, fieldData]) => {
                      const conf = fieldData?.confidence ?? 85;
                      const isUncertain = fieldData?.isUncertain || conf < 75;
                      const reason = fieldData?.reason;
                      const origVal = fieldData?.value ?? fieldData;
                      const currentVal = editingFields[key] !== undefined ? editingFields[key] : '';
                      const isModified = String(origVal).trim() !== String(currentVal).trim();

                      return (
                        <div
                          key={key}
                          className={`hitl-field-card ${isUncertain ? 'field-uncertain' : ''} ${isModified ? 'field-modified' : ''}`}
                        >
                          <div className="hitl-field-card-header">
                            <label className="hitl-field-name">
                              {key.replace(/_/g, ' ').toUpperCase()}
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {isModified && (
                                <button
                                  type="button"
                                  onClick={() => handleResetField(key)}
                                  className="hitl-field-reset-btn"
                                  title="Reset to original OCR value"
                                >
                                  <RotateCcw size={11} /> Reset
                                </button>
                              )}
                              {getConfidenceBadge(conf)}
                            </div>
                          </div>

                          <div className="hitl-field-input-wrapper">
                            <input
                              type={key === 'area_sqm' ? 'number' : 'text'}
                              className="hitl-input-control"
                              value={currentVal}
                              onChange={(e) => handleFieldChange(key, key === 'area_sqm' ? parseFloat(e.target.value) || 0 : e.target.value)}
                              placeholder={`Enter ${key}`}
                            />
                          </div>

                          {isUncertain && reason && (
                            <div className="hitl-field-warning-row">
                              <AlertTriangle size={12} color="#d97706" style={{ flexShrink: 0 }} />
                              <span>{reason}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Verifier Remarks Block */}
                    <div className="hitl-remarks-block">
                      <label className="hitl-field-name">VERIFIER / PATWARI REMARKS</label>
                      <input
                        type="text"
                        className="hitl-input-control"
                        placeholder="e.g., Cross-verified with physical Village Form No. 16 register."
                        value={verifierRemarks}
                        onChange={(e) => setVerifierRemarks(e.target.value)}
                      />
                      {/* Preset Chips */}
                      <div className="hitl-remarks-chips">
                        {presetRemarks.map((chip, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setVerifierRemarks(chip)}
                            className="hitl-chip-btn"
                          >
                            + {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* ─── Workstation Bottom Action Bar ─── */}
              <div className="hitl-workstation-bottom-bar">
                <div className="hitl-bottom-actor-info">
                  <div className="hitl-actor-avatar">
                    <User size={14} color="#4f46e5" />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Acting as: </span>
                    <strong style={{ fontSize: '12px', color: '#0f172a' }}>
                      {userRole === 'patwari' ? 'Patwari (Field Verifier)' : userRole === 'officer' ? 'Revenue Officer (Tehsildar)' : 'Administrator'}
                    </strong>
                  </div>
                </div>

                <div className="hitl-bottom-action-buttons">
                  <button onClick={handleReject} className="hitl-btn-reject">
                    <Ban size={15} /> Reject / Re-survey
                  </button>
                  <button onClick={handleApprove} className="hitl-btn-approve">
                    <CheckCircle2 size={16} /> Approve & Commit to 3D Cadastre
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="hitl-empty-state">
              <FileCheck size={56} color="#94a3b8" />
              <h3>All Queue Records Verified</h3>
              <p>No low-confidence records currently require inspection.</p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
