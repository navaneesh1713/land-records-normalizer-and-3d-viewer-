import React, { useState, useEffect, useRef } from 'react';
import { Camera, Send, XCircle, Loader2, CheckCircle2, RefreshCw, UploadCloud, AlertCircle } from 'lucide-react';
import Peer from 'peerjs';

export default function MobileScanner() {
  const [status, setStatus] = useState('initializing'); // initializing, ready, captured, sending, sent, error
  const [errorMsg, setErrorMsg] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [photoBlob, setPhotoBlob] = useState(null);
  const [peerConnected, setPeerConnected] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const peerRef = useRef(null);
  const connRef = useRef(null);

  // Initialize camera and PeerJS connection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetPeerId = urlParams.get('peerId');

    if (!targetPeerId) {
      setStatus('error');
      setErrorMsg('No connection ID found in QR code. Please scan again from your laptop.');
      return;
    }

    let isMounted = true;

    const startStream = async () => {
      try {
        const constraints = {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('webkit-playsinline', 'true');
          videoRef.current.muted = true;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('Auto play failed, will play on user interaction:', playErr);
          }
        }
        setCameraActive(true);
      } catch (err) {
        console.warn('WebRTC stream could not be started directly:', err);
        // Do not fail completely, user can still use native camera file input
      }
    };

    startStream();

    // Setup PeerJS
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', () => {
      const conn = peer.connect(targetPeerId, { reliable: true });
      connRef.current = conn;

      conn.on('open', () => {
        if (!isMounted) return;
        setPeerConnected(true);
        setStatus('ready');
      });

      conn.on('close', () => {
        if (!isMounted) return;
        setPeerConnected(false);
      });

      conn.on('error', (err) => {
        if (!isMounted) return;
        console.error('Peer connection error:', err);
        setErrorMsg('Connection to laptop interrupted. ' + err.message);
      });
    });

    peer.on('error', (err) => {
      if (!isMounted) return;
      console.error('Peer error:', err);
      if (err.type === 'peer-unavailable') {
        setErrorMsg('Laptop session not found. Make sure the QR code dialog is still open on your laptop.');
      } else {
        setErrorMsg('P2P signaling error: ' + err.message);
      }
      setStatus('error');
    });

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);

  // Ensure video element plays whenever srcObject is bound
  const handleVideoLoaded = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.warn("Video play error", e));
    }
  };

  // Capture snapshot from live video stream
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth || video.clientWidth || 1280;
    const h = video.videoHeight || video.clientHeight || 720;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPhotoDataUrl(dataUrl);

    canvas.toBlob((blob) => {
      setPhotoBlob(blob);
      setStatus('captured');
    }, 'image/jpeg', 0.9);
  };

  // Handle native mobile camera file selection (Fallback / High-res mode)
  const handleNativeFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoBlob(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoDataUrl(event.target.result);
      setStatus('captured');
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setPhotoDataUrl(null);
    setPhotoBlob(null);
    setStatus('ready');
    if (videoRef.current && streamRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleSend = () => {
    if (!connRef.current || (!photoBlob && !photoDataUrl)) {
      alert("Please capture a document photo first.");
      return;
    }

    setStatus('sending');

    try {
      // Send both DataUrl and ArrayBuffer for maximum cross-device compatibility
      if (photoDataUrl) {
        connRef.current.send({
          type: 'image',
          dataUrl: photoDataUrl
        });
      }

      setTimeout(() => {
        setStatus('sent');
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
        }
      }, 700);
    } catch (sendErr) {
      console.error("Failed to send image data:", sendErr);
      setErrorMsg("Failed to transmit image to laptop: " + sendErr.message);
      setStatus('error');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#090d16',
      display: 'flex',
      flexDirection: 'column',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      zIndex: 999999,
      overflow: 'hidden'
    }}>
      {/* Top Mobile Bar */}
      <div style={{
        padding: '16px 20px',
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: peerConnected ? '#10b981' : '#f59e0b' }} />
          <span style={{ fontSize: '14px', fontWeight: 600 }}>LANDX3D Mobile Scanner</span>
        </div>
        <span style={{ fontSize: '12px', color: peerConnected ? '#10b981' : '#f59e0b' }}>
          {peerConnected ? 'Connected to Laptop' : 'Connecting...'}
        </span>
      </div>

      {/* Main Viewport Container */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000' }}>
        {/* Video Element - ALWAYS MOUNTED to ensure stream binding */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={handleVideoLoaded}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: (status === 'ready' && cameraActive && !photoDataUrl) ? 'block' : 'none'
          }}
        />

        {/* Hidden Canvas for Frame Extraction */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Image Preview when Captured */}
        {photoDataUrl && (
          <img
            src={photoDataUrl}
            alt="Scanned Document Preview"
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#090d16' }}
          />
        )}

        {/* Camera Viewfinder Box (Overlay) */}
        {status === 'ready' && cameraActive && !photoDataUrl && (
          <div style={{
            position: 'absolute',
            inset: '30px',
            border: '2px dashed rgba(255,255,255,0.4)',
            borderRadius: '16px',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', color: '#e2e8f0' }}>
              Align document inside frame
            </div>
          </div>
        )}

        {/* Loading Spinner Screen */}
        {status === 'initializing' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
            <Loader2 className="spinner" size={44} color="#3b82f6" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Pairing with Laptop...</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Establishing encrypted direct peer connection</p>
          </div>
        )}

        {/* Error Screen */}
        {status === 'error' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
            <XCircle size={52} color="#ef4444" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#f87171' }}>Connection Error</h3>
            <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '24px' }}>{errorMsg}</p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '12px 24px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <RefreshCw size={16} /> Retry Connection
            </button>
          </div>
        )}

        {/* Sending Screen */}
        {status === 'sending' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
            <Loader2 className="spinner" size={48} color="#10b981" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Sending Document...</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Transmitting high-res scan directly to your laptop</p>
          </div>
        )}

        {/* Success Screen */}
        {status === 'sent' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
            <CheckCircle2 size={64} color="#10b981" style={{ marginBottom: '16px' }} />
            <h2 style={{ margin: '0 0 8px 0', fontSize: '22px' }}>Document Transferred!</h2>
            <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '24px' }}>
              Your laptop has received the document and is now processing OCR extraction.
            </p>
            <button
              onClick={() => {
                setPhotoDataUrl(null);
                setPhotoBlob(null);
                setStatus('ready');
              }}
              style={{ padding: '12px 24px', background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 600 }}
            >
              Scan Another Document
            </button>
          </div>
        )}
      </div>

      {/* Hidden Native File / Camera Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleNativeFileChange}
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
      />

      {/* Bottom Action Controls */}
      {(status === 'ready' || status === 'captured') && (
        <div style={{
          padding: '24px 20px calc(24px + env(safe-area-inset-bottom))',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {status === 'ready' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', width: '100%' }}>
              {/* Native Camera Trigger */}
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <UploadCloud size={16} /> Choose Photo
              </button>

              {/* Shutter Button */}
              <button
                onClick={cameraActive ? handleCapture : () => fileInputRef.current?.click()}
                style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  border: '4px solid rgba(255,255,255,0.4)',
                  boxShadow: '0 0 20px rgba(59,130,246,0.5)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Camera size={34} color="#0f172a" />
              </button>

              <div style={{ width: '100px' }} />
            </div>
          )}

          {status === 'captured' && (
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                onClick={handleRetake}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#334155',
                  color: 'white',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Retake
              </button>
              <button
                onClick={handleSend}
                style={{
                  flex: 2,
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Send size={18} /> Send to Laptop
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
