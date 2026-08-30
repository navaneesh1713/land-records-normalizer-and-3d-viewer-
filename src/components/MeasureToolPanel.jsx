import React, { useState, useMemo } from 'react';
import {
  Ruler, Calculator, X, Trash2, Undo2, Check, MapPin,
  Maximize2, ArrowRightLeft, Sparkles, Layers, Info
} from 'lucide-react';
import {
  AREA_UNITS_TO_SQM,
  UNIT_METADATA,
  convertLandArea,
  getRegionalUnitBreakdown,
  calculatePolylineDistance,
} from '../utils/unitConverter';
import * as turf from '@turf/turf';

/**
 * MeasureToolPanel — Interactive Map Measurement HUD & Indian Land Unit Converter.
 * 
 * Props:
 *   isMeasuring: boolean
 *   onToggleMeasuring: () => void
 *   measurePoints: Array<[lng, lat]>
 *   onUndoPoint: () => void
 *   onClearPoints: () => void
 *   onClose: () => void
 */
export default function MeasureToolPanel({
  isMeasuring = false,
  onToggleMeasuring,
  measurePoints = [],
  onUndoPoint,
  onClearPoints,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('ruler'); // 'ruler' | 'calculator'

  // ── Calculator State ──
  const [calcValue, setCalcValue] = useState(1);
  const [calcFromUnit, setCalcFromUnit] = useState('gunta');

  // Compute live distance and polygon area from measurePoints
  const distanceInfo = useMemo(() => {
    return calculatePolylineDistance(measurePoints);
  }, [measurePoints]);

  const polygonAreaInfo = useMemo(() => {
    if (!measurePoints || measurePoints.length < 3) return null;
    try {
      // Close polygon ring
      const closedCoords = [...measurePoints, measurePoints[0]];
      const poly = turf.polygon([closedCoords]);
      const sqmMeters = turf.area(poly);
      return {
        sqmMeters: Number(sqmMeters.toFixed(2)),
        breakdown: getRegionalUnitBreakdown(sqmMeters),
      };
    } catch (e) {
      return null;
    }
  }, [measurePoints]);

  // Calculator conversions
  const calculatorBreakdown = useMemo(() => {
    const num = parseFloat(calcValue);
    if (isNaN(num) || num < 0) return [];
    const inSqm = num * (AREA_UNITS_TO_SQM[calcFromUnit] || 1.0);
    return getRegionalUnitBreakdown(inSqm);
  }, [calcValue, calcFromUnit]);

  return (
    <div className="measure-panel glass-panel">
      {/* Header */}
      <div className="measure-header">
        <div className="measure-title-group">
          <div className="measure-icon">
            <Ruler size={16} />
          </div>
          <div>
            <div className="measure-title">Spatial Measurement & Units</div>
            <div className="measure-subtitle">Map Ruler • Indian Land Converter</div>
          </div>
        </div>
        <button onClick={onClose} className="sidebar-close-btn" title="Close Tool">
          <X size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="measure-tabs-strip">
        <button
          className={`measure-tab ${activeTab === 'ruler' ? 'active' : ''}`}
          onClick={() => setActiveTab('ruler')}
        >
          <Ruler size={13} />
          <span>Map Ruler ({measurePoints.length} pts)</span>
        </button>
        <button
          className={`measure-tab ${activeTab === 'calculator' ? 'active' : ''}`}
          onClick={() => setActiveTab('calculator')}
        >
          <Calculator size={13} />
          <span>Regional Unit Calculator</span>
        </button>
      </div>

      {/* TAB 1: Interactive Map Ruler */}
      {activeTab === 'ruler' && (
        <div className="measure-body">
          {/* Active Measure Toggle Banner */}
          <div className="measure-toggle-banner">
            <div className="measure-toggle-info">
              <div className="measure-toggle-title">
                {isMeasuring ? 'Ruler Mode Active' : 'Ruler Mode Paused'}
              </div>
              <div className="measure-toggle-sub">
                {isMeasuring ? 'Click anywhere on 3D map to place distance markers' : 'Enable to measure road width, setbacks & parcels'}
              </div>
            </div>
            <button
              className={`measure-switch-btn ${isMeasuring ? 'active' : ''}`}
              onClick={onToggleMeasuring}
            >
              {isMeasuring ? 'Active' : 'Enable'}
            </button>
          </div>

          {/* Metrics Display */}
          <div className="measure-metrics-grid">
            <div className="measure-metric-card">
              <div className="metric-label">Total Distance / Perimeter</div>
              <div className="metric-primary-val">
                {distanceInfo.totalDistanceMeters >= 1000
                  ? `${(distanceInfo.totalDistanceMeters / 1000).toFixed(3)} km`
                  : `${distanceInfo.totalDistanceMeters.toFixed(1)} m`}
              </div>
              <div className="metric-secondary-val">
                ≈ {distanceInfo.totalDistanceFeet.toLocaleString('en-IN', { maximumFractionDigits: 1 })} ft ({((distanceInfo.totalDistanceMeters * 1.09361)).toFixed(1)} yards)
              </div>
            </div>

            {polygonAreaInfo && (
              <div className="measure-metric-card metric-card-area">
                <div className="metric-label">Enclosed Polygon Area (3+ Points)</div>
                <div className="metric-primary-val">
                  {polygonAreaInfo.sqmMeters.toLocaleString('en-IN')} m²
                </div>
                <div className="metric-secondary-val">
                  ≈ {((polygonAreaInfo.sqmMeters * 10.7639)).toLocaleString('en-IN', { maximumFractionDigits: 1 })} sq ft
                </div>
              </div>
            )}
          </div>

          {/* Regional Area Breakdown if Polygon is formed */}
          {polygonAreaInfo && (
            <div className="measure-breakdown-section">
              <div className="measure-section-title">
                <Sparkles size={11} color="#ca8a04" />
                <span>Regional Land Units for Measured Area</span>
              </div>
              <div className="measure-breakdown-grid">
                {polygonAreaInfo.breakdown.map((item) => (
                  <div key={item.unitKey} className="breakdown-card">
                    <div className="breakdown-val">
                      {item.value} <small>{item.symbol}</small>
                    </div>
                    <div className="breakdown-label">{item.label}</div>
                    <div className="breakdown-region">{item.region}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Point Controls */}
          {measurePoints.length > 0 && (
            <div className="measure-actions-bar">
              <button className="btn-control" onClick={onUndoPoint} title="Remove last clicked point">
                <Undo2 size={13} />
                <span>Undo Point</span>
              </button>
              <button className="btn-control btn-danger-action" onClick={onClearPoints} title="Reset all ruler points">
                <Trash2 size={13} color="#ef4444" />
                <span>Clear Ruler</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Regional Indian Land Unit Calculator */}
      {activeTab === 'calculator' && (
        <div className="measure-body">
          {/* Input Row */}
          <div className="calc-input-row">
            <div className="calc-input-group">
              <label className="calc-label">Land Quantity</label>
              <input
                type="number"
                min="0"
                step="any"
                className="calc-number-input"
                value={calcValue}
                onChange={(e) => setCalcValue(e.target.value)}
                placeholder="Enter value"
              />
            </div>
            <div className="calc-input-group">
              <label className="calc-label">Source Unit</label>
              <select
                className="floor-control-select"
                value={calcFromUnit}
                onChange={(e) => setCalcFromUnit(e.target.value)}
              >
                {Object.entries(UNIT_METADATA).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Conversion Grid */}
          <div className="measure-breakdown-section" style={{ marginTop: '12px' }}>
            <div className="measure-section-title">
              <ArrowRightLeft size={11} color="#ca8a04" />
              <span>Equivalent Values Across Indian States</span>
            </div>
            <div className="measure-breakdown-grid">
              {calculatorBreakdown.map((item) => (
                <div
                  key={item.unitKey}
                  className={`breakdown-card ${item.unitKey === calcFromUnit ? 'breakdown-card-highlight' : ''}`}
                >
                  <div className="breakdown-val">
                    {item.value} <small>{item.symbol}</small>
                  </div>
                  <div className="breakdown-label">{item.label}</div>
                  <div className="breakdown-region">{item.region}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
