import React, { useState } from 'react';
import {
  Search, MapPin, RefreshCw, Compass, Menu, PanelLeftOpen, PanelLeftClose, X
} from 'lucide-react';

export default function AppTopBar({
  activeTab = 'map',
  metadata,
  onResetCamera,
  buildingCount = 0,
  unitCount = 0,
  onSearchQuery,
  onToggleHero,
  onToggleMobileMenu,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
}) {
  const [searchVal, setSearchVal] = useState('');

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchVal(val);
    if (onSearchQuery) onSearchQuery(val);
  };

  const getBreadcrumbLabel = () => {
    switch (activeTab) {
      case 'database': return 'Land Database';
      case 'upload': return 'Document Upload';
      case 'map': return '3D Studio';
      case 'review': return 'Review Queue';
      case 'scanner': return 'Document Scanner';
      case 'analytics': return 'Analytics Dashboard';
      case 'audit': return 'Audit Trail';
      case 'ailoop': return 'AI Learning Loop';
      default: return 'Studio';
    }
  };

  return (
    <header className="app-topbar-eleven">
      {/* Left: Mobile Menu Button + Collapse Toggle + Breadcrumbs */}
      <div className="topbar-left-breadcrumbs">
        {/* Mobile Hamburger Button */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="topbar-menu-btn mobile-only"
            title="Open Menu"
          >
            <Menu size={18} />
          </button>
        )}

        {/* Desktop Sidebar Toggle Button */}
        {onToggleSidebarCollapse && (
          <button
            onClick={onToggleSidebarCollapse}
            className="topbar-icon-btn desktop-only"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            style={{ marginRight: 4 }}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={16} color="#6366f1" /> : <PanelLeftClose size={16} color="#64748b" />}
          </button>
        )}

        <span className="crumb-current">{getBreadcrumbLabel()}</span>

        {metadata?.village && (
          <div className="topbar-location-pill desktop-only">
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
            placeholder="Search parcels, survey no, owner..."
            value={searchVal}
            onChange={handleSearchChange}
            className="topbar-search-field"
          />
          {searchVal ? (
            <button
              onClick={() => {
                setSearchVal('');
                if (onSearchQuery) onSearchQuery('');
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8', display: 'flex' }}
            >
              <X size={12} />
            </button>
          ) : (
            <span className="search-shortcut-badge desktop-only">⌘K</span>
          )}
        </div>
      </div>

      {/* Right: Actions & Profile */}
      <div className="topbar-right-actions">
        {onResetCamera && (
          <button onClick={onResetCamera} className="topbar-icon-btn" title="Reset Camera View">
            <RefreshCw size={14} color="#64748b" />
          </button>
        )}
      </div>
    </header>
  );
}
