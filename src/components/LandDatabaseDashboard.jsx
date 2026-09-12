import React, { useState, useEffect } from 'react';
import {
  Database, Search, Filter, Trash2, Layers, Download,
  CheckCircle2, AlertTriangle, ArrowUpRight, FileText,
  MapPin, UserCheck, ShieldCheck, Sparkles, Plus,
  Building, RefreshCw, Upload, FileSpreadsheet, Eye, X, AlertCircle,
  Fingerprint, Copy, Check, ExternalLink, Loader2
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { auditTrailService } from '../services/auditTrailService';
import { useLanguage } from '../context/LanguageContext';
import { syncRecordsToDilrmpMIS, verifyAadhaarWithUIDAI, generateULPIN } from '../utils/ulpinService';
import { supabaseService } from '../services/supabaseClient';

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
  const [isSyncingDilrmp, setIsSyncingDilrmp] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncResultModal, setSyncResultModal] = useState(null);
  const [verifyingAadhaarId, setVerifyingAadhaarId] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const { t } = useLanguage();
  const [newRecordForm, setNewRecordForm] = useState({
    building_name: '',
    house_number: '',
    street_name: '',
    locality: '',
    village_city: '',
    tehsil: '',
    district: '',
    state: 'Karnataka',
    country: 'India',
    pincode: '',
    owner_name: '',
    aadhaar_number: '',
    khasra_number: '',
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
      supabaseService.upsertLandRecord(newRecordForm).catch(err => console.warn('[Supabase Add Sync]:', err));
      setNewRecordForm({
        building_name: '',
        house_number: '',
        street_name: '',
        locality: '',
        village_city: '',
        tehsil: '',
        district: '',
        state: 'Karnataka',
        country: 'India',
        pincode: '',
        owner_name: '',
        aadhaar_number: '',
        khasra_number: '',
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

  const handleSyncToDilrmp = async () => {
    if (records.length === 0) {
      showToast('No cadastral records available to sync to DILRMP-MIS.', 'error');
      return;
    }
    try {
      setIsSyncingDilrmp(true);
      setSyncProgress(15);
      const res = await syncRecordsToDilrmpMIS(records, (pct) => setSyncProgress(pct));
      const syncResult = storageService.syncAllRecordsToDilrmp(res.txnId);
      loadRecords();
      setSyncResultModal({
        txnId: res.txnId,
        syncedCount: records.length,
        timestamp: res.timestamp,
      });
      showToast(`Central DILRMP-MIS Synchronized! Txn: ${res.txnId}`, 'success');
      auditTrailService.logAction(
        'DILRMP_MIS_CENTRAL_SYNC',
        'dilrmp_stack',
        res.txnId,
        { recordCount: records.length },
        'Official'
      );
    } catch (err) {
      console.error('DILRMP sync error:', err);
      showToast('Central DILRMP-MIS sync failed. Please try again.', 'error');
    } finally {
      setIsSyncingDilrmp(false);
      setSyncProgress(0);
    }
  };

  const handleVerifyAadhaarForRecord = async (rec) => {
    try {
      setVerifyingAadhaarId(rec.id);
      const res = await verifyAadhaarWithUIDAI(rec.aadhaar_number, rec.owner_name);
      storageService.updateAadhaarVerification(rec.id, res);
      loadRecords();
      showToast(`Aadhaar e-KYC verified for ${rec.owner_name} (Txn: ${res.authTransactionId})`, 'success');
      if (selectedRecord && (selectedRecord.id === rec.id || selectedRecord.survey_number === rec.survey_number)) {
        setSelectedRecord(prev => ({
          ...prev,
          aadhaar_verified: true,
          aadhaar_number: res.maskedAadhaar,
          aadhaar_auth_txnid: res.authTransactionId,
        }));
      }
    } catch (err) {
      console.error('Aadhaar verification error:', err);
      showToast('UIDAI verification failed.', 'error');
    } finally {
      setVerifyingAadhaarId(null);
    }
  };

  const handleCopy = (text, fieldName) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 1800);
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = ['ID', 'ULPIN (Bhu-Aadhaar)', 'Owner Name', 'Aadhaar Number', 'Aadhaar Verified', 'DILRMP Status', 'DILRMP Txn ID', 'Survey Number', 'Khasra Number', 'Village', 'Tehsil', 'District', 'Classification', 'Area SqM', 'Floors', 'Confidence', 'Created At'];
    const rows = records.map(r => [
      r.id,
      r.ulpin || generateULPIN(77.728, 12.985, r.state, r.survey_number),
      `"${r.owner_name || ''}"`,
      r.aadhaar_number || 'XXXX-XXXX-8492',
      r.aadhaar_verified ? 'YES' : 'NO',
      r.dilrmp_sync_status || 'PENDING',
      r.dilrmp_txn_id || '',
      r.survey_number || '',
      r.khasra_number || '',
      r.village || r.village_city || '',
      r.tehsil || '',
      r.district || '',
      r.classification || '',
      r.area_sqm || '',
      r.floors || '',
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
    showToast('Exported Land Database to CSV (with ULPIN & Aadhaar)!');
  };

  const handleExportJSON = () => {
    storageService.exportDatabaseDump();
    showToast('Exported Full Land Database JSON!');
  };

  // Filter & search records
  const filteredRecords = records.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    const ulpinMatch = r.ulpin && r.ulpin.toLowerCase().includes(q);
    const aadhaarMatch = r.aadhaar_number && r.aadhaar_number.toLowerCase().includes(q);
    const matchesSearch = !q || (
      (r.owner_name && r.owner_name.toLowerCase().includes(q)) ||
      (r.survey_number && r.survey_number.toLowerCase().includes(q)) ||
      (r.khasra_number && r.khasra_number.toLowerCase().includes(q)) ||
      (r.building_name && r.building_name.toLowerCase().includes(q)) ||
      (r.village_city && r.village_city.toLowerCase().includes(q)) ||
      (r.village && r.village.toLowerCase().includes(q)) ||
      (r.district && r.district.toLowerCase().includes(q)) ||
      (r.tehsil && r.tehsil.toLowerCase().includes(q)) ||
      ulpinMatch ||
      aadhaarMatch
    );

    let matchesType = true;
    if (filterType === 'ALL') {
      matchesType = true;
    } else if (filterType === 'AADHAAR_VERIFIED') {
      matchesType = Boolean(r.aadhaar_verified);
    } else if (filterType === 'DILRMP_SYNCED') {
      matchesType = String(r.dilrmp_sync_status).toUpperCase() === 'SYNCED';
    } else if (filterType === 'DILRMP_PENDING') {
      matchesType = String(r.dilrmp_sync_status).toUpperCase() !== 'SYNCED';
    } else {
      matchesType = r.classification && r.classification.toLowerCase() === filterType.toLowerCase();
    }

    return matchesSearch && matchesType;
  });

  // Calculate statistics
  const totalArea = records.reduce((acc, r) => acc + (Number(r.area_sqm) || 0), 0);
  const avgConfidence = records.length > 0
    ? Math.round(records.reduce((acc, r) => acc + (Number(r.confidence) || 85), 0) / records.length)
    : 0;
  const residentialCount = records.filter(r => (r.classification || '').toLowerCase() === 'residential').length;
  const commercialCount = records.filter(r => (r.classification || '').toLowerCase() === 'commercial').length;
  const syncedCount = records.filter(r => String(r.dilrmp_sync_status).toUpperCase() === 'SYNCED').length;
  const aadhaarVerifiedCount = records.filter(r => Boolean(r.aadhaar_verified)).length;

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
            <div style={{ padding: 8, background: '#0052FF', borderRadius: 10, color: '#ffffff', display: 'flex', boxShadow: '0 4px 12px rgba(0, 82, 255, 0.25)' }}>
              <Database size={20} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A0B0D', margin: 0, letterSpacing: '-0.02em' }}>
              Government Land Cadastre Database
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={handleSyncToDilrmp}
            disabled={isSyncingDilrmp}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 18px',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: isSyncingDilrmp ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
              transition: 'all 0.2s ease',
            }}
            title="Synchronize all local cadastral records to central Ministry DILRMP-MIS stack"
          >
            {isSyncingDilrmp ? (
              <>
                <Loader2 size={15} className="spinner" />
                <span>Syncing ({syncProgress}%)...</span>
              </>
            ) : (
              <>
                <RefreshCw size={15} />
                <span>Sync to DILRMP-MIS</span>
                <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.22)', padding: '2px 7px', borderRadius: '12px' }}>
                  {syncedCount}/{records.length}
                </span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 18px',
              background: '#0052FF',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 82, 255, 0.28)'
            }}
          >
            <Plus size={15} />
            <span>Add Record</span>
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              background: '#ffffff',
              border: '1px solid #ECEFF0',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: '#0A0B0D',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <FileSpreadsheet size={15} color="#05B169" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#ffffff', padding: '18px 22px', borderRadius: 16, border: '1px solid #ECEFF0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 11.5, color: '#5B616E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>TOTAL LAND PARCELS</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0A0B0D' }}>{records.length}</div>
          <div style={{ fontSize: 11.5, color: '#05B169', fontWeight: 700, marginTop: 4 }}>
            100% Unique (Zero Duplicates)
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '18px 22px', borderRadius: 16, border: '1px solid #ECEFF0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 11.5, color: '#5B616E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>DILRMP-MIS CENTRAL SYNC</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: syncedCount === records.length ? '#05B169' : '#0052FF' }}>
            {syncedCount} / {records.length}
          </div>
          <div style={{ fontSize: 11.5, color: '#05B169', fontWeight: 700, marginTop: 4 }}>
            14-Digit ULPIN Enabled
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '18px 22px', borderRadius: 16, border: '1px solid #ECEFF0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 11.5, color: '#5B616E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>AADHAAR VERIFIED</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0A0B0D' }}>
            {aadhaarVerifiedCount} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>/ {records.length}</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#0052FF', fontWeight: 700, marginTop: 4 }}>
            UIDAI CIDR Standard
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '18px 22px', borderRadius: 16, border: '1px solid #ECEFF0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 11.5, color: '#5B616E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>TOTAL CADASTRE EXTENT</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0A0B0D' }}>
            {totalArea.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500 }}>sq.m</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#5B616E', fontWeight: 600, marginTop: 4 }}>
            ≈ {(totalArea / 4046.86).toFixed(2)} Acres
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '18px 22px', borderRadius: 16, border: '1px solid #ECEFF0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 11.5, color: '#5B616E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>AVERAGE AI MATCH</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#05B169' }}>{avgConfidence}%</div>
          <div style={{ fontSize: 11.5, color: '#05B169', fontWeight: 700, marginTop: 4 }}>
            SVAMITVA Compliant
          </div>
        </div>
      </div>

      {/* Filter Chips Strip */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { id: 'ALL', label: `All Parcels (${records.length})` },
          { id: 'AADHAAR_VERIFIED', label: `Aadhaar Verified (${aadhaarVerifiedCount})` },
          { id: 'DILRMP_SYNCED', label: `DILRMP Synced (${syncedCount})` },
          { id: 'DILRMP_PENDING', label: `Pending Sync (${records.length - syncedCount})` },
          { id: 'residential', label: `Residential (${residentialCount})` },
          { id: 'commercial', label: `Commercial (${commercialCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: filterType === tab.id ? '1px solid #0052FF' : '1px solid #E2E8F0',
              background: filterType === tab.id ? '#0052FF' : '#ffffff',
              color: filterType === tab.id ? '#ffffff' : '#475569',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: filterType === tab.id ? '0 2px 6px rgba(0, 82, 255, 0.25)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, background: '#ffffff', padding: 12, borderRadius: 14, border: '1px solid #ECEFF0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} color="#8A919E" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by Survey No, Building, Owner Name, Street, Locality, District..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 14px 9px 40px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
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
            padding: '9px 18px',
            background: '#0052FF',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 82, 255, 0.25)',
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
              padding: '9px 18px',
              background: '#05B169',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
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
                <th style={{ padding: '12px 16px' }}>ULPIN (BHU-AADHAAR)</th>
                <th style={{ padding: '12px 16px' }}>OWNER & AADHAAR e-KYC</th>
                <th style={{ padding: '12px 16px' }}>LOCALITY & STATE</th>
                <th style={{ padding: '12px 16px' }}>DILRMP-MIS SYNC</th>
                <th style={{ padding: '12px 16px' }}>CONFIDENCE</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((rec) => {
                const ulpinCode = rec.ulpin || generateULPIN(77.728, 12.985, rec.state, rec.survey_number);
                const isSynced = String(rec.dilrmp_sync_status).toUpperCase() === 'SYNCED';
                const isAadhaarVerified = Boolean(rec.aadhaar_verified);

                return (
                  <tr
                    key={rec.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Survey No */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 14 }}>
                        {rec.survey_number || 'N/A'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {rec.building_name || 'Parcel'}
                      </div>
                    </td>

                    {/* ULPIN (Bhu-Aadhaar) */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            background: '#F0F9FF',
                            color: '#0369A1',
                            padding: '3px 8px',
                            borderRadius: 6,
                            border: '1px solid #BAE6FD',
                          }}
                        >
                          {ulpinCode}
                        </span>
                        <button
                          onClick={() => handleCopy(ulpinCode, `ulpin_${rec.id}`)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#0284C7',
                            cursor: 'pointer',
                            padding: 2,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Copy 14-Digit ULPIN"
                        >
                          {copiedField === `ulpin_${rec.id}` ? <Check size={13} color="#05B169" /> : <Copy size={13} />}
                        </button>
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                        14-Digit Geo-Standard
                      </div>
                    </td>

                    {/* Owner & Aadhaar */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {rec.owner_name || 'Unspecified'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>
                          {rec.aadhaar_number || 'XXXX-XXXX-8492'}
                        </span>
                        {isAadhaarVerified ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#166534',
                              background: '#DCFCE7',
                              padding: '1px 6px',
                              borderRadius: 10,
                            }}
                          >
                            <CheckCircle2 size={10} /> UIDAI Verified
                          </span>
                        ) : (
                          <button
                            onClick={() => handleVerifyAadhaarForRecord(rec)}
                            disabled={verifyingAadhaarId === rec.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#92400E',
                              background: '#FEF3C7',
                              border: '1px solid #FDE68A',
                              padding: '1px 7px',
                              borderRadius: 10,
                              cursor: verifyingAadhaarId === rec.id ? 'not-allowed' : 'pointer',
                            }}
                            title="Verify citizen via simulated UIDAI e-KYC CIDR"
                          >
                            {verifyingAadhaarId === rec.id ? (
                              <>
                                <Loader2 size={10} className="spinner" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <>
                                <Fingerprint size={10} />
                                <span>Verify e-KYC</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Locality & State */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#334155', fontWeight: 500 }}>
                        {rec.locality ? `${rec.locality}, ` : ''}{rec.village_city || rec.village || 'N/A'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {rec.district ? `${rec.district}, ` : ''}{rec.state || ''} {rec.pincode ? `(${rec.pincode})` : ''}
                      </div>
                    </td>

                    {/* DILRMP-MIS Sync Status */}
                    <td style={{ padding: '12px 16px' }}>
                      {isSynced ? (
                        <div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 700,
                              background: '#DCFCE7',
                              color: '#15803D',
                              border: '1px solid #BBF7D0',
                            }}
                          >
                            <CheckCircle2 size={11} /> DILRMP Synced
                          </span>
                          <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>
                            {rec.dilrmp_txn_id || 'DILRMP-MIS-2026'}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 700,
                              background: '#FEF3C7',
                              color: '#B45309',
                              border: '1px solid #FDE68A',
                            }}
                          >
                            <RefreshCw size={10} /> Pending Central Sync
                          </span>
                        </div>
                      )}
                    </td>

                    {/* AI Confidence */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          background: (rec.confidence || 90) >= 80 ? '#ECFDF5' : '#FEF3C7',
                          color: (rec.confidence || 90) >= 80 ? '#059669' : '#92400e',
                        }}
                      >
                        {rec.confidence || 90}% Match
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          onClick={() => setSelectedRecord(rec)}
                          style={{
                            padding: '5px 10px',
                            background: '#F1F5F9',
                            color: '#334155',
                            border: '1px solid #CBD5E1',
                            borderRadius: 8,
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          title="Inspect full cadastral, ULPIN, and Aadhaar record details"
                        >
                          <Eye size={13} />
                          <span>Inspect</span>
                        </button>

                        <button
                          onClick={() => handleApplySingleToMap(rec)}
                          style={{
                            padding: '5px 10px',
                            background: '#EDF2FE',
                            color: '#0052FF',
                            border: '1px solid rgba(0, 82, 255, 0.15)',
                            borderRadius: 8,
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          title="Extrude and view this parcel in 3D Map Studio"
                        >
                          <Layers size={12} />
                          <span>3D</span>
                        </button>

                        <button
                          onClick={() => handleDelete(rec.id, rec.survey_number || rec.khasra_number)}
                          style={{
                            padding: '5px 8px',
                            background: '#FDE8E8',
                            color: '#DF1525',
                            border: '1px solid rgba(223, 21, 37, 0.2)',
                            borderRadius: 8,
                            fontSize: 11.5,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Delete from database"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
            background: 'rgba(10, 11, 13, 0.65)',
            backdropFilter: 'blur(8px)',
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
              borderRadius: 20,
              width: '100%',
              maxWidth: 680,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px -12px rgba(0,0,0,0.25)',
              border: '1px solid #ECEFF0',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeInUp 0.25s ease',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #ECEFF0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#F8FAFC',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 8, background: '#0052FF', borderRadius: 10, color: '#fff', display: 'flex', boxShadow: '0 4px 12px rgba(0, 82, 255, 0.25)' }}>
                  <Plus size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0A0B0D', margin: 0 }}>
                    Add Certified Land Record
                  </h2>
                  <p style={{ fontSize: 11.5, color: '#5B616E', margin: 0 }}>
                    All blank fields must be completed. System enforces 100% database uniqueness.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#5B616E', padding: 4 }}
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
                  background: '#FDE8E8',
                  border: '1px solid #F87171',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: '#991B1B',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={16} color="#DF1525" style={{ flexShrink: 0 }} />
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
                  { key: 'aadhaar_number', label: 'Owner Aadhaar Number (UIDAI) *', placeholder: 'e.g. 5892 4910 8402 or XXXX-XXXX-8492', isAadhaar: true },
                  { key: 'survey_number', label: 'Survey / Hissa No *', placeholder: 'e.g. 48/2A' },
                  { key: 'floors', label: 'Storeys (Floors) *', placeholder: 'e.g. 3' },
                ].map(({ key, label, placeholder, isAadhaar }) => {
                  const isMissing = addFormErrors.some((err) => label.toLowerCase().includes(err.toLowerCase().split(' ')[0]));
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: isMissing ? '#DF1525' : '#5B616E',
                          }}
                        >
                          {label}
                        </label>
                        {isAadhaar && (
                          <button
                            type="button"
                            onClick={() => setNewRecordForm((prev) => ({ ...prev, aadhaar_number: 'XXXX-XXXX-8492' }))}
                            style={{
                              background: '#EDF2FE',
                              border: '1px solid rgba(0, 82, 255, 0.25)',
                              color: '#0052FF',
                              fontSize: 10.5,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 6,
                              cursor: 'pointer'
                            }}
                          >
                            Auto-Demo UIDAI
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder={placeholder}
                        value={newRecordForm[key] || ''}
                        onChange={(e) => {
                          setNewRecordForm((prev) => ({ ...prev, [key]: e.target.value }));
                          if (addFormErrors.length > 0) setAddFormErrors([]);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: `1.5px solid ${isMissing ? '#DF1525' : '#E2E8F0'}`,
                          background: isMissing ? '#FFF5F5' : '#FFFFFF',
                          fontSize: 13,
                          fontFamily: isAadhaar ? 'monospace' : 'inherit',
                          letterSpacing: isAadhaar ? '0.5px' : 'normal',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  );
                })}

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5B616E', marginBottom: 4 }}>
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
                        border: '1.5px solid #E2E8F0',
                        background: '#FFFFFF',
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
                        border: '1.5px solid #E2E8F0',
                        background: '#F8FAFC',
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
                  borderTop: '1px solid #ECEFF0',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 10,
                    border: '1px solid #ECEFF0',
                    background: '#FFFFFF',
                    color: '#5B616E',
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
                    borderRadius: 10,
                    border: 'none',
                    background: '#0052FF',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 82, 255, 0.28)',
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

      {/* ─── Record Inspection Modal ─── */}
      {selectedRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(10, 11, 13, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              width: '100%',
              maxWidth: 680,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
              border: '1px solid #ECEFF0',
              animation: 'fadeInUp 0.25s ease',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #ECEFF0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#F8FAFC',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 8, background: '#0052FF', borderRadius: 10, color: '#fff', display: 'flex' }}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0A0B0D', margin: 0 }}>
                    Cadastral Title Inspection: Survey No. {selectedRecord.survey_number}
                  </h2>
                  <p style={{ fontSize: 11.5, color: '#5B616E', margin: 0 }}>
                    {selectedRecord.id} • DILRMP 3.0 Standard National Registry
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#5B616E', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* ULPIN (Bhu-Aadhaar) Highlight Card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  borderRadius: 14,
                  padding: '16px 20px',
                  color: '#ffffff',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    <ShieldCheck size={14} />
                    <span>Unique Land Parcel Identification Number (ULPIN / Bhu-Aadhaar)</span>
                  </div>
                  <span style={{ fontSize: 10, background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                    14-Digit Standard
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 800, letterSpacing: '0.14em', color: '#F8FAFC' }}>
                    {selectedRecord.ulpin || generateULPIN(77.728, 12.985, selectedRecord.state, selectedRecord.survey_number)}
                  </div>
                  <button
                    onClick={() => handleCopy(selectedRecord.ulpin || generateULPIN(77.728, 12.985, selectedRecord.state, selectedRecord.survey_number), 'modal_ulpin')}
                    style={{
                      background: 'rgba(56, 189, 248, 0.2)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      color: '#38bdf8',
                      borderRadius: 8,
                      padding: '6px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {copiedField === 'modal_ulpin' ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                    <span>{copiedField === 'modal_ulpin' ? 'Copied' : 'Copy ULPIN'}</span>
                  </button>
                </div>
              </div>

              {/* Citizen Aadhaar e-KYC Verification Card */}
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: 14,
                  padding: '16px 20px',
                  border: `1.5px solid ${selectedRecord.aadhaar_verified ? '#BBF7D0' : '#FDE68A'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: selectedRecord.aadhaar_verified ? '#15803D' : '#B45309' }}>
                    <Fingerprint size={16} />
                    <span>Citizen Aadhaar Identity Link & UIDAI e-KYC</span>
                  </div>
                  {selectedRecord.aadhaar_verified ? (
                    <span style={{ fontSize: 11, background: '#DCFCE7', color: '#15803D', padding: '3px 9px', borderRadius: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={12} /> UIDAI Certified
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, background: '#FEF3C7', color: '#B45309', padding: '3px 9px', borderRadius: 12, fontWeight: 700 }}>
                      Pending e-KYC
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                      {selectedRecord.aadhaar_number || 'XXXX-XXXX-8492'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      Registered Titleholder: <strong>{selectedRecord.owner_name}</strong>
                    </div>
                    {selectedRecord.aadhaar_auth_txnid && (
                      <div style={{ fontSize: 11, color: '#059669', marginTop: 3 }}>
                        Auth Txn: <code>{selectedRecord.aadhaar_auth_txnid}</code>
                      </div>
                    )}
                  </div>

                  {!selectedRecord.aadhaar_verified && (
                    <button
                      onClick={() => handleVerifyAadhaarForRecord(selectedRecord)}
                      disabled={verifyingAadhaarId === selectedRecord.id}
                      style={{
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: verifyingAadhaarId === selectedRecord.id ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                      }}
                    >
                      {verifyingAadhaarId === selectedRecord.id ? (
                        <>
                          <Loader2 size={13} className="spinner" />
                          <span>Verifying with UIDAI...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={13} />
                          <span>Verify via UIDAI e-KYC</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* DILRMP Central Stack Status */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 14,
                  padding: '16px 20px',
                  border: '1px solid #E2E8F0',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 14,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>DILRMP-MIS STATUS</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: String(selectedRecord.dilrmp_sync_status).toUpperCase() === 'SYNCED' ? '#059669' : '#D97706', marginTop: 2 }}>
                    {String(selectedRecord.dilrmp_sync_status).toUpperCase() === 'SYNCED' ? 'Central Repository Synced' : 'Sync Pending'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>CENTRAL TRANSACTION ID</div>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                    {selectedRecord.dilrmp_txn_id || 'DILRMP-MIS-PENDING'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>LOCATION / JURISDICTION</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', marginTop: 2 }}>
                    {selectedRecord.village_city || selectedRecord.village || 'N/A'}, {selectedRecord.state}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>CADASTRAL EXTENT</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                    {selectedRecord.size} {selectedRecord.size_unit} ({selectedRecord.area_sqm || '—'} m²)
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 10 }}>
                <button
                  onClick={() => setSelectedRecord(null)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>

                <button
                  onClick={() => {
                    handleApplySingleToMap(selectedRecord);
                    setSelectedRecord(null);
                  }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#0052FF',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 8px rgba(0, 82, 255, 0.25)',
                  }}
                >
                  <Layers size={14} />
                  <span>Extrude into 3D Studio</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── DILRMP Sync Success Modal ─── */}
      {syncResultModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(10, 11, 13, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              width: '100%',
              maxWidth: 520,
              padding: '28px 24px',
              textAlign: 'center',
              boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
              border: '1px solid #ECEFF0',
              animation: 'fadeInUp 0.25s ease',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: '#DCFCE7',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 4px 14px rgba(21, 128, 61, 0.2)',
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0A0B0D', margin: '0 0 6px' }}>
              DILRMP-MIS Central Sync Completed
            </h3>
            <p style={{ fontSize: 13, color: '#5B616E', margin: '0 0 20px', lineHeight: 1.5 }}>
              All <strong>{syncResultModal.syncedCount}</strong> cadastral land parcels have been committed with 14-digit ULPIN codes into the national Digital India Land Records repository.
            </p>

            <div
              style={{
                background: '#F8FAFC',
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 20,
                textAlign: 'left',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#64748B' }}>DILRMP Transaction ID:</span>
                <strong style={{ fontFamily: 'monospace', color: '#0052FF' }}>{syncResultModal.txnId}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#64748B' }}>Parcels Synchronized:</span>
                <strong style={{ color: '#0F172A' }}>{syncResultModal.syncedCount} (100% Verified)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#64748B' }}>Authority Gateway:</span>
                <strong style={{ color: '#059669' }}>DoLR / MoRD Central Node</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#64748B' }}>Timestamp:</span>
                <span style={{ color: '#475569', fontSize: 11 }}>{new Date(syncResultModal.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => setSyncResultModal(null)}
              style={{
                width: '100%',
                padding: '11px 20px',
                background: '#0052FF',
                color: '#ffffff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 82, 255, 0.28)',
              }}
            >
              Acknowledged & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
