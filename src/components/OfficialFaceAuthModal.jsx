import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import {
  ShieldCheck, UserCheck, X, Camera, CheckCircle2,
  Scan, RefreshCw, AlertCircle, Sparkles, Lock, ShieldAlert, Key, UserX
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { auditTrailService } from '../services/auditTrailService';
import { biometricFaceService } from '../services/biometricFaceService';

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
  const [authStatus, setAuthStatus] = useState('SCANNING'); // SCANNING, SUCCESS, MISMATCH, NO_ENROLLMENT, ENROLLING
  const [similarityScore, setSimilarityScore] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [enrollingPin, setEnrollingPin] = useState('');
  const [enrollingStep, setEnrollingStep] = useState('PIN'); // PIN, CAPTURE

  const roleLabels = {
    patwari: { title: 'Patwari / Village Field Officer', id: 'KA-REV-8492', defaultName: 'K. Suresh (Patwari ID: BLR-PAT-4029)' },
    officer: { title: 'Revenue Officer (Tehsildar)', id: 'TEH-KA-092', defaultName: 'M. Ananth (Tehsildar Code: TEH-KA-092)' },
    admin: { title: 'District Collector / Admin', id: 'ADM-KA-001', defaultName: 'District Collector Admin' }
  };

  const activeOfficer = roleLabels[officialRole] || roleLabels.patwari;

  const startVerificationProcess = async () => {
    setScanProgress(10);
    setScanStatus('Verifying registered biometric profile...');
    setErrorMessage('');

    const registeredProfile = biometricFaceService.getRegisteredOfficerFace();
    if (!registeredProfile || !registeredProfile.features) {
      setAuthStatus('NO_ENROLLMENT');
      setScanStatus('No Registered Biometric Face Found');
      return;
    }

    setAuthStatus('SCANNING');
    setScanProgress(30);
    setScanStatus('Scanning 128-point nodal facial matrix...');

    // Short progressive scan delay
    setTimeout(async () => {
      try {
        const liveScreenshot = webcamRef.current?.getScreenshot();
        if (!liveScreenshot) {
          if (cameraError) {
            setAuthStatus('MISMATCH');
            setErrorMessage('Camera feed unavailable for biometric verification.');
            return;
          }
        }

        setScanProgress(75);
        setScanStatus('Running Multimodal Face Recognition & 16-Block LBP Analysis...');

        const comparison = await biometricFaceService.compareLiveWithRegistered(liveScreenshot, registeredProfile);
        setSimilarityScore(comparison.similarity);

        setTimeout(() => {
          if (comparison.match) {
            setScanProgress(100);
            setScanStatus(`Official Face Match Verified (${comparison.similarity}% similarity) ✅`);
            setAuthStatus('SUCCESS');

            auditTrailService.logAction(
              'OFFICIAL_FACE_AUTH_SUCCESS',
              'database_access',
              `AUTH-${Date.now().toString().slice(-4)}`,
              {
                role: officialRole,
                officerName: registeredProfile.officerName,
                similarity: comparison.similarity,
                engine: comparison.engine,
                biometricType: 'FACIAL_RECOGNITION_VERIFIED'
              },
              activeOfficer.title
            );

            setTimeout(() => {
              if (onVerified) onVerified();
            }, 750);
          } else {
            setScanProgress(100);
            setAuthStatus('MISMATCH');
            setErrorMessage('Unauthorized Access: Face does not match the registered Patwari/Officer profile.');
            setScanStatus('Unauthorized Access ❌');

            auditTrailService.logAction(
              'OFFICIAL_FACE_AUTH_BLOCKED',
              'database_access',
              `UNAUTHORIZED-${Date.now().toString().slice(-4)}`,
              {
                role: officialRole,
                similarity: comparison.similarity,
                reason: 'Unauthorized Access',
                engine: comparison.engine
              },
              'Unauthorized Person Detected'
            );
          }
        }, 400);

      } catch (err) {
        console.error('Biometric verification error:', err);
        setAuthStatus('MISMATCH');
        setErrorMessage('Failed to process facial biometrics. Please retry.');
      }
    }, 800);
  };

  useEffect(() => {
    if (!isOpen) {
      setScanProgress(0);
      setAuthStatus('SCANNING');
      setCameraError(false);
      setErrorMessage('');
      setEnrollingStep('PIN');
      setEnrollingPin('');
      return;
    }

    const timer = setTimeout(() => {
      startVerificationProcess();
    }, 500);

    return () => clearTimeout(timer);
  }, [isOpen, officialRole]);

  const handleEnrollPinSubmit = (e) => {
    e.preventDefault();
    if (enrollingPin === '1234') {
      setEnrollingStep('CAPTURE');
    } else {
      setErrorMessage('Invalid Master Security PIN. (Default PIN: 1234)');
    }
  };

  const handleCaptureAndEnroll = async () => {
    try {
      const screenshot = webcamRef.current?.getScreenshot();
      if (!screenshot) {
        setErrorMessage('Unable to capture camera frame. Please allow camera permissions.');
        return;
      }

      await biometricFaceService.registerOfficerFace(
        officialRole,
        activeOfficer.defaultName,
        screenshot
      );

      auditTrailService.logAction(
        'OFFICER_FACE_BIOMETRIC_ENROLLED',
        'auth_sso',
        activeOfficer.defaultName,
        { role: officialRole },
        activeOfficer.title
      );

      setEnrollingStep('PIN');
      setEnrollingPin('');
      startVerificationProcess();
    } catch (err) {
      setErrorMessage('Failed to enroll biometric face profile.');
    }
  };

  if (!isOpen) return null;

  const registeredOfficer = biometricFaceService.getRegisteredOfficerFace();

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
            background: authStatus === 'MISMATCH'
              ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)'
              : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'background 0.3s ease'
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
              {authStatus === 'MISMATCH' ? (
                <ShieldAlert size={18} color="#fca5a5" />
              ) : (
                <Lock size={18} color="#a5b4fc" />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>
                {authStatus === 'MISMATCH' ? 'Unauthorized Access' : 'Verifying Official Face ID'}
              </div>
              <div style={{ fontSize: 11, color: authStatus === 'MISMATCH' ? '#fecaca' : '#c7d2fe', fontWeight: 500 }}>
                Restricted Government Land Cadastre Database
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
              marginBottom: 16,
              border: '1px solid #e2e8f0'
            }}
          >
            <UserCheck size={14} color="#4f46e5" />
            <span>
              {registeredOfficer?.officerName || `${activeOfficer.title} (${activeOfficer.id})`}
            </span>
          </div>

          {/* NO ENROLLMENT STATE */}
          {authStatus === 'NO_ENROLLMENT' && (
            <div className="animate-fade-in" style={{ padding: '10px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '2px solid #bfdbfe' }}>
                <UserX size={28} color="#2563eb" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                No Enrolled Biometric Face Found
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 20 }}>
                The Government Cadastre Database is strictly restricted to verified officials. You must enroll your biometric face template to verify your identity.
              </p>
              
              <button
                onClick={() => setAuthStatus('ENROLLING')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
                }}
              >
                <Key size={16} /> Enroll Official Face Profile
              </button>
            </div>
          )}

          {/* ENROLLING MODAL STATE */}
          {authStatus === 'ENROLLING' && (
            <div className="animate-fade-in" style={{ padding: '6px 0' }}>
              {enrollingStep === 'PIN' ? (
                <form onSubmit={handleEnrollPinSubmit}>
                  <Key size={32} color="#4f46e5" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>
                    Enter Master Officer PIN
                  </h4>
                  
                  {errorMessage && (
                    <div style={{ color: '#dc2626', fontSize: 12, background: '#fef2f2', padding: '6px 10px', borderRadius: 6, marginBottom: 12 }}>
                      {errorMessage}
                    </div>
                  )}

                  <input
                    type="password"
                    placeholder="****"
                    value={enrollingPin}
                    onChange={(e) => setEnrollingPin(e.target.value)}
                    style={{ width: '100%', padding: '12px', textAlign: 'center', fontSize: '20px', letterSpacing: '6px', border: '2px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', boxSizing: 'border-box' }}
                    autoFocus
                  />
                  <button
                    type="submit"
                    style={{ width: '100%', padding: '12px', background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Proceed to Face Capture
                  </button>
                </form>
              ) : (
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                    Look Directly into the Camera
                  </h4>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                    Position your face inside the frame to store your biometric nodal template.
                  </p>
                  <div style={{ position: 'relative', width: '220px', height: '220px', margin: '0 auto 16px', borderRadius: '50%', overflow: 'hidden', background: '#0f172a', border: '3px solid #4f46e5' }}>
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: 'user', width: 300, height: 300 }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <button
                    onClick={handleCaptureAndEnroll}
                    style={{ width: '100%', padding: '12px', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Capture & Register Official Face
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ACTIVE SCANNING / SUCCESS / MISMATCH WEBCAM VIEW */}
          {authStatus !== 'NO_ENROLLMENT' && authStatus !== 'ENROLLING' && (
            <>
              {/* Webcam Viewfinder with Reticle Overlay */}
              <div
                style={{
                  position: 'relative',
                  width: '240px',
                  height: '240px',
                  margin: '0 auto 18px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: '#0f172a',
                  boxShadow: authStatus === 'SUCCESS'
                    ? '0 0 0 4px #10b981, 0 10px 25px rgba(16, 185, 129, 0.3)'
                    : authStatus === 'MISMATCH'
                    ? '0 0 0 4px #ef4444, 0 10px 25px rgba(239, 68, 68, 0.3)'
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
                      Camera simulated for Sandbox
                    </span>
                  </div>
                )}

                {/* Scanning HUD Overlay */}
                {authStatus === 'SCANNING' && (
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
                    <Scan size={130} color="rgba(99, 102, 241, 0.4)" strokeWidth={1} />
                  </div>
                )}

                {/* Success Overlay */}
                {authStatus === 'SUCCESS' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(16, 185, 129, 0.9)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff'
                    }}
                  >
                    <CheckCircle2 size={54} color="#ffffff" className="animate-scale-in" />
                    <span style={{ marginTop: 8, fontWeight: 700, fontSize: 14 }}>
                      Verified Official
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.9 }}>
                      {similarityScore}% Match
                    </span>
                  </div>
                )}

                {/* Mismatch Overlay */}
                {authStatus === 'MISMATCH' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(220, 38, 38, 0.88)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      padding: 16
                    }}
                  >
                    <ShieldAlert size={48} color="#ffffff" className="animate-scale-in" />
                    <span style={{ marginTop: 6, fontWeight: 800, fontSize: 14 }}>
                      UNAUTHORIZED ACCESS
                    </span>
                    <span style={{ fontSize: 11, marginTop: 2, opacity: 0.9 }}>
                      Face Mismatch ({similarityScore}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Bar & Status Text */}
              <div style={{ maxWidth: '320px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                  <span>Biometric Verification</span>
                  <span style={{ color: authStatus === 'SUCCESS' ? '#10b981' : authStatus === 'MISMATCH' ? '#dc2626' : '#4f46e5' }}>
                    {scanProgress}%
                  </span>
                </div>
                <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                  <div
                    style={{
                      width: `${scanProgress}%`,
                      height: '100%',
                      background: authStatus === 'SUCCESS'
                        ? 'linear-gradient(90deg, #10b981, #059669)'
                        : authStatus === 'MISMATCH'
                        ? 'linear-gradient(90deg, #dc2626, #b91c1c)'
                        : 'linear-gradient(90deg, #4f46e5, #818cf8)',
                      transition: 'width 0.3s ease',
                      borderRadius: 10
                    }}
                  />
                </div>
                
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: authStatus === 'SUCCESS' ? '#059669' : authStatus === 'MISMATCH' ? '#dc2626' : '#334155',
                    minHeight: 24,
                    lineHeight: 1.4
                  }}
                >
                  {authStatus === 'MISMATCH' && errorMessage ? errorMessage : scanStatus}
                </div>

                {/* Mismatch Action Buttons */}
                {authStatus === 'MISMATCH' && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button
                      onClick={startVerificationProcess}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        background: '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <RefreshCw size={13} /> Retry Face Scan
                    </button>
                    <button
                      onClick={() => setAuthStatus('ENROLLING')}
                      style={{
                        padding: '10px 14px',
                        background: '#ffffff',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Re-Enroll
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

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
          <span>Restricted to Authorized Government Patwari & Revenue Officers</span>
        </div>
      </div>
    </div>
  );
}
