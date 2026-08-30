import React, { useState } from 'react';
import {
  ShieldCheck, UserCheck, Key, Lock, CheckCircle2,
  Building2, MapPin, Award, Fingerprint, Shield, X, ArrowRight,
  Sparkles, RefreshCw, Cpu
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { auditTrailService } from '../services/auditTrailService';

export default function GovAuthModal({
  currentRole = 'patwari',
  onSelectRole,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState(currentRole);
  const [passcode, setPasscode] = useState('');
  const [authSuccess, setAuthSuccess] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);

  const rolesConfig = [
    {
      id: 'patwari',
      title: 'Patwari / Village Field Officer',
      badge: 'Tier-1 Ground Verifier',
      icon: UserCheck,
      color: '#4f46e5',
      officerName: 'K. Suresh (Patwari ID: BLR-PAT-4029)',
      jurisdiction: 'Kadugodi & Whitefield Circle, Bengaluru East',
      dscToken: 'DSC-PAT-SHA256-4892019',
      permissions: [
        'Ingest raw Bhoomi & Bhulekh documents',
        'Field boundary GPS ground verification',
        'Resolve low-confidence OCR records (&lt; 80%)',
        'Submit human corrections to AI feedback pipeline'
      ],
      defaultPin: '1234',
    },
    {
      id: 'officer',
      title: 'Revenue Officer / Tehsildar',
      badge: 'Tier-2 Quasi-Judicial Authority',
      icon: ShieldCheck,
      color: '#d97706',
      officerName: 'M. Ananth (Tehsildar Code: TEH-KA-092)',
      jurisdiction: 'Bengaluru East Sub-Division & Taluk',
      dscToken: 'DSC-TEH-GOV-KA-9938210',
      permissions: [
        'Approve 3D Mutation & Subdivision Deeds',
        'FAR & Municipal Encroachment Dispute Adjudication',
        'Digitally sign & seal 3D Property Cards (Form 9/11)',
        'Authorize mutation entry rollbacks and legal ledger changes'
      ],
      defaultPin: '5678',
    },
    {
      id: 'admin',
      title: 'District Collector / Executive Admin',
      badge: 'Tier-3 National Cadastre SuperAdmin',
      icon: Award,
      color: '#059669',
      officerName: 'Dr. V. Rajesh, IAS (District Magistrate)',
      jurisdiction: 'State of Karnataka / National Cadastre Mesh',
      dscToken: 'DSC-IAS-GOV-IN-0019283',
      permissions: [
        'Access Executive National Cadastre Analytics',
        'PostGIS spatial database dump & master sync',
        'Fine-tune local OCR AI models from verified datasets',
        'Export legal immutable SHA-256 audit ledger certificates'
      ],
      defaultPin: '9999',
    },
  ];

  const currentConfig = rolesConfig.find(r => r.id === activeTab) || rolesConfig[0];

  const handleAuthenticate = (e) => {
    e.preventDefault();
    setAuthenticating(true);
    setTimeout(() => {
      setAuthenticating(false);
      setAuthSuccess(true);
      if (onSelectRole) {
        onSelectRole(activeTab);
      }
      storageService.setActiveRole(activeTab);
      auditTrailService.logAction({
        action: 'USER_AUTHENTICATED_ROLE',
        actor: currentConfig.officerName,
        role: currentConfig.title,
        targetId: currentConfig.dscToken,
        details: `Digital Certificate Verified (${currentConfig.badge})`,
      });
      setTimeout(() => {
        if (onClose) onClose();
      }, 700);
    }, 600);
  };

  return (
    <div className="gov-auth-backdrop">
      <div className="gov-auth-modal animate-scale-in">
        {/* Header */}
        <div className="gov-auth-header">
          <div className="gov-auth-brand">
            <div className="gov-seal-icon">
              <Shield size={20} color="#ffffff" />
            </div>
            <div>
              <div className="gov-auth-title">National Land Governance SSO</div>
              <div className="gov-auth-sub">MeriPehchan / Digital India Cadastre Authentication</div>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="auth-close-btn">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Role Tab Selector */}
        <div className="gov-role-tabs">
          {rolesConfig.map((r) => {
            const Icon = r.icon;
            const isSelected = activeTab === r.id;
            return (
              <button
                key={r.id}
                onClick={() => {
                  setActiveTab(r.id);
                  setAuthSuccess(false);
                }}
                className={`gov-role-tab ${isSelected ? 'active' : ''}`}
                style={{ borderColor: isSelected ? r.color : 'transparent' }}
              >
                <div className="tab-icon-wrap" style={{ background: isSelected ? r.color : '#f1f5f9' }}>
                  <Icon size={14} color={isSelected ? '#ffffff' : '#64748b'} />
                </div>
                <div className="tab-info">
                  <span className="tab-role-name">{r.id.toUpperCase()}</span>
                  <span className="tab-badge">{r.badge.split(' ')[0]}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Role Card Details */}
        <div className="gov-role-card">
          <div className="role-card-banner" style={{ borderLeftColor: currentConfig.color }}>
            <div className="officer-meta">
              <div className="officer-name">{currentConfig.officerName}</div>
              <div className="officer-role">{currentConfig.title}</div>
              <div className="officer-jurisdiction">
                <MapPin size={12} /> {currentConfig.jurisdiction}
              </div>
            </div>
            <div className="officer-token">
              <span className="token-label">Digital Token:</span>
              <span className="token-val">{currentConfig.dscToken}</span>
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="permissions-box">
            <div className="permissions-title">Granted Operational Clearance:</div>
            <div className="permissions-grid">
              {currentConfig.permissions.map((p, i) => (
                <div key={i} className="perm-item">
                  <CheckCircle2 size={13} color={currentConfig.color} />
                  <span dangerouslySetInnerHTML={{ __html: p }} />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Sign-In Form */}
          <form onSubmit={handleAuthenticate} className="gov-pin-form">
            <div className="pin-input-wrap">
              <Key size={14} className="pin-icon" />
              <input
                type="password"
                placeholder={`Enter Officer Security PIN (Default: ${currentConfig.defaultPin})`}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="gov-pin-field"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={authenticating}
              className="gov-auth-submit-btn"
              style={{ background: currentConfig.color }}
            >
              {authenticating ? (
                <>
                  <RefreshCw size={14} className="spinner" />
                  <span>Verifying DSC Token...</span>
                </>
              ) : authSuccess ? (
                <>
                  <CheckCircle2 size={14} />
                  <span>Authenticated!</span>
                </>
              ) : (
                <>
                  <Fingerprint size={14} />
                  <span>Authenticate & Switch Role</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
