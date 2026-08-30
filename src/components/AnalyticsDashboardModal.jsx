import React, { useState } from 'react';
import {
  BarChart3, TrendingUp, CheckCircle2, AlertTriangle, Clock, MapPin,
  Building2, Layers, ShieldAlert, ArrowUpRight, Filter, Download, X, PieChart
} from 'lucide-react';
import { storageService } from '../services/storageService';

export default function AnalyticsDashboardModal({ onClose }) {
  const [selectedState, setSelectedState] = useState('ALL');
  const reviewQueue = storageService.getReviewQueue();
  const pendingCount = reviewQueue.filter(q => q.status === 'PENDING_REVIEW').length;
  const approvedCount = reviewQueue.filter(q => q.status === 'APPROVED').length;

  const districtData = [
    { state: 'Karnataka', district: 'Bengaluru Urban (Kadugodi)', totalParcels: 74200, digitized: 65600, percentage: 88.4, buildings3d: 14200, disputes: 18, avgConf: 94.8 },
    { state: 'Karnataka', district: 'Mysuru (Hunsur)', totalParcels: 51800, digitized: 42100, percentage: 81.2, buildings3d: 8900, disputes: 12, avgConf: 92.1 },
    { state: 'Uttar Pradesh', district: 'Varanasi (Pindra & Shivpur)', totalParcels: 62100, digitized: 47320, percentage: 76.2, buildings3d: 9800, disputes: 29, avgConf: 89.6 },
    { state: 'Uttar Pradesh', district: 'Lucknow (Sarojini Nagar)', totalParcels: 88400, digitized: 74200, percentage: 83.9, buildings3d: 16400, disputes: 24, avgConf: 93.4 },
    { state: 'Maharashtra', district: 'Pune (Haveli & Wagholi)', totalParcels: 89400, digitized: 73300, percentage: 82.0, buildings3d: 18200, disputes: 21, avgConf: 91.5 },
    { state: 'Madhya Pradesh', district: 'Indore (Sanwer)', totalParcels: 58490, digitized: 54680, percentage: 93.5, buildings3d: 11200, disputes: 8, avgConf: 96.2 },
    { state: 'Haryana', district: 'Sonipat (Rai)', totalParcels: 46200, digitized: 41100, percentage: 88.9, buildings3d: 7900, disputes: 11, avgConf: 95.0 },
  ];

  const filteredDistricts = selectedState === 'ALL'
    ? districtData
    : districtData.filter(d => d.state === selectedState);

  const totalDigitized = filteredDistricts.reduce((acc, d) => acc + d.digitized, 0);
  const totalParcels = filteredDistricts.reduce((acc, d) => acc + d.totalParcels, 0);
  const total3dBuildings = filteredDistricts.reduce((acc, d) => acc + d.buildings3d, 0);
  const totalDisputes = filteredDistricts.reduce((acc, d) => acc + d.disputes, 0);
  const overallPercentage = ((totalDigitized / totalParcels) * 100).toFixed(1);

  const errorCategories = [
    { label: 'OCR Name Phonetic Misspellings', percentage: 38, count: 142, color: '#f59e0b' },
    { label: 'Non-Standard Regional Unit Notations (Bigha/Gunta)', percentage: 24, count: 90, color: '#6366f1' },
    { label: 'Missing / Leading Zero Khata Numbers', percentage: 19, count: 71, color: '#ec4899' },
    { label: 'Ambiguous Multi-Story Floor Bounds', percentage: 12, count: 45, color: '#8b5cf6' },
    { label: 'Unsanctioned FAR / Over-construction', percentage: 7, count: 26, color: '#ef4444' },
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
              <h2 className="analytics-modal-title">National SVAMITVA 3D Cadastre Analytics Dashboard</h2>
              <p className="analytics-modal-subtitle">
                Executive monitoring portal for District Collectors, State Revenue Commissioners & Ministry of Panchayati Raj
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
              <span>+{Math.round(totalDigitized / 40)} this week</span>
            </div>
          </div>

          <div className="analytics-kpi-card">
            <div className="kpi-top">
              <span className="kpi-title">3D Extruded Cadastre Units</span>
              <Layers size={16} color="#8b5cf6" />
            </div>
            <div className="kpi-value">{total3dBuildings.toLocaleString()}</div>
            <div className="kpi-footer purple">
              <span>{overallPercentage}% normalized</span>
            </div>
          </div>

          <div className="analytics-kpi-card">
            <div className="kpi-top">
              <span className="kpi-title">Mean OCR Accuracy</span>
              <CheckCircle2 size={16} color="#10b981" />
            </div>
            <div className="kpi-value">94.2%</div>
            <div className="kpi-footer green">
              <span>+1.8% from fine-tuning</span>
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
              <span className="kpi-title">Active Dispute / FAR Flags</span>
              <ShieldAlert size={16} color="#ef4444" />
            </div>
            <div className="kpi-value">{totalDisputes}</div>
            <div className="kpi-footer red">
              <span>1.84% dispute index</span>
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
