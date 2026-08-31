import React from 'react';
import {
  Building2, Layers, ShieldCheck, ScanLine, BarChart3, ShieldAlert,
  Lock, BrainCircuit, Ruler, History, Terminal, Database, Upload,
  MapPin, CheckCircle2, UserCheck, ChevronRight, FileSpreadsheet,
  Globe, Sun, Moon, HelpCircle, Download, Search, Settings, Sparkles,
  Compass, Eye, FolderKanban, Sliders
} from 'lucide-react';
import { PRESET_DATASETS } from '../services/dataSource';

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
}) {
  const fileInputRef = React.useRef(null);

  const mainNavItems = [
    { id: 'map', label: '3D Studio', icon: Layers, badge: null },
    { id: 'database', label: 'Land Database', icon: Database, badge: null },
    { id: 'upload', label: 'Upload & Scan', icon: Upload, badge: null },
    { id: 'scanner', label: 'Document Scanner', icon: ScanLine, badge: null },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: null },
    { id: 'ailoop', label: 'AI Feedback Loop', icon: BrainCircuit, badge: null },
  ];

  return (
    <aside className="app-sidebar-eleven">
      {/* Brand Header (Clickable Logo to view Hero Landing page) */}
      <div
        className="sidebar-brand-block clickable-logo"
        onClick={onToggleHero}
        title="Click Logo to view Hero Landing Overview"
        role="button"
        tabIndex={0}
      >
        <div className="brand-logo-icon">
          <Building2 size={20} color="#ffffff" />
        </div>
        <div className="brand-text-wrap">
          <div className="brand-title">LANDX3D</div>
          <div className="brand-tag">SVAMITVA 3.0</div>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="sidebar-scroll-area">
        {/* Main Workspaces */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Core Workspaces</div>
          <nav className="sidebar-nav-list">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                >
                  <div className="nav-btn-left">
                    <Icon size={16} className="nav-icon" />
                    <span className="nav-label">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="nav-badge" style={{ backgroundColor: item.badgeColor || '#6366f1' }}>
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
          <div className="sidebar-section-title">Land Datasets</div>
          <div className="sidebar-presets-list">
            {Object.entries(PRESET_DATASETS).map(([key, item]) => {
              const isSelected = currentPreset === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    onSelectPreset(key);
                    if (activeTab !== 'map') onSelectTab('map');
                  }}
                  className={`preset-nav-btn ${isSelected ? 'active' : ''}`}
                >
                  <Database size={13} className="preset-icon" />
                  <span className="preset-title">{item.name.replace(/ \(.*?\)/, '')}</span>
                  {isSelected && <div className="preset-active-dot" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Role & Quick Actions Profile Footer */}
      <div className="sidebar-footer-profile">
        <div className="profile-role-box">
          <div
            className="role-avatar-circle"
            onClick={onOpenAuth}
            style={{ cursor: 'pointer' }}
            title="Open GovPass SSO Digital Authentication"
          >
            <UserCheck size={14} color="#4f46e5" />
          </div>
          <div className="role-details">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="role-title-sub">Active Role</span>
              {onOpenAuth && (
                <button
                  onClick={onOpenAuth}
                  style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: 0 }}
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
      </div>
    </aside>
  );
}
