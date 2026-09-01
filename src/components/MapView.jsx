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

// 100% Free, zero-API-key basemap styles (Carto & ESRI Satellite)
// Using direct raster tile specs avoids CORS issues and missing glyph .pbf errors
const FREE_STYLES = {
  dark: {
    version: 8,
    sources: {
      'carto-dark': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        ],
        tileSize: 256,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    },
    layers: [
      {
        id: 'carto-dark-layer',
        type: 'raster',
        source: 'carto-dark',
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  },
  light: {
    version: 8,
    sources: {
      'carto-light': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
          'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
          'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
          'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        ],
        tileSize: 256,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    },
    layers: [
      {
        id: 'carto-light-layer',
        type: 'raster',
        source: 'carto-light',
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  },
  satellite: {
    version: 8,
    sources: {
      'esri-satellite': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community',
      },
    },
    layers: [
      {
        id: 'esri-satellite-layer',
        type: 'raster',
        source: 'esri-satellite',
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  },
};

export default function MapView({
  features = [],
  mapTheme = 'dark',
  viewState: controlledViewState,
  onViewStateChange,
  onSelectUnit,
  selectedUnitId,
  explosionFactor = 0,
  floorFilter = null,
}) {
  const envToken = (import.meta.env.VITE_MAPBOX_TOKEN || '').trim();
  const [tokenError, setTokenError] = useState(false);
  const [hoverInfo, setHoverInfo] = useState(null);

  const mapboxToken = envToken && !tokenError ? envToken : undefined;

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
    if (mapboxToken) {
      return MAPBOX_STYLES[mapTheme] || MAPBOX_STYLES.dark;
    }
    return FREE_STYLES[mapTheme] || FREE_STYLES.dark;
  }, [mapboxToken, mapTheme]);

  // Derived 3D floor slices for every building feature
  const baseFloorSlices = useMemo(() => {
    return generateBuildingFloorSlices(features);
  }, [features]);

  // Apply explosion factor and floor filter to produce the final renderable slices.
  const floorSlices = useMemo(() => {
    if (!baseFloorSlices || baseFloorSlices.length === 0) return [];

    const explosionGapMeters = explosionFactor * 12;

    let result = baseFloorSlices;

    if (floorFilter !== null) {
      result = result.filter((s) => s.floor_number === floorFilter);
    }

    if (explosionFactor > 0) {
      result = result.map((slice) => {
        const extraGap = (slice.floor_number - 1) * explosionGapMeters;
        if (extraGap === 0) return slice;

        const newPolygon = slice.polygon.map((ring) =>
          ring.map((pt) => [pt[0], pt[1], (pt[2] || 0) + extraGap])
        );

        return {
          ...slice,
          polygon: newPolygon,
          baseElevation: slice.baseElevation + extraGap,
        };
      });
    }

    return result;
  }, [baseFloorSlices, explosionFactor, floorFilter]);

  // Deck.gl Layers
  const layers = useMemo(() => {
    const layerList = [];

    if (floorSlices && floorSlices.length > 0) {
      layerList.push(
        new PolygonLayer({
          id: 'building-floor-slices-layer',
          data: floorSlices,
          extruded: true,
          wireframe: false,
          filled: true,
          stroked: true,
          getPolygon: (d) => d.polygon,
          getElevation: (d) => d.sliceThickness,
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
            getLineWidth: [selectedUnitId],
            getPolygon: [explosionFactor, floorFilter],
            getElevation: [explosionFactor, floorFilter],
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
      );
    }

    return layerList;
  }, [floorSlices, selectedUnitId, onSelectUnit, explosionFactor, floorFilter]);

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
          mapboxAccessToken={mapboxToken}
          mapStyle={activeMapStyle}
          preventStyleDiffing={false}
          attributionControl={true}
          onError={(e) => {
            console.warn('[MapBasemap] Basemap load error, falling back to free Carto tiles:', e);
            if (mapboxToken) {
              setTokenError(true);
            }
          }}
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
