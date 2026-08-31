import React, { useState } from 'react';
import {
  BarChart3, TrendingUp, CheckCircle2, AlertTriangle, Clock, MapPin,
  Building2, Layers, ShieldAlert, ArrowUpRight, Filter, Download,
  PieChart, FileText, Sparkles, Check, ChevronRight, Activity, Globe
} from 'lucide-react';
import { storageService } from '../services/storageService';

export default function AnalyticsView() {
  const [selectedState, setSelectedState] = useState('ALL');
  const reviewQueue = storageService.getReviewQueue();
  const pendingCount = reviewQueue.filter(q => q.status === 'PENDING_REVIEW').length;
  const approvedCount = reviewQueue.filter(q => q.status === 'APPROVED').length;

  const districtData = [
    { state: 'Karnataka', district: 'Bengaluru Urban (Kadugodi)', totalParcels: 74200, digitized: 65600, percentage: 88.4, buildings3d: 14200, disputes: 18, avgConf: 94.8, status: 'Active Zone' },
    { state: 'Karnataka', district: 'Mysuru (Hunsur)', totalParcels: 51800, digitized: 42100, percentage: 81.2, buildings3d: 8900, disputes: 12, avgConf: 92.1, status: 'Active Zone' },
    { state: 'Uttar Pradesh', district: 'Varanasi (Pindra & Shivpur)', totalParcels: 62100, digitized: 47320, percentage: 76.2, buildings3d: 9800, disputes: 29, avgConf: 89.6, status: 'In Progress' },
    { state: 'Uttar Pradesh', district: 'Lucknow (Sarojini Nagar)', totalParcels: 88400, digitized: 74200, percentage: 83.9, buildings3d: 16400, disputes: 24, avgConf: 93.4, status: 'Active Zone' },
    { state: 'Maharashtra', district: 'Pune (Haveli & Wagholi)', totalParcels: 89400, digitized: 73300, percentage: 82.0, buildings3d: 18200, disputes: 21, avgConf: 91.5, status: 'Active Zone' },
    { state: 'Madhya Pradesh', district: 'Indore (Sanwer)', totalParcels: 58490, digitized: 54680, percentage: 93.5, buildings3d: 11200, disputes: 8, avgConf: 96.2, status: 'Near Complete' },
    { state: 'Haryana', district: 'Sonipat (Rai)', totalParcels: 46200, digitized: 41100, percentage: 88.9, buildings3d: 7900, disputes: 11, avgConf: 95.0, status: 'Active Zone' },
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
    { label: 'Regional Unit Notations (Bigha / Gunta)', percentage: 24, count: 90, color: '#6366f1' },
    { label: 'Missing / Leading Zero Khata Numbers', percentage: 19, count: 71, color: '#ec4899' },
    { label: 'Ambiguous Multi-Story Floor Bounds', percentage: 12, count: 45, color: '#8b5cf6' },
    { label: 'Unsanctioned FAR / Over-construction', percentage: 7, count: 26, color: '#ef4444' },
  ];

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "State,District,Total Parcels,Digitized,Percentage,3D Extruded Buildings,Disputes,Avg Confidence\n"
      + filteredDistricts.map(d => `${d.state},"${d.district}",${d.totalParcels},${d.digitized},${d.percentage}%,${d.buildings3d},${d.disputes},${d.avgConf}%`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `landx3d_analytics_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="analytics-page-root animate-fade-in" style={{ flex: 1, height: '100%', overflowY: 'auto', background: '#f8fafc', padding: '28px 32px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)' }}>
              <BarChart3 size={20} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Executive Cadastre Analytics
              </h1>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                District-level digitization monitoring, 3D parcel extrusions, and OCR fidelity metrics
              </span>
            </div>
          </div>
        </div>

        {/* Filters & Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '6px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Filter size={14} color="#64748b" />
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}
            >
              <option value="ALL">All States / UTs</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Haryana">Haryana</option>
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)'
            }}
          >
            <Download size={14} /> Export Report (CSV)
          </button>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '28px' }}>
        
        {/* Total Ingested */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Total Cadastral Parcels</span>
            <Building2 size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            {totalParcels.toLocaleString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
            <ArrowUpRight size={14} /> +{Math.round(totalDigitized / 40).toLocaleString()} records this week
          </div>
        </div>

        {/* 3D Extruded Units */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>3D Extruded Buildings</span>
            <Layers size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            {total3dBuildings.toLocaleString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#7c3aed', fontWeight: 600 }}>
            <span>{overallPercentage}% normalized into volumetric cadastre</span>
          </div>
        </div>

        {/* OCR Accuracy */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Mean OCR Accuracy</span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            94.2%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
            <TrendingUp size={14} /> +1.8% from active HITL learning loop
          </div>
        </div>

        {/* Pending Review */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Human Verification Queue</span>
            <Clock size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            {pendingCount} Pending
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#b45309', fontWeight: 600 }}>
            <span>{approvedCount} verified & approved</span>
          </div>
        </div>

      </div>

      {/* Main Grid: District Digitization Table & Error Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* District Progress Table */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              District-Wise Cadastral Digitization ({filteredDistricts.length})
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Updated Live</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>State & District</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Total Parcels</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Digitization</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>3D Buildings</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Avg Fidelity</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDistricts.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.district}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>{row.state}</div>
                    </td>
                    <td style={{ padding: '14px 18px', color: '#334155', fontWeight: 600 }}>
                      {row.totalParcels.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden', width: '80px' }}>
                          <div style={{ width: `${row.percentage}%`, background: row.percentage > 85 ? '#10b981' : '#3b82f6', height: '100%' }} />
                        </div>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '12px' }}>{row.percentage}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', color: '#6366f1', fontWeight: 700 }}>
                      {row.buildings3d.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ background: '#ecfdf5', color: '#065f46', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '11.5px' }}>
                        {row.avgConf}%
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        padding: '3px 9px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: row.status === 'Near Complete' ? '#dcfce7' : '#eff6ff',
                        color: row.status === 'Near Complete' ? '#15803d' : '#1d4ed8'
                      }}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Error Distribution & Dispute Monitoring */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Error Categories Breakdown */}
          <div style={{ background: '#ffffff', padding: '22px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
              Common Extraction Discrepancies
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {errorCategories.map((cat, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                    <span style={{ color: '#334155', fontWeight: 500 }}>{cat.label}</span>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>{cat.percentage}% ({cat.count})</span>
                  </div>
                  <div style={{ background: '#f1f5f9', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${cat.percentage}%`, background: cat.color, height: '100%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legal Dispute Alert Box */}
          <div style={{ background: '#fffbeb', padding: '18px', borderRadius: '14px', border: '1px solid #fde68a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldAlert size={18} color="#d97706" />
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#92400e' }}>
                Active Title Disputes ({totalDisputes})
              </h4>
            </div>
            <p style={{ fontSize: '12.5px', color: '#b45309', margin: 0, lineHeight: 1.45 }}>
              Discrepancies identified via overlapping polygon overlays and joint share mismatch. Flagged for Tahsildar adjudication before 3D spatial registration.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
