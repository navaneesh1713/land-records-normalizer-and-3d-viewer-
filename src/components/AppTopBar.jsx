import React, { useState } from 'react';
import {
  Search, Globe, Sun, Moon, HelpCircle, Download, Bell,
  ChevronRight, Folder, MapPin, Sparkles, Building2, RefreshCw, Compass
} from 'lucide-react';

export default function AppTopBar({
  activeTab = 'map',
  metadata,
  mapTheme = 'light',
  onChangeTheme,
  onResetCamera,
  onToggleHelp,
  onExportDB,
  buildingCount = 0,
  unitCount = 0,
  onSearchQuery,
  onToggleHero,
}) {
  const [searchVal, setSearchVal] = useState('');

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchVal(val);
    if (onSearchQuery) onSearchQuery(val);
  };

  const getBreadcrumbLabel = () => {
    switch (activeTab) {
      case 'map': return '3D Cadastre Map Studio';
      case 'review': return 'Human-in-the-Loop Review Workstation';
      case 'scanner': return 'Document OCR Scanner & Importer';
      case 'analytics': return 'Executive Collector Analytics';
      case 'auditor': return 'FAR Violation & Dispute Auditor';
      case 'audit': return 'Secure Document Vault & Audit Trail';
      case 'ailoop': return 'Continuous AI Learning Loop';
      case 'timeline': return '4D Mutation Historical Timeline';
      case 'ruler': return 'Spatial Measurement & Unit Converter';
      case 'api': return 'REST API Gateway & OpenAPI Console';
      default: return 'Cadastre Workspace';
    }
  };

  return (
    <header className="app-topbar-eleven">
      {/* Left: Breadcrumbs & Location Pin */}
      <div className="topbar-left-breadcrumbs">
        <Folder size={14} className="crumb-icon" />
        <span className="crumb-root">Cadastre</span>
        <ChevronRight size={12} className="crumb-sep" />
        <span className="crumb-current">{getBreadcrumbLabel()}</span>

        {metadata?.village && (
          <div className="topbar-location-pill">
            <MapPin size={11} color="#6366f1" />
            <span>{metadata.village}, {metadata.tehsil}</span>
            <span className="pill-stat-tag">{buildingCount} bldgs · {unitCount} units</span>
          </div>
        )}
      </div>

      {/* Center: Universal Quick Search */}
      <div className="topbar-center-search">
        <div className="search-input-wrapper">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search parcels, survey no (e.g. 48/2), owner name..."
            value={searchVal}
            onChange={handleSearchChange}
            className="topbar-search-field"
          />
          <span className="search-shortcut-badge">⌘K</span>
        </div>
      </div>

      {/* Right: Actions, Theme, DB Export & Profile */}
      <div className="topbar-right-actions">
        {onToggleHero && (
          <button onClick={onToggleHero} className="topbar-pill-btn" title="Hero Overview Landing Page">
            <Compass size={13} color="#4f46e5" />
            <span>Overview</span>
          </button>
        )}

        <button onClick={onExportDB} className="topbar-pill-btn" title="Export Full Database & PostGIS Dump (JSON)">
          <Download size={13} color="#10b981" />
          <span>Export DB</span>
        </button>

        {/* Basemap Switcher */}
        {onChangeTheme && (
          <button
            onClick={() => {
              if (mapTheme === 'dark') onChangeTheme('light');
              else if (mapTheme === 'light') onChangeTheme('satellite');
              else onChangeTheme('dark');
            }}
            className="topbar-icon-btn"
            title={`Basemap: ${mapTheme.toUpperCase()}. Click to switch.`}
          >
            {mapTheme === 'satellite' ? (
              <Globe size={15} color="#0284c7" />
            ) : mapTheme === 'light' ? (
              <Sun size={15} color="#eab308" />
            ) : (
              <Moon size={15} color="#64748b" />
            )}
          </button>
        )}

        {onResetCamera && (
          <button onClick={onResetCamera} className="topbar-icon-btn" title="Reset Camera View">
            <RefreshCw size={14} color="#64748b" />
          </button>
        )}

        {onToggleHelp && (
          <button onClick={onToggleHelp} className="topbar-icon-btn" title="3D Navigation Help Guide">
            <HelpCircle size={15} color="#64748b" />
          </button>
        )}

        {/* User Status Profile Icon */}
        <div className="topbar-user-avatar" title="Official Indian Land Records Session">
          <span>GOV</span>
          <div className="user-online-dot" />
        </div>
      </div>
    </header>
  );
}
