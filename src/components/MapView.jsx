import React, { useState, useEffect, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { PolygonLayer, GeoJsonLayer, PathLayer, ScatterplotLayer } from '@deck.gl/layers';
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
  encroachmentGeoJson = null,
  showEncroachmentOverlay = true,
  isMeasuring = false,
  measurePoints = [],
  onAddMeasurePoint,
}) {
  const envToken = (import.meta.env.VITE_MAPBOX_TOKEN || '').trim();
  const [tokenError, setTokenError] = useState(false);
  const [hoverInfo, setHoverInfo] = useState(null);

  // Validate Mapbox token format (starts with pk. and is long enough)
  const isLikelyValidMapboxToken = useMemo(() => {
    return !tokenError && envToken.startsWith('pk.') && envToken.length > 25;
  }, [envToken, tokenError]);

  const mapboxToken = isLikelyValidMapboxToken ? envToken : undefined;

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
          pickable: !isMeasuring,
          autoHighlight: !isMeasuring,
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
            if (!isMeasuring && info && info.object) {
              setHoverInfo(info);
            } else {
              setHoverInfo(null);
            }
          },
          onClick: (info) => {
            if (!isMeasuring && info && info.object && onSelectUnit) {
              onSelectUnit(info.object);
            }
          }
        })
      );
    }

    // Encroachment Overlap Red Polygon Overlay Layer
    if (showEncroachmentOverlay && encroachmentGeoJson && encroachmentGeoJson.features && encroachmentGeoJson.features.length > 0) {
      layerList.push(
        new GeoJsonLayer({
          id: 'encroachment-violation-layer',
          data: encroachmentGeoJson,
          filled: true,
          stroked: true,
          extruded: true,
          getElevation: 14,
          getFillColor: [239, 68, 68, 200],
          getLineColor: [255, 255, 255, 255],
          getLineWidth: 2,
          lineWidthUnits: 'pixels',
          pickable: !isMeasuring,
          autoHighlight: !isMeasuring,
          highlightColor: [255, 255, 255, 120],
          onHover: (info) => {
            if (!isMeasuring && info && info.object) {
              const p = info.object.properties || {};
              setHoverInfo({
                x: info.x,
                y: info.y,
                object: {
                  unit_id: 'ENCROACHMENT ZONE',
                  floor_number: '!',
                  owner_name: `Overlap: ${p.overlap_sqm} m² between ${p.source_plot} & ${p.target_plot}`,
                  classification: 'Boundary Encroachment',
                  building_id: p.source_plot,
                }
              });
            } else {
              setHoverInfo(null);
            }
          }
        })
      );
    }

    // ── Interactive Measurement Layers ──
    if (measurePoints && measurePoints.length > 0) {
      // 1. Enclosed Polygon Fill (if >= 3 points)
      if (measurePoints.length >= 3) {
        layerList.push(
          new PolygonLayer({
            id: 'measure-polygon-layer',
            data: [{ polygon: measurePoints }],
            filled: true,
            stroked: false,
            getPolygon: (d) => d.polygon,
            getFillColor: [254, 240, 138, 110], // Soft translucent gold
            pickable: false,
          })
        );
      }

      // 2. Polyline Path
      if (measurePoints.length >= 2) {
        layerList.push(
          new PathLayer({
            id: 'measure-path-layer',
            data: [{ path: measurePoints }],
            getPath: (d) => d.path,
            getColor: [234, 179, 8, 255], // Gold
            getWidth: 3,
            widthUnits: 'pixels',
            jointRounded: true,
            capRounded: true,
            pickable: false,
          })
        );
      }

      // 3. Scatterplot Node Pins
      layerList.push(
        new ScatterplotLayer({
          id: 'measure-nodes-layer',
          data: measurePoints.map((pt, idx) => ({ position: pt, index: idx + 1 })),
          getPosition: (d) => d.position,
          getFillColor: (d) => (d.index === 1 ? [16, 185, 129, 255] : [234, 179, 8, 255]),
          getLineColor: [255, 255, 255, 255],
          getLineWidth: 2,
          lineWidthUnits: 'pixels',
          getRadius: 6,
          radiusUnits: 'pixels',
          pickable: false,
        })
      );
    }

    return layerList;
  }, [floorSlices, selectedUnitId, onSelectUnit, explosionFactor, floorFilter, showEncroachmentOverlay, encroachmentGeoJson, isMeasuring, measurePoints]);

  const handleMapClick = (info) => {
    if (isMeasuring && info && info.coordinate && onAddMeasurePoint) {
      const [lng, lat] = info.coordinate;
      onAddMeasurePoint([Number(lng.toFixed(6)), Number(lat.toFixed(6))]);
    }
  };

  return (
    <div className="map-wrapper">
      <DeckGL
        viewState={activeViewState}
        onViewStateChange={handleViewStateChange}
        onClick={handleMapClick}
        controller={{
          dragRotate: true,
          touchRotate: true,
          dragPan: true,
          scrollZoom: true,
          doubleClickZoom: true,
          keyboard: true
        }}
        layers={layers}
        getCursor={({ isHovering }) => (isMeasuring ? 'crosshair' : isHovering ? 'pointer' : 'default')}
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
