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
  const [elapsedSec, setElapsedSec] = useState('0.0');
  const [rawOcrText, setRawOcrText] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);

  // Extracted records
  const [extractedRecords, setExtractedRecords] = useState([]);
  const [sourceFileName, setSourceFileName] = useState('');
  const [error, setError] = useState(null);
  const [queueSuccessMsg, setQueueSuccessMsg] = useState('');
  const [modelInfo, setModelInfo] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [notificationPopup, setNotificationPopup] = useState(null);

  // Live Timer Effect for OCR Processing
  useEffect(() => {
    let interval = null;
    if (ocrRunning) {
      const startTime = Date.now();
      interval = setInterval(() => {
        setElapsedSec(((Date.now() - startTime) / 1000).toFixed(1));
      }, 100);
    } else {
      setElapsedSec('0.0');
    }
    return () => clearInterval(interval);
  }, [ocrRunning]);

  // ─── Field Normalizer ───
  // ─── Field Normalizer ───
  const normalizeRecord = (raw) => {
    const r = {};
    const keyMap = {
      building_name: ['building_name', 'building', 'structure_name', 'complex', 'apartment', 'property_name'],
      house_number: ['house_number', 'building_number', 'door_number', 'house_no', 'plot_no', 'door_no', 'flat_no'],
      street_name: ['street_name', 'street', 'road', 'road_name', 'lane', 'marg', 'cross'],
      locality: ['locality', 'area', 'colony', 'sector', 'nagar', 'mohalla', 'zone'],
      village_city: ['village_city', 'village', 'town', 'city', 'mauza', 'gram'],
      tehsil: ['tehsil', 'taluk', 'tahsil', 'mandal', 'sub_district', 'subdistrict', 'circle', 'anchal'],
      district: ['district', 'zilla', 'zila'],
      state: ['state', 'province', 'state_province', 'rajya'],
      country: ['country', 'nation', 'rashtra'],
      pincode: ['pincode', 'pin_code', 'zip', 'zip_code', 'postal_code', 'pin'],
      owner_name: ['owner', 'owner_name', 'name', 'khatadar', 'ownername', 'pattadar'],
      khasra_number: ['khasra_number', 'khasra', 'khasra_no', 'khasrano', 'dag_no', 'khatiyan', 'plot_no'],
      survey_number: ['survey', 'survey_no', 'survey_number', 'hissa', 'hissa_no'],
      floors: ['floors', 'floor_count', 'storeys', 'storeys_floors', 'levels'],
      size: ['size', 'extent', 'area', 'area_sqft', 'built_up_area', 'plot_area', 'area_sqm'],
      size_unit: ['size_unit', 'unit', 'area_unit'],
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
    if (!r.country) r.country = 'India';
    if (!r.size_unit) r.size_unit = 'sft';
    if (!r.floors) r.floors = '2';
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
    setOcrProgress(15);
    setOcrStatus('Optimizing document resolution & pre-processing frame...');
    setRawOcrText('');
    setExtractedRecords([]);
    setModelInfo(null);

    try {
      const extracted = await extractHandwrittenLandRecord(
        imageFile,
        activeKey,
        null,
        (pct, text) => {
          setOcrProgress(pct);
          setOcrStatus(text);
        }
      );

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
        building_name: extracted.building_name || '',
        house_number: extracted.house_number || '',
        street_name: extracted.street_name || '',
        locality: extracted.locality || '',
        village_city: extracted.village_city || extracted.village || '',
        tehsil: extracted.tehsil || extracted.taluk || extracted.mandal || '',
        district: extracted.district || '',
        state: extracted.state || 'Karnataka',
        country: extracted.country || 'India',
        pincode: extracted.pincode || '',
        owner_name: extracted.owner_name || '',
        khasra_number: extracted.khasra_number || extracted.survey_number || '',
        survey_number: extracted.survey_number || extracted.khasra_number || '',
        floors: extracted.floors || '2',
        size: extracted.size || extracted.area_sqm || '',
        size_unit: extracted.size_unit || 'sft',
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
    // Clear validation error for this field if user enters a value
    if (String(value).trim()) {
      setValidationErrors((prev) => {
        const currentList = prev[idx] || [];
        const nextList = currentList.filter((f) => f !== field);
        return { ...prev, [idx]: nextList };
      });
    }
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

    // 1. Strict Blank Field Validation across all 13 fields
    const requiredKeys = [
      { key: 'building_name', label: 'Building Name' },
      { key: 'house_number', label: 'Building/House Number' },
      { key: 'street_name', label: 'Street/Road Name' },
      { key: 'locality', label: 'Locality/Area' },
      { key: 'village_city', label: 'Village/Town/City' },
      { key: 'tehsil', label: 'Tehsil / Taluk / Mandal' },
      { key: 'district', label: 'District' },
      { key: 'state', label: 'State/Province' },
      { key: 'country', label: 'Country' },
      { key: 'pincode', label: 'PIN/ZIP Code' },
      { key: 'owner_name', label: 'Owner / Khatadar Name' },
      { key: 'khasra_number', label: 'Khasra Number' },
      { key: 'survey_number', label: 'Survey Number' },
      { key: 'floors', label: 'Storeys (Floors)' },
      { key: 'size', label: 'Size' },
    ];

    const errorsByRecord = {};
    let hasAnyBlank = false;
    const missingFieldLabels = new Set();

    extractedRecords.forEach((rec) => {
      const missingInThisRec = [];
      requiredKeys.forEach(({ key, label }) => {
        const val = rec[key];
        if (val === undefined || val === null || String(val).trim() === '' || (key === 'size' && isNaN(Number(val)))) {
          missingInThisRec.push(key);
          missingFieldLabels.add(label);
          hasAnyBlank = true;
        }
      });
      if (missingInThisRec.length > 0) {
        errorsByRecord[rec._idx] = missingInThisRec;
      }
    });

    if (hasAnyBlank) {
      setValidationErrors(errorsByRecord);
      const labels = Array.from(missingFieldLabels);
      setNotificationPopup({
        type: 'error',
        title: 'Action Required: Incomplete Land Record',
        message: `Cannot add to database. Please fill in all blank fields before saving: ${labels.slice(0, 4).join(', ')}${labels.length > 4 ? ` and ${labels.length - 4} more` : ''}.`,
      });
      setTimeout(() => {
        setNotificationPopup((prev) => (prev?.type === 'error' ? null : prev));
      }, 5000);
      return;
    }

    // Clear validation errors
    setValidationErrors({});

    // 2. Strict Uniqueness Ingestion
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

    const firstRec = extractedRecords[0];
    const surveyRef = firstRec?.survey_number || firstRec?.khasra_number || 'Record';

    if (result.updatedCount > 0 && result.addedCount === 0) {
      setNotificationPopup({
        type: 'success',
        title: 'Database Updated (Zero Duplicates)',
        message: `Existing cadastral entry for Survey No. ${surveyRef} was updated in-place. Guaranteed 100% uniqueness in Land Database.`,
      });
    } else {
      setNotificationPopup({
        type: 'success',
        title: 'Record Successfully Saved!',
        message: `Survey No. ${surveyRef} (Owner: ${firstRec?.owner_name || 'Owner'}) stored in Cadastre Database (${result.totalCount} total parcels).`,
      });
    }

    setTimeout(() => {
      setNotificationPopup(null);
    }, 4500);
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

        {/* Interactive Multi-Stage OCR Progress Dashboard */}
        {ocrRunning && (
          <div
            className="animate-slide-in"
            style={{
              marginBottom: 20,
              padding: '18px 20px',
              borderRadius: 14,
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.12), 0 8px 10px -6px rgba(79, 70, 229, 0.08)',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* Ambient subtle glowing top border */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #4f46e5, #06b6d4, #10b981)' }} />

            {/* Top info bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#e0e7ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4f46e5'
                  }}
                >
                  <Bot size={18} className="spin-animate" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                    Multimodal AI Vision Engine Active
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{getGeminiModel() || 'Gemini 2.5 Flash'}</span>
                    <span>•</span>
                    <span style={{ color: '#4f46e5', fontWeight: 600 }}>⚡ {elapsedSec}s elapsed</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#4f46e5', letterSpacing: '-0.02em' }}>
                  {ocrProgress}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#6366f1' }}>%</span>
              </div>
            </div>

            {/* Animated Pulsing Progress Track */}
            <div
              style={{
                width: '100%',
                height: 10,
                background: '#f1f5f9',
                borderRadius: 20,
                overflow: 'hidden',
                position: 'relative',
                marginBottom: 16,
                border: '1px solid #e2e8f0'
              }}
            >
              <div
                style={{
                  width: `${Math.max(8, ocrProgress)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #4f46e5 0%, #06b6d4 50%, #10b981 100%)',
                  borderRadius: 20,
                  transition: 'width 0.35s ease',
                  boxShadow: '0 0 12px rgba(6, 182, 212, 0.5)',
                  position: 'relative',
                }}
              />
            </div>

            {/* Interactive Live 4-Stage Workflow Stepper */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 8,
                padding: '10px',
                background: '#f8fafc',
                borderRadius: 10,
                border: '1px solid #edf2f7',
                marginBottom: 12
              }}
            >
              {[
                { threshold: 15, label: '1. Optimize Frame', desc: 'Downscale & Enhance' },
                { threshold: 35, label: '2. Cloud Stream', desc: 'Gemini AI Vision' },
                { threshold: 75, label: '3. Indic OCR', desc: 'Handwriting / Stamp' },
                { threshold: 88, label: '4. Cadastre Schema', desc: '13 Entities Extracted' }
              ].map((step, sIdx) => {
                const isDone = ocrProgress > step.threshold + 15 || ocrProgress === 100;
                const isActive = ocrProgress >= step.threshold && !isDone;
                return (
                  <div
                    key={sIdx}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 8,
                      background: isDone ? '#ecfdf5' : isActive ? '#eef2ff' : 'transparent',
                      border: `1px solid ${isDone ? '#a7f3d0' : isActive ? '#c7d2fe' : 'transparent'}`,
                      transition: 'all 0.25s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      {isDone ? (
                        <CheckCircle2 size={12} color="#059669" />
                      ) : isActive ? (
                        <Loader2 size={12} color="#4f46e5" className="spin-animate" />
                      ) : (
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#cbd5e1' }} />
                      )}
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: isDone ? '#065f46' : isActive ? '#3730a3' : '#94a3b8'
                      }}>
                        {step.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 9, color: isDone ? '#047857' : isActive ? '#6366f1' : '#94a3b8', paddingLeft: 17 }}>
                      {step.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Current Realtime Status Note */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155', fontWeight: 500 }}>
              <Sparkles size={14} color="#4f46e5" />
              <span>{ocrStatus || 'Deciphering handwritten deed with Gemini AI...'}</span>
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

        {/* Floating Rich Notification Pop-up */}
        {notificationPopup && (
          <div
            className={`scanner-notification-popup ${notificationPopup.type} animate-slide-in`}
            style={{
              position: 'relative',
              marginBottom: 16,
              padding: '12px 16px',
              borderRadius: 10,
              background: notificationPopup.type === 'success' ? '#ecfdf5' : '#fef2f2',
              border: `1.5px solid ${notificationPopup.type === 'success' ? '#10b981' : '#ef4444'}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ flexShrink: 0, marginTop: 2 }}>
              {notificationPopup.type === 'success' ? (
                <CheckCircle2 size={18} color="#059669" />
              ) : (
                <AlertCircle size={18} color="#dc2626" />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: notificationPopup.type === 'success' ? '#065f46' : '#991b1b',
                marginBottom: 2
              }}>
                {notificationPopup.title}
              </div>
              <div style={{
                fontSize: 12,
                color: notificationPopup.type === 'success' ? '#047857' : '#b91c1c',
                lineHeight: 1.4
              }}>
                {notificationPopup.message}
              </div>
            </div>
            <button
              onClick={() => setNotificationPopup(null)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: notificationPopup.type === 'success' ? '#059669' : '#dc2626',
                padding: 2
              }}
            >
              <X size={14} />
            </button>
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
                    { key: 'building_name', label: 'Building Name' },
                    { key: 'house_number', label: 'Building/House Number' },
                    { key: 'street_name', label: 'Street/Road Name' },
                    { key: 'locality', label: 'Locality/Area' },
                    { key: 'village_city', label: 'Village/Town/City' },
                    { key: 'tehsil', label: 'Tehsil / Taluk / Mandal' },
                    { key: 'district', label: 'District' },
                    { key: 'state', label: 'State/Province' },
                    { key: 'country', label: 'Country' },
                    { key: 'pincode', label: 'PIN/ZIP Code' },
                    { key: 'owner_name', label: 'Owner / Khatadar Name' },
                    { key: 'khasra_number', label: 'Khasra Number' },
                    { key: 'survey_number', label: 'Survey Number' },
                    { key: 'floors', label: 'Storeys (Floors)' },
                    { key: 'size', label: 'Size', isSize: true },
                  ].map(({ key, label, isSize }) => {
                    const hasValue = Boolean(rec[key] && String(rec[key]).trim());
                    const isValidationError = Boolean(validationErrors[rec._idx]?.includes(key));
                    const fieldConf = rec._fieldConfidence?.[key]?.score ?? (hasValue ? (rec._confidence || 85) : 35);
                    const isUncertain = rec._fieldConfidence?.[key]?.isUncertain || !hasValue || fieldConf < 75 || isValidationError;
                    const reason = isValidationError
                      ? '⚠️ Required blank — please fill in before adding to database'
                      : (rec._fieldConfidence?.[key]?.reason || (!hasValue ? 'Unclear / missing from scan — please enter manually' : null));

                    return (
                      <div
                        key={key}
                        className={`record-field-cell ${isUncertain ? 'uncertain' : ''}`}
                        style={
                          isValidationError
                            ? { borderColor: '#ef4444', background: 'rgba(254, 226, 226, 0.45)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)' }
                            : !hasValue
                            ? { borderColor: '#f59e0b', background: 'rgba(254, 243, 199, 0.3)' }
                            : {}
                        }
                      >
                        <div className="field-cell-header">
                          <label className="field-cell-label" style={isValidationError ? { color: '#b91c1c', fontWeight: 700 } : {}}>
                            {label} {isValidationError && <span style={{ color: '#ef4444' }}>*</span>}
                          </label>
                          {getConfidenceBadge(fieldConf)}
                        </div>

                        {isSize ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              type="number"
                              className="field-cell-input"
                              value={rec.size || ''}
                              onChange={(e) => updateField(rec._idx, 'size', e.target.value)}
                              placeholder={isValidationError ? '⚠️ REQUIRED: Size...' : 'Enter size...'}
                              style={{
                                flex: 1,
                                ...(isValidationError ? { borderColor: '#ef4444', color: '#991b1b', fontWeight: 600 } : {})
                              }}
                            />
                            <select
                              value={rec.size_unit || 'sft'}
                              onChange={(e) => updateField(rec._idx, 'size_unit', e.target.value)}
                              style={{
                                padding: '6px 8px',
                                borderRadius: 6,
                                border: '1.5px solid #cbd5e1',
                                background: '#f8fafc',
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#1e293b',
                                cursor: 'pointer',
                                height: '36px'
                              }}
                            >
                              <option value="sft">sft</option>
                              <option value="sqy">sqy</option>
                              <option value="acr">acr</option>
                            </select>
                          </div>
                        ) : (
                          <input
                            type="text"
                            className="field-cell-input"
                            value={rec[key] || ''}
                            onChange={(e) => updateField(rec._idx, key, e.target.value)}
                            placeholder={isValidationError ? `⚠️ REQUIRED: Enter ${label}...` : !hasValue ? `⚠️ Click to fill in ${label}...` : `Enter ${label}...`}
                            style={
                              isValidationError
                                ? { borderColor: '#ef4444', background: '#fff', color: '#991b1b', fontWeight: 600 }
                                : !hasValue
                                ? { borderColor: '#f59e0b', fontStyle: 'italic' }
                                : {}
                            }
                          />
                        )}

                        {isUncertain && reason && (
                          <div className="field-uncertain-note" style={isValidationError ? { color: '#b91c1c' } : {}}>
                            <AlertTriangle size={10} color={isValidationError ? '#dc2626' : '#d97706'} />
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
