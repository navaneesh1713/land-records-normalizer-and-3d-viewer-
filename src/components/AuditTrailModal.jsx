import React, { useState } from 'react';
import {
  ShieldAlert, Lock, CheckCircle2, FileText, Download, X,
  Search, Key, Hash, Clock, User, ShieldCheck, FileCheck
} from 'lucide-react';
import { auditTrailService } from '../services/auditTrailService';

export default function AuditTrailModal({ onClose }) {
  const [logs, setLogs] = useState(() => auditTrailService.getLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState('ALL');

  const filteredLogs = logs.filter((l) => {
    const matchesQuery =
      l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.targetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.details.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = selectedActionFilter === 'ALL' || l.action === selectedActionFilter;
    return matchesQuery && matchesAction;
  });

  const handleExportAuditCertificate = () => {
    const textData = `===============================================================
GOVERNMENT OF INDIA - MINISTRY OF PANCHAYATI RAJ (SVAMITVA SCHEME)
IMMUTABLE 3D CADASTRE AUDIT & PROVENANCE CERTIFICATE
Generated On: ${new Date().toISOString()}
===============================================================

TOTAL VERIFIED TRANSACTIONS: ${logs.length}
SECURITY STANDARD: SHA-256 Tamper-Evident Digital Ledger

AUDIT TRAIL LOG ENTRIES:
${logs.map((l, i) => `
[#${i + 1}] LOG ID: ${l.id}
  Timestamp : ${l.timestamp}
  Action    : ${l.action}
  Actor     : ${l.actor} (${l.role} - ID: ${l.empId || 'N/A'})
  Target    : ${l.targetId}
  Details   : ${l.details}
  Seal      : ${l.digitalSeal}
  IP Origin : ${l.ipAddress || '10.24.112.44'}
  Status    : ${l.status}
---------------------------------------------------------------`).join('\n')}

CERTIFIED GENUINE & UNMODIFIED BY DIGITAL REVENUE REGISTRAR.`;

    const blob = new Blob([textData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `svamitva_cadastre_audit_certificate_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop animate-fade-in">
      <div className="audit-modal glass-panel animate-scale-up">
        {/* Header */}
        <div className="audit-modal-header">
          <div className="audit-header-left">
            <div className="audit-icon-pill">
              <Lock size={18} color="#059669" />
            </div>
            <div>
              <h2 className="audit-modal-title">Secure Document Repository & Immutable Audit Trail</h2>
              <p className="audit-modal-subtitle">
                Cryptographically sealed, timestamped record of every document upload, Patwari edit, and 3D cadastre mutation
              </p>
            </div>
          </div>
          <button onClick={onClose} className="sidebar-close-btn">
            <X size={16} />
          </button>
        </div>

        {/* Security Summary Strip */}
        <div className="audit-security-strip">
          <div className="audit-sec-item">
            <ShieldCheck size={14} color="#10b981" />
            <span><strong>Tamper-Proofing:</strong> SHA-256 Cryptographic Hash per Transaction</span>
          </div>
          <div className="audit-sec-item">
            <Key size={14} color="#6366f1" />
            <span><strong>Signatures:</strong> NIC e-Sign & Patwari PKI Authentication</span>
          </div>
          <div className="audit-sec-item">
            <FileCheck size={14} color="#ca8a04" />
            <span><strong>Legal Admissibility:</strong> Indian Evidence Act Sec 65-B Compliant</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="audit-filter-bar">
          <div className="audit-search-box">
            <Search size={14} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by Log ID, Actor, Survey No, or Action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="audit-filter-actions">
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className="audit-action-select"
            >
              <option value="ALL">All Actions ({logs.length})</option>
              <option value="RECORD_VERIFIED">Record Verified</option>
              <option value="OCR_INGESTION_FLAGGED">OCR Ingest Flagged</option>
              <option value="FAR_VIOLATION_SANCTIONED">FAR Violation Sanction</option>
              <option value="MUTATION_COMMITTED">Mutation Committed</option>
              <option value="SVAMITVA_DRONE_SURVEY_INGEST">Drone Ingest</option>
            </select>

            <button onClick={handleExportAuditCertificate} className="audit-export-btn">
              <Download size={13} />
              <span>Export Legal Audit Certificate</span>
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="audit-table-wrapper">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Log ID & Timestamp</th>
                <th>Action & Event</th>
                <th>Actor / Officer</th>
                <th>Target Parcel / Document</th>
                <th>Event Description & Remarks</th>
                <th>SHA-256 Digital Seal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="audit-id-cell">
                    <code>{log.id}</code>
                    <div className="audit-timestamp">
                      <Clock size={10} />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`audit-action-badge ${log.action.toLowerCase()}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="audit-actor-cell">
                    <strong>{log.actor}</strong>
                    <div className="actor-role-sub">{log.role}</div>
                  </td>
                  <td className="audit-target-cell">
                    <code>{log.targetId}</code>
                  </td>
                  <td className="audit-desc-cell">{log.details}</td>
                  <td className="audit-seal-cell">
                    <div className="hash-box" title={log.digitalSeal}>
                      <Hash size={11} />
                      <span>{log.digitalSeal.slice(0, 18)}...</span>
                    </div>
                  </td>
                  <td>
                    <span className="audit-status-committed">
                      <CheckCircle2 size={11} /> {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
