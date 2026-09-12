import React, { useState, useEffect, useRef } from 'react';
import {
  Search, MapPin, RefreshCw, Compass, Menu, PanelLeftOpen, PanelLeftClose, X,
  CreditCard, Globe, Building, CheckCircle2, ExternalLink, Layers, ShieldCheck,
  ChevronRight, Sparkles, UserCheck, AlertCircle, ArrowRight, Check
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { useLanguage } from '../context/LanguageContext';
import { storageService } from '../services/storageService';
import { supabaseService, normalizeAadhaarKey, normalizeUlpinKey } from '../services/supabaseClient';

export default function AppTopBar({
  activeTab = 'map',
  metadata,
  onResetCamera,
  buildingCount = 0,
  unitCount = 0,
  onSearchQuery,
  onSelectLandRecord,
  onToggleHero,
  onToggleMobileMenu,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
}) {
  const [searchVal, setSearchVal] = useState('');
  const [searchMode, setSearchMode] = useState('aadhaar'); // 'aadhaar' | 'ulpin'
  const [activeMenuTab, setActiveMenuTab] = useState('aadhaar'); // 'aadhaar' | 'ulpin' | 'registry'
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const { t } = useLanguage();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dual-mode search: debounced execution
  useEffect(() => {
    let cancelled = false;

    async function performSearch() {
      const q = searchVal.trim();
      const allRecords = storageService.getDatabaseRecords() || [];

      if (!q) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);

      try {
        if (searchMode === 'aadhaar') {
          // Mode 1: Search by Aadhaar Number -> Retrieve all land records of that owner
          const rawQ = normalizeAadhaarKey(q);

          let matches = await supabaseService.getRecordsByAadhaar(rawQ || q);
          if (!matches || matches.length === 0) {
            matches = allRecords.filter((r) => {
              const recAadhaar = normalizeAadhaarKey(r.aadhaar_number);
              const recOwner = (r.owner_name || '').toLowerCase();
              return (
                recAadhaar.includes(rawQ) ||
                (rawQ.length >= 4 && recAadhaar.endsWith(rawQ)) ||
                recOwner.includes(q.toLowerCase())
              );
            });
          }

          if (!cancelled) {
            setSearchResults(matches);
          }
        } else {
          // Mode 2: Search by ULPIN -> Retrieve the exact land record of the landlord
          const cleanUlpin = normalizeUlpinKey(q);

          let exactMatch = await supabaseService.getRecordByULPIN(cleanUlpin);
          if (!exactMatch) {
            exactMatch = allRecords.find((r) => {
              const rUlpin = normalizeUlpinKey(r.ulpin);
              return rUlpin.includes(cleanUlpin) || (r.ulpin && r.ulpin.toLowerCase().includes(q.toLowerCase()));
            });
          }

          if (!cancelled) {
            setSearchResults(exactMatch ? [exactMatch] : []);
          }
        }
      } catch (err) {
        console.warn('Search query error:', err);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }

    performSearch();

    return () => {
      cancelled = true;
    };
  }, [searchVal, searchMode]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchVal(val);
    setIsDropdownOpen(true);
    if (onSearchQuery) onSearchQuery(val);
  };

  const handleSelectResult = (record) => {
    setIsDropdownOpen(false);
    if (onSelectLandRecord) {
      onSelectLandRecord(record);
    }
  };

  const handleQuickDemoSelect = (mode, queryVal) => {
    setSearchMode(mode);
    setActiveMenuTab(mode);
    setSearchVal(queryVal);
    setIsDropdownOpen(true);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
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

  // Group records by Aadhaar for Aadhaar mode so all records for a citizen appear together
  const ownerGroups = React.useMemo(() => {
    if (searchMode !== 'aadhaar' || searchResults.length === 0) return null;
    const groups = {};
    searchResults.forEach((rec) => {
      const key = normalizeAadhaarKey(rec.aadhaar_number) || (rec.owner_name || '').toLowerCase().trim();
      if (!groups[key]) {
        groups[key] = {
          owner_name: rec.owner_name || 'Registered Landholder',
          aadhaar_number: rec.aadhaar_number || 'XXXX-XXXX-8492',
          aadhaar_verified: rec.aadhaar_verified ?? true,
          records: [],
        };
      }
      groups[key].records.push(rec);
    });
    return Object.values(groups);
  }, [searchResults, searchMode]);

  return (
    <header className="app-topbar-eleven">
      {/* Left: Mobile Menu Button + Collapse Toggle + Breadcrumbs */}
      <div className="topbar-left-breadcrumbs">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="topbar-menu-btn mobile-only"
            title={t('open_menu', 'Open Menu')}
          >
            <Menu size={18} />
          </button>
        )}

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

      {/* Center: Dual-Mode Smart Search with Pinterest-style Two-Column Dropdown */}
      <div className="topbar-center-search" ref={dropdownRef} style={{ position: 'relative' }}>
        <div className="search-input-wrapper">
          <Search size={14} className="search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={
              searchMode === 'aadhaar'
                ? 'Enter Aadhaar No. (e.g. 8492 or XXXX-XXXX-8492)...'
                : 'Enter 14-Digit ULPIN (e.g. 29841029471024)...'
            }
            value={searchVal}
            onChange={handleSearchChange}
            onFocus={() => setIsDropdownOpen(true)}
            className="topbar-search-field"
          />

          {searchVal ? (
            <button
              onClick={() => {
                setSearchVal('');
                setSearchResults([]);
                if (onSearchQuery) onSearchQuery('');
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8', display: 'flex' }}
            >
              <X size={13} />
            </button>
          ) : (
            <span className="search-shortcut-badge desktop-only" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {searchMode === 'aadhaar' ? (
                <>
                  <CreditCard size={12} color="#0052FF" />
                  <span>Aadhaar Mode</span>
                </>
              ) : (
                <>
                  <Globe size={12} color="#059669" />
                  <span>ULPIN Mode</span>
                </>
              )}
            </span>
          )}
        </div>

        {/* ─── TWO-COLUMN PINTEREST TEMPLATE SPLIT DROPDOWN ─── */}
        {isDropdownOpen && (
          <div className="topbar-split-dropdown">
            {/* Left Column: Features / Retrieval Modes */}
            <div className="split-dropdown-left">
              <div className="split-col-heading">RETRIEVAL MODES</div>

              <div className="split-menu-list">
                {/* Option 1: By Owner Aadhaar */}
                <div
                  className={`split-menu-item ${activeMenuTab === 'aadhaar' ? 'active' : ''}`}
                  onMouseEnter={() => setActiveMenuTab('aadhaar')}
                  onClick={() => {
                    setActiveMenuTab('aadhaar');
                    setSearchMode('aadhaar');
                    if (searchInputRef.current) searchInputRef.current.focus();
                  }}
                >
                  <div className="split-item-icon-box aadhaar-icon">
                    <CreditCard size={18} />
                  </div>
                  <div className="split-item-text">
                    <div className="split-item-title">By Owner Aadhaar</div>
                    <div className="split-item-desc">Retrieve portfolio of all land parcels & flats</div>
                  </div>
                  {activeMenuTab === 'aadhaar' && (
                    <div className="split-item-arrow">
                      <ArrowRight size={14} />
                    </div>
                  )}
                </div>

                {/* Option 2: By 14-Digit ULPIN */}
                <div
                  className={`split-menu-item ${activeMenuTab === 'ulpin' ? 'active' : ''}`}
                  onMouseEnter={() => setActiveMenuTab('ulpin')}
                  onClick={() => {
                    setActiveMenuTab('ulpin');
                    setSearchMode('ulpin');
                    if (searchInputRef.current) searchInputRef.current.focus();
                  }}
                >
                  <div className="split-item-icon-box ulpin-icon">
                    <Globe size={18} />
                  </div>
                  <div className="split-item-text">
                    <div className="split-item-title">By 14-Digit ULPIN</div>
                    <div className="split-item-desc">Retrieve exact cadastral deed & 3D polygon</div>
                  </div>
                  {activeMenuTab === 'ulpin' && (
                    <div className="split-item-arrow">
                      <ArrowRight size={14} />
                    </div>
                  )}
                </div>

                {/* Option 3: Verified Citizens Registry */}
                <div
                  className={`split-menu-item ${activeMenuTab === 'registry' ? 'active' : ''}`}
                  onMouseEnter={() => setActiveMenuTab('registry')}
                  onClick={() => {
                    setActiveMenuTab('registry');
                    setSearchMode('aadhaar');
                  }}
                >
                  <div className="split-item-icon-box registry-icon">
                    <UserCheck size={18} />
                  </div>
                  <div className="split-item-text">
                    <div className="split-item-title">Verified Citizens</div>
                    <div className="split-item-desc">Pre-verified titleholder test cases (2 & 1 records)</div>
                  </div>
                  {activeMenuTab === 'registry' && (
                    <div className="split-item-arrow">
                      <ArrowRight size={14} />
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom hint */}
              <div className="split-left-footer">
                <span className="badge-demo-note">Digital India Land Records • DILRMP Stack</span>
              </div>
            </div>

            {/* Right Column: Contextual Options or Live Search Results */}
            <div className="split-dropdown-right">
              {isSearching ? (
                <div className="split-loading-box">
                  <div className="spinner-sm" />
                  <span>Searching national cadastre & database...</span>
                </div>
              ) : searchResults.length > 0 ? (
                /* LIVE RESULTS */
                <div className="split-results-container">
                  <div className="split-right-header">
                    <div className="split-right-title">
                      Found {searchResults.length} {searchResults.length === 1 ? 'Cadastral Record' : 'Cadastral Records'}
                    </div>
                    <div className="split-right-sub">
                      Query matched {searchMode === 'aadhaar' ? 'Aadhaar identity' : '14-digit ULPIN geometry'}. Click any parcel to extrude in 3D.
                    </div>
                  </div>

                  {searchMode === 'aadhaar' && ownerGroups ? (
                    <div className="split-aadhaar-groups">
                      {ownerGroups.map((grp, gIdx) => (
                        <div key={gIdx} className="split-group-card">
                          <div className="split-group-top">
                            <div className="split-group-owner">
                              <UserCheck size={15} color="#0052FF" />
                              <span className="name">{grp.owner_name}</span>
                            </div>
                            <div className="split-group-tags">
                              <span className="aadhaar-tag">{grp.aadhaar_number}</span>
                              <span className="count-tag">{grp.records.length} {grp.records.length === 1 ? 'Record' : 'Records'}</span>
                            </div>
                          </div>

                          <div className="split-parcel-list">
                            {grp.records.map((rec, rIdx) => (
                              <div
                                key={rIdx}
                                className="split-parcel-item"
                                onClick={() => handleSelectResult(rec)}
                              >
                                <div className="parcel-left">
                                  <div className="parcel-title-row">
                                    <span className="survey-badge">Survey {rec.survey_number || rec.khasra_number}</span>
                                    <span className="bldg-title">{rec.building_name || 'Cadastre Plot'}</span>
                                  </div>
                                  <div className="parcel-addr-row">
                                    <MapPin size={11} />
                                    <span>{[rec.house_number, rec.locality, rec.village_city || rec.village].filter(Boolean).join(', ')}</span>
                                  </div>
                                </div>
                                <div className="parcel-right">
                                  <span className="ulpin-chip">{rec.ulpin}</span>
                                  <span className="area-text">{rec.area_sqm ? `${rec.area_sqm} sq.m` : `${rec.size} ${rec.size_unit}`}</span>
                                  <button type="button" className="btn-3d-jump">
                                    <span>3D</span>
                                    <ArrowRight size={11} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* ULPIN Single Exact Match */
                    <div className="split-ulpin-exact-view">
                      {searchResults.map((rec, idx) => (
                        <div key={idx} className="split-ulpin-card" onClick={() => handleSelectResult(rec)}>
                          <div className="ulpin-card-header">
                            <div className="ulpin-badge-main">
                              <Globe size={14} color="#0052FF" />
                              <span>{rec.ulpin}</span>
                            </div>
                            <span className="badge-exact">Exact Land Parcel</span>
                          </div>

                          <div className="ulpin-details-grid">
                            <div className="cell">
                              <span className="lbl">Owner / Landlord</span>
                              <span className="val bold">{rec.owner_name}</span>
                            </div>
                            <div className="cell">
                              <span className="lbl">Survey Number</span>
                              <span className="val">{rec.survey_number || rec.khasra_number}</span>
                            </div>
                            <div className="cell">
                              <span className="lbl">Aadhaar Linked</span>
                              <span className="val mono">{rec.aadhaar_number || 'XXXX-XXXX-8492'}</span>
                            </div>
                            <div className="cell">
                              <span className="lbl">Cadastral Area</span>
                              <span className="val">{rec.area_sqm || 120} sq.m ({rec.floors || 2} Floors)</span>
                            </div>
                            <div className="cell full">
                              <span className="lbl">Jurisdiction</span>
                              <span className="val">{[rec.house_number, rec.street_name, rec.locality, rec.village_city || rec.village, rec.district, rec.state].filter(Boolean).join(', ')}</span>
                            </div>
                          </div>

                          <div className="ulpin-card-footer">
                            <span className="hint-text">Click to extrude & isolate parcel in 3D Studio</span>
                            <button type="button" className="btn-extrude-3d">
                              <Layers size={13} />
                              <span>Inspect in 3D</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : searchVal.trim() !== '' ? (
                /* EMPTY SEARCH STATE */
                <div className="split-empty-state">
                  <AlertCircle size={28} color="#94A3B8" />
                  <div className="empty-heading">No matching records found</div>
                  <div className="empty-sub">
                    {searchMode === 'aadhaar'
                      ? 'No land parcels matched this Aadhaar number. Try "8492" or one of the pre-loaded test profiles on the left.'
                      : 'No parcel matched this 14-digit ULPIN code. Verify the geo-standard number.'}
                  </div>
                </div>
              ) : (
                /* DEFAULT STATE MATCHING PINTEREST TEMPLATE */
                <div className="split-context-content">
                  {activeMenuTab === 'aadhaar' && (
                    <div className="context-tab-pane">
                      <div className="split-right-header">
                        <div className="split-right-title">Search by Citizen Aadhaar</div>
                        <div className="split-right-sub">
                          Retrieves all land records, building flats, and agricultural holdings registered to this citizen.
                        </div>
                      </div>

                      <div className="split-items-list">
                        <div className="split-sub-item" onClick={() => handleQuickDemoSelect('aadhaar', 'XXXX-XXXX-8492')}>
                          <div className="sub-item-main">
                            <div className="sub-item-title">Ramesh Kumar Sharma</div>
                            <div className="sub-item-desc">Aadhaar: XXXX-XXXX-8492 • Kadugodi, Bengaluru</div>
                            <div className="sub-item-details">Holdings: Survey 48/2A (Residency) & 48/2B (Commercial Wing)</div>
                          </div>
                          <div className="sub-item-badge badge-blue">
                            <span>2 Land Records</span>
                            <ChevronRight size={13} />
                          </div>
                        </div>

                        <div className="split-sub-item" onClick={() => handleQuickDemoSelect('aadhaar', 'XXXX-XXXX-3829')}>
                          <div className="sub-item-main">
                            <div className="sub-item-title">विरेन्द्र प्रताप सिंह (Virendra Pratap Singh)</div>
                            <div className="sub-item-desc">Aadhaar: XXXX-XXXX-3829 • Shivpur, Varanasi</div>
                            <div className="sub-item-details">Holdings: Survey 184/3 • Pratap Mansion (2,424 sq.m)</div>
                          </div>
                          <div className="sub-item-badge badge-slate">
                            <span>1 Land Record</span>
                            <ChevronRight size={13} />
                          </div>
                        </div>

                        <div className="split-sub-item" onClick={() => handleQuickDemoSelect('aadhaar', 'XXXX-XXXX-9104')}>
                          <div className="sub-item-main">
                            <div className="sub-item-title">राजेश मारुती पाटील (Rajesh M. Patil)</div>
                            <div className="sub-item-desc">Aadhaar: XXXX-XXXX-9104 • Wagholi, Pune</div>
                            <div className="sub-item-details">Holdings: Survey 302/1B • Patil Commercial Arcade (4,856 sq.m)</div>
                          </div>
                          <div className="sub-item-badge badge-slate">
                            <span>1 Land Record</span>
                            <ChevronRight size={13} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeMenuTab === 'ulpin' && (
                    <div className="context-tab-pane">
                      <div className="split-right-header">
                        <div className="split-right-title">14-Digit ULPIN (Bhu-Aadhaar)</div>
                        <div className="split-right-sub">
                          Retrieves the unique geospatial polygon, mutation record, and spatial boundary coordinates.
                        </div>
                      </div>

                      <div className="split-items-list">
                        <div className="split-sub-item" onClick={() => handleQuickDemoSelect('ulpin', '29841029471024')}>
                          <div className="sub-item-main">
                            <div className="sub-item-title mono">29841029471024</div>
                            <div className="sub-item-desc">Shree Sai Residency • Survey 48/2A • Kadugodi, Bengaluru</div>
                            <div className="sub-item-details">Owner: Ramesh Kumar Sharma & Meera Ramesh • 134.7 sq.m</div>
                          </div>
                          <div className="sub-item-badge badge-green">
                            <span>Exact Parcel</span>
                            <ChevronRight size={13} />
                          </div>
                        </div>

                        <div className="split-sub-item" onClick={() => handleQuickDemoSelect('ulpin', '29841029471025')}>
                          <div className="sub-item-main">
                            <div className="sub-item-title mono">29841029471025</div>
                            <div className="sub-item-desc">Shree Sai Commercial Wing • Survey 48/2B • Kadugodi, Bengaluru</div>
                            <div className="sub-item-details">Owner: Ramesh Kumar Sharma • 88.5 sq.m</div>
                          </div>
                          <div className="sub-item-badge badge-green">
                            <span>Exact Parcel</span>
                            <ChevronRight size={13} />
                          </div>
                        </div>

                        <div className="split-sub-item" onClick={() => handleQuickDemoSelect('ulpin', '09712048912048')}>
                          <div className="sub-item-main">
                            <div className="sub-item-title mono">09712048912048</div>
                            <div className="sub-item-desc">Pratap Mansion • Survey 184/3 • Shivpur, Varanasi</div>
                            <div className="sub-item-details">Owner: विरेन्द्र प्रताप सिंह व सन्तोष कुमार • 2,424 sq.m</div>
                          </div>
                          <div className="sub-item-badge badge-green">
                            <span>Exact Parcel</span>
                            <ChevronRight size={13} />
                          </div>
                        </div>

                        <div className="split-sub-item" onClick={() => handleQuickDemoSelect('ulpin', '27649102849102')}>
                          <div className="sub-item-main">
                            <div className="sub-item-title mono">27649102849102</div>
                            <div className="sub-item-desc">Patil Commercial Arcade • Survey 302/1B • Wagholi, Pune</div>
                            <div className="sub-item-details">Owner: राजेश मारुती पाटील • 4,856 sq.m</div>
                          </div>
                          <div className="sub-item-badge badge-green">
                            <span>Exact Parcel</span>
                            <ChevronRight size={13} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeMenuTab === 'registry' && (
                    <div className="context-tab-pane">
                      <div className="split-right-header">
                        <div className="split-right-title">Verified Cadastral Registry</div>
                        <div className="split-right-sub">
                          DILRMP-MIS & SVAMITVA cross-referenced cadastral test citizens.
                        </div>
                      </div>

                      <div className="split-items-list">
                        <div className="split-sub-item" onClick={() => handleQuickDemoSelect('aadhaar', 'XXXX-XXXX-8492')}>
                          <div className="sub-item-main">
                            <div className="sub-item-title">Multi-Property Landholder (2 Properties)</div>
                            <div className="sub-item-desc">Citizen: Ramesh Kumar Sharma (Aadhaar: XXXX-XXXX-8492)</div>
                            <div className="sub-item-details">Tests multiple parcel retrieval under single UIDAI identity</div>
                          </div>
                          <div className="sub-item-badge badge-blue">
                            <span>Load 2 Records</span>
                            <ChevronRight size={13} />
                          </div>
                        </div>

                        <div className="split-sub-item" onClick={() => handleQuickDemoSelect('aadhaar', 'XXXX-XXXX-3829')}>
                          <div className="sub-item-main">
                            <div className="sub-item-title">Single-Parcel Titleholder (1 Property)</div>
                            <div className="sub-item-desc">Citizen: विरेन्द्र प्रताप सिंह (Aadhaar: XXXX-XXXX-3829)</div>
                            <div className="sub-item-details">Tests single deed retrieval with DILRMP sync verification</div>
                          </div>
                          <div className="sub-item-badge badge-slate">
                            <span>Load 1 Record</span>
                            <ChevronRight size={13} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
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
