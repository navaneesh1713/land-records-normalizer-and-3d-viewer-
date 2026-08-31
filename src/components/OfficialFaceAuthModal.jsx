import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import {
  ShieldCheck, UserCheck, X, Camera, CheckCircle2,
  Scan, RefreshCw, AlertCircle, Sparkles, Lock
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { auditTrailService } from '../services/auditTrailService';

export default function OfficialFaceAuthModal({
  isOpen,
  onClose,
  onVerified,
  officialRole = 'patwari'
}) {
  const webcamRef = useRef(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('Initializing High-Security Face Biometric Engine...');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const roleLabels = {
    patwari: { title: 'Patwari / Village Field Officer', id: 'KA-REV-8492' },
    officer: { title: 'Revenue Officer (Tehsildar)', id: 'TEH-KA-092' },
    admin: { title: 'District Collector / Admin', id: 'ADM-KA-001' }
  };

  const activeOfficer = roleLabels[officialRole] || roleLabels.patwari;

  useEffect(() => {
    if (!isOpen) {
      setScanProgress(0);
      setIsSuccess(false);
      setCameraError(false);
      return;
    }

    let isMounted = true;
    let timer = null;

    // Simulate progressive facial landmark scanning
    const startScanProcess = () => {
      setScanStatus('Aligning face geometry & verifying official credentials...');
      
      let progress = 10;
      setScanProgress(progress);

      timer = setInterval(() => {
        if (!isMounted) return;
        progress += Math.floor(Math.random() * 18) + 12;
        if (progress >= 100) {
          progress = 100;
          setScanProgress(100);
          setScanStatus('Official Face Identity Match 100% Verified ✅');
          setIsSuccess(true);
          clearInterval(timer);

          auditTrailService.logAction(
            'OFFICIAL_FACE_AUTH_SUCCESS',
            'database_access',
            `AUTH-${Date.now().toString().slice(-4)}`,
            {
              role: officialRole,
              officerId: activeOfficer.id,
              biometricType: 'FACIAL_RECOGNITION',
              confidence: 99.8,
            },
            activeOfficer.title
          );

          setTimeout(() => {
            if (isMounted && onVerified) {
              onVerified();
            }
          }, 800);
        } else {
          setScanProgress(progress);
          if (progress > 30 && progress < 70) {
            setScanStatus('Scanning 128-point nodal facial matrix...');
          } else if (progress >= 70) {
            setScanStatus('Cross-verifying with National Land Registry Token...');
          }
        }
      }, 350);
    };

    const initialDelay = setTimeout(() => {
      startScanProcess();
    }, 600);

    return () => {
      isMounted = false;
      clearTimeout(initialDelay);
      if (timer) clearInterval(timer);
    };
  }, [isOpen, officialRole]);

  if (!isOpen) return null;

  return (
    <div className="gov-auth-backdrop" style={{ zIndex: 9999 }}>
      <div
        className="gov-auth-modal animate-scale-in"
        style={{
          maxWidth: '440px',
          width: '90%',
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
          overflow: 'hidden',
          border: '1px solid rgba(226, 232, 240, 0.9)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.25)'
              }}
            >
              <Lock size={18} color="#a5b4fc" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>
                Verifying Official
              </div>
              <div style={{ fontSize: 11, color: '#c7d2fe', fontWeight: 500 }}>
                Biometric Face ID Scan for Land Database Access
              </div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#ffffff'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px 20px', textAlign: 'center' }}>
          {/* Officer Tag */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#f1f5f9',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 12,
              color: '#334155',
              fontWeight: 600,
              marginBottom: 18,
              border: '1px solid #e2e8f0'
            }}
          >
            <UserCheck size={14} color="#4f46e5" />
            <span>{activeOfficer.title} ({activeOfficer.id})</span>
          </div>

          {/* Webcam Viewfinder with Reticle Overlay */}
          <div
            style={{
              position: 'relative',
              width: '260px',
              height: '260px',
              margin: '0 auto 20px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#0f172a',
              boxShadow: isSuccess
                ? '0 0 0 4px #10b981, 0 10px 25px rgba(16, 185, 129, 0.3)'
                : '0 0 0 4px #4f46e5, 0 10px 25px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            {!cameraError ? (
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: 'user', width: 300, height: 300 }}
                onUserMedia={() => setCameraReady(true)}
                onUserMediaError={() => setCameraError(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#94a3b8',
                  padding: 20
                }}
              >
                <Camera size={36} color="#64748b" style={{ marginBottom: 8 }} />
                <span style={{ fontSize: 11, textAlign: 'center' }}>
                  Camera simulated for Government SSO Sandbox
                </span>
              </div>
            )}

            {/* Scanning HUD Overlay */}
            {!isSuccess && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {/* Laser scan line */}
                <div
                  style={{
                    position: 'absolute',
                    top: `${scanProgress}%`,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: 'linear-gradient(90deg, transparent, #00f0ff, transparent)',
                    boxShadow: '0 0 12px #00f0ff',
                    transition: 'top 0.3s ease'
                  }}
                />
                <Scan size={140} color="rgba(99, 102, 241, 0.4)" strokeWidth={1} />
              </div>
            )}

            {/* Success Overlay */}
            {isSuccess && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(16, 185, 129, 0.85)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}
              >
                <CheckCircle2 size={54} color="#ffffff" className="animate-scale-in" />
                <span style={{ marginTop: 8, fontWeight: 700, fontSize: 14 }}>
                  Official Verified
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar & Status Text */}
          <div style={{ maxWidth: '300px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
              <span>Face Scan Biometrics</span>
              <span style={{ color: isSuccess ? '#10b981' : '#4f46e5' }}>{scanProgress}%</span>
            </div>
            <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
              <div
                style={{
                  width: `${scanProgress}%`,
                  height: '100%',
                  background: isSuccess ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #4f46e5, #818cf8)',
                  transition: 'width 0.3s ease',
                  borderRadius: 10
                }}
              />
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: isSuccess ? '#059669' : '#334155',
                minHeight: 20
              }}
            >
              {scanStatus}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div
          style={{
            padding: '12px 20px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            fontSize: 11,
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <ShieldCheck size={13} color="#10b981" />
          <span>Encrypted with Government DSC Hardware Security Module</span>
        </div>
      </div>
    </div>
  );
}
