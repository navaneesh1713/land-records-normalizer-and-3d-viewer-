/**
 * auditTrailService.js — Secure Document Repository & Immutable Audit Trail (Point 15).
 * Simulates SHA-256 cryptographic hashes for tamper-evidence, actor tracking, and certificate generation.
 */

const STORAGE_KEY = 'sih_cadastre_audit_logs';

function generateSimulatedHash(dataString) {
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852${hex.slice(-4)}`;
}

export const INITIAL_AUDIT_LOGS = [
  {
    id: 'AUDIT-LOG-1049',
    timestamp: '2026-08-30T11:45:12.000Z',
    action: 'RECORD_VERIFIED',
    actor: 'Patwari K. Suresh',
    role: 'Patwari / Field Verifier',
    empId: 'KA-REV-8492',
    targetId: 'DOC-2026-KA-0891 (Survey 48/2A)',
    details: 'Corrected owner name spelling from "Rameeshh Gowwda" to "Ramesh Gowda". Approved for 3D cadastre ingestion.',
    digitalSeal: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    ipAddress: '10.24.112.44 (NIC-GoK-SecNet)',
    status: 'COMMITTED',
  },
  {
    id: 'AUDIT-LOG-1048',
    timestamp: '2026-08-30T10:15:30.000Z',
    action: 'OCR_INGESTION_FLAGGED',
    actor: 'System AI Worker (Tesseract-v5/DoTR)',
    role: 'Automated OCR Pipeline',
    empId: 'SYS-AI-ENGINE',
    targetId: 'DOC-2026-KA-0891 (Survey 48/2A)',
    details: 'Confidence score 64% on Owner Name. Routed to Human-in-the-Loop review queue.',
    digitalSeal: 'sha256:1a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
    ipAddress: '127.0.0.1 (Local Worker)',
    status: 'FLAGGED',
  },
  {
    id: 'AUDIT-LOG-1047',
    timestamp: '2026-08-30T09:30:00.000Z',
    action: 'FAR_VIOLATION_SANCTIONED',
    actor: 'Tehsildar M. Ananth',
    role: 'Revenue Officer / Tehsildar',
    empId: 'KA-REV-RO-0041',
    targetId: 'BUILDING-BLDG-B1-KADUGODI',
    details: 'Issued structural notice under KLR Act Sec 94-B for unauthorized 3rd floor construction (FAR 2.45 vs allowed 1.75).',
    digitalSeal: 'sha256:8b4f9d2e1a3c5b7d9e0f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d',
    ipAddress: '10.24.112.12 (NIC-GoK-SecNet)',
    status: 'COMMITTED',
  },
  {
    id: 'AUDIT-LOG-1046',
    timestamp: '2026-08-29T16:20:10.000Z',
    action: 'MUTATION_COMMITTED',
    actor: 'Revenue Inspector S. Naidu',
    role: 'Revenue Officer',
    empId: 'KA-REV-RI-1942',
    targetId: 'PARCEL-KAD-48-2',
    details: 'Partition of Survey 48/2 into 48/2A and 48/2B registered under Mutation Case No. M-2024-889.',
    digitalSeal: 'sha256:3c5e7a9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3c5e7b9d1f3a5c',
    ipAddress: '10.24.112.55 (NIC-GoK-SecNet)',
    status: 'COMMITTED',
  },
  {
    id: 'AUDIT-LOG-1045',
    timestamp: '2026-08-29T11:05:44.000Z',
    action: 'SVAMITVA_DRONE_SURVEY_INGEST',
    actor: 'Survey of India (SoI Team 4)',
    role: 'Admin / District Collector',
    empId: 'SOI-DRONE-2026',
    targetId: 'KADUGODI_CADASTRAL_SHEET_01',
    details: 'Batch 3D point cloud and Orthorectified Imagery (ORI) ingested with 5cm GSD accuracy.',
    digitalSeal: 'sha256:4d6f8a0b2c4e6a8c0e2a4c6e8a0c2e4a6c8e0a2c4e6a8c0e2a4c6e8a0c2e4a6c',
    ipAddress: '14.139.12.8 (SoI-Portal-Gateway)',
    status: 'COMMITTED',
  }
];

export const auditTrailService = {
  getLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  },

  logAction({ action, actor, role, empId, targetId, details, status = 'COMMITTED' }) {
    const logs = this.getLogs();
    const timestamp = new Date().toISOString();
    const logId = `AUDIT-LOG-${Date.now().toString().slice(-4)}`;
    const payload = `${timestamp}:${action}:${actor}:${targetId}:${details}`;
    const digitalSeal = generateSimulatedHash(payload);

    const newLog = {
      id: logId,
      timestamp,
      action,
      actor: actor || 'Revenue Officer',
      role: role || 'Field Officer',
      empId: empId || 'GOV-IND-2026',
      targetId,
      details,
      digitalSeal,
      ipAddress: '10.24.112.89 (GovNet-Secured)',
      status,
    };

    const updated = [newLog, ...logs];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist audit log:', e);
    }
    return updated;
  }
};
