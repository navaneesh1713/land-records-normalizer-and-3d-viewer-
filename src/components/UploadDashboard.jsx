import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Camera, Smartphone, ScanLine, X, Loader2, CheckCircle2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import Peer from 'peerjs';

export default function UploadDashboard({ onFileReady }) {
  const [showQR, setShowQR] = useState(false);
  const [peerId, setPeerId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('waiting'); // waiting, connecting, connected, received
  const fileInputRef = useRef(null);
  const peerRef = useRef(null);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  useEffect(() => {
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileReady(e.target.files[0]);
    }
  };

  const handleScanClick = () => {
    if (isMobile) {
      // If already on mobile, just trigger camera input directly
      if (fileInputRef.current) {
        fileInputRef.current.setAttribute('capture', 'environment');
        fileInputRef.current.click();
      }
    } else {
      // Laptop: Setup PeerJS and show QR Code
      setShowQR(true);
      setConnectionStatus('waiting');
      
      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', (id) => {
        setPeerId(id);
      });

      peer.on('connection', (conn) => {
        setConnectionStatus('connecting');
        
        conn.on('open', () => {
          setConnectionStatus('connected');
        });

        conn.on('data', async (data) => {
          if (data.type === 'image' && (data.blob || data.dataUrl || data.buffer)) {
            setConnectionStatus('received');
            let file;
            if (data.blob) {
              file = new File([data.blob], "scanned_document.jpg", { type: 'image/jpeg' });
            } else if (data.dataUrl) {
              const res = await fetch(data.dataUrl);
              const blob = await res.blob();
              file = new File([blob], "scanned_document.jpg", { type: 'image/jpeg' });
            } else if (data.buffer) {
              const blob = new Blob([data.buffer], { type: data.mimeType || 'image/jpeg' });
              file = new File([blob], "scanned_document.jpg", { type: data.mimeType || 'image/jpeg' });
            }
            setTimeout(() => {
              setShowQR(false);
              if (file) onFileReady(file);
            }, 1000);
          }
        });
      });
    }
  };

  return (
    <div className="upload-dashboard-container animate-fade-in" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ fontSize: '28px', color: '#0f172a', marginBottom: '12px' }}>Document Ingestion Portal</h2>
      <p style={{ color: '#64748b', marginBottom: '48px', fontSize: '16px' }}>Upload digital records or scan physical documents using your mobile device.</p>

      <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
        
        {/* Upload Document Button */}
        <button 
          onClick={handleUploadClick}
          className="upload-action-card"
          style={{ flex: '1 1 300px', minWidth: '300px', padding: '48px 24px', background: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
        >
          <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '50%' }}>
            <UploadCloud size={32} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a' }}>Upload Document</div>
          <div style={{ color: '#64748b', fontSize: '14px' }}>PDF, JPG, PNG or CSV records</div>
        </button>

        {/* Scan Document Button */}
        <button 
          onClick={handleScanClick}
          className="upload-action-card"
          style={{ flex: '1 1 300px', minWidth: '300px', padding: '48px 24px', background: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
        >
          <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '50%' }}>
            <Camera size={32} color="#10b981" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a' }}>Scan Document</div>
          <div style={{ color: '#64748b', fontSize: '14px' }}>Use mobile camera for physical scans</div>
        </button>

      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
        accept="image/*,application/pdf,.csv,.xlsx" 
      />

      {/* QR Code Modal for Laptop -> Mobile scanning flow */}
      {showQR && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="animate-scale-in" style={{ background: '#ffffff', padding: '32px', borderRadius: '16px', maxWidth: '400px', width: '90%', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setShowQR(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <X size={24} color="#64748b" />
            </button>

            {connectionStatus === 'waiting' && (
              <>
                <ScanLine size={32} color="#10b981" style={{ marginBottom: '16px' }} />
                <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '20px' }}>Scan with Mobile</h3>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
                  Point your phone's camera at this QR code to securely connect and snap a photo of the document.
                </p>
                {peerId ? (
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', display: 'inline-block' }}>
                    <QRCode value={`${window.location.protocol}//${window.location.host}/scan-mobile?peerId=${peerId}`} size={200} />
                  </div>
                ) : (
                  <div style={{ height: '232px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 className="spinner" size={32} color="#3b82f6" />
                  </div>
                )}
              </>
            )}

            {connectionStatus === 'connecting' && (
              <div style={{ padding: '40px 0' }}>
                <Smartphone size={48} color="#3b82f6" className="animate-bounce" style={{ marginBottom: '16px' }} />
                <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Device Connected</h3>
                <p style={{ color: '#64748b', fontSize: '14px' }}>Awaiting camera capture from your mobile device...</p>
              </div>
            )}

            {connectionStatus === 'received' && (
              <div style={{ padding: '40px 0' }}>
                <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '16px' }} />
                <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Document Received</h3>
                <p style={{ color: '#64748b', fontSize: '14px' }}>Processing image through OCR pipeline...</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .upload-action-card:hover {
          border-color: #3b82f6 !important;
          transform: translateY(-4px);
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
}
