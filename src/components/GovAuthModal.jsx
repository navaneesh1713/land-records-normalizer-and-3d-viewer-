import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck, UserCheck, Key, CheckCircle2,
  Shield, X, Fingerprint, RefreshCw, Camera
} from 'lucide-react';
import Webcam from "react-webcam";
import { storageService } from '../services/storageService';
import { auditTrailService } from '../services/auditTrailService';

const FACIAL_AUTH_KEY = 'landx3d_face_registered';

export default function GovAuthModal({
  currentRole = 'patwari',
  onSelectRole,
  onClose,
  onAuthSuccess
}) {
  const [activeTab, setActiveTab] = useState(currentRole);
  const [authStep, setAuthStep] = useState('ROLE_SELECT'); // ROLE_SELECT, PIN_ENTRY, FACE_SCAN, FACE_REGISTER
  const [passcode, setPasscode] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  
  const hasFaceRegistered = localStorage.getItem(FACIAL_AUTH_KEY) === 'true';

  const rolesConfig = [
    {
      id: 'patwari',
      title: 'Patwari / Village Field Officer',
      badge: 'Tier-1',
      icon: UserCheck,
      color: '#4f46e5',
      officerName: 'K. Suresh (Patwari ID: BLR-PAT-4029)',
      defaultPin: '1234',
    },
    {
      id: 'officer',
      title: 'Revenue Officer / Tehsildar',
      badge: 'Tier-2',
      icon: ShieldCheck,
      color: '#d97706',
      officerName: 'M. Ananth (Tehsildar Code: TEH-KA-092)',
      defaultPin: '1234',
    }
  ];

  const currentConfig = rolesConfig.find(r => r.id === activeTab) || rolesConfig[0];

  const handleRoleContinue = () => {
    if (hasFaceRegistered) {
      setAuthStep('FACE_SCAN');
    } else {
      setAuthStep('PIN_ENTRY');
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (passcode === currentConfig.defaultPin) {
      if (hasFaceRegistered) {
        // Fallback login successful
        completeAuthentication();
      } else {
        // Go to register face
        setAuthStep('FACE_REGISTER');
      }
    } else {
      alert("Invalid Security PIN");
    }
  };

  const completeAuthentication = () => {
    setAuthenticating(true);
    setTimeout(() => {
      setAuthenticating(false);
      setAuthSuccess(true);
      if (onSelectRole) onSelectRole(activeTab);
      storageService.setActiveRole(activeTab);
      auditTrailService.logAction({
        action: 'USER_AUTHENTICATED_ROLE',
        actor: currentConfig.officerName,
        role: currentConfig.title,
        details: `Digital Certificate Verified (${currentConfig.badge})`,
      });
      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess();
        if (onClose) onClose();
      }, 700);
    }, 600);
  };

  const handleFaceCapture = () => {
    // Simulate Face Scan processing
    setAuthenticating(true);
    setTimeout(() => {
      setAuthenticating(false);
      completeAuthentication();
    }, 1500);
  };

  const handleFaceRegistration = () => {
    setAuthenticating(true);
    setTimeout(() => {
      setAuthenticating(false);
      localStorage.setItem(FACIAL_AUTH_KEY, 'true');
      completeAuthentication();
    }, 2000);
  };

  return (
    <div className="gov-auth-backdrop">
      <div className="gov-auth-modal animate-scale-in" style={{ maxWidth: '400px' }}>
        {/* Header */}
        <div className="gov-auth-header" style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="gov-auth-brand" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="gov-seal-icon" style={{ background: currentConfig.color, padding: '8px', borderRadius: '50%' }}>
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
          
          {authStep === 'ROLE_SELECT' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '16px', fontSize: '14px', color: '#475569', fontWeight: 500 }}>Select your Official Role:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rolesConfig.map((r) => {
                  const Icon = r.icon;
                  const isSelected = activeTab === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setActiveTab(r.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                        border: `2px solid ${isSelected ? r.color : '#e2e8f0'}`,
                        borderRadius: '8px', background: isSelected ? '#f8fafc' : '#ffffff',
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ background: isSelected ? r.color : '#f1f5f9', padding: '10px', borderRadius: '8px' }}>
                        <Icon size={18} color={isSelected ? '#ffffff' : '#64748b'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{r.id.toUpperCase()}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{r.badge}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={handleRoleContinue}
                style={{ width: '100%', marginTop: '24px', padding: '14px', background: currentConfig.color, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Continue as {activeTab.toUpperCase()}
              </button>
            </div>
          )}

          {authStep === 'PIN_ENTRY' && (
            <form onSubmit={handlePinSubmit} className="animate-fade-in" style={{ textAlign: 'center' }}>
              <Key size={32} color={currentConfig.color} style={{ marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a' }}>Enter Security PIN</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
                {activeTab === 'patwari' ? 'Enter PATWARI Security PIN (1234)' : 'Enter Officer Security PIN (1234)'}
              </p>
              <input
                type="password"
                placeholder="****"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                style={{ width: '100%', padding: '14px', textAlign: 'center', fontSize: '24px', letterSpacing: '8px', border: '2px solid #e2e8f0', borderRadius: '8px', marginBottom: '24px', boxSizing: 'border-box' }}
                autoFocus
              />
              <button
                type="submit"
                style={{ width: '100%', padding: '14px', background: currentConfig.color, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                Authenticate & Switch Role
              </button>
            </form>
          )}

          {authStep === 'FACE_REGISTER' && (
            <div className="animate-fade-in" style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a' }}>Register Face for Future Logins</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                Look directly at the camera to store your biometric template securely in local memory.
              </p>
              <div style={{ position: 'relative', width: '100%', height: '200px', background: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
                <Webcam audio={false} width="100%" height="100%" style={{ objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, border: '4px solid rgba(79, 70, 229, 0.5)', borderRadius: '8px', zIndex: 10 }}></div>
              </div>
              <button
                onClick={handleFaceRegistration}
                disabled={authenticating}
                style={{ width: '100%', padding: '14px', background: currentConfig.color, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                {authenticating ? <><RefreshCw size={14} className="spinner" /> Scanning...</> : 'Scan & Register Face'}
              </button>
            </div>
          )}

          {authStep === 'FACE_SCAN' && (
            <div className="animate-fade-in" style={{ textAlign: 'center' }}>
              <Fingerprint size={32} color={currentConfig.color} style={{ marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a' }}>Biometric Authentication</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                Face scan is your primary preference. Please look at the camera.
              </p>
              
              <div style={{ position: 'relative', width: '100%', height: '200px', background: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
                <Webcam audio={false} width="100%" height="100%" style={{ objectFit: 'cover' }} />
                {authenticating && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(79,70,229,0.3)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '100%', height: '4px', background: '#4f46e5', position: 'absolute', top: '50%', animation: 'scanline 2s linear infinite' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleFaceCapture}
                  disabled={authenticating}
                  style={{ flex: 1, padding: '12px', background: currentConfig.color, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  {authenticating ? 'Verifying...' : 'Scan Face'}
                </button>
                <button
                  onClick={() => setAuthStep('PIN_ENTRY')}
                  disabled={authenticating}
                  style={{ padding: '12px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                >
                  Use PIN
                </button>
              </div>
            </div>
          )}

          {authSuccess && (
            <div className="animate-scale-in" style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a' }}>Authentication Successful</h3>
              <p style={{ fontSize: '14px', color: '#64748b' }}>Redirecting...</p>
            </div>
          )}

        </div>
      </div>
      <style>{`
        @keyframes scanline {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
}
