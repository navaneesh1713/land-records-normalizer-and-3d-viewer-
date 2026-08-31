import React, { useRef } from 'react';
import {
  Building2, Sun, Moon, Globe, MapPin, RefreshCw, Upload, Database,
  ScanLine, ShieldAlert, Ruler, History, HelpCircle, ShieldCheck,
  BrainCircuit, Lock, BarChart3, Terminal, Download, UserCheck
} from 'lucide-react';
import { PRESET_DATASETS } from '../services/dataSource';
import { storageService } from '../services/storageService';

export default function Header({
  metadata,
  mapTheme = 'dark',
  onChangeTheme,
  onResetCamera,
  onFileSelect,
  onSelectPreset,
  currentPreset = 'svamitva',
  buildingCount = 0,
  unitCount = 0,
  stepTitle = "SVAMITVA 3D Cadastre",
  showBuildingList = false,
  onToggleBuildingList,
  showScanner = false,
  onToggleScanner,
  showHelp = false,
  onToggleHelp,
  // New Government Core props
  userRole = 'patwari',
  onChangeRole,
  pendingReviewCount = 0,
  showReviewQueue = false,
  onToggleReviewQueue,
  showAiLog = false,
  onToggleAiLog,
  showAuditTrail = false,
  onToggleAuditTrail,
  showAnalytics = false,
  onToggleAnalytics,
  onToggleHero,
}) {
  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
    e.target.value = '';
  };

  const cycleTheme = () => {
    if (!onChangeTheme) return;
    if (mapTheme === 'dark') onChangeTheme('light');
    else if (mapTheme === 'light') onChangeTheme('satellite');
    else onChangeTheme('dark');
  };

  const handleExportDB = () => {
    storageService.exportDatabaseDump();
  };

  return (
    <header className="header-wrapper">
      {/* Title & Metadata Card + Role Badge */}
      <div className="header-left">
        <div className="glass-panel brand-card">
          <div className="brand-icon">
            <Building2 size={20} />
          </div>
          <div>
            <div className="brand-title-row">
              <h1 className="brand-title">3D Land Records Normalizer & Viewer</h1>
              <span className="step-badge">{stepTitle}</span>
            </div>
            <div className="meta-subtitle-row">
              <p className="meta-subtitle">
                <MapPin size={13} />
                <span>
                  {metadata?.village ? `${metadata.village}, ${metadata.tehsil} (${metadata.district})` : 'Parcels Map'}
                </span>
                <span className="meta-dot">•</span>
                <span className="meta-highlight">{buildingCount} buildings</span>
                <span className="meta-dot">•</span>
                <span className="meta-highlight">{unitCount} floor units</span>
              </p>
            </div>
          </div>
        </div>

        {/* Role Selector Badge (RBAC Point 14) */}
        {onChangeRole && (
          <div className="glass-panel role-switcher-card" title="Switch User Role & Permissions (RBAC)">
            <UserCheck size={14} color="#6366f1" />
            <span className="role-label">Role:</span>
            <select
              value={userRole}
              onChange={(e) => onChangeRole(e.target.value)}
              className="role-selector-select"
            >
              <option value="patwari">Patwari (Field Verifier)</option>
              <option value="officer">Revenue Officer (Tehsildar)</option>
              <option value="admin">Collector / Admin</option>
            </select>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="header-right">
        <div className="glass-panel controls-bar">
          {/* Dataset Group */}
          <div className="control-group">
            {onSelectPreset && (
              <div className="preset-selector-wrap">
                <Database size={13} color="#ca8a04" />
                <select
                  value={currentPreset}
                  onChange={(e) => onSelectPreset(e.target.value)}
                  className="floor-control-select"
                  style={{ width: 'auto', minWidth: 155, padding: '4px 20px 4px 6px', fontSize: 11 }}
                  title="Select Real Government Cadastre Dataset"
                >
                  {Object.entries(PRESET_DATASETS).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json,application/geo+json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              id="json-file-input"
            />
            <button
              onClick={handleButtonClick}
              className="btn-control"
              title="Upload or Browse GeoJSON File"
            >
              <Upload size={13} color="#854d0e" />
              <span>Load JSON</span>
            </button>
          </div>

          <div className="control-separator" />

          {/* Core SIH Government Workflow Tools */}
          <div className="control-group">
            {/* 1. OCR Scanner */}
            {onToggleScanner && (
              <button
                onClick={onToggleScanner}
                className={`btn-control ${showScanner ? 'btn-control-active' : ''}`}
                title="Open Document Scanner (OCR & Ingestion)"
              >
                <ScanLine size={13} color="#ca8a04" />
                <span>Scanner</span>
              </button>
            )}

            {/* 2. Review Queue (HITL) */}
            {onToggleReviewQueue && (
              <button
                onClick={onToggleReviewQueue}
                className={`btn-control ${showReviewQueue ? 'btn-control-active' : ''} ${pendingReviewCount > 0 ? 'btn-queue-alert' : ''}`}
                title="Human-in-the-Loop Verification Review Queue"
              >
                <ShieldCheck size={13} color={pendingReviewCount > 0 ? '#f59e0b' : '#10b981'} />
                <span>Review</span>
                {pendingReviewCount > 0 && (
                  <span className="queue-count-pill">{pendingReviewCount}</span>
                )}
              </button>
            )}

            {/* 3. AI Learning Log */}
            {onToggleAiLog && (
              <button
                onClick={onToggleAiLog}
                className={`btn-control ${showAiLog ? 'btn-control-active' : ''}`}
                title="Continuous AI Learning & Model Improvement Log"
              >
                <BrainCircuit size={13} color="#8b5cf6" />
                <span>AI Loop</span>
              </button>
            )}

            {/* 4. Audit Trail */}
            {onToggleAuditTrail && (
              <button
                onClick={onToggleAuditTrail}
                className={`btn-control ${showAuditTrail ? 'btn-control-active' : ''}`}
                title="Secure Document Repository & Immutable Audit Trail"
              >
                <Lock size={13} color="#059669" />
                <span>Audit</span>
              </button>
            )}

            {/* 5. Executive Analytics Dashboard */}
            {onToggleAnalytics && (
              <button
                onClick={onToggleAnalytics}
                className={`btn-control ${showAnalytics ? 'btn-control-active' : ''}`}
                title="Executive District & State Cadastre Analytics Dashboard"
              >
                <BarChart3 size={13} color="#2563eb" />
                <span>Analytics</span>
              </button>
            )}

          </div>

          <div className="control-separator" />

          {/* Basemap & Settings Group */}
          <div className="control-group">
            {onChangeTheme && (
              <button
                onClick={cycleTheme}
                className="btn-control"
                title={`Current basemap: ${mapTheme.toUpperCase()}. Click to cycle (Dark -> Light -> Satellite)`}
              >
                {mapTheme === 'satellite' ? (
                  <>
                    <Globe size={13} color="#38bdf8" />
                    <span>Satellite</span>
                  </>
                ) : mapTheme === 'light' ? (
                  <>
                    <Sun size={13} color="#eab308" />
                    <span>Light</span>
                  </>
                ) : (
                  <>
                    <Moon size={13} color="#94a3b8" />
                    <span>Dark</span>
                  </>
                )}
              </button>
            )}

            {onToggleBuildingList && (
              <button
                onClick={onToggleBuildingList}
                className={`btn-control ${showBuildingList ? 'btn-control-active' : ''}`}
                title="Toggle Building Directory Panel"
              >
                <Building2 size={13} color="#ca8a04" />
                <span>Buildings ({buildingCount})</span>
              </button>
            )}

            <button
              onClick={handleExportDB}
              className="btn-control"
              title="Export Full Database & PostGIS State Dump (JSON)"
            >
              <Download size={13} color="#10b981" />
              <span>DB Sync</span>
            </button>


            {onToggleHelp && (
              <button
                onClick={onToggleHelp}
                className={`btn-control ${showHelp ? 'btn-control-active' : ''}`}
                title="3D Navigation & Controls Guide"
              >
                <HelpCircle size={13} color="#64748b" />
                <span>Help</span>
              </button>
            )}

            {onResetCamera && (
              <button
                onClick={onResetCamera}
                className="btn-control"
                title="Reset Camera Orientation"
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
