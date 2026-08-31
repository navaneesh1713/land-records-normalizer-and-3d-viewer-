import React, { useState, useEffect, useRef } from 'react';
import { Camera, Send, XCircle, Loader2, CheckCircle2 } from 'lucide-react';
import Peer from 'peerjs';

export default function MobileScanner() {
  const [status, setStatus] = useState('initializing'); // initializing, ready, captured, sending, sent, error
  const [errorMsg, setErrorMsg] = useState('');
  const [photoBlob, setPhotoBlob] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const peerRef = useRef(null);
  const connRef = useRef(null);

  useEffect(() => {
    // Get target peerId from URL
    const urlParams = new URLSearchParams(window.location.search);
    const targetPeerId = urlParams.get('peerId');

    if (!targetPeerId) {
      setStatus('error');
      setErrorMsg('Invalid QR Code. No Peer ID found in URL.');
      return;
    }

    // Initialize camera
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        streamRef.current = stream;
        
        // Initialize PeerJS
        const peer = new Peer();
        peerRef.current = peer;

        peer.on('open', () => {
          const conn = peer.connect(targetPeerId, { reliable: true });
          connRef.current = conn;
          
          conn.on('open', () => {
            setStatus('ready');
          });
          
          conn.on('error', (err) => {
            setStatus('error');
            setErrorMsg('Failed to connect to laptop. ' + err.message);
          });
        });
        
        peer.on('error', (err) => {
          setStatus('error');
          setErrorMsg('PeerJS Error: ' + err.message);
        });

      } catch (err) {
        setStatus('error');
        setErrorMsg('Camera access denied or not available. ' + err.message);
      }
    };

    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerRef.current) peerRef.current.destroy();
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      setPhotoBlob(blob);
      setStatus('captured');
    }, 'image/jpeg', 0.85);
  };

  const handleRetake = () => {
    setPhotoBlob(null);
    setStatus('ready');
  };

  const handleSend = () => {
    if (!connRef.current || !photoBlob) return;
    
    setStatus('sending');
    connRef.current.send({
      type: 'image',
      blob: photoBlob
    });
    
    // Simulate slight delay for UI feel
    setTimeout(() => {
      setStatus('sent');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }, 800);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', display: 'flex', flexDirection: 'column', color: 'white' }}>
      {status === 'initializing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="spinner" size={48} color="#3b82f6" style={{ marginBottom: '16px' }} />
          <p>Connecting to Laptop...</p>
        </div>
      )}

      {status === 'error' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <XCircle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
          <h3>Connection Failed</h3>
          <p style={{ color: '#94a3b8' }}>{errorMsg}</p>
        </div>
      )}

      {(status === 'ready' || status === 'captured') && (
        <div style={{ flex: 1, position: 'relative' }}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: status === 'ready' ? 'block' : 'none' }}
          />
          <canvas 
            ref={canvasRef} 
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: status === 'captured' ? 'block' : 'none' }}
          />
          
          {/* Overlay UI */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '32px 24px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px' }}>
            {status === 'ready' && (
              <button onClick={handleCapture} style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '4px solid white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={32} color="white" />
              </button>
            )}

            {status === 'captured' && (
              <>
                <button onClick={handleRetake} style={{ padding: '16px', borderRadius: '12px', background: '#334155', color: 'white', border: 'none', fontWeight: 600, flex: 1 }}>
                  Retake
                </button>
                <button onClick={handleSend} style={{ padding: '16px', borderRadius: '12px', background: '#10b981', color: 'white', border: 'none', fontWeight: 600, flex: 1, display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  <Send size={20} /> Use Photo
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {status === 'sending' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="spinner" size={48} color="#10b981" style={{ marginBottom: '16px' }} />
          <p>Sending securely to laptop...</p>
        </div>
      )}

      {status === 'sent' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle2 size={64} color="#10b981" style={{ marginBottom: '16px' }} />
          <h2 style={{ margin: '0 0 8px 0' }}>Transfer Complete</h2>
          <p style={{ color: '#94a3b8' }}>You can now close this tab.</p>
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
