import React, { useState, useEffect } from 'react';
import {
  Database, Search, Filter, Trash2, Layers, Download,
  CheckCircle2, AlertTriangle, ArrowUpRight, FileText,
  MapPin, UserCheck, ShieldCheck, Sparkles, Plus,
  Building, RefreshCw, Upload, FileSpreadsheet, Eye, X, AlertCircle
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
  const [toastType, setToastType] = useState('success');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormErrors, setAddFormErrors] = useState([]);
  const [newRecordForm, setNewRecordForm] = useState({
    building_name: '',
    house_number: '',
    street_name: '',
    locality: '',
    village_city: '',
    district: '',
    state: 'Karnataka',
    country: 'India',
    pincode: '',
    owner_name: '',
    survey_number: '',
    floors: '2',
    size: '1200',
    size_unit: 'sft',
  });

  const loadRecords = () => {
    const data = storageService.getDatabaseRecords();
    setRecords(data);
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 4500);
  };

  const handleCreateRecord = (e) => {
    e?.preventDefault();
    const validation = storageService.validateCadastralRecord(newRecordForm);
    if (!validation.isValid) {
      setAddFormErrors(validation.missingFields);
      showToast(`Cannot add record: Please fill in all blank fields (${validation.missingFields.slice(0, 3).join(', ')}${validation.missingFields.length > 3 ? '...' : ''})`, 'error');
      return;
    }

    setAddFormErrors([]);
    const res = storageService.addSingleRecord(newRecordForm);
    if (res.success) {
      loadRecords();
      setShowAddModal(false);
      setNewRecordForm({
        building_name: '',
        house_number: '',
        street_name: '',
        locality: '',
        village_city: '',
        district: '',
        state: 'Karnataka',
        country: 'India',
        pincode: '',
        owner_name: '',
        survey_number: '',
        floors: '2',
        size: '1200',
        size_unit: 'sft',
      });

      if (res.updatedCount > 0 && res.addedCount === 0) {
        showToast(`Survey No. ${newRecordForm.survey_number} already existed — updated existing entry with zero duplicate creation.`, 'success');
      } else {
        showToast(`Successfully added Survey No. ${newRecordForm.survey_number} (Owner: ${newRecordForm.owner_name}) to Land Database! (100% Unique)`, 'success');
      }

      auditTrailService.logAction(
        'DATABASE_RECORD_MANUAL_ADD',
        'land_database',
        res.lastRecord?.id || 'REC-NEW',
        { surveyNo: newRecordForm.survey_number, owner: newRecordForm.owner_name },
        'Official'
      );
    }
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
      {/* Toast Notification Pop-up */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            background: toastType === 'success' ? '#064e3b' : '#7f1d1d',
            color: '#ffffff',
            padding: '14px 22px',
            borderRadius: 12,
            boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 13,
            fontWeight: 600,
            animation: 'slideInRight 0.3s ease',
            maxWidth: '90vw',
          }}
        >
          {toastType === 'success' ? (
            <CheckCircle2 size={18} color="#34d399" style={{ flexShrink: 0 }} />
          ) : (
            <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0 }} />
          )}
          <span style={{ flex: 1 }}>{toastMsg}</span>
          <button
            onClick={() => setToastMsg('')}
            style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 8, background: '#4f46e5', borderRadius: 10, color: '#ffffff', display: 'flex' }}>
              <Database size={20} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Government Land Cadastre Database
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowAddModal(true)}
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
            <Plus size={14} />
            <span>Add Record</span>
          </button>

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

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, background: '#ffffff', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by Survey No, Building, Owner Name, Street, Locality, District..."
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

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            background: '#4f46e5',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)',
          }}
        >
          <Plus size={15} />
          <span>Add Record</span>
        </button>

        {filteredRecords.length > 0 && (
          <button
            onClick={handleApplyAllToMap}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Layers size={14} />
            <span>Apply to 3D Map ({filteredRecords.length})</span>
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
                <th style={{ padding: '12px 16px' }}>SURVEY / HISSA NO</th>
                <th style={{ padding: '12px 16px' }}>BUILDING & NUMBER</th>
                <th style={{ padding: '12px 16px' }}>OWNER / KHATADAR</th>
                <th style={{ padding: '12px 16px' }}>LOCALITY & CITY</th>
                <th style={{ padding: '12px 16px' }}>STOREYS & SIZE</th>
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
                      {rec.survey_number || 'N/A'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      {rec.building_name || 'Individual Parcel'}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {rec.house_number ? `No: ${rec.house_number}` : ''}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      {rec.owner_name || 'Unspecified'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ color: '#334155', fontWeight: 500 }}>
                      {rec.locality ? `${rec.locality}, ` : ''}{rec.village_city || rec.village || 'N/A'}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {rec.district ? `${rec.district}, ` : ''}{rec.state || ''} {rec.pincode ? `(${rec.pincode})` : ''}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {rec.size || '1200'} {rec.size_unit || 'sft'}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {rec.floors || '2'} Storeys ({rec.area_sqm ? `${rec.area_sqm} m²` : ''})
                    </div>
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

      {/* ─── Add Record Modal Dialog ─── */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 680,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeInUp 0.25s ease',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 8, background: '#4f46e5', borderRadius: 10, color: '#fff', display: 'flex' }}>
                  <Plus size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Add Certified Land Record
                  </h2>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                    All blank fields must be completed. System enforces 100% database uniqueness.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Validation Alert */}
            {addFormErrors.length > 0 && (
              <div
                style={{
                  margin: '16px 24px 0',
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #f87171',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: '#991b1b',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                <span>
                  <strong>All blanks required:</strong> Please fill in the missing fields: {addFormErrors.join(', ')}.
                </span>
              </div>
            )}

            {/* Modal Form Body */}
            <form onSubmit={handleCreateRecord} style={{ padding: 24 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                {[
                  { key: 'building_name', label: 'Building Name *', placeholder: 'e.g. Shree Sai Residency' },
                  { key: 'house_number', label: 'Building/House Number *', placeholder: 'e.g. Flat 302, Bldg 4B' },
                  { key: 'street_name', label: 'Street/Road Name *', placeholder: 'e.g. Kadugodi Main Road' },
                  { key: 'locality', label: 'Locality/Area *', placeholder: 'e.g. Whitefield Zone' },
                  { key: 'village_city', label: 'Village/Town/City *', placeholder: 'e.g. Kadugodi, Bengaluru' },
                  { key: 'district', label: 'District *', placeholder: 'e.g. Bengaluru Urban' },
                  { key: 'state', label: 'State/Province *', placeholder: 'e.g. Karnataka' },
                  { key: 'country', label: 'Country *', placeholder: 'e.g. India' },
                  { key: 'pincode', label: 'PIN/ZIP Code *', placeholder: 'e.g. 560067' },
                  { key: 'owner_name', label: 'Owner / Khatadar Name *', placeholder: 'e.g. Ramesh Kumar Sharma' },
                  { key: 'survey_number', label: 'Survey / Hissa No *', placeholder: 'e.g. 48/2A' },
                  { key: 'floors', label: 'Storeys (Floors) *', placeholder: 'e.g. 3' },
                ].map(({ key, label, placeholder }) => {
                  const isMissing = addFormErrors.some((err) => label.toLowerCase().includes(err.toLowerCase().split(' ')[0]));
                  return (
                    <div key={key}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 12,
                          fontWeight: 600,
                          color: isMissing ? '#dc2626' : '#334155',
                          marginBottom: 4,
                        }}
                      >
                        {label}
                      </label>
                      <input
                        type="text"
                        placeholder={placeholder}
                        value={newRecordForm[key]}
                        onChange={(e) => {
                          setNewRecordForm((prev) => ({ ...prev, [key]: e.target.value }));
                          if (addFormErrors.length > 0) setAddFormErrors([]);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: `1.5px solid ${isMissing ? '#ef4444' : '#cbd5e1'}`,
                          background: isMissing ? '#fff5f5' : '#ffffff',
                          fontSize: 13,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  );
                })}

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Size (Area) *
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="number"
                      placeholder="e.g. 1450"
                      value={newRecordForm.size}
                      onChange={(e) => setNewRecordForm((prev) => ({ ...prev, size: e.target.value }))}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <select
                      value={newRecordForm.size_unit}
                      onChange={(e) => setNewRecordForm((prev) => ({ ...prev, size_unit: e.target.value }))}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #cbd5e1',
                        background: '#f8fafc',
                        fontSize: 13,
                        fontWeight: 600,
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="sft">sft</option>
                      <option value="sqy">sqy</option>
                      <option value="acr">acr</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Footer Action */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 12,
                  paddingTop: 16,
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#4f46e5',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Database size={14} />
                  <span>Save to Land Database</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
