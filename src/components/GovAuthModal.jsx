import React, { useState } from 'react';
import {
  ShieldCheck, Key, CheckCircle2,
  Shield, X, AlertCircle
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { auditTrailService } from '../services/auditTrailService';

export default function GovAuthModal({
  onClose,
  onAuthSuccess,
}) {
  const [passcode, setPasscode] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [authError, setAuthError] = useState('');

  const handlePinSubmit = (e) => {
    e.preventDefault();
    setAuthError('');
    if (passcode === '1234') {
      completeAuthentication();
    } else {
      setAuthError('Invalid Security PIN. Default PIN is 1234.');
    }
  };

  const completeAuthentication = () => {
    setAuthenticating(true);
    setTimeout(() => {
      setAuthenticating(false);
      setAuthSuccess(true);
      storageService.setActiveRole('officer');
      auditTrailService.logAction(
        'USER_AUTHENTICATED_ROLE',
        'auth_sso',
        'Official (GovPass SSO)',
        { role: 'officer' },
        'Government Official'
      );
      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess();
        if (onClose) onClose();
      }, 700);
    }, 600);
  };

  return (
    <div className="gov-auth-backdrop">
      <div className="gov-auth-modal animate-scale-in" style={{ maxWidth: '400px' }}>
        {/* Header */}
        <div className="gov-auth-header" style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="gov-auth-brand" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="gov-seal-icon" style={{ background: '#0052FF', padding: '8px', borderRadius: '50%' }}>
              <Shield size={20} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>National Land Governance SSO</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>MeriPehchan / Digital India Cadastre Authentication</div>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          )}
        </div>

        <div style={{ padding: '20px' }}>

          {!authSuccess ? (
            <form onSubmit={handlePinSubmit} className="animate-fade-in" style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                <div style={{ background: 'rgba(0,82,255,0.08)', borderRadius: '50%', padding: 16 }}>
                  <ShieldCheck size={36} color="#0052FF" />
                </div>
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>Login as Official</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
                Enter your Government Security PIN to access the system.
              </p>
              <input
                type="password"
                placeholder="••••"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                style={{ width: '100%', padding: '14px', textAlign: 'center', fontSize: '24px', letterSpacing: '8px', border: '2px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', boxSizing: 'border-box' }}
                autoFocus
              />

              {authError && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', background: '#fef2f2',
                  border: '1px solid #fecaca', borderRadius: 8,
                  color: '#dc2626', fontSize: 12, marginBottom: 16, textAlign: 'left'
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authenticating}
                style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #0052FF 0%, #0045D8 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: 15 }}
              >
                <Key size={16} />
                {authenticating ? 'Authenticating...' : 'Authenticate & Enter'}
              </button>
              <p style={{ marginTop: 12, fontSize: 11, color: '#94a3b8' }}>Default PIN: 1234</p>
            </form>
          ) : (
            <div className="animate-scale-in" style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a' }}>Authentication Successful</h3>
              <p style={{ fontSize: '14px', color: '#64748b' }}>Redirecting to Upload...</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
