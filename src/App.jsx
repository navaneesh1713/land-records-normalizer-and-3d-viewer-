import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import MapView from './components/MapView';
import Header from './components/Header';
import Legend from './components/Legend';
import ParcelSidebar from './components/ParcelSidebar';
import BuildingListPanel from './components/BuildingListPanel';
import FloorControlPanel from './components/FloorControlPanel';
import DocumentScanner from './components/DocumentScanner';
import VerificationQueueModal from './components/VerificationQueueModal';
import AiImprovementLogModal from './components/AiImprovementLogModal';
import AuditTrailModal from './components/AuditTrailModal';
import AnalyticsDashboardModal from './components/AnalyticsDashboardModal';
import AnalyticsView from './components/AnalyticsView';
import AuditTrailView from './components/AuditTrailView';
import AiFeedbackLoopView from './components/AiFeedbackLoopView';
import HeroLandingPage from './components/HeroLandingPage';
import GovAuthModal from './components/GovAuthModal';
import AppSidebar from './components/AppSidebar';
import AppTopBar from './components/AppTopBar';
import UploadDashboard from './components/UploadDashboard';
import MobileScanner from './components/MobileScanner';
import { storageService } from './services/storageService';
import { auditTrailService } from './services/auditTrailService';
import { getParcelData, PRESET_DATASETS } from './services/dataSource';
import { calculateFeatureCenter } from './utils/geoUtils';
import { detectInputShape, runBrowserPipeline } from './utils/pipelineBrowser';
import { FlyToInterpolator } from '@deck.gl/core';
import {
  Loader2, AlertCircle, UploadCloud, X, FileText, CheckCircle2,
  AlertTriangle, ScanLine, ShieldAlert, Ruler, History,
  ShieldCheck, BrainCircuit, Lock, BarChart3, Terminal, Layers,
  Compass, MapPin, Database
} from 'lucide-react';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [mapTheme, setMapTheme] = useState('light');
  const [viewState, setViewState] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showBuildingList, setShowBuildingList] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [loadedFileName, setLoadedFileName] = useState(null);
  const dragCounter = useRef(0);

  // Pipeline processing state
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState('');
  const [unplacedRecords, setUnplacedRecords] = useState([]);
  const [showUnplaced, setShowUnplaced] = useState(false);

  // 3D Floor Controls state
  const [explosionFactor, setExplosionFactor] = useState(0);
  const [floorFilter, setFloorFilter] = useState(null);

  // Preset dataset switcher state
  const [currentPreset, setCurrentPreset] = useState('svamitva');

  // Document Scanner panel state
  const [showScanner, setShowScanner] = useState(false);

  const [showMobileScanner, setShowMobileScanner] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.startsWith('/scan-mobile');
    }
    return false;
  });

  // Government & SIH Core Workflow States
  const [showHeroPage, setShowHeroPage] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === '/' || window.location.pathname === '';
    }
    return true;
  });
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/home') || window.location.hash === '#/home') return 'map';
      if (path.startsWith('/upload')) return 'upload';
      if (path.startsWith('/analytics')) return 'analytics';
      if (path.startsWith('/audit')) return 'audit';
      if (path.startsWith('/ailoop') || path.startsWith('/ai-learning')) return 'ailoop';
    }
    return 'hero';
  });
  const [userRole, setUserRole] = useState(() => storageService.getActiveRole());
  const [showGovAuth, setShowGovAuth] = useState(false);
  const [showReviewQueue, setShowReviewQueue] = useState(false);
  const [reviewQueue, setReviewQueue] = useState(() => storageService.getReviewQueue());

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/scan-mobile')) {
        setShowMobileScanner(true);
        return;
      }
      setShowMobileScanner(false);
      
      const isHome = path.startsWith('/home') || window.location.hash === '#/home';
      const isUpload = path.startsWith('/upload');
      const isAnalytics = path.startsWith('/analytics');
      const isAudit = path.startsWith('/audit');
      const isAiLoop = path.startsWith('/ailoop') || path.startsWith('/ai-learning');
      
      setShowHeroPage(path === '/' || path === '');
      if (isUpload) {
        setActiveTab('upload');
      } else if (isAnalytics) {
        setActiveTab('analytics');
      } else if (isAudit) {
        setActiveTab('audit');
      } else if (isAiLoop) {
        setActiveTab('ailoop');
      } else if (isHome) {
        setActiveTab('map');
      } else {
        setActiveTab('hero');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectTab = useCallback((tabId) => {
    setActiveTab(tabId);
    if (tabId === 'hero') {
      setShowHeroPage(true);
      if (window.location.pathname !== '/') {
        window.history.pushState({}, '', '/');
      }
    } else {
      setShowHeroPage(false);
      if (tabId === 'upload') {
        if (window.location.pathname !== '/upload') window.history.pushState({}, '', '/upload');
      } else if (tabId === 'analytics') {
        if (window.location.pathname !== '/analytics') window.history.pushState({}, '', '/analytics');
      } else if (tabId === 'audit') {
        if (window.location.pathname !== '/audit') window.history.pushState({}, '', '/audit');
      } else if (tabId === 'ailoop') {
        if (window.location.pathname !== '/ailoop') window.history.pushState({}, '', '/ailoop');
      } else if (tabId === 'map' || tabId === 'review') {
        if (window.location.pathname !== '/home') window.history.pushState({}, '', '/home');
      }

      if (tabId === 'map') {
        setShowScanner(false);
        setShowReviewQueue(false);
      } else if (tabId === 'review') {
        setShowReviewQueue(true);
        setShowScanner(false);
      } else if (tabId === 'scanner') {
        setShowScanner(true);
        setShowReviewQueue(false);
      } else {
        setShowScanner(false);
        setShowReviewQueue(false);
      }
    }
  }, []);

  const handleLaunchStudio = useCallback((tabId = 'map') => {
    setShowHeroPage(false);
    handleSelectTab(tabId);
    if (window.location.pathname !== '/home') {
      window.history.pushState({}, '', '/home');
    }
  }, [handleSelectTab]);

  const handleGoToHero = useCallback(() => {
    setShowHeroPage(true);
    setActiveTab('hero');
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
  }, []);

  const handleRoleChange = useCallback((newRole) => {
    setUserRole(newRole);
    storageService.setActiveRole(newRole);
    auditTrailService.logAction({
      action: 'USER_ROLE_SWITCHED',
      actor: newRole === 'patwari' ? 'Patwari K. Suresh' : newRole === 'officer' ? 'Revenue Officer M. Ananth' : 'District Collector / Admin',
      role: newRole === 'patwari' ? 'Patwari / Field Verifier' : newRole === 'officer' ? 'Revenue Officer' : 'Administrator',
      targetId: 'RBAC_SESSION_CONTEXT',
      details: `Active user context switched to ${newRole.toUpperCase()}`,
    });
  }, []);

  const handleApproveQueueRecord = useCallback((verifiedRecord) => {
    // If the verified record has coordinates or survey match, route through browser pipeline
    if (verifiedRecord) {
      handleScannerRecords([verifiedRecord]);
    }
  }, []);

  const handleSelectPreset = useCallback((presetKey) => {
    const preset = PRESET_DATASETS[presetKey];
    if (preset && preset.data) {
      setCurrentPreset(presetKey);
      setData(preset.data);
      setSelectedUnit(null);
      const center = calculateFeatureCenter(preset.data.features || []);
      setViewState((prev) => ({
        ...(prev || {}),
        longitude: center.longitude,
        latitude: center.latitude,
        zoom: 17.8,
        pitch: 58,
        bearing: -25,
        transitionDuration: 1200,
      }));
    }
  }, []);

  // Load building parcel data via isolated dataSource module initially
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getParcelData()
      .then((geoJson) => {
        if (isMounted) {
          setData(geoJson);
          const center = calculateFeatureCenter(geoJson?.features || []);
          setViewState({
            longitude: center.longitude,
            latitude: center.latitude,
            zoom: 17.5,
            pitch: 58,
            bearing: -25,
            maxPitch: 85,
          });
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load building parcel data');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleTheme = useCallback(() => {
    setMapTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const handleResetCamera = useCallback(() => {
    if (data?.features) {
      const center = calculateFeatureCenter(data.features);
      setViewState((prev) => ({
        ...(prev || {}),
        longitude: center.longitude,
        latitude: center.latitude,
        zoom: 17.5,
        pitch: 58,
        bearing: -25,
        transitionDuration: 1000,
      }));
    }
  }, [data]);

  const handleSelectUnit = useCallback((unit) => {
    setSelectedUnit(unit);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSelectedUnit(null);
  }, []);

  // Fly camera to a specific building feature when clicked in the building directory side menu
  const handleSelectBuilding = useCallback((feature) => {
    if (!feature) return;
    const center = calculateFeatureCenter([feature]);
    console.log(`[Building FlyTo] Flying camera to building ${feature.properties?.plot_id}: lng=${center.longitude}, lat=${center.latitude}`);

    setViewState({
      longitude: center.longitude,
      latitude: center.latitude,
      zoom: 19,
      pitch: 62,
      bearing: -25,
      transitionDuration: 1400,
      transitionInterpolator: new FlyToInterpolator(),
    });

    // Automatically inspect the first unit of this building
    const props = feature.properties || {};
    const plotId = props.plot_id || 'UNKNOWN';
    let firstUnit = null;

    if (Array.isArray(props.floors) && props.floors.length > 0) {
      const fl = props.floors[0];
      const div = (fl.divisions && fl.divisions.length > 0) ? fl.divisions[0] : null;
      if (div) {
        firstUnit = {
          plot_id: plotId,
          building_id: plotId,
          osm_way_id: props.osm_way_id,
          village: props.village,
          tehsil: props.tehsil,
          district: props.district,
          floor_height_m: props.floor_height_m || 3.5,
          footprint_area_sqm: props.footprint_area_sqm,
          total_floors: props.floors.length,
          floor_number: fl.floor_number || 1,
          unit_id: div.unit_id,
          khasra_number: div.khasra_number,
          survey_number: div.survey_number,
          owner_name: div.owner_name,
          classification: div.classification,
          status: div.status,
          division_index: div.division_index || 1,
          division_share: div.division_share || 1,
          is_synthetic: Boolean(div.is_synthetic),
        };
      }
    }

    if (firstUnit) {
      setSelectedUnit(firstUnit);
    }
  }, []);

  // Center the camera on the given features using smooth FlyTo animation
  const centerOnFeatures = useCallback((features) => {
    if (features && features.length > 0) {
      const center = calculateFeatureCenter(features);
      console.log(`[Camera FlyTo] Flying camera to center: lng=${center.longitude}, lat=${center.latitude}, zoom=${center.zoom || 17.5}`);
      setViewState({
        longitude: center.longitude,
        latitude: center.latitude,
        zoom: center.zoom || 17.5,
        pitch: 58,
        bearing: -25,
        transitionDuration: 1500,
        transitionInterpolator: new FlyToInterpolator(),
      });
    }
  }, []);

  // Load an already-assembled FeatureCollection directly into the renderer
  const loadFeatureCollection = useCallback((parsed, fileName) => {
    setData(parsed);
    setLoadedFileName(fileName);
    setSelectedUnit(null);
    setUnplacedRecords([]);
    centerOnFeatures(parsed.features);
  }, [centerOnFeatures]);

  // Run the full pipeline on raw OCR records
  const runPipelineOnRecords = useCallback(async (records, fileName) => {
    console.log(`[Check 1] Action: INVOKING runFullPipeline() on ${records.length} raw records from "${fileName}"`);
    setPipelineRunning(true);
    setPipelineStatus('Starting pipeline...');
    setFileError(null);

    try {
      const result = await runBrowserPipeline(records, (stage, detail) => {
        setPipelineStatus(detail);
      });

      console.log(`[Check 2] Pipeline Completed for ${result.featureCollection.features.length} features:`);
      result.featureCollection.features.forEach((feat, idx) => {
        const p = feat.properties;
        const coords = feat.geometry.coordinates[0];
        console.log(`  Feature ${idx + 1}: plot_id=${p.plot_id}, village="${p.village}", osm_way_id=${p.osm_way_id}, is_synthetic=${p.osm_way_id === null}`);
        console.log(`    Polygon First 2 Coordinates [lng, lat]:`, JSON.stringify(coords.slice(0, 2)));
      });

      setData(result.featureCollection);
      setUnplacedRecords(result.unplaced_records || []);
      setLoadedFileName(fileName);
      setSelectedUnit(null);
      centerOnFeatures(result.featureCollection.features);

      if (result.unplaced_records?.length > 0) {
        setPipelineStatus(`Done — ${result.stats.features_count} buildings placed, ${result.unplaced_records.length} records unplaced (Tier C)`);
      } else {
        setPipelineStatus(`Done — ${result.stats.features_count} buildings placed`);
      }

      // Clear status after a moment
      setTimeout(() => setPipelineStatus(''), 4000);
    } catch (err) {
      setFileError(`Pipeline error: ${err.message}`);
    } finally {
      setPipelineRunning(false);
    }
  }, [centerOnFeatures]);

  // Handle records pushed from the DocumentScanner (OCR / CSV / Excel)
  const handleScannerRecords = useCallback((records) => {
    console.log(`[Scanner] Received ${records.length} records from Document Scanner`);
    setShowScanner(false);
    runPipelineOnRecords(records, 'Document Scanner');
  }, [runPipelineOnRecords]);

  // Detect input shape and process accordingly
  const processUploadedJson = useCallback((jsonString, fileName = 'Uploaded file') => {
    setFileError(null);
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      setFileError(`Invalid JSON format: The file "${fileName}" could not be parsed. (${e.message})`);
      return;
    }

    const shape = detectInputShape(parsed);
    console.log(`[Check 1] Input File: "${fileName}", Detected Shape: "${shape}"`);

    if (shape === 'feature_collection') {
      console.log(`[Check 1] Branch: feature_collection -> SKIPPING runFullPipeline() (rendering FeatureCollection directly)`);
      if (!Array.isArray(parsed.features)) {
        setFileError(`Invalid "features" property: Must be an array of GeoJSON Feature objects.`);
        return;
      }
      loadFeatureCollection(parsed, fileName);
      return;
    }

    if (shape === 'raw_records') {
      console.log(`[Check 1] Branch: raw_records -> INVOKING runFullPipeline()`);
      runPipelineOnRecords(parsed, fileName);
      return;
    }

    // Unknown shape
    if (!parsed || typeof parsed !== 'object') {
      setFileError(`Invalid JSON: The file "${fileName}" must contain a JSON object or array.`);
      return;
    }
    if (parsed.type && parsed.features) {
      // Looks like GeoJSON but didn't pass validation
      if (!Array.isArray(parsed.features)) {
        setFileError(`Invalid "features" property: Must be an array of GeoJSON Feature objects.`);
        return;
      }
      loadFeatureCollection(parsed, fileName);
    } else {
      setFileError(
        `Unrecognized format: "${fileName}" is neither a GeoJSON FeatureCollection nor a raw OCR records array. ` +
        `Expected either { type: "FeatureCollection", features: [...] } or a flat array of records with village/district/khasra fields.`
      );
    }
  }, [loadFeatureCollection, runPipelineOnRecords]);

  const [scannerInitialFile, setScannerInitialFile] = useState(null);

  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    setFileError(null);
    const ext = file.name.split('.').pop().toLowerCase();

    // If image, PDF, CSV, or Excel -> Route directly to DocumentScanner OCR engine
    if (['jpg', 'jpeg', 'png', 'webp', 'tiff', 'tif', 'bmp', 'pdf', 'csv', 'xlsx', 'xls'].includes(ext)) {
      setScannerInitialFile(file);
      setShowScanner(true);
      setShowHeroPage(false);
      setActiveTab('scanner');
      return;
    }

    // Otherwise treat as GeoJSON / Cadastre JSON
    const reader = new FileReader();
    reader.onload = (e) => {
      processUploadedJson(e.target.result, file.name);
    };
    reader.onerror = () => {
      setFileError(`Failed to read file "${file.name}".`);
    };
    reader.readAsText(file);
  }, [processUploadedJson]);

  // Drag and Drop handlers for entire window/app
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Compute unit statistics (supports floors[] -> divisions[] and legacy units[])
  const { totalUnits, syntheticCount } = useMemo(() => {
    if (!data?.features) return { totalUnits: 0, syntheticCount: 0 };
    let total = 0;
    let synthetic = 0;
    for (const f of data.features) {
      if (Array.isArray(f.properties?.floors)) {
        for (const fl of f.properties.floors) {
          const divs = Array.isArray(fl.divisions) ? fl.divisions : [];
          total += divs.length;
          synthetic += divs.filter((u) => u.is_synthetic).length;
        }
      } else {
        const units = f.properties?.units || [];
        total += units.length;
        synthetic += units.filter((u) => u.is_synthetic).length;
      }
    }
    return { totalUnits: total, syntheticCount: synthetic };
  }, [data]);

  // Compute sorted unique floor numbers from all buildings
  const availableFloors = useMemo(() => {
    if (!data?.features) return [];
    const floorSet = new Set();
    for (const f of data.features) {
      if (Array.isArray(f.properties?.floors)) {
        for (const fl of f.properties.floors) {
          floorSet.add(Number(fl.floor_number) || 1);
        }
      } else if (Array.isArray(f.properties?.units)) {
        for (const u of f.properties.units) {
          floorSet.add(Number(u.floor_number) || 1);
        }
      }
    }
    return Array.from(floorSet).sort((a, b) => a - b);
  }, [data]);

  // Active features
  const activeFeatures = useMemo(() => {
    return data?.features || [];
  }, [data]);

  if (loading) {
    return (
      <div className="status-screen">
        <Loader2 className="spinner" size={38} color="#818cf8" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Rendering 3D Multi-Story Buildings...</h2>
        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Extruding individual floor slices and applying classification shaders</p>
      </div>
    );
  }

  if (error || !data || !data.features || data.features.length === 0) {
    return (
      <div
        className="status-screen"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Pipeline Processing Overlay */}
        {pipelineRunning && (
          <div className="pipeline-overlay">
            <div className="pipeline-modal glass-panel">
              <Loader2 className="spinner" size={36} color="#818cf8" />
              <h3 className="pipeline-title">Processing Land Records</h3>
              <p className="pipeline-status">{pipelineStatus}</p>
              <p className="pipeline-hint">Geocoding involves real network calls — this may take a moment.</p>
            </div>
          </div>
        )}

        <div className="glass-panel" style={{ padding: 24, maxWidth: 440, borderColor: error ? 'rgba(239, 68, 68, 0.4)' : 'rgba(51, 65, 85, 0.6)' }}>
          <AlertCircle size={40} color={error ? '#f87171' : '#fbbf24'} style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: error ? '#fca5a5' : '#fde68a' }}>
            {error ? 'Error Loading Building Data' : 'No Building Features Found'}
          </h2>
          <p style={{ fontSize: 13, color: '#cbd5e1', marginTop: 8, marginBottom: 16 }}>
            {error || 'Drop a GeoJSON FeatureCollection or a raw OCR records JSON array to get started.'}
          </p>

          <label className="btn-control btn-upload-cta" style={{ margin: '0 auto', display: 'inline-flex' }}>
            <UploadCloud size={16} />
            <span>Browse JSON File</span>
            <input
              type="file"
              accept=".json,application/json,application/geo+json"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div
      className="eleven-app-root"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Pipeline Processing Overlay */}
      {pipelineRunning && (
        <div className="pipeline-overlay">
          <div className="pipeline-modal glass-panel">
            <Loader2 className="spinner" size={36} color="#818cf8" />
            <h3 className="pipeline-title">Processing Land Records</h3>
            <p className="pipeline-status">{pipelineStatus}</p>
            <p className="pipeline-hint">Geocoding involves real network calls — this may take a moment.</p>
          </div>
        </div>
      )}

      {/* Mobile Scanner Fullscreen Route */}
      {showMobileScanner && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
          <MobileScanner />
        </div>
      )}

      {/* ─── ELEVENLABS-STYLE SIDEBAR NAVIGATION ─── */}
      <AppSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        userRole={userRole}
        onChangeRole={handleRoleChange}
        pendingReviewCount={storageService.getReviewQueue().filter(q => q.status === 'PENDING_REVIEW').length}
        currentPreset={currentPreset}
        onSelectPreset={handleSelectPreset}
        onFileSelect={handleFileSelect}
        onToggleHero={handleGoToHero}
        onOpenAuth={() => setShowGovAuth(true)}
      />

      {/* ─── MAIN ELEVENLABS DASHBOARD AREA ─── */}
      <div className="eleven-main-area">
        {/* Top Header Bar with Breadcrumbs, Search & Profile */}
        <AppTopBar
          activeTab={activeTab}
          metadata={data?.metadata}
          onResetCamera={handleResetCamera}
          buildingCount={activeFeatures.length}
          unitCount={totalUnits}
          onToggleHero={handleGoToHero}
          onSearchQuery={(q) => {
            if (!q) return;
            const match = data?.features?.find(f =>
              f.properties?.title_details?.owner_name?.toLowerCase().includes(q.toLowerCase()) ||
              f.properties?.title_details?.survey_number?.toLowerCase().includes(q.toLowerCase()) ||
              f.properties?.title_details?.khasra_number?.toLowerCase().includes(q.toLowerCase()) ||
              f.properties?.plot_id?.toLowerCase().includes(q.toLowerCase())
            );
            if (match) {
              handleSelectBuilding(match.properties.plot_id);
            }
          }}
        />

        {/* ─── DEDICATED FULL-PAGE WORKSPACE VIEWS ─── */}
        {activeTab === 'upload' && (
          <div style={{ flex: 1, background: '#f8fafc', overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)' }}>
            <UploadDashboard 
              onFileReady={(file) => {
                setScannerInitialFile(file);
                setShowScanner(true);
                setActiveTab('scanner');
              }} 
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView />
        )}

        {activeTab === 'audit' && (
          <AuditTrailView />
        )}

        {activeTab === 'ailoop' && (
          <AiFeedbackLoopView />
        )}

        {/* ─── 3D MAP & EXPLODED STUDIO WORKSPACE CANVAS ─── */}
        {activeTab !== 'upload' && activeTab !== 'analytics' && activeTab !== 'audit' && activeTab !== 'ailoop' && (
          <div className="eleven-view-container">

            {/* Unplaced Records Badge */}
            {unplacedRecords.length > 0 && (
              <div className="unplaced-badge glass-panel" onClick={() => setShowUnplaced(!showUnplaced)}>
                <AlertTriangle size={14} color="#fbbf24" />
                <span>{unplacedRecords.length} unplaced record{unplacedRecords.length !== 1 ? 's' : ''} (Tier C)</span>
              </div>
            )}

            {/* Unplaced Records Panel */}
            {showUnplaced && unplacedRecords.length > 0 && (
              <div className="unplaced-panel glass-panel">
                <div className="unplaced-panel-header">
                  <h3>Unplaced Records (Tier C)</h3>
                  <button onClick={() => setShowUnplaced(false)} className="file-error-close-btn">
                    <X size={16} />
                  </button>
                </div>
                <div className="unplaced-panel-body">
                  {unplacedRecords.map((rec, i) => (
                    <div key={i} className="unplaced-record-card">
                      <div className="unplaced-record-field"><span>Village:</span> <strong>{rec.village || '—'}</strong></div>
                      <div className="unplaced-record-field"><span>Khasra:</span> {rec.khasra_number || '—'}</div>
                      <div className="unplaced-record-field"><span>Owner:</span> {rec.owner_name || '—'}</div>
                      <div className="unplaced-record-field"><span>Reason:</span> <em>{rec.reason}</em></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Alert Toast / Modal */}
            {fileError && (
              <div className="file-error-toast glass-panel animate-slide-in">
                <div className="file-error-icon">
                  <AlertCircle size={20} color="#f87171" />
                </div>
                <div className="file-error-content">
                  <div className="file-error-title">JSON Load Error</div>
                  <div className="file-error-msg">{fileError}</div>
                </div>
                <button
                  onClick={() => setFileError(null)}
                  className="file-error-close-btn"
                  title="Dismiss error"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Pipeline completion status bar */}
            {pipelineStatus && !pipelineRunning && (
              <div className="pipeline-done-toast glass-panel animate-slide-in">
                <CheckCircle2 size={16} color="#34d399" />
                <span>{pipelineStatus}</span>
              </div>
            )}

            {/* Drag & Drop Full-Screen Overlay */}
            {isDragging && (
              <div className="drag-drop-overlay">
                <div className="drag-drop-box glass-panel">
                  <UploadCloud size={48} color="#818cf8" className="spinner" style={{ animationDuration: '3s' }} />
                  <h3 className="drag-drop-title">Drop GeoJSON or Raw Records Here</h3>
                  <p className="drag-drop-sub">Release to process and render 3D building parcels</p>
                </div>
              </div>
            )}

            {/* 3D Mapbox + Deck.GL Canvas */}
            <MapView
              features={activeFeatures}
              mapTheme={mapTheme}
              viewState={viewState}
              onViewStateChange={({ viewState: nextViewState }) => setViewState(nextViewState)}
              onSelectUnit={handleSelectUnit}
              selectedUnitId={selectedUnit?.unit_id}
              explosionFactor={explosionFactor}
              floorFilter={floorFilter}
            />

            {/* Legend */}
            <Legend
              unitCount={totalUnits}
              syntheticCount={syntheticCount}
            />

            {/* 3D Floor Exploded View & Isolator Controls */}
            {data?.features && data.features.length > 0 && !showScanner && (
              <FloorControlPanel
                explosionFactor={explosionFactor}
                onExplosionChange={setExplosionFactor}
                floorFilter={floorFilter}
                onFloorFilterChange={setFloorFilter}
                availableFloors={availableFloors}
              />
            )}

            {/* Building Directory Side Menu */}
            {showBuildingList && data?.features && data.features.length > 0 && !selectedUnit && (
              <BuildingListPanel
                features={data.features}
                selectedPlotId={selectedUnit?.plot_id}
                onSelectBuilding={handleSelectBuilding}
                onClose={() => setShowBuildingList(false)}
              />
            )}

            {/* Per-Floor Inspection Sidebar */}
            {selectedUnit && (
              <ParcelSidebar
                unit={selectedUnit}
                metadata={data?.metadata}
                onClose={handleCloseSidebar}
              />
            )}

            {/* Document Scanner / OCR / CSV Importer */}
            {showScanner && (
              <DocumentScanner
                initialFile={scannerInitialFile}
                onRecordsReady={handleScannerRecords}
                onRouteToQueue={() => {
                  setShowScanner(false);
                  setScannerInitialFile(null);
                  setShowReviewQueue(true);
                  setActiveTab('review');
                }}
                onClose={() => {
                  setShowScanner(false);
                  setScannerInitialFile(null);
                  setActiveTab('map');
                }}
              />
            )}

            {/* Point 12: Human-in-the-Loop Verification Review Queue Modal */}
            {showReviewQueue && (
              <VerificationQueueModal
                userRole={userRole}
                onApproveRecord={handleApproveQueueRecord}
                onClose={() => {
                  setShowReviewQueue(false);
                  setActiveTab('map');
                }}
              />
            )}

          </div>
        )}
      </div>
      {/* ─── GOVERNMENT ROLE-BASED AUTH MODAL ─── */}
      {showGovAuth && (
        <GovAuthModal
          currentRole={userRole}
          onSelectRole={(newRole) => {
            handleRoleChange(newRole);
          }}
          onAuthSuccess={() => {
            setShowGovAuth(false);
            setShowHeroPage(false);
            handleSelectTab('upload');
          }}
          onClose={() => setShowGovAuth(false)}
        />
      )}

      {/* ─── HERO LANDING OVERVIEW PAGE (PIN DESIGN) ─── */}
      {showHeroPage && !showMobileScanner && (
        <HeroLandingPage
          onLaunchApp={() => handleLaunchStudio('map')}
          onOpenScanner={() => handleLaunchStudio('scanner')}
          onOpenAnalytics={() => handleLaunchStudio('analytics')}
          onAuthSuccess={() => {
            setShowHeroPage(false);
            handleSelectTab('upload');
          }}
          userRole={userRole}
          onChangeRole={handleRoleChange}
        />
      )}
    </div>
  );
}




