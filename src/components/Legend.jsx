import React, { useState } from 'react';
import { CLASSIFICATION_COLORS } from '../utils/colorUtils';
import { Layers, Sparkles, ChevronDown, ChevronUp, Info } from 'lucide-react';

export default function Legend({ unitCount = 0, syntheticCount = 0 }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="legend-panel glass-panel">
      <div className="legend-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="legend-title-row">
          <Layers size={16} className="legend-icon" />
          <span className="legend-title">Classification Legend</span>
        </div>
        <button className="legend-toggle-btn" aria-label="Toggle legend">
          {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="legend-body">
          <div className="legend-items-list">
            {Object.entries(CLASSIFICATION_COLORS).map(([key, item]) => (
              <div key={key} className="legend-item">
                <div
                  className="legend-color-chip"
                  style={{ backgroundColor: item.hex }}
                />
                <span className="legend-label">{item.name}</span>
              </div>
            ))}
          </div>

          <div className="legend-divider" />

          {/* Synthetic unit indicator */}
          <div className="legend-synthetic-section">
            <div className="legend-synthetic-header">
              <Sparkles size={14} color="#38bdf8" />
              <span className="legend-synthetic-title">Data Simulation Tag</span>
            </div>
            <div className="legend-synthetic-item">
              <div className="legend-synthetic-chip" />
              <div className="legend-synthetic-text">
                <span className="legend-synthetic-label">is_synthetic: true</span>
                <span className="legend-synthetic-desc">Semi-translucent floor ({syntheticCount} units)</span>
              </div>
            </div>
          </div>

          <div className="legend-footer">
            <Info size={12} className="legend-footer-icon" />
            <span>Vertical stacking = floor_number × floor_height_m</span>
          </div>
        </div>
      )}
    </div>
  );
}
