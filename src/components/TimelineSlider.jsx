import React, { useState, useEffect } from 'react';
import { History, Play, Pause, FastForward, Calendar, ShieldCheck, ChevronRight, X } from 'lucide-react';
import { CADASTRAL_TIMELINE_YEARS, TIMELINE_SNAPSHOTS } from '../data/mutationTimeline';

/**
 * TimelineSlider — Cadastral Time-Travel & Mutation History Scrubber.
 * 
 * Props:
 *   selectedYear: number (2012 | 2018 | 2024)
 *   onSelectYear: (year: number) => void
 *   onClose: () => void
 */
export default function TimelineSlider({
  selectedYear = 2024,
  onSelectYear,
  onClose,
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play time scrubber
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const idx = CADASTRAL_TIMELINE_YEARS.indexOf(selectedYear);
      const nextIdx = (idx + 1) % CADASTRAL_TIMELINE_YEARS.length;
      if (onSelectYear) {
        onSelectYear(CADASTRAL_TIMELINE_YEARS[nextIdx]);
      }
    }, 2800);
    return () => clearInterval(interval);
  }, [isPlaying, selectedYear, onSelectYear]);

  const currentSnapshot = TIMELINE_SNAPSHOTS[selectedYear] || {
    year: 2024,
    title: 'SVAMITVA 3D Multi-Story Cadastre',
    subtitle: 'High-Density G+2 Vertical Cadastre & Floor Unit Title Deeds',
    mutation_entry: 'MUT-2024-8842 (SVAMITVA Drone Cadastre)',
    land_use: 'Mixed Residential & Commercial Multi-Story',
    notes: 'DGCA-certified UAV Drone Photogrammetry mapped with discrete vertical floor boundaries.',
  };

  return (
    <div className="timeline-panel glass-panel animate-slide-up">
      {/* Top Header */}
      <div className="timeline-header">
        <div className="timeline-title-group">
          <div className="timeline-icon">
            <History size={15} />
          </div>
          <div>
            <div className="timeline-title">Cadastral Time-Travel</div>
            <div className="timeline-subtitle">Land Mutation & Subdivision Timeline</div>
          </div>
        </div>

        <div className="timeline-header-actions">
          <button
            className={`btn-control btn-play ${isPlaying ? 'active' : ''}`}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause Timeline' : 'Auto-Play Historical Evolution'}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {onClose && (
            <button onClick={onClose} className="sidebar-close-btn" title="Close Timeline">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Year Scrub Track */}
      <div className="timeline-track-wrapper">
        <div className="timeline-track">
          <div
            className="timeline-track-progress"
            style={{
              width: `${(CADASTRAL_TIMELINE_YEARS.indexOf(selectedYear) / (CADASTRAL_TIMELINE_YEARS.length - 1)) * 100}%`,
            }}
          />
          {CADASTRAL_TIMELINE_YEARS.map((yr) => {
            const isSelected = yr === selectedYear;
            return (
              <button
                key={yr}
                className={`timeline-node ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  setIsPlaying(false);
                  if (onSelectYear) onSelectYear(yr);
                }}
              >
                <div className="timeline-node-dot" />
                <span className="timeline-node-year">{yr}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Era Snapshot Card */}
      <div className="timeline-snapshot-card">
        <div className="snapshot-top-row">
          <span className="snapshot-badge">
            <Calendar size={11} /> Year {selectedYear}
          </span>
          <span className="snapshot-mutation font-mono">{currentSnapshot.mutation_entry}</span>
        </div>

        <div className="snapshot-title">{currentSnapshot.title}</div>
        <div className="snapshot-subtitle">{currentSnapshot.subtitle}</div>

        <p className="snapshot-notes">{currentSnapshot.notes}</p>
      </div>
    </div>
  );
}
