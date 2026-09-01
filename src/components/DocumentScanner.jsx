import React, { useState, useRef, useCallback, useEffect } from 'react';

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { extractFieldsFromOCR } from '../utils/ocrExtractor';
import { storageService } from '../services/storageService';
import { auditTrailService } from '../services/auditTrailService';
import {
  extractHandwrittenLandRecord,
  getGeminiApiKey,
  saveGeminiApiKey,
  getGeminiModel,
  saveGeminiModel,
} from '../services/handwrittenOcrService';
import {
  ScanLine, Upload, FileText, FileSpreadsheet, Image as ImageIcon,
  Loader2, CheckCircle2, AlertCircle, X, Eye, EyeOff, Edit3, Send, Trash2,
  Sparkles, Download, ShieldCheck, AlertTriangle, ArrowRight, Layers, FileCode,
  Wand2, Check, HelpCircle, RefreshCw, Bot, Database
} from 'lucide-react';

export default function DocumentScanner({ initialFile, onRecordsReady, onRouteToQueue, onClose, onNavigateToUpload }) {
  const handleGoToUpload = () => {
    if (onNavigateToUpload) {
      onNavigateToUpload();
    } else {
      window.history.pushState({}, '', '/upload');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Scanner state
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [rawOcrText, setRawOcrText] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);

  // Extracted records
  const [extractedRecords, setExtractedRecords] = useState([]);
  const [sourceFileName, setSourceFileName] = useState('');
  const [error, setError] = useState(null);
  const [queueSuccessMsg, setQueueSuccessMsg] = useState('');
  const [modelInfo, setModelInfo] = useState(null);

  // ─── Field Normalizer ───
  const normalizeRecord = (raw) => {
    const r = {};
    const keyMap = {
      owner_name: ['owner', 'owner_name', 'name', 'khatadar', 'ownername'],
      khasra_number: ['khasra', 'khasra_no', 'khasra_number', 'gata', 'gata_no', 'survey', 'survey_no', 'survey_number'],
      survey_number: ['survey', 'survey_no', 'survey_number', 'hissa'],
      khata_number: ['khata', 'khata_no', 'khata_number', 'khatoni'],
      village: ['village', 'village_name', 'mauza', 'gram'],
      tehsil: ['tehsil', 'taluk', 'taluka', 'mandal'],
      district: ['district', 'zilla', 'zila'],
      area_acres: ['area', 'area_acres', 'acres', 'area_sqft', 'extent'],
      classification: ['classification', 'land_type', 'type', 'use'],
      floors: ['floors', 'floor_count', 'storeys'],
      height_m: ['height', 'height_m', 'building_height'],
    };

    for (const [canonical, aliases] of Object.entries(keyMap)) {
      for (const [k, v] of Object.entries(raw)) {
        const cleanK = k.toLowerCase().replace(/[\s_\-.]/g, '');
        if (aliases.some(a => a.replace(/[\s_\-.]/g, '') === cleanK) && v !== '') {
          r[canonical] = String(v).trim();
          break;
        }
      }
    }
    return r;
  };

  // ─── CSV Parsing ───
  const parseCSV = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setError('CSV file is empty or formatted incorrectly.');
          return;
        }
        const records = results.data.map((row, i) => ({
          _idx: i,
          _source: 'csv',
          _fileName: file.name,
          _confidence: 95,
          _fieldConfidence: {},
          _uncertainFields: [],
          ...normalizeRecord(row),
        }));
        setExtractedRecords(records);
        setOcrStatus(`Loaded ${records.length} records from CSV`);
      },
      error: (err) => setError(`CSV Parse error: ${err.message}`),
    });
  };

  // ─── Excel Parsing ───
  const parseExcel = async (file) => {
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheet = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheet];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!data || data.length === 0) {
        setError('Excel sheet is empty.');
        return;
      }

      const records = data.map((row, i) => ({
        _idx: i,
        _source: 'excel',
        _fileName: file.name,
        _confidence: 95,
        _fieldConfidence: {},
        _uncertainFields: [],
        ...normalizeRecord(row),
      }));

      setExtractedRecords(records);
      setOcrStatus(`Loaded ${records.length} records from Excel (.${file.name.split('.').pop()})`);
    } catch (err) {
      setError(`Excel read error: ${err.message}`);
    }
  };

  // ─── Gemini Multimodal Handwritten AI Vision Engine ───
  const runGeminiVisionOCR = async (imageFile) => {
    const activeKey = getGeminiApiKey();

    setOcrRunning(true);
    setOcrProgress(25);
    setOcrStatus('Deciphering handwriting & Indic script with Gemini Flash Vision...');
    setRawOcrText('');
    setExtractedRecords([]);
    setModelInfo(null);

    try {
      setOcrProgress(50);
      const extracted = await extractHandwrittenLandRecord(imageFile, activeKey);
      setOcrProgress(90);

      const record = {
        _idx: 0,
        _source: 'gemini_vision_htr',
        _modelUsed: extracted._modelUsed || getGeminiModel() || 'Gemini 2.5 Flash',
        _fileName: imageFile.name,
        _rawText: extracted._rawText || '',
        _confidence: extracted._confidence || 75,
        _fieldConfidence: extracted._fieldConfidence || {},
        _uncertainFields: extracted._uncertainFields || [],
        _handwritingQuality: extracted._handwritingQuality || 'CLEAR',
        owner_name: extracted.owner_name || '',
        survey_number: extracted.survey_number || '',
        khasra_number: extracted.khasra_number || '',
        khata_number: extracted.khata_number || '',
        village: extracted.village || '',
        tehsil: extracted.tehsil || '',
        district: extracted.district || '',
        classification: extracted.classification || '',
        area_sqm: extracted.area_sqm || '',
        floors: extracted.floors || '',
        height_m: extracted.height_m || '',
      };

      setRawOcrText(record._rawText);
      setExtractedRecords([record]);
      setModelInfo(`Processed with ${record._modelUsed} (Confidence: ${record._confidence}%)`);
      setOcrProgress(100);
      setOcrStatus(`Handwritten extraction complete (${record._confidence}% confidence)`);

      auditTrailService.logAction(
        'HANDWRITTEN_AI_VISION_EXTRACT',
        'document',
        `DOC-${Date.now().toString().slice(-4)}`,
        {
          fileName: imageFile.name,
          engine: 'Gemini-Multimodal-Vision',
          model: record._modelUsed,
          confidence: record._confidence,
          quality: record._handwritingQuality,
        },
        'Gemini Vision AI Engine'
      );
    } catch (err) {
      console.error('Gemini Vision OCR Error:', err);
      if (err.message?.startsWith('NOT_A_GOV_DOCUMENT')) {
        setError('🚫 Invalid Document: The uploaded image does not appear to be a valid government land or revenue record. Please upload a Khatiyan, Jamabandi, 7/12, RTC, Property Card, or similar official document.');
      } else {
        setError(`AI Vision Error: ${err.message}`);
      }
    } finally {
      setOcrRunning(false);
    }
  };


  // ─── Image Processing Router ───
  const processImage = useCallback(async (imageFile) => {
    // Show image preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewSrc(e.target.result);
    reader.readAsDataURL(imageFile);

    await runGeminiVisionOCR(imageFile);
  }, []);

  // ─── File Selection Handler ───
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError(null);
    setSourceFileName(file.name);
    const ext = file.name.split('.').pop().toLowerCase();

    // IMAGE / PDF → OCR / Multimodal Vision
    if (['jpg', 'jpeg', 'png', 'webp', 'tiff', 'tif', 'bmp', 'pdf'].includes(ext)) {
      await processImage(file);
    }
    // CSV
    else if (ext === 'csv') {
      parseCSV(file);
    }
    // Excel
    else if (['xlsx', 'xls'].includes(ext)) {
      parseExcel(file);
    }
    // JSON
    else if (ext === 'json' || ext === 'geojson') {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const records = Array.isArray(parsed) ? parsed : (parsed.records || parsed.features || parsed.data || [parsed]);
        setExtractedRecords(records.map((r, i) => ({ _idx: i, ...normalizeRecord(r.properties || r) })));
      } catch (e) {
        setError(`JSON parse error: ${e.message}`);
      }
    }
    else {
      setError(`Unsupported file type: .${ext}. Supports images (png/jpg/tiff/pdf), CSV, Excel (.xlsx), or JSON/GeoJSON.`);
    }
  }, [processImage]);

  // Automatically process initialFile if passed from upload dashboard or mobile scan
  useEffect(() => {
    if (initialFile) {
      handleFile(initialFile);
    }
  }, [initialFile, handleFile]);



  const handleLoadSample = async () => {
    try {
      setError(null);
      setSourceFileName('sample-svamitva-property-card.png');
      const res = await fetch('/sample-svamitva-property-card.png');
      if (!res.ok) throw new Error('Failed to load sample image');
      const blob = await res.blob();
      const file = new File([blob], 'sample-svamitva-property-card.png', { type: 'image/png' });
      await processImage(file);
    } catch (err) {
      setError(`Failed to load sample document: ${err.message}`);
    }
  };

  const updateField = (idx, field, value) => {
    setExtractedRecords((prev) =>
      prev.map((rec) => (rec._idx === idx ? { ...rec, [field]: value } : rec))
    );
  };

  const deleteRecord = (idx) => {
    setExtractedRecords((prev) => prev.filter((rec) => rec._idx !== idx));
  };

  const handleApply = () => {
    if (extractedRecords.length === 0) return;
    if (onRecordsReady) onRecordsReady(extractedRecords);
  };

  const handleAddToDatabase = () => {
    if (extractedRecords.length === 0) return;

    const result = storageService.addRecordsToDatabase(extractedRecords);

    auditTrailService.logAction(
      'LAND_DATABASE_INGEST',
      'document',
      `BATCH-${Date.now().toString().slice(-4)}`,
      {
        fileName: sourceFileName || 'Scanned Document',
        addedCount: result.addedCount,
        updatedCount: result.updatedCount,
        totalParcels: result.totalCount,
      },
      'Official'
    );

    if (result.updatedCount > 0 && result.addedCount === 0) {
      setQueueSuccessMsg(`Updated ${result.updatedCount} existing record(s) in Land Database (Zero duplicates created).`);
    } else {
      setQueueSuccessMsg(`Successfully saved ${result.addedCount} record(s) to Land Database! (${result.totalCount} total parcels)`);
    }

    setTimeout(() => {
      setQueueSuccessMsg('');
    }, 2500);
  };

  const getConfidenceBadge = (confidence) => {
    const score = Number(confidence) || 0;
    if (score >= 80) return <span className="conf-badge conf-high">{score}% High</span>;
    if (score >= 60) return <span className="conf-badge conf-med">{score}% Medium</span>;
    return <span className="conf-badge conf-low">{score}% Review Flag</span>;
  };

  return (
    <div className="scanner-panel-studio">
      {/* Header Bar */}
      <div className="scanner-studio-header">
        <div className="scanner-header-left">
          <div className="scanner-icon-pill">
            <ScanLine size={16} color="#4f46e5" />
          </div>
          <div>
            <div className="scanner-title-text">Document OCR Scanner & AI Normalizer</div>
            <div className="scanner-subtitle-text">Multimodal Handwritten HTR • Confidence Scoring • HITL Pipeline</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            className="topbar-pill-btn"
            style={{
              padding: '4px 10px',
              fontSize: 11,
              background: 'rgba(16, 185, 129, 0.1)',
              borderColor: 'rgba(16, 185, 129, 0.3)',
              color: '#059669',
            }}
            title="Active AI Vision Engine"
          >
            <Sparkles size={12} color="#059669" />
            <span>AI Vision Active</span>
          </div>
          <button onClick={onClose} className="scanner-close-x-btn" title="Close Scanner">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Main Content Scrollable Area */}
      <div className="scanner-studio-body">




        {/* Upload Action Button */}
        <div style={{ marginBottom: 14 }}>
          <button
            onClick={handleGoToUpload}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              width: '100%',
              padding: '14px 20px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            <Upload size={17} />
            <span>Upload Document</span>
          </button>
        </div>

        <div className="scanner-dropzone-wrapper">

          {/* Quick 1-Click Sample Card */}
          <div className="scanner-sample-card">
            <div className="sample-card-info">
              <div className="sample-card-title">
                <Sparkles size={13} color="#eab308" />
                <span>Test Demo Document</span>
              </div>
              <p className="sample-card-desc">
                Instant test with certified SVAMITVA Drone Cadastre Property Card.
              </p>
            </div>
            <div className="sample-card-actions">
              <button
                className="sample-load-btn"
                onClick={handleLoadSample}
                disabled={ocrRunning}
              >
                <span>Run Demo OCR</span>
                <ArrowRight size={13} />
              </button>
              <a
                href="/sample-svamitva-property-card.png"
                download="sample-svamitva-property-card.png"
                className="sample-download-link"
                title="Download sample image"
              >
                <Download size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Success Toast */}
        {queueSuccessMsg && (
          <div className="scanner-toast success animate-slide-in">
            <CheckCircle2 size={14} color="#16a34a" />
            <span>{queueSuccessMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="scanner-toast error animate-slide-in">
            <AlertCircle size={14} color="#dc2626" />
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => setError(null)} className="toast-dismiss-btn">
              <X size={12} />
            </button>
          </div>
        )}

        {/* OCR Progress Section */}
        {ocrRunning && (
          <div className="scanner-progress-box">
            <div className="progress-top-info">
              <span className="progress-status-label">
                <Loader2 size={13} className="spin-animate" color="#4f46e5" />
                {ocrStatus}
              </span>
              <span className="progress-percent-val">{ocrProgress}%</span>
            </div>
            <div className="progress-track-bg">
              <div className="progress-fill-bar" style={{ width: `${ocrProgress}%` }} />
            </div>
          </div>
        )}

        {/* Image Preview */}
        {previewSrc && (
          <div className="scanner-image-preview-card">
            <div className="preview-card-header">
              <div className="preview-header-title">
                <ImageIcon size={13} color="#4f46e5" />
                <span>Source Scan Document</span>
              </div>
              {sourceFileName && <span className="preview-filename-badge">{sourceFileName}</span>}
            </div>
            <div className="preview-image-container">
              <img src={previewSrc} alt="Scanned document" className="source-scan-img" />
            </div>
          </div>
        )}

        {/* Raw OCR Text Accordion */}
        {rawOcrText && (
          <div className="scanner-raw-accordion">
            <button
              className="raw-accordion-btn"
              onClick={() => setShowRawText(!showRawText)}
            >
              <div className="raw-btn-left">
                {showRawText ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>Raw Extracted Text & Transcription</span>
              </div>
              <span className="raw-char-pill">{rawOcrText.length} chars</span>
            </button>
            {showRawText && (
              <pre className="raw-ocr-pre">{rawOcrText}</pre>
            )}
          </div>
        )}

        {/* Extracted Records Form */}
        {extractedRecords.length > 0 && (
          <div className="scanner-records-container">
            <div className="records-header-strip">
              <div className="records-title-group">
                <Edit3 size={14} color="#4f46e5" />
                <span>Extracted Cadastral Schema</span>
              </div>
              {modelInfo && <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>{modelInfo}</span>}
              <span className="records-count-pill">{extractedRecords.length} Record</span>
            </div>

            {extractedRecords.some(r => Object.values(r._fieldConfidence || {}).some(f => f.isUncertain) || !r.owner_name || !r.survey_number) && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.9), rgba(253, 230, 138, 0.6))',
                border: '1px solid #f59e0b',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: '#92400e',
                fontSize: 12,
                fontWeight: 500,
                boxShadow: '0 2px 4px rgba(245, 158, 11, 0.1)'
              }}>
                <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Action Required:</strong> Some fields were unclear or missing in the scan. Random data was <em>not</em> hallucinated. Please fill in the highlighted fields below.
                </span>
              </div>
            )}

            {extractedRecords.map((rec) => (
              <div key={rec._idx} className="extracted-record-card">
                <div className="record-top-meta">
                  <span className="record-id-badge">#{rec._idx + 1}</span>
                  {rec._source && <span className="record-source-tag">{rec._source.toUpperCase()}</span>}
                  {rec._confidence > 0 && getConfidenceBadge(rec._confidence)}
                  {rec._handwritingQuality && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: '#ede9fe',
                      color: '#6d28d9'
                    }}>
                      Quality: {rec._handwritingQuality}
                    </span>
                  )}
                  <button onClick={() => deleteRecord(rec._idx)} className="record-delete-btn" title="Remove">
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="record-fields-grid">
                  {[
                    { key: 'owner_name', label: 'Owner / Khatadar Name' },
                    { key: 'khasra_number', label: 'Khasra / Gata No' },
                    { key: 'survey_number', label: 'Survey / Hissa No' },
                    { key: 'khata_number', label: 'Khatauni No' },
                    { key: 'village', label: 'Village / Mauza' },
                    { key: 'tehsil', label: 'Tehsil / Taluk' },
                    { key: 'district', label: 'District' },
                    { key: 'classification', label: 'Land Use' },
                    { key: 'floors', label: 'Storeys (Floors)' },
                    { key: 'height_m', label: 'Height (m)' },
                  ].map(({ key, label }) => {
                    const hasValue = Boolean(rec[key] && String(rec[key]).trim());
                    const fieldConf = rec._fieldConfidence?.[key]?.score ?? (hasValue ? (rec._confidence || 85) : 35);
                    const isUncertain = rec._fieldConfidence?.[key]?.isUncertain || !hasValue || fieldConf < 75;
                    const reason = rec._fieldConfidence?.[key]?.reason || (!hasValue ? 'Unclear / missing from scan — please enter manually' : null);

                    return (
                      <div
                        key={key}
                        className={`record-field-cell ${isUncertain ? 'uncertain' : ''}`}
                        style={!hasValue ? { borderColor: '#f59e0b', background: 'rgba(254, 243, 199, 0.3)' } : {}}
                      >
                        <div className="field-cell-header">
                          <label className="field-cell-label">{label}</label>
                          {getConfidenceBadge(fieldConf)}
                        </div>
                        <input
                          type="text"
                          className="field-cell-input"
                          value={rec[key] || ''}
                          onChange={(e) => updateField(rec._idx, key, e.target.value)}
                          placeholder={!hasValue ? `⚠️ Click to fill in ${label}...` : `Enter ${label}...`}
                          style={!hasValue ? { borderColor: '#f59e0b', fontStyle: 'italic' } : {}}
                        />
                        {isUncertain && reason && (
                          <div className="field-uncertain-note">
                            <AlertTriangle size={10} color="#d97706" />
                            <span>{reason}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Action Buttons */}
      {extractedRecords.length > 0 && (
        <div className="scanner-studio-footer">
          <button
            onClick={handleAddToDatabase}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.2s ease',
            }}
            title="Save extracted record to local government database (Zero Duplicates)"
          >
            <Database size={14} />
            <span>Add to Database</span>
          </button>

          <button
            onClick={handleApply}
            className="scanner-btn-apply-3d"
            title="Normalize & Extrude directly into 3D Map Viewer"
          >
            <Layers size={14} />
            <span>Apply to 3D Map</span>
          </button>
        </div>
      )}
    </div>
  );
}
