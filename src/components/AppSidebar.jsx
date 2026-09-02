import React from 'react';
import {
  Building2, Layers, ShieldCheck, ScanLine, BarChart3, ShieldAlert,
  Lock, BrainCircuit, Ruler, History, Terminal, Database, Upload,
  MapPin, CheckCircle2, UserCheck, ChevronRight, ChevronLeft, FileSpreadsheet,
  Globe, Sun, Moon, HelpCircle, Download, Search, Settings, Sparkles,
  Compass, Eye, FolderKanban, Sliders, X, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { PRESET_DATASETS } from '../services/dataSource';
import { useLanguage } from '../context/LanguageContext';

export default function AppSidebar({
  activeTab = 'map',
  onSelectTab,
  userRole = 'patwari',
  onChangeRole,
  pendingReviewCount = 0,
  violationCount = 0,
  currentPreset = 'svamitva',
  onSelectPreset,
  onFileSelect,
  onToggleHelp,
  onExportDB,
  onToggleHero,
  onOpenAuth,
  isCollapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) {
  const { t } = useLanguage();

  const mainNavItems = [
    { id: 'map', label: t('nav_studio', '3D Studio'), icon: Layers, badge: null },
    { id: 'database', label: t('nav_database', 'Land Database'), icon: Database, badge: null },
    { id: 'upload', label: t('nav_upload', 'Upload & Scan'), icon: Upload, badge: null },
    { id: 'scanner', label: t('nav_scanner', 'Document Scanner'), icon: ScanLine, badge: null },
    { id: 'analytics', label: t('nav_analytics', 'Analytics'), icon: BarChart3, badge: null },
    { id: 'ailoop', label: t('nav_ailoop', 'AI Feedback Loop'), icon: BrainCircuit, badge: null },
  ];

  const handleNavClick = (tabId) => {
    onSelectTab(tabId);
    if (mobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside className={`app-sidebar-eleven ${isCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand-block">
        <div
          className="brand-logo-area clickable-logo"
          onClick={onToggleHero}
          title={isCollapsed ? 'LANDX3D — SVAMITVA 3.0 (Click to view Hero Landing)' : 'Click Logo to view Hero Landing Overview'}
          role="button"
          tabIndex={0}
        >
          <div className="brand-logo-icon">
            <Building2 size={20} color="#ffffff" />
          </div>
          {!isCollapsed && (
            <div className="brand-text-wrap">
              <div className="brand-title">LANDX3D</div>
              <div className="brand-tag">SVAMITVA 3.0</div>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle Button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="sidebar-collapse-toggle-btn desktop-only"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="sidebar-mobile-close-btn mobile-only"
            title="Close Menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="sidebar-scroll-area">
        {/* Main Workspaces */}
        <div className="sidebar-section">
          {!isCollapsed && <div className="sidebar-section-title">Core Workspaces</div>}
          <nav className="sidebar-nav-list">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`sidebar-nav-btn ${isActive ? 'active' : ''} ${isCollapsed ? 'icon-only' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="nav-btn-left">
                    <Icon size={18} className="nav-icon" />
                    {!isCollapsed && <span className="nav-label">{item.label}</span>}
                  </div>
                  {!isCollapsed && item.badge && (
                    <span className="nav-badge" style={{ backgroundColor: item.badgeColor || '#0052FF' }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Datasets & Data Sources */}
        <div className="sidebar-section">
          {!isCollapsed && <div className="sidebar-section-title">Land Datasets</div>}
          <div className="sidebar-presets-list">
            {Object.entries(PRESET_DATASETS).map(([key, item]) => {
              const isSelected = currentPreset === key;
              const shortName = item.name.replace(/ \(.*?\)/, '');
              return (
                <button
                  key={key}
                  onClick={() => {
                    onSelectPreset(key);
                    if (activeTab !== 'map') handleNavClick('map');
                  }}
                  className={`preset-nav-btn ${isSelected ? 'active' : ''} ${isCollapsed ? 'icon-only' : ''}`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Database size={15} className="preset-icon" />
                  {!isCollapsed && (
                    <>
                      <span className="preset-title">{shortName}</span>
                      {isSelected && <div className="preset-active-dot" />}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Role & Quick Actions Profile Footer */}
      <div className="sidebar-footer-profile">
        {isCollapsed ? (
          <div
            className="role-avatar-circle collapsed-avatar"
            onClick={onOpenAuth}
            style={{ cursor: 'pointer', margin: '0 auto' }}
            title={`Role: ${userRole.toUpperCase()} — Click for DSC Token SSO Auth`}
          >
            <UserCheck size={16} color="#0052FF" />
          </div>
        ) : (
          <div className="profile-role-box">
            <div
              className="role-avatar-circle"
              onClick={onOpenAuth}
              style={{ cursor: 'pointer' }}
              title="Open GovPass SSO Digital Authentication"
            >
              <UserCheck size={14} color="#0052FF" />
            </div>
            <div className="role-details">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="role-title-sub">Active Role</span>
                {onOpenAuth && (
                  <button
                    onClick={onOpenAuth}
                    style={{ background: 'none', border: 'none', color: '#0052FF', fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    title="Verify DSC Token & PIN"
                  >
                    SSO Auth ↗
                  </button>
                )}
              </div>
              <select
                value={userRole}
                onChange={(e) => onChangeRole(e.target.value)}
                className="role-selector-eleven"
              >
                <option value="patwari">Patwari (Field Verifier)</option>
                <option value="officer">Revenue Officer (Tehsildar)</option>
                <option value="admin">District Collector / Admin</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
