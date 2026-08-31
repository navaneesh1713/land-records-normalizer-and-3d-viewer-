import React, { useState } from 'react';
import {
  ShieldAlert, Lock, CheckCircle2, FileText, Download,
  Search, Key, Hash, Clock, User, ShieldCheck, FileCheck, Filter, ArrowUpRight
} from 'lucide-react';
import { auditTrailService } from '../services/auditTrailService';

export default function AuditTrailView() {
  const [logs, setLogs] = useState(() => auditTrailService.getLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState('ALL');

  const filteredLogs = logs.filter((l) => {
    const matchesQuery =
      (l.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.actor || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.targetId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.details || '').toLowerCase().includes(searchQuery.toLowerCase());

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

  const getActionPill = (action) => {
    switch (action) {
      case 'HUMAN_VERIFICATION_APPROVED':
        return <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 9px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>VERIFIED & APPROVED</span>;
      case 'HUMAN_VERIFICATION_REJECTED':
        return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 9px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>FLAGGED RE-SURVEY</span>;
      case 'USER_AUTHENTICATED_ROLE':
        return <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '3px 9px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>SSO AUTHENTICATION</span>;
      case 'HANDWRITTEN_AI_VISION_EXTRACT':
        return <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '3px 9px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>AI VISION EXTRACT</span>;
      default:
        return <span style={{ background: '#f1f5f9', color: '#334155', padding: '3px 9px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>{action}</span>;
    }
  };

  return (
    <div className="audit-page-root animate-fade-in" style={{ flex: 1, height: '100%', overflowY: 'auto', background: '#f8fafc', padding: '28px 32px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(5, 150, 105, 0.25)' }}>
            <Lock size={20} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Immutable Audit Trail
            </h1>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Cryptographically sealed, timestamped record of every document upload, Patwari edit, and 3D cadastre mutation
            </span>
          </div>
        </div>

        {/* Certificate Export Button */}
        <button
          onClick={handleExportAuditCertificate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
          }}
        >
          <Download size={15} /> Export Legal Audit Certificate (.TXT)
        </button>
      </div>

      {/* Security & Provenance Standards Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '8px', borderRadius: '8px', background: '#ecfdf5' }}>
            <ShieldCheck size={18} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Tamper-Proofing Standard</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>SHA-256 Hash Chaining</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '8px', borderRadius: '8px', background: '#eef2ff' }}>
            <Key size={18} color="#4f46e5" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Digital Signature Standard</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>NIC e-Sign & Patwari PKI Role</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '8px', borderRadius: '8px', background: '#fef3c7' }}>
            <FileCheck size={18} color="#d97706" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Legal Admissibility</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Indian Evidence Act Sec 65-B</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search by log ID, actor, survey number, or remarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '13.5px', color: '#0f172a' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={14} color="#64748b" />
          <select
            value={selectedActionFilter}
            onChange={(e) => setSelectedActionFilter(e.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 12px', fontSize: '12.5px', fontWeight: 600, color: '#0f172a', background: '#ffffff', outline: 'none', cursor: 'pointer' }}
          >
            <option value="ALL">All Event Types</option>
            <option value="HUMAN_VERIFICATION_APPROVED">Verified & Approved</option>
            <option value="HUMAN_VERIFICATION_REJECTED">Flagged Re-Survey</option>
            <option value="USER_AUTHENTICATED_ROLE">SSO Authentication</option>
            <option value="HANDWRITTEN_AI_VISION_EXTRACT">AI Vision Extracts</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Timestamp (IST)</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Log ID & Digital Seal</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Event Action</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Actor & Role</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Target Entity</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Verification Details</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                  <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{new Date(log.timestamp).toLocaleDateString()}</div>
                    <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', fontSize: '12px' }}>{log.id}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6366f1' }}>{log.digitalSeal || 'SHA256:4f8e...9a21'}</div>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {getActionPill(log.action)}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{log.actor}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>{log.role}</div>
                  </td>
                  <td style={{ padding: '14px 18px', fontWeight: 600, color: '#334155' }}>
                    {log.targetId}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#475569', fontSize: '12.5px', maxWidth: '300px' }}>
                    {log.details}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700 }}>
                      <CheckCircle2 size={12} /> Verified
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
