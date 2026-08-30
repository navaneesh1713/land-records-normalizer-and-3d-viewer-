import React, { useState, useRef, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { extractFieldsFromOCR } from '../utils/ocrExtractor';
import { storageService } from '../services/storageService';
import { auditTrailService } from '../services/auditTrailService';
import {
  ScanLine, Upload, FileText, FileSpreadsheet, Image as ImageIcon,
  Loader2, CheckCircle2, AlertCircle, X, Eye, EyeOff, Edit3, Send, Trash2,
  Sparkles, Download, ShieldCheck, AlertTriangle, ArrowRight, Layers, FileCode
} from 'lucide-react';

export default function DocumentScanner({ onRecordsReady, onRouteToQueue, onClose }) {
  const fileInputRef = useRef(null);

  // OCR state
  const [ocrLanguage, setOcrLanguage] = useState('eng');
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

  // ─── Load Sample SVAMITVA Property Card ───
  const handleLoadSample = async () => {
    try {
      setError(null);
      setSourceFileName('sample-svamitva-property-card.png');
      const res = await fetch('/sample-svamitva-property-card.png');
      if (!res.ok) throw new Error('Failed to load sample image');
      const blob = await res.blob();
      const file = new File([blob], 'sample-svamitva-property-card.png', { type: 'image/png' });
      await runOCR(file);
    } catch (err) {
      setError(`Failed to load sample document: ${err.message}`);
    }
  };

  // ─── File Selection Handler ───
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError(null);
    setSourceFileName(file.name);
    const ext = file.name.split('.').pop().toLowerCase();

    // IMAGE / PDF → tesseract.js OCR
    if (['jpg', 'jpeg', 'png', 'webp', 'tiff', 'tif', 'bmp', 'pdf'].includes(ext)) {
      await runOCR(file);
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
  }, [ocrLanguage]);

  // ─── Real Tesseract.js WebAssembly OCR Engine ───
  const runOCR = async (imageFile) => {
    setOcrRunning(true);
    setOcrProgress(0);
    setOcrStatus(`Initializing WebAssembly OCR engine (${ocrLanguage.toUpperCase()})...`);
    setRawOcrText('');
    setExtractedRecords([]);

    // Show image preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewSrc(e.target.result);
    reader.readAsDataURL(imageFile);

    try {
      const result = await Tesseract.recognize(imageFile, ocrLanguage, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round((m.progress || 0) * 100));
            setOcrStatus('Extracting live text matrix...');
          } else {
            setOcrStatus(m.status ? m.status.replace(/_/g, ' ') : 'Processing document...');
          }
        },
      });

      const fullText = result.data.text || '';
      const overallConfidence = Math.round(result.data.confidence || 0);
      setRawOcrText(fullText);

      // Parse with field-level confidence scoring (Point 11)
      const extracted = extractFieldsFromOCR(fullText, overallConfidence);

      const record = {
        _idx: 0,
        _source: 'ocr',
        _fileName: imageFile.name,
        _rawText: fullText,
        _confidence: extracted._confidence || overallConfidence || 80,
        _fieldConfidence: extracted._fieldConfidence,
        _uncertainFields: extracted._uncertainFields,
        ...extracted,
      };

      setExtractedRecords([record]);
      setOcrStatus(`OCR extraction complete (Confidence: ${record._confidence}%)`);
    } catch (err) {
      setError(`OCR Error: ${err.message || 'Failed to extract text from document.'}`);
    } finally {
      setOcrRunning(false);
    }
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

  // Update a field in extractedRecords
  const updateField = (idx, field, value) => {
    setExtractedRecords((prev) =>
      prev.map((rec) => (rec._idx === idx ? { ...rec, [field]: value } : rec))
    );
  };

  // Delete a record
  const deleteRecord = (idx) => {
    setExtractedRecords((prev) => prev.filter((rec) => rec._idx !== idx));
  };

  // Apply to 3D Viewer (Direct Ingest)
  const handleApply = () => {
    if (extractedRecords.length === 0) return;
    if (onRecordsReady) onRecordsReady(extractedRecords);
  };

  // Route to HITL Review Queue (Point 12)
  const handleRouteToQueue = () => {
    if (extractedRecords.length === 0) return;

    extractedRecords.forEach((rec) => {
      const queueItem = storageService.addReviewItem({
        sourceFileName: rec._fileName || sourceFileName || 'Scanned Document',
        rawText: rec._rawText || '',
        overallConfidence: rec._confidence || 75,
        fieldConfidence: rec._fieldConfidence || {},
        uncertainFields: rec._uncertainFields || [],
        extractedFields: {
          owner_name: rec.owner_name || '',
          khasra_number: rec.khasra_number || '',
          survey_number: rec.survey_number || '',
          khata_number: rec.khata_number || '',
          village: rec.village || '',
          tehsil: rec.tehsil || '',
          district: rec.district || '',
          area_acres: rec.area_acres || '',
          classification: rec.classification || 'Residential',
          floors: rec.floors || '2',
          height_m: rec.height_m || '6.5',
        },
      });

      auditTrailService.logAction(
        'OCR_INGEST_TO_QUEUE',
        'document',
        queueItem.id,
        {
          fileName: queueItem.sourceFileName,
          confidence: queueItem.overallConfidence,
          uncertainFieldsCount: queueItem.uncertainFields.length,
        },
        'system'
      );
    });

    setQueueSuccessMsg(`Successfully routed ${extractedRecords.length} record(s) to Human-in-the-Loop Review Queue.`);
    setTimeout(() => {
      setQueueSuccessMsg('');
      if (onRouteToQueue) onRouteToQueue();
    }, 1200);
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
            <div className="scanner-subtitle-text">Multi-format Ingest • Confidence Scoring • HITL Pipeline</div>
          </div>
        </div>
        <button onClick={onClose} className="scanner-close-x-btn" title="Close Scanner">
          <X size={15} />
        </button>
      </div>

      {/* Main Content Scrollable Area */}
      <div className="scanner-studio-body">
        {/* Language & Input Configuration Strip */}
        <div className="scanner-lang-strip">
          <div className="lang-strip-left">
            <span className="lang-label-title">OCR Recognition Language:</span>
          </div>
          <select
            value={ocrLanguage}
            onChange={(e) => setOcrLanguage(e.target.value)}
            className="scanner-lang-select"
            disabled={ocrRunning}
          >
            <option value="eng">English (Standard / National)</option>
            <option value="hin+eng">Hindi + English (UP Bhulekh / MP Land)</option>
            <option value="kan+eng">Kannada + English (Karnataka Bhoomi RTC)</option>
            <option value="mar+eng">Marathi + English (Maharashtra 7/12)</option>
            <option value="tel+eng">Telugu + English (Maa Bhoomi / Dharani)</option>
            <option value="tam+eng">Tamil + English (Tamil Nadu Patta)</option>
            <option value="guj+eng">Gujarati + English (AnyRoR Gujarat)</option>
            <option value="ben+eng">Bengali + English (BanglarBhumi)</option>
          </select>
        </div>

        {/* Modern Drag & Drop Zone */}
        <div className="scanner-dropzone-wrapper">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.csv,.xlsx,.xls,.json,.geojson,.pdf"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
              e.target.value = '';
            }}
          />

          <div
            className="scanner-dropzone-box"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="dropzone-icon-circle">
              <Upload size={20} color="#4f46e5" />
            </div>
            <div className="dropzone-main-label">
              <strong>Click to upload</strong> or drag and drop document
            </div>
            <div className="dropzone-sub-label">
              Supports scanned Bhoomi RTC, 7/12, Khatiyan, SVAMITVA Cards, PDF, CSV & GeoJSON
            </div>
            <div className="dropzone-badges-row">
              <span className="file-tag">PNG</span>
              <span className="file-tag">JPG</span>
              <span className="file-tag">PDF</span>
              <span className="file-tag">TIFF</span>
              <span className="file-tag">CSV</span>
              <span className="file-tag">XLSX</span>
              <span className="file-tag">JSON</span>
            </div>
          </div>

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
                <span>Raw OCR Extracted Text</span>
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
              <span className="records-count-pill">{extractedRecords.length} Record</span>
            </div>

            {extractedRecords.map((rec) => (
              <div key={rec._idx} className="extracted-record-card">
                <div className="record-top-meta">
                  <span className="record-id-badge">#{rec._idx + 1}</span>
                  {rec._source && <span className="record-source-tag">{rec._source.toUpperCase()}</span>}
                  {rec._confidence > 0 && getConfidenceBadge(rec._confidence)}
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
                    const fieldConf = rec._fieldConfidence?.[key]?.score ?? (rec._confidence || 85);
                    const isUncertain = rec._fieldConfidence?.[key]?.isUncertain || fieldConf < 75;
                    const reason = rec._fieldConfidence?.[key]?.reason;

                    return (
                      <div key={key} className={`record-field-cell ${isUncertain ? 'uncertain' : ''}`}>
                        <div className="field-cell-header">
                          <label className="field-cell-label">{label}</label>
                          {getConfidenceBadge(fieldConf)}
                        </div>
                        <input
                          type="text"
                          className="field-cell-input"
                          value={rec[key] || ''}
                          onChange={(e) => updateField(rec._idx, key, e.target.value)}
                          placeholder={`Enter ${label}...`}
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
            onClick={handleRouteToQueue}
            className="scanner-btn-route-queue"
            title="Route uncertain records to Human-in-the-Loop verifier"
          >
            <ShieldCheck size={14} />
            <span>Route to HITL Review</span>
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
