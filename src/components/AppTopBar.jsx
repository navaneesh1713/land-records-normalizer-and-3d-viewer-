import React, { useState } from 'react';
import {
  Search, MapPin, RefreshCw, Compass, Menu, PanelLeftOpen, PanelLeftClose, X
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { useLanguage } from '../context/LanguageContext';

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
  const { t } = useLanguage();

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchVal(val);
    if (onSearchQuery) onSearchQuery(val);
  };

  const getBreadcrumbLabel = () => {
    switch (activeTab) {
      case 'database': return t('nav_database', 'Land Database');
      case 'upload': return t('nav_upload', 'Upload & Scan');
      case 'map': return t('nav_studio', '3D Studio');
      case 'review': return 'Review Queue';
      case 'scanner': return t('nav_scanner', 'Document Scanner');
      case 'analytics': return t('nav_analytics', 'Analytics Dashboard');
      case 'audit': return t('nav_audit', 'Audit Trail');
      case 'ailoop': return t('nav_ailoop', 'AI Learning Loop');
      default: return t('nav_studio', '3D Studio');
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
            title={t('open_menu', 'Open Menu')}
          >
            <Menu size={18} />
          </button>
        )}

        {/* Desktop Sidebar Toggle Button */}
        {onToggleSidebarCollapse && (
          <button
            onClick={onToggleSidebarCollapse}
            className="topbar-icon-btn desktop-only"
            title={isSidebarCollapsed ? t('expand_sidebar', 'Expand Sidebar') : t('collapse_sidebar', 'Collapse Sidebar')}
            style={{ marginRight: 4 }}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={16} color="#0052FF" /> : <PanelLeftClose size={16} color="#5B616E" />}
          </button>
        )}

        <span className="crumb-current">{getBreadcrumbLabel()}</span>

        {metadata?.village && (
          <div className="topbar-location-pill desktop-only">
            <MapPin size={11} color="#0052FF" />
            <span>{metadata.village}, {metadata.tehsil}</span>
            <span className="pill-stat-tag">{buildingCount} {t('buildings', 'bldgs')} · {unitCount} {t('units', 'units')}</span>
          </div>
        )}
      </div>

      {/* Center: Universal Quick Search */}
      <div className="topbar-center-search">
        <div className="search-input-wrapper">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder={t('search_placeholder', 'Search parcels, survey no, khasra, owner...')}
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

      {/* Right: Actions, Language Selector & Camera Reset */}
      <div className="topbar-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LanguageSelector />

        {onResetCamera && (
          <button onClick={onResetCamera} className="topbar-icon-btn" title={t('reset_camera', 'Reset Camera View')}>
            <RefreshCw size={14} color="#64748b" />
          </button>
        )}
      </div>
    </header>
  );
}
