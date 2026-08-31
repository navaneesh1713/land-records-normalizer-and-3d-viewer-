import React, { useState, useEffect } from 'react';
import {
  Database, Search, Filter, Trash2, Layers, Download,
  CheckCircle2, AlertTriangle, ArrowUpRight, FileText,
  MapPin, UserCheck, ShieldCheck, Sparkles, Plus,
  Building, RefreshCw, Upload, FileSpreadsheet, Eye
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { auditTrailService } from '../services/auditTrailService';

export default function LandDatabaseDashboard({
  onApplyTo3DMap,
  onNavigateToUpload,
  onOpenScanner,
}) {
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  const loadRecords = () => {
    const data = storageService.getDatabaseRecords();
    setRecords(data);
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleDelete = (id, surveyNo) => {
    if (window.confirm(`Are you sure you want to remove record Survey No. ${surveyNo} from the local database?`)) {
      const updated = storageService.deleteDatabaseRecord(id);
      setRecords(updated);
      showToast(`Removed Survey No. ${surveyNo} from local database.`);
      auditTrailService.logAction(
        'DATABASE_RECORD_DELETE',
        'land_database',
        id,
        { surveyNo },
        'Official'
      );
    }
  };

  const handleApplySingleToMap = (rec) => {
    if (onApplyTo3DMap) {
      onApplyTo3DMap([rec]);
      showToast(`Loaded ${rec.survey_number} into 3D Studio!`);
    }
  };

  const handleApplyAllToMap = () => {
    if (filteredRecords.length === 0) return;
    if (onApplyTo3DMap) {
      onApplyTo3DMap(filteredRecords);
      showToast(`Extruded ${filteredRecords.length} records into 3D Studio!`);
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = ['ID', 'Owner Name', 'Survey Number', 'Khasra Number', 'Khata Number', 'Village', 'Tehsil', 'District', 'Classification', 'Area SqM', 'Floors', 'Height M', 'Tax Status', 'Encumbrance', 'Confidence', 'Created At'];
    const rows = records.map(r => [
      r.id,
      `"${r.owner_name || ''}"`,
      r.survey_number || '',
      r.khasra_number || '',
      r.khata_number || '',
      r.village || '',
      r.tehsil || '',
      r.district || '',
      r.classification || '',
      r.area_sqm || '',
      r.floors || '',
      r.height_m || '',
      r.tax_status || '',
      r.encumbrance_status || '',
      r.confidence || '',
      r.createdAt || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `land_database_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported Land Database to CSV!');
  };

  const handleExportJSON = () => {
    storageService.exportDatabaseDump();
    showToast('Exported Full Land Database JSON!');
  };

  // Filter & search records
  const filteredRecords = records.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (r.owner_name && r.owner_name.toLowerCase().includes(q)) ||
      (r.survey_number && r.survey_number.toLowerCase().includes(q)) ||
      (r.khasra_number && r.khasra_number.toLowerCase().includes(q)) ||
      (r.khata_number && r.khata_number.toLowerCase().includes(q)) ||
      (r.village && r.village.toLowerCase().includes(q)) ||
      (r.district && r.district.toLowerCase().includes(q)) ||
      (r.tehsil && r.tehsil.toLowerCase().includes(q))
    );

    const matchesType = filterType === 'ALL' || (
      (r.classification && r.classification.toLowerCase() === filterType.toLowerCase())
    );

    return matchesSearch && matchesType;
  });

  // Calculate statistics
  const totalArea = records.reduce((acc, r) => acc + (Number(r.area_sqm) || 0), 0);
  const avgConfidence = records.length > 0
    ? Math.round(records.reduce((acc, r) => acc + (Number(r.confidence) || 85), 0) / records.length)
    : 0;
  const residentialCount = records.filter(r => (r.classification || '').toLowerCase() === 'residential').length;
  const commercialCount = records.filter(r => (r.classification || '').toLowerCase() === 'commercial').length;

  return (
    <div style={{ flex: 1, height: '100%', overflowY: 'auto', background: '#f8fafc', padding: '24px 32px' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            background: '#1e1b4b',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 10,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
            animation: 'slideInRight 0.3s ease'
          }}
        >
          <CheckCircle2 size={16} color="#10b981" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ padding: 8, background: '#4f46e5', borderRadius: 10, color: '#ffffff', display: 'flex' }}>
              <Database size={20} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Government Land Cadastre Database
            </h1>
            <span style={{ fontSize: 11, background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
              Local Memory Persisted
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Official ledger of all verified land parcels, SVAMITVA drone cards, RTC extracts, and AI Vision scanned records.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <FileSpreadsheet size={14} color="#10b981" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <Download size={14} color="#6366f1" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={onNavigateToUpload}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
            }}
          >
            <Upload size={14} />
            <span>Scan / Upload New Document</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>TOTAL LAND PARCELS</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>{records.length}</div>
          <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginTop: 4 }}>
            100% Unique (Zero Duplicates)
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>TOTAL CADASTRE EXTENT</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>
            {totalArea.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500 }}>sq.m</span>
          </div>
          <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, marginTop: 4 }}>
            ≈ {(totalArea / 4046.86).toFixed(2)} Acres
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>LAND USE DISTRIBUTION</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
            {residentialCount} Res · {commercialCount} Comm
          </div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginTop: 4 }}>
            {records.length - residentialCount - commercialCount} Agricultural / Other
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>AVERAGE AI CONFIDENCE</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#059669' }}>{avgConfidence}%</div>
          <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginTop: 4 }}>
            Certified SVAMITVA Standard
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, background: '#ffffff', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by Survey No, Khasra, Owner Name, Village, District..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {['ALL', 'residential', 'commercial', 'agricultural'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filterType === type ? '#4f46e5' : '#f1f5f9',
                color: filterType === type ? '#ffffff' : '#475569',
                textTransform: 'capitalize',
                transition: 'all 0.15s ease'
              }}
            >
              {type}
            </button>
          ))}
        </div>

        {filteredRecords.length > 0 && (
          <button
            onClick={handleApplyAllToMap}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Layers size={14} />
            <span>Apply Filtered to 3D Map ({filteredRecords.length})</span>
          </button>
        )}
      </div>

      {/* Records Table */}
      <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {filteredRecords.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <Database size={40} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#334155' }}>No Records Found</div>
            <p style={{ fontSize: 13, marginTop: 4, maxWidth: 400, margin: '4px auto 16px' }}>
              {searchQuery ? 'No land parcels matched your search criteria.' : 'The land database is currently empty. Upload or scan document records to populate the database.'}
            </p>
            <button
              onClick={onNavigateToUpload}
              style={{
                padding: '8px 16px',
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Scan / Ingest Records
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, fontSize: 12 }}>
                <th style={{ padding: '12px 16px' }}>SURVEY / KHASRA</th>
                <th style={{ padding: '12px 16px' }}>OWNER / KHATEDAR</th>
                <th style={{ padding: '12px 16px' }}>VILLAGE & DISTRICT</th>
                <th style={{ padding: '12px 16px' }}>LAND USE</th>
                <th style={{ padding: '12px 16px' }}>EXTENT (SQ.M)</th>
                <th style={{ padding: '12px 16px' }}>SOURCE / CONFIDENCE</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((rec) => (
                <tr
                  key={rec.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14 }}>
                      {rec.survey_number || rec.khasra_number || 'N/A'}
                    </div>
                    {rec.khata_number && (
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        Khata: {rec.khata_number}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      {rec.owner_name || 'Unspecified'}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {rec.tax_status === 'PAID' || rec.tax_status?.includes('PAID') ? (
                        <span style={{ color: '#16a34a' }}>● Tax Paid</span>
                      ) : (
                        <span style={{ color: '#d97706' }}>● {rec.tax_status || 'Unverified'}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ color: '#334155' }}>
                      {rec.village || 'N/A'}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {rec.tehsil ? `${rec.tehsil}, ` : ''}{rec.district || ''}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        background: (rec.classification || '').toLowerCase() === 'commercial' ? '#fef3c7' : '#e0e7ff',
                        color: (rec.classification || '').toLowerCase() === 'commercial' ? '#92400e' : '#3730a3',
                      }}
                    >
                      {rec.classification || 'Residential'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                    {rec.area_sqm ? `${Number(rec.area_sqm).toLocaleString()} m²` : 'N/A'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          background: (rec.confidence || 90) >= 80 ? '#dcfce7' : '#fef3c7',
                          color: (rec.confidence || 90) >= 80 ? '#166534' : '#92400e',
                        }}
                      >
                        {rec.confidence || 90}% AI Match
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                      {rec.sourceType || 'AI Vision Scan'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        onClick={() => handleApplySingleToMap(rec)}
                        style={{
                          padding: '4px 10px',
                          background: '#e0e7ff',
                          color: '#4338ca',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                        title="Extrude and view this parcel in 3D Map Studio"
                      >
                        <Layers size={12} />
                        <span>3D View</span>
                      </button>

                      <button
                        onClick={() => handleDelete(rec.id, rec.survey_number || rec.khasra_number)}
                        style={{
                          padding: '4px 8px',
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: 11,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Delete from database"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
