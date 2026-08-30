import React, { useState } from 'react';
import {
  ShieldCheck, CheckCircle2, AlertTriangle, X, Edit3, ArrowRight,
  FileText, Check, Ban, Sparkles, User, Clock, FileCheck, Layers
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
      details: `Verified & approved all extracted attributes. Remarks: ${verifierRemarks || 'Checked against land record registry.'}`,
    });

    // Update state in storage
    const updatedQueue = storageService.updateQueueItem(
      selectedItem.id,
      editingFields,
      'APPROVED',
      userRole === 'patwari' ? 'Patwari K. Suresh' : 'Revenue Officer'
    );
    setQueue(updatedQueue);

    // If caller provided callback to ingest to 3D Map
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
    if (score >= 80) return <span className="conf-badge conf-high">{score}% High</span>;
    if (score >= 60) return <span className="conf-badge conf-med">{score}% Review</span>;
    return <span className="conf-badge conf-low">{score}% Low Flag</span>;
  };

  return (
    <div className="modal-backdrop animate-fade-in">
      <div className="hitl-queue-modal glass-panel animate-scale-up">
        {/* Modal Top Bar */}
        <div className="hitl-modal-header">
          <div className="hitl-header-left">
            <div className="hitl-icon-pill">
              <ShieldCheck size={18} color="#4f46e5" />
            </div>
            <div>
              <h2 className="hitl-modal-title">Human-in-the-Loop (HITL) Verification Portal</h2>
              <p className="hitl-modal-subtitle">
                Inspect low-confidence OCR extractions side-by-side with source scans before committing to 3D Cadastre
              </p>
            </div>
          </div>
          <div className="hitl-header-right">
            <span className="queue-pending-pill">
              <Clock size={13} /> {pendingCount} Pending Review
            </span>
            <button onClick={onClose} className="sidebar-close-btn" title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="hitl-toast-alert animate-slide-in">
            <CheckCircle2 size={16} color="#16a34a" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Modal Main Content: Split Master-Detail */}
        <div className="hitl-split-container">
          {/* Left Column: Queue List */}
          <div className="hitl-queue-sidebar">
            <div className="hitl-queue-sidebar-header">
              <span>Review Queue ({queue.length})</span>
            </div>
            <div className="hitl-queue-list">
              {queue.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                const isPending = item.status === 'PENDING_REVIEW';
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className={`hitl-queue-card ${isSelected ? 'selected' : ''} ${!isPending ? 'completed' : ''}`}
                  >
                    <div className="hitl-card-top">
                      <span className="hitl-card-id">{item.id}</span>
                      {isPending ? (
                        <span className="hitl-status-badge pending">Needs Review</span>
                      ) : item.status === 'APPROVED' ? (
                        <span className="hitl-status-badge approved">Approved</span>
                      ) : (
                        <span className="hitl-status-badge rejected">Re-survey</span>
                      )}
                    </div>
                    <div className="hitl-card-sub">
                      <strong>{item.fields?.village?.value || item.village || 'Kadugodi'}</strong> · {item.fields?.survey_number?.value || item.fields?.khasra_number?.value || 'Survey 48/2'}
                    </div>
                    <div className="hitl-card-bottom">
                      <span>{item.documentType}</span>
                      {getConfidenceBadge(item.overallConfidence)}
                    </div>
                    {item.flaggedReason && isPending && (
                      <div className="hitl-card-flag-msg">
                        <AlertTriangle size={11} color="#f59e0b" />
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
            <div className="hitl-workstation">
              <div className="hitl-workstation-panes">
                {/* Left Sub-pane: Document Scan & OCR Source Preview */}
                <div className="hitl-source-pane">
                  <div className="hitl-pane-header">
                    <FileText size={14} color="#6366f1" />
                    <span>Source Document Transcript ({selectedItem.state})</span>
                  </div>
                  <div className="hitl-source-meta">
                    <div className="meta-item"><span>District:</span> <strong>{selectedItem.district}</strong></div>
                    <div className="meta-item"><span>Taluk:</span> <strong>{selectedItem.taluk}</strong></div>
                    <div className="meta-item"><span>Format:</span> <strong>{selectedItem.documentType}</strong></div>
                  </div>
                  <div className="hitl-source-text-box">
                    <pre>{selectedItem.sourceText}</pre>
                  </div>
                  <div className="hitl-ai-heuristic-note">
                    <Sparkles size={13} color="#818cf8" />
                    <span>
                      <strong>AI Extraction Note:</strong> {selectedItem.flaggedReason || 'OCR model found 1 or more uncertain tokens below 75% threshold.'}
                    </span>
                  </div>
                </div>

                {/* Right Sub-pane: Interactive Field Corrector */}
                <div className="hitl-fields-pane">
                  <div className="hitl-pane-header">
                    <Edit3 size={14} color="#10b981" />
                    <span>Editable Extracted Attributes (Field-by-Field)</span>
                  </div>

                  <div className="hitl-fields-form">
                    {Object.entries(selectedItem.fields || {}).map(([key, fieldData]) => {
                      const conf = fieldData?.confidence ?? 85;
                      const isUncertain = fieldData?.isUncertain || conf < 75;
                      const reason = fieldData?.reason;

                      return (
                        <div key={key} className={`hitl-field-group ${isUncertain ? 'uncertain-highlight' : ''}`}>
                          <div className="hitl-field-label-row">
                            <label className="hitl-field-label">
                              {key.replace(/_/g, ' ').toUpperCase()}
                            </label>
                            <div className="hitl-field-conf-indicator">
                              {getConfidenceBadge(conf)}
                            </div>
                          </div>

                          <input
                            type={key === 'area_sqm' ? 'number' : 'text'}
                            className="hitl-field-input"
                            value={editingFields[key] !== undefined ? editingFields[key] : ''}
                            onChange={(e) => handleFieldChange(key, key === 'area_sqm' ? parseFloat(e.target.value) || 0 : e.target.value)}
                            placeholder={`Enter ${key}`}
                          />

                          {isUncertain && reason && (
                            <div className="hitl-field-reason-warning">
                              <AlertTriangle size={11} color="#f59e0b" />
                              <span>{reason}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Verifier Remarks */}
                    <div className="hitl-field-group">
                      <label className="hitl-field-label">VERIFIER / PATWARI REMARKS</label>
                      <input
                        type="text"
                        className="hitl-field-input"
                        placeholder="e.g., Cross-verified with physical Village Form No. 16 register."
                        value={verifierRemarks}
                        onChange={(e) => setVerifierRemarks(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Workstation Footer Actions */}
              <div className="hitl-workstation-footer">
                <div className="hitl-footer-left">
                  <User size={13} />
                  <span>
                    Acting as: <strong>{userRole === 'patwari' ? 'Patwari (Field Verifier)' : userRole === 'officer' ? 'Revenue Officer (Tehsildar)' : 'Administrator'}</strong>
                  </span>
                </div>
                <div className="hitl-footer-right">
                  <button onClick={handleReject} className="hitl-reject-btn">
                    <Ban size={14} /> Reject / Re-survey
                  </button>
                  <button onClick={handleApprove} className="hitl-approve-btn">
                    <CheckCircle2 size={15} /> Approve & Commit to 3D Cadastre
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="hitl-empty-selection">
              <FileCheck size={48} color="#94a3b8" />
              <h3>All records in current queue are verified</h3>
              <p>Scan or upload new land revenue documents to begin another review cycle.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
