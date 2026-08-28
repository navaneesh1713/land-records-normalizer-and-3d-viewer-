import React, { useState } from 'react';
import { Building2, Navigation, Layers, Search, MapPin, X, CheckCircle2, AlertTriangle, Sparkles, ChevronRight } from 'lucide-react';
import { formatArea } from '../utils/geoUtils';

export default function BuildingListPanel({
  features = [],
  onSelectBuilding,
  selectedPlotId,
  onClose,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Extract metadata and details for each building feature
  const buildingItems = features.map((feature, idx) => {
    const props = feature.properties || {};
    const plotId = props.plot_id || `PLOT-${idx + 1}`;
    const isSynthetic = props.osm_way_id === null || props.osm_way_id === undefined;
    const village = props.village || 'Unknown Village';
    const tehsil = props.tehsil || '';
    const areaSqm = props.footprint_area_sqm || 0;
    const floors = Array.isArray(props.floors) ? props.floors : [];
    
    let totalUnits = 0;
    let ownerNames = new Set();
    let hasDisputed = false;

    floors.forEach((fl) => {
      const divs = Array.isArray(fl.divisions) ? fl.divisions : [];
      totalUnits += divs.length;
      divs.forEach((d) => {
        if (d.owner_name && d.owner_name !== 'Unknown' && d.owner_name !== 'Unassigned') {
          ownerNames.add(d.owner_name);
        }
        if (d.status === 'disputed') {
          hasDisputed = true;
        }
      });
    });

    const ownersArray = Array.from(ownerNames);
    const ownerDisplay = ownersArray.length > 0
      ? ownersArray.slice(0, 2).join(', ') + (ownersArray.length > 2 ? ` (+${ownersArray.length - 2} more)` : '')
      : 'No owner data';

    return {
      feature,
      plotId,
      osmWayId: props.osm_way_id,
      isSynthetic,
      village,
      tehsil,
      areaSqm,
      floorCount: floors.length,
      unitCount: totalUnits,
      ownerDisplay,
      hasDisputed,
    };
  });

  // Filter building items by search term
  const filteredBuildings = buildingItems.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.plotId.toLowerCase().includes(term) ||
      item.village.toLowerCase().includes(term) ||
      item.ownerDisplay.toLowerCase().includes(term) ||
      (item.osmWayId && String(item.osmWayId).includes(term))
    );
  });

  return (
    <aside className="building-list-panel glass-panel animate-slide-in">
      {/* Panel Header */}
      <div className="building-panel-header">
        <div className="building-panel-title-group">
          <div className="brand-icon-sm">
            <Building2 size={16} color="#818cf8" />
          </div>
          <div>
            <h2 className="building-panel-title">Building Directory</h2>
            <p className="building-panel-subtitle">{features.length} building{features.length !== 1 ? 's' : ''} extracted & plotted</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="sidebar-close-btn" title="Close Building Directory">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="building-search-wrapper">
        <Search size={14} className="search-icon" />
        <input
          type="text"
          placeholder="Search by Plot ID, Owner, Village..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="building-search-input"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="search-clear-btn">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Building List */}
      <div className="building-list-container">
        {filteredBuildings.length === 0 ? (
          <div className="building-empty-state">
            <p>No buildings match "{searchTerm}"</p>
          </div>
        ) : (
          filteredBuildings.map((item, idx) => {
            const isSelected = selectedPlotId === item.plotId;

            return (
              <div
                key={item.plotId || idx}
                className={`building-card ${isSelected ? 'building-card-selected' : ''}`}
                onClick={() => onSelectBuilding(item.feature)}
                title="Click to fly camera to this building"
              >
                <div className="building-card-top">
                  <div className="building-card-id-row">
                    <span className="building-card-id">{item.plotId}</span>
                    {item.isSynthetic ? (
                      <span className="badge-type badge-synthetic">
                        <Sparkles size={10} />
                        <span>Synthetic</span>
                      </span>
                    ) : (
                      <span className="badge-type badge-osm">
                        <CheckCircle2 size={10} />
                        <span>OSM #{item.osmWayId}</span>
                      </span>
                    )}
                  </div>
                  <button className="btn-flyto" title="Fly camera to building">
                    <Navigation size={13} color="#818cf8" />
                  </button>
                </div>

                {/* Subtitle location */}
                <div className="building-card-location">
                  <MapPin size={12} color="#94a3b8" />
                  <span>{item.village}{item.tehsil ? `, ${item.tehsil}` : ''}</span>
                  <span className="dot-sep">•</span>
                  <span>{formatArea(item.areaSqm)}</span>
                </div>

                {/* Bottom stats row */}
                <div className="building-card-footer">
                  <div className="building-stats-strip">
                    <span className="building-stat">
                      <Layers size={11} />
                      <strong>{item.floorCount}</strong> floor{item.floorCount !== 1 ? 's' : ''}
                    </span>
                    <span className="dot-sep">•</span>
                    <span className="building-stat">
                      <strong>{item.unitCount}</strong> unit{item.unitCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {item.hasDisputed && (
                    <span className="badge-disputed-mini" title="Contains disputed unit">
                      <AlertTriangle size={10} /> Disputed
                    </span>
                  )}
                </div>

                {/* Owner summary */}
                <div className="building-owner-preview">
                  <span>Owner: </span>
                  <strong>{item.ownerDisplay}</strong>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
