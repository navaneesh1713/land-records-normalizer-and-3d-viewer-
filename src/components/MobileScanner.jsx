import React, { useState, useEffect, useRef } from 'react';
import {
  Camera, Send, XCircle, Loader2, CheckCircle2, RefreshCw,
  UploadCloud, Plus, Trash2, Layers, Check, ArrowRight, Eye
} from 'lucide-react';
import Peer from 'peerjs';

export default function MobileScanner() {
  const [status, setStatus] = useState('initializing'); // initializing, ready, sending, sent, error
  const [errorMsg, setErrorMsg] = useState('');
  const [capturedPhotos, setCapturedPhotos] = useState([]); // [{ id, dataUrl, blob }]
  const [selectedPreviewIdx, setSelectedPreviewIdx] = useState(0);
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
        setErrorMsg('Connection to laptop interrupted: ' + err.message);
      });
    });

    peer.on('error', (err) => {
      if (!isMounted) return;
      console.error('Peer error:', err);
      if (err.type === 'peer-unavailable') {
        setErrorMsg('Laptop session not found. Please make sure the QR code dialog is still open on your laptop.');
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

    canvas.toBlob((blob) => {
      const newPhoto = {
        id: Date.now(),
        dataUrl,
        blob: blob || new Blob([], { type: 'image/jpeg' }),
        name: `scan_page_${capturedPhotos.length + 1}.jpg`
      };
      setCapturedPhotos((prev) => [...prev, newPhoto]);
      setSelectedPreviewIdx(capturedPhotos.length);
    }, 'image/jpeg', 0.9);
  };

  // Native mobile camera fallback
  const handleNativeFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const newPhoto = {
        id: Date.now(),
        dataUrl: event.target.result,
        blob: file,
        name: file.name || `scan_page_${capturedPhotos.length + 1}.jpg`
      };
      setCapturedPhotos((prev) => [...prev, newPhoto]);
      setSelectedPreviewIdx(capturedPhotos.length);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = (id) => {
    setCapturedPhotos((prev) => {
      const next = prev.filter(p => p.id !== id);
      if (selectedPreviewIdx >= next.length) {
        setSelectedPreviewIdx(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  const handleSendAll = () => {
    if (!connRef.current || capturedPhotos.length === 0) {
      alert("Please capture at least one document photo first.");
      return;
    }

    setStatus('sending');

    try {
      // Send array of images
      connRef.current.send({
        type: 'images_batch',
        count: capturedPhotos.length,
        images: capturedPhotos.map(p => ({
          id: p.id,
          name: p.name,
          dataUrl: p.dataUrl
        })),
        // Primary single image for direct processing
        primaryImage: capturedPhotos[0].dataUrl
      });

      setTimeout(() => {
        setStatus('sent');
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
        }
      }, 800);
    } catch (sendErr) {
      console.error("Failed to transmit image batch:", sendErr);
      setErrorMsg("Failed to transmit to laptop: " + sendErr.message);
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
      {/* Top Mobile Status Header */}
      <div style={{
        padding: '14px 18px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: peerConnected ? '#10b981' : '#f59e0b'
          }} />
          <span style={{ fontSize: '14px', fontWeight: 600 }}>LANDX3D Mobile Scanner</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {capturedPhotos.length > 0 && (
            <span style={{
              background: '#3b82f6',
              color: 'white',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px'
            }}>
              {capturedPhotos.length} {capturedPhotos.length === 1 ? 'Page' : 'Pages'}
            </span>
          )}
          <span style={{ fontSize: '12px', color: peerConnected ? '#10b981' : '#f59e0b' }}>
            {peerConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000' }}>
        {/* Video Element for live camera feed */}
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
            display: (status === 'ready' && cameraActive) ? 'block' : 'none'
          }}
        />

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Live Alignment Overlay Box */}
        {status === 'ready' && cameraActive && (
          <div style={{
            position: 'absolute',
            inset: '24px 20px 90px 20px',
            border: '2px dashed rgba(255,255,255,0.4)',
            borderRadius: '16px',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ background: 'rgba(0,0,0,0.65)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', color: '#e2e8f0' }}>
              Align document page inside frame
            </div>
          </div>
        )}

        {/* Captured Gallery Thumbnails Strip (Overlay at bottom of viewport) */}
        {status === 'ready' && capturedPhotos.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '16px',
            right: '16px',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            padding: '8px',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.15)',
            zIndex: 5
          }}>
            {capturedPhotos.map((photo, index) => (
              <div
                key={photo.id}
                style={{
                  position: 'relative',
                  width: '54px',
                  height: '68px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: selectedPreviewIdx === index ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)',
                  flexShrink: 0
                }}
              >
                <img
                  src={photo.dataUrl}
                  alt={`Page ${index + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  onClick={() => handleRemovePhoto(photo.id)}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.9)',
                    border: 'none',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <Trash2 size={10} />
                </button>
                <span style={{
                  position: 'absolute',
                  bottom: '2px',
                  left: '2px',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  fontSize: '9px',
                  padding: '1px 4px',
                  borderRadius: '3px'
                }}>
                  #{index + 1}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Loading Spinner Screen */}
        {status === 'initializing' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
            <Loader2 className="spinner" size={44} color="#3b82f6" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Connecting to Laptop...</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Establishing secure direct P2P link</p>
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
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Transmitting {capturedPhotos.length} {capturedPhotos.length === 1 ? 'Document' : 'Pages'}...</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Sending high-resolution photos directly to your computer</p>
          </div>
        )}

        {/* Success Screen */}
        {status === 'sent' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
            <CheckCircle2 size={64} color="#10b981" style={{ marginBottom: '16px' }} />
            <h2 style={{ margin: '0 0 8px 0', fontSize: '22px' }}>{capturedPhotos.length} {capturedPhotos.length === 1 ? 'Page' : 'Pages'} Sent to Laptop!</h2>
            <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '24px' }}>
              Your computer is displaying the scanned document preview. You can approve or add more pages from your laptop screen.
            </p>
            <button
              onClick={() => {
                setCapturedPhotos([]);
                setStatus('ready');
              }}
              style={{ padding: '12px 24px', background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 600 }}
            >
              Scan Additional Records
            </button>
          </div>
        )}
      </div>

      {/* Hidden File Input for Native Camera fallback */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleNativeFileChange}
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
      />

      {/* Bottom Camera Action Controls */}
      {status === 'ready' && (
        <div style={{
          padding: '16px 20px calc(20px + env(safe-area-inset-bottom))',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            
            {/* Gallery / Native Camera Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <UploadCloud size={15} /> Upload / File
            </button>

            {/* Shutter Button */}
            <button
              onClick={cameraActive ? handleCapture : () => fileInputRef.current?.click()}
              style={{
                width: '72px',
                height: '72px',
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
              <Camera size={32} color="#0f172a" />
            </button>

            {/* Send Batch Button */}
            <button
              onClick={handleSendAll}
              disabled={capturedPhotos.length === 0}
              style={{
                background: capturedPhotos.length > 0 ? '#10b981' : 'rgba(255,255,255,0.08)',
                color: capturedPhotos.length > 0 ? '#ffffff' : '#64748b',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: capturedPhotos.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <Send size={15} /> Send ({capturedPhotos.length})
            </button>
          </div>
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
