import React, { useMemo } from 'react';
import { Layers, SlidersHorizontal, Eye, EyeOff, RotateCcw } from 'lucide-react';

/**
 * FloorControlPanel — 3D Exploded View Slider & Floor Isolator.
 *
 * Props:
 *   explosionFactor  — 0 (collapsed) to 1 (fully exploded), controls vertical spacing between floors
 *   onExplosionChange — (value: number) => void
 *   floorFilter       — null (show all) or a specific floor number to isolate
 *   onFloorFilterChange — (floorNum: number | null) => void
 *   availableFloors   — sorted array of unique floor numbers present in the data
 */
export default function FloorControlPanel({
  explosionFactor = 0,
  onExplosionChange,
  floorFilter = null,
  onFloorFilterChange,
  availableFloors = [],
}) {
  const explosionPercent = Math.round(explosionFactor * 100);

  const maxFloor = useMemo(() => {
    if (availableFloors.length === 0) return 1;
    return Math.max(...availableFloors);
  }, [availableFloors]);

  const handleSliderChange = (e) => {
    const val = Number(e.target.value) / 100;
    if (onExplosionChange) onExplosionChange(val);
  };

  const handleFloorSelect = (e) => {
    const val = e.target.value;
    if (val === 'all') {
      if (onFloorFilterChange) onFloorFilterChange(null);
    } else {
      if (onFloorFilterChange) onFloorFilterChange(Number(val));
    }
  };

  const handleReset = () => {
    if (onExplosionChange) onExplosionChange(0);
    if (onFloorFilterChange) onFloorFilterChange(null);
  };

  return (
    <div className="floor-control-panel glass-panel">
      {/* Panel Header */}
      <div className="floor-control-header">
        <div className="floor-control-title-group">
          <div className="floor-control-icon">
            <SlidersHorizontal size={14} />
          </div>
          <span className="floor-control-title">3D Floor Controls</span>
        </div>
        <button
          onClick={handleReset}
          className="floor-control-reset-btn"
          title="Reset to default (collapsed, all floors)"
          disabled={explosionFactor === 0 && floorFilter === null}
        >
          <RotateCcw size={12} />
        </button>
      </div>

      {/* Explosion Slider */}
      <div className="floor-control-section">
        <div className="floor-control-label-row">
          <Layers size={12} className="floor-control-label-icon" />
          <span className="floor-control-label">Exploded View</span>
          <span className="floor-control-value">{explosionPercent}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={explosionPercent}
          onChange={handleSliderChange}
          className="floor-control-slider"
          id="explosion-slider"
        />
        <div className="floor-control-hint-row">
          <span>Collapsed</span>
          <span>Separated</span>
        </div>
      </div>

      {/* Floor Isolator Dropdown */}
      <div className="floor-control-section">
        <div className="floor-control-label-row">
          {floorFilter !== null ? (
            <Eye size={12} className="floor-control-label-icon" />
          ) : (
            <EyeOff size={12} className="floor-control-label-icon" />
          )}
          <span className="floor-control-label">Floor Isolator</span>
        </div>
        <select
          value={floorFilter !== null ? String(floorFilter) : 'all'}
          onChange={handleFloorSelect}
          className="floor-control-select"
          id="floor-isolator-select"
        >
          <option value="all">All Floors ({maxFloor} levels)</option>
          {availableFloors.map((fn) => (
            <option key={fn} value={String(fn)}>
              Floor {fn}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
