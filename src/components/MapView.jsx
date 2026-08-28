import React, { useState, useEffect, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { PolygonLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { calculateFeatureCenter } from '../utils/geoUtils';
import { getParcelColor } from '../utils/colorUtils';
import { generateBuildingFloorSlices } from '../utils/buildingUtils';

const MAPBOX_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11'
};

const CARTO_FREE_STYLES = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
};

export default function MapView({
  features = [],
  mapTheme = 'dark',
  viewState: controlledViewState,
  onViewStateChange,
  onSelectUnit,
  selectedUnitId,
}) {
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
  const [hoverInfo, setHoverInfo] = useState(null);

  // Dynamic center
  const defaultCenter = useMemo(() => calculateFeatureCenter(features), [features]);

  const [internalViewState, setInternalViewState] = useState({
    longitude: defaultCenter.longitude,
    latitude: defaultCenter.latitude,
    zoom: 17.5,
    pitch: 58,
    bearing: -25,
    maxPitch: 85,
  });

  useEffect(() => {
    setInternalViewState((prev) => ({
      ...prev,
      longitude: defaultCenter.longitude,
      latitude: defaultCenter.latitude,
      zoom: 17.5
    }));
  }, [defaultCenter]);

  const activeViewState = controlledViewState || internalViewState;

  const handleViewStateChange = (params) => {
    if (onViewStateChange) {
      onViewStateChange(params);
    } else {
      setInternalViewState(params.viewState);
    }
  };

  const activeMapStyle = useMemo(() => {
    if (mapboxToken && mapboxToken.trim().length > 0) {
      return MAPBOX_STYLES[mapTheme] || MAPBOX_STYLES.dark;
    }
    return CARTO_FREE_STYLES[mapTheme] || CARTO_FREE_STYLES.dark;
  }, [mapboxToken, mapTheme]);

  // Derived 3D floor slices for every building feature
  const floorSlices = useMemo(() => {
    return generateBuildingFloorSlices(features);
  }, [features]);

  // Deck.gl PolygonLayer rendering discrete floor slices stacked vertically in 3D
  const layers = useMemo(() => {
    if (!floorSlices || floorSlices.length === 0) return [];

    return [
      new PolygonLayer({
        id: 'building-floor-slices-layer',
        data: floorSlices,
        extruded: true,
        wireframe: false,
        filled: true,
        stroked: true,
        getPolygon: (d) => d.polygon,
        getElevation: (d) => d.sliceThickness,
        // Classification color per floor slice
        getFillColor: (d) => {
          const isSelected = selectedUnitId && d.unit_id === selectedUnitId;
          if (isSelected) {
            return [250, 204, 21, 245]; // Golden highlight
          }
          return getParcelColor(d.classification, d.is_synthetic);
        },
        getLineColor: (d) => {
          const isSelected = selectedUnitId && d.unit_id === selectedUnitId;
          return isSelected ? [255, 255, 255, 255] : [15, 23, 42, 220];
        },
        getLineWidth: (d) => {
          const isSelected = selectedUnitId && d.unit_id === selectedUnitId;
          return isSelected ? 3 : 1;
        },
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: 1,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 80],
        material: {
          ambient: 0.45,
          diffuse: 0.65,
          shininess: 40,
          specularColor: [80, 85, 95]
        },
        updateTriggers: {
          getFillColor: [selectedUnitId],
          getLineColor: [selectedUnitId],
          getLineWidth: [selectedUnitId]
        },
        onHover: (info) => {
          if (info && info.object) {
            setHoverInfo(info);
          } else {
            setHoverInfo(null);
          }
        },
        onClick: (info) => {
          if (info && info.object && onSelectUnit) {
            onSelectUnit(info.object);
          }
        }
      })
    ];
  }, [floorSlices, selectedUnitId, onSelectUnit]);

  return (
    <div className="map-wrapper">
      <DeckGL
        viewState={activeViewState}
        onViewStateChange={handleViewStateChange}
        controller={{
          dragRotate: true,
          touchRotate: true,
          dragPan: true,
          scrollZoom: true,
          doubleClickZoom: true,
          keyboard: true
        }}
        layers={layers}
        getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'default')}
        style={{ width: '100%', height: '100%' }}
      >
        <Map
          reuseMaps
          mapboxAccessToken={mapboxToken || undefined}
          mapStyle={activeMapStyle}
          preventStyleDiffing={false}
          attributionControl={true}
        />
      </DeckGL>

      {/* Hover Tooltip showing specific Floor & Unit Details */}
      {hoverInfo && hoverInfo.object && (
        <div
          className="map-tooltip glass-panel"
          style={{
            left: hoverInfo.x + 14,
            top: hoverInfo.y + 14,
          }}
        >
          <div className="tooltip-id">Floor {hoverInfo.object.floor_number} • {hoverInfo.object.unit_id}</div>
          <div className="tooltip-detail">
            <span>Owner:</span>
            <strong>{hoverInfo.object.owner_name}</strong>
          </div>
          <div className="tooltip-detail">
            <span>Classification:</span>
            <span className="capitalize">{hoverInfo.object.classification}</span>
          </div>
          <div className="tooltip-detail">
            <span>Building:</span>
            <span>{hoverInfo.object.building_id}</span>
          </div>
        </div>
      )}
    </div>
  );
}
