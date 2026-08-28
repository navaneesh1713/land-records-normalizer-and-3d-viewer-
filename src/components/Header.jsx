import React, { useRef } from 'react';
import { Building2, Sun, Moon, MapPin, RefreshCw, Upload, FileUp } from 'lucide-react';

export default function Header({
  metadata,
  mapTheme,
  onToggleTheme,
  onResetCamera,
  onFileSelect,
  buildingCount = 0,
  unitCount = 0,
  stepTitle = "3D Multi-Story Building View",
  showBuildingList = false,
  onToggleBuildingList,
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
    // Reset so same file can be re-selected if needed
    e.target.value = '';
  };

  return (
    <header className="header-wrapper">
      {/* Title & Metadata Card */}
      <div className="header-left">
        <div className="glass-panel brand-card">
          <div className="brand-icon">
            <Building2 size={20} />
          </div>
          <div>
            <div className="brand-title-row">
              <h1 className="brand-title">3D Multi-Story Land Parcel Viewer</h1>
              <span className="step-badge">{stepTitle}</span>
            </div>
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

      {/* Controls Bar */}
      <div className="header-right">
        <div className="glass-panel controls-bar">
          {/* File Upload Button */}
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
            className="btn-control btn-upload"
            title="Upload or Browse GeoJSON File"
          >
            <Upload size={14} color="#818cf8" />
            <span>Load JSON</span>
          </button>

          <button
            onClick={onToggleTheme}
            className="btn-control"
            title={`Switch to ${mapTheme === 'dark' ? 'Light' : 'Dark'} style`}
          >
            {mapTheme === 'dark' ? (
              <>
                <Sun size={15} color="#f59e0b" />
                <span>Light Map</span>
              </>
            ) : (
              <>
                <Moon size={15} color="#818cf8" />
                <span>Dark Map</span>
              </>
            )}
          </button>

          {onToggleBuildingList && (
            <button
              onClick={onToggleBuildingList}
              className={`btn-control ${showBuildingList ? 'btn-control-active' : ''}`}
              title="Toggle Building Directory Panel"
            >
              <Building2 size={14} color="#818cf8" />
              <span>Buildings ({buildingCount})</span>
            </button>
          )}

          {onResetCamera && (
            <button
              onClick={onResetCamera}
              className="btn-control"
              title="Reset Camera Orientation"
            >
              <RefreshCw size={14} />
              <span>Reset View</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
