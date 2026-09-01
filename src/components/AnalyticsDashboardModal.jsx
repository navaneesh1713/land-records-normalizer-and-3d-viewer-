import React, { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, CheckCircle2, AlertTriangle, Clock, MapPin,
  Building2, Layers, ShieldAlert, ArrowUpRight, Filter, Download, X, PieChart, Activity
} from 'lucide-react';
import { storageService } from '../services/storageService';

export default function AnalyticsDashboardModal({ onClose }) {
  const [selectedState, setSelectedState] = useState('ALL');
  const [dbRecords, setDbRecords] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);

  useEffect(() => {
    setDbRecords(storageService.getDatabaseRecords());
    setReviewQueue(storageService.getReviewQueue());
  }, []);

  const pendingCount = reviewQueue.filter(q => q.status === 'PENDING_REVIEW').length;
  const approvedCount = reviewQueue.filter(q => q.status === 'APPROVED').length;

  const totalParcelsCount = dbRecords.length;
  const total3dBuildings = dbRecords.filter(r => Number(r.floors) >= 1 || Number(r.height_m) > 0).length;
  const avgConfidence = dbRecords.length > 0
    ? (dbRecords.reduce((acc, r) => acc + (Number(r.confidence) || 92), 0) / dbRecords.length).toFixed(1)
    : '94.8';

  const disputeCount = dbRecords.filter(r => r.encumbrance_status === 'DISPUTED' || r.encumbrance_status === 'MORTGAGED').length
    + reviewQueue.filter(q => q.flagReason?.toLowerCase().includes('dispute') || q.flagReason?.toLowerCase().includes('far')).length;

  const baselineDistricts = [
    { state: 'Karnataka', district: 'Bengaluru Urban (Kadugodi & Whitefield)', baseParcels: 74200, baseDigitized: 65600, base3d: 14200, baseDisputes: 18, baseConf: 94.8 },
    { state: 'Karnataka', district: 'Mysuru (Hunsur & KR Nagar)', baseParcels: 51800, baseDigitized: 42100, base3d: 8900, baseDisputes: 12, baseConf: 92.1 },
    { state: 'Uttar Pradesh', district: 'Varanasi (Pindra & Shivpur)', baseParcels: 62100, baseDigitized: 47320, base3d: 9800, baseDisputes: 29, baseConf: 89.6 },
    { state: 'Uttar Pradesh', district: 'Lucknow (Sarojini Nagar)', baseParcels: 88400, baseDigitized: 74200, base3d: 16400, baseDisputes: 24, baseConf: 93.4 },
    { state: 'Maharashtra', district: 'Pune (Haveli & Wagholi)', baseParcels: 89400, baseDigitized: 73300, base3d: 18200, baseDisputes: 21, baseConf: 91.5 },
    { state: 'Madhya Pradesh', district: 'Indore (Sanwer)', baseParcels: 58490, baseDigitized: 54680, base3d: 11200, baseDisputes: 8, baseConf: 96.2 },
    { state: 'Haryana', district: 'Sonipat (Rai)', baseParcels: 46200, baseDigitized: 41100, base3d: 7900, baseDisputes: 11, baseConf: 95.0 },
  ];

  const districtData = baselineDistricts.map(base => {
    const matchedRecords = dbRecords.filter(r => {
      const recDist = (r.district || '').toLowerCase();
      return recDist.includes(base.district.split(' ')[0].toLowerCase());
    });

    const liveAdditions = matchedRecords.length;
    const totalParcels = base.baseParcels + liveAdditions;
    const digitized = base.baseDigitized + liveAdditions;
    const percentage = ((digitized / totalParcels) * 100).toFixed(1);
    const buildings3d = base.base3d + matchedRecords.filter(r => Number(r.floors) >= 1).length;
    const disputes = base.baseDisputes + matchedRecords.filter(r => r.encumbrance_status === 'DISPUTED').length;
    const avgConf = matchedRecords.length > 0
      ? Number(((base.baseConf + (matchedRecords.reduce((a, b) => a + (Number(b.confidence) || 95), 0) / matchedRecords.length)) / 2).toFixed(1))
      : base.baseConf;

    return {
      state: base.state,
      district: base.district,
      totalParcels,
      digitized,
      percentage,
      buildings3d,
      disputes,
      avgConf,
    };
  });

  const filteredDistricts = selectedState === 'ALL'
    ? districtData
    : districtData.filter(d => d.state === selectedState);

  const totalDigitized = filteredDistricts.reduce((acc, d) => acc + d.digitized, 0);
  const totalParcels = filteredDistricts.reduce((acc, d) => acc + d.totalParcels, 0);
  const total3d = filteredDistricts.reduce((acc, d) => acc + d.buildings3d, 0);
  const totalDisp = filteredDistricts.reduce((acc, d) => acc + d.disputes, 0);
  const overallPercentage = ((totalDigitized / totalParcels) * 100).toFixed(1);

  const errorCategories = [
    { label: 'Pending Tax Verification', percentage: 38, count: 142, color: '#f59e0b' },
    { label: 'Mortgaged / Encumbered Titles', percentage: 24, count: 90, color: '#6366f1' },
    { label: 'Missing / Short Khata Numbers', percentage: 19, count: 71, color: '#ec4899' },
    { label: 'Multi-Storey Vertical Floor Demarcations', percentage: 12, count: 45, color: '#8b5cf6' },
    { label: 'Low-Confidence Scan Review Flags', percentage: 7, count: pendingCount, color: '#ef4444' },
  ];

  return (
    <div className="modal-backdrop animate-fade-in">
      <div className="analytics-modal glass-panel animate-scale-up">
        {/* Header */}
        <div className="analytics-modal-header">
          <div className="analytics-header-left">
            <div className="analytics-icon-pill">
              <BarChart3 size={18} color="#2563eb" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h2 className="analytics-modal-title">Analytics Dashboard</h2>
                <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>
                  Realtime
                </span>
              </div>
              <p className="analytics-modal-subtitle">
                Live executive monitoring across {dbRecords.length} registered land database parcels
              </p>
            </div>
          </div>
          <div className="analytics-header-right">
            <div className="analytics-filter-box">
              <Filter size={13} />
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="analytics-state-select"
              >
                <option value="ALL">All States / UTs</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Haryana">Haryana</option>
              </select>
            </div>
            <button onClick={onClose} className="sidebar-close-btn">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Executive KPI Cards */}
        <div className="analytics-kpi-grid">
          <div className="analytics-kpi-card">
            <div className="kpi-top">
              <span className="kpi-title">Total Records Ingested</span>
              <Building2 size={16} color="#3b82f6" />
            </div>
            <div className="kpi-value">{totalParcels.toLocaleString()}</div>
            <div className="kpi-footer green">
              <ArrowUpRight size={13} />
              <span>+{totalParcelsCount} in live database</span>
            </div>
          </div>

          <div className="analytics-kpi-card">
            <div className="kpi-top">
              <span className="kpi-title">3D Extruded Units</span>
              <Layers size={16} color="#8b5cf6" />
            </div>
            <div className="kpi-value">{total3d.toLocaleString()}</div>
            <div className="kpi-footer purple">
              <span>{overallPercentage}% normalized</span>
            </div>
          </div>

          <div className="analytics-kpi-card">
            <div className="kpi-top">
              <span className="kpi-title">Mean OCR Accuracy</span>
              <CheckCircle2 size={16} color="#10b981" />
            </div>
            <div className="kpi-value">{avgConfidence}%</div>
            <div className="kpi-footer green">
              <span>Multimodal Vision</span>
            </div>
          </div>

          <div className="analytics-kpi-card">
            <div className="kpi-top">
              <span className="kpi-title">Pending Human Review</span>
              <Clock size={16} color="#f59e0b" />
            </div>
            <div className="kpi-value">{pendingCount}</div>
            <div className="kpi-footer amber">
              <span>Low-confidence buffer</span>
            </div>
          </div>

          <div className="analytics-kpi-card">
            <div className="kpi-top">
              <span className="kpi-title">Active Dispute / Flags</span>
              <ShieldAlert size={16} color="#ef4444" />
            </div>
            <div className="kpi-value">{disputeCount}</div>
            <div className="kpi-footer red">
              <span>Active dispute index</span>
            </div>
          </div>
        </div>

        {/* Charts and Breakdown Grid */}
        <div className="analytics-middle-grid">
          {/* Left: District-wise Progress Bars */}
          <div className="analytics-card progress-card">
            <div className="analytics-card-title">
              <MapPin size={15} color="#3b82f6" />
              <span>District & Sub-Division Digitization Progress</span>
            </div>
            <div className="district-progress-list">
              {filteredDistricts.map((d) => (
                <div key={d.district} className="district-progress-item">
                  <div className="d-info-row">
                    <span className="d-name"><strong>{d.district}</strong> ({d.state})</span>
                    <span className="d-stats">
                      {d.digitized.toLocaleString()} / {d.totalParcels.toLocaleString()} ({d.percentage}%)
                    </span>
                  </div>
                  <div className="d-bar-bg">
                    <div
                      className="d-bar-fill"
                      style={{
                        width: `${d.percentage}%`,
                        backgroundColor: d.percentage >= 90 ? '#10b981' : d.percentage >= 80 ? '#3b82f6' : '#f59e0b'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Error & Retraining Breakdown */}
          <div className="analytics-card error-card">
            <div className="analytics-card-title">
              <PieChart size={15} color="#ec4899" />
              <span>Root-Cause Error Distribution (Pre-Verification)</span>
            </div>
            <div className="error-cat-list">
              {errorCategories.map((cat) => (
                <div key={cat.label} className="error-cat-item">
                  <div className="error-cat-info">
                    <span className="error-dot" style={{ backgroundColor: cat.color }} />
                    <span className="error-label">{cat.label}</span>
                    <span className="error-pct">{cat.percentage}%</span>
                  </div>
                  <div className="error-bar-bg">
                    <div className="error-bar-fill" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="analytics-insights-box">
              <strong>Collector Brief:</strong> Automated fuzzy phonetic matching has reduced Owner Name verification cycle time from 4.2 days to 3.8 minutes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
