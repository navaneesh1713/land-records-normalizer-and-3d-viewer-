import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud, Camera, Smartphone, ScanLine, X, Loader2, CheckCircle2,
  Trash2, Plus, Sparkles, ArrowRight, FileText, RefreshCw, Eye, Ban, Check
} from 'lucide-react';
import QRCode from 'react-qr-code';
import Peer from 'peerjs';

export default function UploadDashboard({ onFileReady }) {
  const [showQR, setShowQR] = useState(false);
  const [peerId, setPeerId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('waiting'); // waiting, connecting, connected, preview
  const [receivedPhotos, setReceivedPhotos] = useState([]); // [{ id, name, dataUrl, file }]
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const fileInputRef = useRef(null);
  const peerRef = useRef(null);
  const connRef = useRef(null);

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

  const startPeerSession = () => {
    setShowQR(true);
    setConnectionStatus('waiting');
    setReceivedPhotos([]);
    setActivePhotoIdx(0);

    if (peerRef.current) {
      peerRef.current.destroy();
    }

    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
    });

    peer.on('connection', (conn) => {
      connRef.current = conn;
      setConnectionStatus('connecting');

      conn.on('open', () => {
        setConnectionStatus('connected');
      });

      conn.on('data', async (data) => {
        console.log('[PeerJS] Received data from mobile:', data);

        // Batch of images
        if (data.type === 'images_batch' && Array.isArray(data.images) && data.images.length > 0) {
          const processedList = [];
          for (let i = 0; i < data.images.length; i++) {
            const img = data.images[i];
            let fileObj;
            if (img.dataUrl) {
              const res = await fetch(img.dataUrl);
              const blob = await res.blob();
              fileObj = new File([blob], img.name || `mobile_scan_page_${i + 1}.jpg`, { type: 'image/jpeg' });
            }
            processedList.push({
              id: img.id || Date.now() + i,
              name: img.name || `Page ${i + 1}`,
              dataUrl: img.dataUrl,
              file: fileObj
            });
          }

          setReceivedPhotos((prev) => [...prev, ...processedList]);
          setConnectionStatus('preview');
        }
        // Single image
        else if (data.type === 'image' && (data.blob || data.dataUrl || data.buffer)) {
          let fileObj;
          let dataUrl = data.dataUrl;

          if (data.blob) {
            fileObj = new File([data.blob], "mobile_scanned_document.jpg", { type: 'image/jpeg' });
            dataUrl = URL.createObjectURL(data.blob);
          } else if (data.dataUrl) {
            const res = await fetch(data.dataUrl);
            const blob = await res.blob();
            fileObj = new File([blob], "mobile_scanned_document.jpg", { type: 'image/jpeg' });
          } else if (data.buffer) {
            const blob = new Blob([data.buffer], { type: data.mimeType || 'image/jpeg' });
            fileObj = new File([blob], "mobile_scanned_document.jpg", { type: data.mimeType || 'image/jpeg' });
            dataUrl = URL.createObjectURL(blob);
          }

          setReceivedPhotos((prev) => [
            ...prev,
            {
              id: Date.now(),
              name: `Page ${prev.length + 1}`,
              dataUrl,
              file: fileObj
            }
          ]);
          setConnectionStatus('preview');
        }
      });

      conn.on('close', () => {
        console.log('[PeerJS] Mobile connection closed.');
      });
    });
  };

  const handleScanClick = () => {
    if (isMobile) {
      if (fileInputRef.current) {
        fileInputRef.current.setAttribute('capture', 'environment');
        fileInputRef.current.click();
      }
    } else {
      startPeerSession();
    }
  };

  const handleRejectPhoto = (id) => {
    setReceivedPhotos((prev) => {
      const filtered = prev.filter(p => p.id !== id);
      if (filtered.length === 0) {
        setConnectionStatus('waiting');
        setActivePhotoIdx(0);
      } else if (activePhotoIdx >= filtered.length) {
        setActivePhotoIdx(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  const handleRejectAll = () => {
    setReceivedPhotos([]);
    setConnectionStatus('waiting');
    setActivePhotoIdx(0);
  };

  const handleConfirmAndExtract = () => {
    if (receivedPhotos.length === 0) return;
    const selectedPhoto = receivedPhotos[activePhotoIdx] || receivedPhotos[0];
    setShowQR(false);
    if (selectedPhoto.file) {
      onFileReady(selectedPhoto.file);
    }
  };

  return (
    <div className="upload-dashboard-container animate-fade-in" style={{ padding: '40px 24px', maxWidth: '850px', margin: '0 auto', textAlign: 'center' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: '#EDF2FE', borderRadius: '20px', border: '1px solid rgba(0, 82, 255, 0.2)', marginBottom: '16px' }}>
          <Sparkles size={14} color="#0052FF" />
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0052FF' }}>Multi-Modal Cadastre Ingestion</span>
        </div>
        <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0A0B0D', margin: '0 0 10px 0', letterSpacing: '-0.02em' }}>
          Document Ingestion Portal
        </h2>
        <p style={{ color: '#5B616E', fontSize: '15px', maxWidth: '560px', margin: '0 auto', lineHeight: 1.5 }}>
          Upload digital records or live-scan physical deeds using your mobile device camera for automated 3D spatial extraction.
        </p>
      </div>

      {/* Main Action Cards */}
      <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
        
        {/* Upload Document Card */}
        <button 
          onClick={handleUploadClick}
          className="upload-action-card"
          style={{
            flex: '1 1 320px',
            minWidth: '300px',
            padding: '44px 28px',
            background: '#ffffff',
            border: '2px dashed #cbd5e1',
            borderRadius: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ background: '#EDF2FE', padding: '18px', borderRadius: '50%', border: '1px solid rgba(0, 82, 255, 0.15)' }}>
            <UploadCloud size={34} color="#0052FF" />
          </div>
          <div>
            <div style={{ fontSize: '19px', fontWeight: 700, color: '#0A0B0D', marginBottom: '4px' }}>Upload Document</div>
            <div style={{ color: '#5B616E', fontSize: '13.5px' }}>PDF, JPG, PNG, Excel or CSV records</div>
          </div>
        </button>

        {/* Scan Document Card */}
        <button 
          onClick={handleScanClick}
          className="upload-action-card"
          style={{
            flex: '1 1 320px',
            minWidth: '300px',
            padding: '44px 28px',
            background: '#ffffff',
            border: '2px dashed #cbd5e1',
            borderRadius: '18px',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ background: '#ecfdf5', padding: '18px', borderRadius: '50%', border: '1px solid #d1fae5' }}>
            <Camera size={34} color="#059669" />
          </div>
          <div>
            <div style={{ fontSize: '19px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Scan Document</div>
            <div style={{ color: '#64748b', fontSize: '13.5px' }}>Pair phone camera via secure QR code</div>
          </div>
        </button>

      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
        accept="image/*,application/pdf,.csv,.xlsx,.xls,.json,.geojson" 
      />

      {/* ─── QR Code & Live Mobile Preview Modal ─── */}
      {showQR && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="animate-scale-in" style={{
            background: '#ffffff',
            padding: connectionStatus === 'preview' ? '28px' : '36px',
            borderRadius: '20px',
            maxWidth: connectionStatus === 'preview' ? '680px' : '440px',
            width: '100%',
            textAlign: 'center',
            position: 'relative',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <button
              onClick={() => setShowQR(false)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>

            {/* State 1: Waiting for QR Scan */}
            {connectionStatus === 'waiting' && (
              <div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#EDF2FE', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <ScanLine size={24} color="#0052FF" />
                </div>
                <h3 style={{ margin: '0 0 8px 0', color: '#0A0B0D', fontSize: '21px', fontWeight: 800 }}>Scan with Mobile Device</h3>
                <p style={{ color: '#5B616E', fontSize: '14px', marginBottom: '24px', lineHeight: 1.45 }}>
                  Point your phone's camera at this QR code to capture and stream land deeds directly to this workstation.
                </p>
                {peerId ? (
                  <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'inline-block' }}>
                    <QRCode value={`${window.location.protocol}//${window.location.host}/scan-mobile?peerId=${peerId}`} size={210} />
                  </div>
                ) : (
                  <div style={{ height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <Loader2 className="spinner" size={36} color="#0052FF" />
                    <span style={{ fontSize: '13px', color: '#5B616E' }}>Generating peer pairing token...</span>
                  </div>
                )}
              </div>
            )}

            {/* State 2: Mobile Connected, Waiting for Photos */}
            {connectionStatus === 'connected' && (
              <div style={{ padding: '32px 16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#EDF2FE', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Smartphone size={32} color="#0052FF" className="animate-bounce" />
                </div>
                <h3 style={{ margin: '0 0 8px 0', color: '#0A0B0D', fontSize: '20px', fontWeight: 800 }}>Mobile Device Connected!</h3>
                <p style={{ color: '#5B616E', fontSize: '14px', maxWidth: '340px', margin: '0 auto 20px auto' }}>
                  Your phone is currently connected. Align document pages and tap <strong>Send</strong> on your phone.
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: '#E6F8F0', borderRadius: '20px', border: '1px solid rgba(5, 177, 105, 0.3)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#05B169' }} />
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#047857' }}>Awaiting Camera Snapshots</span>
                </div>
              </div>
            )}

            {/* State 3: Scanned Photos Received — Review, Accept, Reject & Batch Pipeline */}
            {connectionStatus === 'preview' && receivedPhotos.length > 0 && (
              <div style={{ textAlign: 'left' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingRight: '24px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={20} color="#05B169" />
                      <h3 style={{ margin: 0, color: '#0A0B0D', fontSize: '18px', fontWeight: 800 }}>
                        Scanned Document(s) Received
                      </h3>
                    </div>
                    <p style={{ margin: '2px 0 0 0', color: '#5B616E', fontSize: '13px' }}>
                      Review uploaded mobile scans before extracting attributes via AI normalizer.
                    </p>
                  </div>
                  <span style={{ background: '#EDF2FE', color: '#0052FF', fontSize: '12px', fontWeight: 800, padding: '4px 12px', borderRadius: '9999px' }}>
                    {receivedPhotos.length} {receivedPhotos.length === 1 ? 'Page' : 'Pages'}
                  </span>
                </div>

                {/* Main Large Image Preview Box */}
                <div style={{
                  background: '#0A0B0D',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  height: '320px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  border: '1px solid #E2E8F0',
                  marginBottom: '16px'
                }}>
                  {receivedPhotos[activePhotoIdx]?.dataUrl && (
                    <img
                      src={receivedPhotos[activePhotoIdx].dataUrl}
                      alt={`Scanned page ${activePhotoIdx + 1}`}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  )}
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '14px',
                    background: 'rgba(0,0,0,0.75)',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    Page {activePhotoIdx + 1} of {receivedPhotos.length}
                  </div>
                </div>

                {/* Multiple Thumbnails Strip (if > 1 photo) */}
                {receivedPhotos.length > 1 && (
                  <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '4px' }}>
                    {receivedPhotos.map((photo, idx) => (
                      <div
                        key={photo.id}
                        onClick={() => setActivePhotoIdx(idx)}
                        style={{
                          position: 'relative',
                          width: '64px',
                          height: '80px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: activePhotoIdx === idx ? '2px solid #0052FF' : '1px solid #CBD5E1',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        <img src={photo.dataUrl} alt={photo.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectPhoto(photo.id);
                          }}
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: '#DF1525',
                            color: 'white',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Decision Actions Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #ECEFF0',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Reject / Retake Button */}
                    <button
                      onClick={handleRejectAll}
                      style={{
                        padding: '10px 16px',
                        background: '#FFFFFF',
                        color: '#DF1525',
                        border: '1.5px solid #FCA5A5',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Ban size={15} /> Reject / Retake
                    </button>

                    {/* Wait for More Photos Button */}
                    <button
                      onClick={() => setConnectionStatus('connected')}
                      style={{
                        padding: '10px 16px',
                        background: '#F8FAFC',
                        color: '#5B616E',
                        border: '1px solid #CBD5E1',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Plus size={15} /> Add More Photos
                    </button>
                  </div>

                  {/* Approve & Direct to OCR Normalizer */}
                  <button
                    onClick={handleConfirmAndExtract}
                    style={{
                      padding: '11px 22px',
                      background: '#0052FF',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(0, 82, 255, 0.3)'
                    }}
                  >
                    <Sparkles size={16} /> Send to Document OCR Scanner & AI Normalizer
                  </button>
                </div>

                <div style={{ fontSize: '11.5px', color: '#8A919E', textAlign: 'center', marginTop: '12px' }}>
                  Multimodal Handwritten HTR • Confidence Scoring • HITL Pipeline
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      <style>{`
        .upload-action-card:hover {
          border-color: #0052FF !important;
          transform: translateY(-4px);
          box-shadow: 0 12px 28px -6px rgba(0, 82, 255, 0.15) !important;
        }
      `}</style>
    </div>
  );
}
