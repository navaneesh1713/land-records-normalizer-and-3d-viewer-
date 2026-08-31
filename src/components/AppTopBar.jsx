import React, { useState } from 'react';
import {
  Search, MapPin, RefreshCw, Compass
} from 'lucide-react';

export default function AppTopBar({
  activeTab = 'map',
  metadata,
  onResetCamera,
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
      case 'upload': return 'Document Ingestion Portal';
      case 'map': return '3D Studio';
      case 'review': return 'Review Workstation';
      case 'scanner': return 'Document Scanner';
      case 'analytics': return 'Analytics';
      case 'audit': return 'Audit Trail';
      case 'ailoop': return 'AI Learning Loop';
      default: return 'Studio';
    }
  };

  return (
    <header className="app-topbar-eleven">
      {/* Left: Current View & Location Pin */}
      <div className="topbar-left-breadcrumbs">
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

      {/* Right: Actions & Profile */}
      <div className="topbar-right-actions">
        {onToggleHero && (
          <button onClick={onToggleHero} className="topbar-pill-btn" title="Hero Overview Landing Page">
            <Compass size={13} color="#4f46e5" />
            <span>Overview</span>
          </button>
        )}

        {onResetCamera && (
          <button onClick={onResetCamera} className="topbar-icon-btn" title="Reset Camera View">
            <RefreshCw size={14} color="#64748b" />
          </button>
        )}

      </div>
    </header>
  );
}
