import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./LeafletMap.css";
import type { Report } from "../../pages/citizen-guest/AlertsComponents/AlertsPanel";
import type { EvacuationCenterData } from "../ui/mapLayers/evacuationCenters/evacuationCentersTypes";

// Import layer creation functions from organized modules
import {
  createFaultLinesLayer,
  createFloodZonesLayer,
  createLandslideRiskLayer,
  createEvacuationCentersLayer,
  createRoadsLayer,
  createTrafficLayer,
  createNDVILayer,
} from "./mapLayers";

// Severity colors matching the alerts panel
const severityColors: Record<"critical" | "high" | "moderate" | "low", { primary: string; secondary: string; border: string; text: string }> = {
  critical: { primary: "#991b1b", secondary: "#dc2626", border: "#9c1515", text: "CRITICAL" },
  high: { primary: "#ef4444", secondary: "#f87171", border: "#df3838", text: "HIGH" },
  moderate: { primary: "#f59e0b", secondary: "#fbbf24", border: "#e78c23", text: "MODERATE" },
  low: { primary: "#10b981", secondary: "#34d399", border: "#0ba876", text: "LOW" },
};

interface BarangayData {
  name: string;
  lat: number;
  lon: number;
  risk: "High" | "Medium" | "Low";
}

interface OverpassElement {
  center?: { lat: number; lon: number };
  tags?: { name?: string };
  members?: Array<{
    type: string;
    role?: "outer" | "inner";
    geometry?: Array<{ lat: number; lon: number }>;
  }>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

// Tile layer configurations for different map types
const tileLayerConfigs = {
  basic: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)",
  },
};

/** Hazard index data for one barangay (from hazard_index_data.json / API) */
export interface HazardBarangayData {
  hazard_index: number;
  hazard_class: string;
  flood_risk: number;
  landslide_risk: number;
  earthquake_risk: number;
  typhoon_risk: number;
  rainfall_risk: number;
}

/** Green index data for one barangay (from green_index_data.json / API) */
export interface GreenIndexBarangayData {
  green_index: number;
  mean_ndvi: number;
  gar: number;
  ndvi_norm: number;
  veg_class: string;
}

/** Calamity risk data for one barangay (from calamity_risk_forecast_data.json / API) */
export interface CalamityRiskBarangayData {
  calamity_risk: number;
  calamity_risk_raw: number;
  risk_class: string;
  hazard_index: number;
  hazard_index_raw: number;
  green_index: number;
  green_index_raw: number;
  exposure_norm: number;
}

interface LeafletMapProps {
  height?: string;
  width?: string;
  mapView?: "interactive" | "choropleth";
  mapType?: "basic" | "satellite" | "terrain";
  /** Currently selected data layer in choropleth mode (e.g. "hazard", "green", "calamity") */
  dataLayer?: string;
  searchedBarangay?: string;
  searchedSeverity?: string | null;
  selectedReport?: Report | null;
  reportClickTimestamp?: number | null;
  activeLayers?: string[];
  ndviOpacity?: number;
  ndviYear?: number;
  ndviMonth?: number; // 1-12, for selecting clearest image of a specific month
  ndviFromDate?: string;
  ndviToDate?: string;
  ndviMaxCloud?: number;
  /** Year used for hazard / index choropleth timelines (2020–2030) */
  hazardYear?: number;
  showPopupOnMap?: boolean;
  onSelectEvacuationCenter?: (center: EvacuationCenterData) => void;
  /** Called when user selects a barangay on the hazard index choropleth (for right-panel details) */
  onHazardBarangaySelect?: (barangay: string, year: string, data: HazardBarangayData) => void;
  /** Called when user hovers a barangay on the green index choropleth */
  onGreenIndexBarangaySelect?: (barangay: string, year: string, data: GreenIndexBarangayData) => void;
  /** Called when user hovers a barangay on the calamity risk choropleth */
  onCalamityRiskBarangaySelect?: (barangay: string, year: string, data: CalamityRiskBarangayData) => void;
}

export default function LeafletMap(props: LeafletMapProps) {
  const {
    height = "600px",
    width = "100%",
    mapView = "interactive",
    mapType = "basic",
    dataLayer,
    searchedBarangay = "",
    searchedSeverity = null,
    selectedReport = null,
    reportClickTimestamp: _reportClickTimestamp = null, // kept for API compatibility
    activeLayers = [],
    ndviOpacity = 0.8,
    ndviYear,
    ndviMonth,
    ndviFromDate,
    ndviToDate,
    ndviMaxCloud,
    hazardYear,
    showPopupOnMap = true,
    onSelectEvacuationCenter,
    onHazardBarangaySelect,
    onGreenIndexBarangaySelect,
    onCalamityRiskBarangaySelect,
  } = props;
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const choroplethLayerRef = useRef<L.LayerGroup | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const barangayDataRef = useRef<BarangayData[]>([]);
  const barangayBoundariesLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Layer refs for toggle functionality
  const faultLinesLayerRef = useRef<L.LayerGroup | null>(null);
  const floodZonesLayerRef = useRef<L.LayerGroup | null>(null);
  const landslideRiskLayerRef = useRef<L.LayerGroup | null>(null);
  const evacuationCentersLayerRef = useRef<L.LayerGroup | null>(null);
  const roadsLayerRef = useRef<L.Layer | null>(null);
  const trafficLayerRef = useRef<L.Layer | null>(null);
  const ndviLayerRef = useRef<L.LayerGroup | null>(null);
  const verifiedReportsLayerRef = useRef<L.LayerGroup | null>(null);

  // Hazard Index choropleth (barangay-level)
  const hazardLayerRef = useRef<L.GeoJSON | null>(null);
  const hazardDataRef = useRef<any | null>(null);
  const hazardYearsRef = useRef<string[]>([]);
  const hazardBarangayByLayerIdRef = useRef<Record<number, string>>({});
  const hazardYearRef = useRef<number | undefined>(hazardYear);
  const hazardLabelsLayerRef = useRef<L.LayerGroup | null>(null);
  const onHazardBarangaySelectRef = useRef(onHazardBarangaySelect);

  // Green Index choropleth (barangay-level)
  const greenLayerRef = useRef<L.GeoJSON | null>(null);
  const greenDataRef = useRef<any | null>(null);
  const greenYearsRef = useRef<string[]>([]);
  const greenBarangayByLayerIdRef = useRef<Record<number, string>>({});
  const greenYearRef = useRef<number | undefined>(hazardYear);
  const greenLabelsLayerRef = useRef<L.LayerGroup | null>(null);
  const onGreenIndexBarangaySelectRef = useRef(onGreenIndexBarangaySelect);

  // Calamity Risk choropleth (barangay-level)
  const calamityLayerRef = useRef<L.GeoJSON | null>(null);
  const calamityDataRef = useRef<any | null>(null);
  const calamityYearsRef = useRef<string[]>([]);
  const calamityBarangayByLayerIdRef = useRef<Record<number, string>>({});
  const calamityYearRef = useRef<number | undefined>(hazardYear);
  const calamityLabelsLayerRef = useRef<L.LayerGroup | null>(null);
  const onCalamityRiskBarangaySelectRef = useRef(onCalamityRiskBarangaySelect);

  // Color scale adapted from Hazard/hazard_index_server.py (getHazardColor)
  const getHazardIndexColor = (value: number): string => {
    let hi = Math.max(0, Math.min(100, value));
    let r: number, g: number, b: number;

    if (hi >= 80) {
      const t = (hi - 80) / 20;
      r = Math.round(183 + t * (100 - 83));
      g = Math.round(28 - t * 28);
      b = Math.round(28 - t * 28);
    } else if (hi >= 60) {
      const t = (hi - 60) / 20;
      r = Math.round(229 + t * (183 - 229));
      g = Math.round(57 + t * (28 - 57));
      b = Math.round(53 + t * (28 - 53));
    } else if (hi >= 40) {
      const t = (hi - 40) / 20;
      r = Math.round(255 - t * 26);
      g = Math.round(152 - t * 95);
      b = Math.round(0 + t * 53);
    } else if (hi >= 20) {
      const t = (hi - 20) / 20;
      r = Math.round(253 + t * 2);
      g = Math.round(216 - t * 64);
      b = Math.round(53 - t * 53);
    } else {
      const t = hi / 20;
      r = Math.round(102 + t * 151);
      g = Math.round(187 + t * 29);
      b = Math.round(106 - t * 53);
    }

    return `rgb(${r},${g},${b})`;
  };

  // Green Index color function (from green_index_server.py interpolateColor)
  const getGreenIndexColor = (gi: number): string => {
    gi = Math.max(0, Math.min(100, gi));
    let r: number, g: number, b: number;
    if (gi >= 70) {
      const t = (gi - 70) / 30;
      r = Math.round(60 - t * 60);
      g = Math.round(139 + t * (100 - 39));
      b = Math.round(60 - t * 60);
    } else if (gi >= 40) {
      const t = (gi - 40) / 30;
      r = Math.round(180 - t * 120);
      g = Math.round(180 - t * 41);
      b = Math.round(0 + t * 60);
    } else {
      const t = gi / 40;
      r = Math.round(92 + t * 88);
      g = Math.round(64 + t * 116);
      b = Math.round(51 - t * 51);
    }
    return `rgb(${r},${g},${b})`;
  };

  // Calamity Risk color scale (warm red tones matching screenshot)
  const getCalamityRiskColor = (cr: number): string => {
    const v = Math.max(0, Math.min(1, cr / 100));
    if (v >= 0.8) return '#b71c1c';
    if (v >= 0.6) return '#e53935';
    if (v >= 0.4) return '#ff7043';
    if (v >= 0.2) return '#ffab91';
    return '#fce4ec';
  };

  // Keep latest hazardYear available inside Leaflet event handlers
  useEffect(() => {
    hazardYearRef.current = hazardYear;
    greenYearRef.current = hazardYear;
    calamityYearRef.current = hazardYear;
  }, [hazardYear]);

  // Keep latest callback available inside Leaflet event handlers
  useEffect(() => {
    onHazardBarangaySelectRef.current = onHazardBarangaySelect;
  }, [onHazardBarangaySelect]);

  useEffect(() => {
    onGreenIndexBarangaySelectRef.current = onGreenIndexBarangaySelect;
  }, [onGreenIndexBarangaySelect]);

  useEffect(() => {
    onCalamityRiskBarangaySelectRef.current = onCalamityRiskBarangaySelect;
  }, [onCalamityRiskBarangaySelect]);




  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map("map").setView([14.2349, 121.1211], 13);
      mapRef.current = map;

      // Add initial tile layer
      const config = tileLayerConfigs[mapType];
      tileLayerRef.current = L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: 19,
      }).addTo(map);
    }
  }, []);

  // Handle map type (tile layer) switching
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing tile layer
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    // Add new tile layer based on mapType
    const config = tileLayerConfigs[mapType];
    tileLayerRef.current = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: 19,
    }).addTo(map);

    // Move tile layer to bottom so markers/polygons stay on top
    tileLayerRef.current.bringToBack();
  }, [mapType]);

  // User location (only for interactive)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapView !== "interactive") return;

    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const latlng: [number, number] = [latitude, longitude];

        if (!markerRef.current) {
          markerRef.current = L.marker(latlng, { title: "Your Location" }).addTo(map);
        } else {
          markerRef.current.setLatLng(latlng);
        }

        const circleRadius = accuracy * 0.001;
        if (!circleRef.current) {
          circleRef.current = L.circle(latlng, { radius: circleRadius }).addTo(map);
        } else {
          circleRef.current.setLatLng(latlng).setRadius(circleRadius);
        }

        // Only center on user location once during initial load
        //if (!hasInitialCenteredRef.current) {
        //  map.setView(latlng);
        //  hasInitialCenteredRef.current = true;
        //}
      },
      (err) => {
        if (err.code === 1) alert("Please allow geolocation access");
        else alert("Cannot get current location");
      }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, [mapView]);

  // "Go to My Location" button
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!selectedReport) return;

    const marker = reportMarkersMap.current.get(selectedReport.id);

    if (marker) {
      const latLng = marker.getLatLng();
      map.flyTo(latLng, 16, { duration: 0.5 });
      marker.openPopup();
      marker.setZIndexOffset(1000);
    }

  }, [selectedReport]);


  // Reset any generic choropleth placeholder when map view changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (choroplethLayerRef.current && mapView !== "choropleth") {
      choroplethLayerRef.current.remove();
      choroplethLayerRef.current = null;
    }
  }, [mapView]);

  // Hazard Index choropleth: load data + GeoJSON and create barangay polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const shouldShowHazardChoropleth =
      mapView === "choropleth" && dataLayer === "hazard";

    // Clear layer when not needed
    if (!shouldShowHazardChoropleth) {
      if (hazardLayerRef.current) {
        hazardLayerRef.current.remove();
        hazardLayerRef.current = null;
        hazardBarangayByLayerIdRef.current = {};
      }
      if (hazardLabelsLayerRef.current) {
        hazardLabelsLayerRef.current.remove();
        hazardLabelsLayerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const loadHazardLayer = async () => {
      try {
        // Fetch hazard index data (all years) once
        if (!hazardDataRef.current) {
          const res = await fetch("/api/hazard/hazard-index/");
          if (!res.ok) throw new Error(`Failed to load hazard index data: ${res.status}`);
          const json = await res.json();
          hazardDataRef.current = json;
          hazardYearsRef.current = Object.keys(json).sort();
        }

        // If layer already exists (e.g., user toggled away and back), just re-add to map
        // and update colors for current year
        if (hazardLayerRef.current) {
          hazardLayerRef.current.addTo(map);
          // Apply colors for current year
          const years: string[] = hazardYearsRef.current;
          const yearKey = String(hazardYearRef.current ?? (years.length ? parseInt(years[0], 10) : 2026));
          const slice = hazardDataRef.current?.[yearKey];
          if (slice) {
            hazardLayerRef.current.eachLayer((layer: L.Layer) => {
              const id = L.Util.stamp(layer);
              const brgy = hazardBarangayByLayerIdRef.current[id];
              if (!brgy) return;
              const d = slice[brgy];
              const hi = d?.hazard_index;
              const fillColor =
                typeof hi === "number" ? getHazardIndexColor(hi) : "#cccccc";
              (layer as L.Path).setStyle({
                fillColor,
                fillOpacity: typeof hi === "number" ? 0.75 : 0.2,
                weight: 1.5,
                color: "#ffffff",
              });
            });
          }
          return;
        }

        // Fetch barangay boundaries GeoJSON
        const geoRes = await fetch("/api/hazard/barangays/");
        if (!geoRes.ok) throw new Error(`Failed to load barangay GeoJSON: ${geoRes.status}`);
        const geoJson = await geoRes.json();

        if (cancelled) return;

        const years = hazardYearsRef.current;
        const sampleYear = years[0];
        const sampleSlice = sampleYear ? hazardDataRef.current?.[sampleYear] : null;
        const dataBarangays: string[] = sampleSlice ? Object.keys(sampleSlice) : [];

        const normalizeBrgy = (name: string) =>
          name
            .toLowerCase()
            .trim()
            .replace(/^barangay\s+/, "")
            .replace(/^brgy\s+/, "")
            .replace(/-/g, " ");

        const mapBrgyName = (raw: string) => {
          const key = normalizeBrgy(raw);
          if (key === "poblacion") return "Poblacion";
          const match = dataBarangays.find((b) => normalizeBrgy(b) === key);
          return match || raw;
        };

        // Get initial year for coloring
        const initialYearKey = String(hazardYearRef.current ?? (years.length ? parseInt(years[0], 10) : 2026));
        const initialSlice = hazardDataRef.current?.[initialYearKey];

        hazardLayerRef.current = L.geoJSON(geoJson as any, {
          style: (feature) => {
            if (!feature || !feature.properties) {
              return {
                color: "#ffffff",
                weight: 1.5,
                opacity: 0.9,
                fillOpacity: 0.2,
                fillColor: "#cccccc",
              };
            }
            const rawName =
              (feature.properties.brgy_name || feature.properties.name) || "";
            const mappedName = mapBrgyName(rawName);
            const d = initialSlice?.[mappedName];
            const hi = d?.hazard_index;
            const fillColor =
              typeof hi === "number" ? getHazardIndexColor(hi) : "#cccccc";
            
            return {
              color: "#ffffff",
              weight: 1.5,
              opacity: 0.9,
              fillOpacity: typeof hi === "number" ? 0.75 : 0.2,
              fillColor,
            };
          },
          onEachFeature: (feature, layer) => {
            const rawName =
              (feature.properties &&
                (feature.properties.brgy_name || feature.properties.name)) ||
              "";
            const mappedName = mapBrgyName(rawName);

            if (!feature.properties) feature.properties = {};
            feature.properties.brgy_name = mappedName;

            const id = L.Util.stamp(layer);
            hazardBarangayByLayerIdRef.current[id] = mappedName;

            layer.on("mouseover", () => {
              (layer as L.Path).setStyle({ weight: 3, fillOpacity: 0.9 });
              // Show barangay details in the right panel on hover
              const yearKey = String(hazardYearRef.current ?? "");
              const slice = hazardDataRef.current?.[yearKey];
              const d = slice?.[mappedName];
              if (d) {
                onHazardBarangaySelectRef.current?.(mappedName, yearKey, d as HazardBarangayData);
              }
            });

            layer.on("mouseout", () => {
              const yearKey = String(hazardYearRef.current ?? "");
              const slice = hazardDataRef.current?.[yearKey];
              const d = slice?.[mappedName];
              const hi = d?.hazard_index;
              const fillColor =
                typeof hi === "number" ? getHazardIndexColor(hi) : "#cccccc";
              (layer as L.Path).setStyle({
                weight: 1.5,
                fillOpacity: typeof hi === "number" ? 0.75 : 0.2,
                color: "#ffffff",
                fillColor,
              });
            });
          },
        }).addTo(map);

        // Add static labels for each barangay (centered)
        if (hazardLabelsLayerRef.current) {
          hazardLabelsLayerRef.current.remove();
          hazardLabelsLayerRef.current = null;
        }
        hazardLabelsLayerRef.current = L.layerGroup().addTo(map);
        hazardLayerRef.current.eachLayer((layer: L.Layer) => {
          const id = L.Util.stamp(layer);
          const brgy = hazardBarangayByLayerIdRef.current[id];
          if (!brgy) return;
          const polygon = layer as L.Polygon;
          const bounds = polygon.getBounds();
          if (!bounds.isValid()) return;
          const center = bounds.getCenter();
          // Estimate label width based on text length - tighter box around text
          const estimatedWidth = Math.max(60, brgy.length * 7 + 16);
          const estimatedHeight = 22;
          
          L.marker(center, {
            icon: L.divIcon({
              className: "barangay-label",
              html: `<span>${brgy}</span>`,
              iconSize: [estimatedWidth, estimatedHeight],
              iconAnchor: [estimatedWidth / 2, estimatedHeight / 2], // Center the label
            }),
          }).addTo(hazardLabelsLayerRef.current as L.LayerGroup);
        });

        const bounds = hazardLayerRef.current.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20] });
        }
      } catch (err) {
        console.error("Failed to set up hazard index choropleth:", err);
      }
    };

    loadHazardLayer();

    return () => {
      cancelled = true;
    };
  }, [mapView, dataLayer]);

  // Update hazard choropleth colors + popups when year changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!hazardLayerRef.current) return;
    if (mapView !== "choropleth" || dataLayer !== "hazard") return;

    const hazardData = hazardDataRef.current;
    if (!hazardData) return;

    const years: string[] = hazardYearsRef.current;
    if (!years.length) return;

    const yearKey = String(hazardYear ?? parseInt(years[0], 10));
    const slice = hazardData[yearKey];
    if (!slice) return;

    hazardLayerRef.current.eachLayer((layer: L.Layer) => {
      const id = L.Util.stamp(layer);
      const brgy = hazardBarangayByLayerIdRef.current[id];
      if (!brgy) return;

      const d = slice[brgy];
      const hi = d?.hazard_index;
      const fillColor =
        typeof hi === "number" ? getHazardIndexColor(hi) : "#cccccc";

      (layer as L.Path).setStyle({
        fillColor,
        fillOpacity: typeof hi === "number" ? 0.75 : 0.2,
        weight: 1.5,
        color: "#ffffff",
      });

      // Remove any existing popup (details are shown on hover in the side panel)
      (layer as L.Path).unbindPopup();
    });
  }, [hazardYear, mapView, dataLayer]);

  // Green Index choropleth: load data + GeoJSON and create barangay polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const shouldShowGreenChoropleth =
      mapView === "choropleth" && dataLayer === "green";

    // Clear layer when not needed
    if (!shouldShowGreenChoropleth) {
      if (greenLayerRef.current) {
        greenLayerRef.current.remove();
        greenLayerRef.current = null;
        greenBarangayByLayerIdRef.current = {};
      }
      if (greenLabelsLayerRef.current) {
        greenLabelsLayerRef.current.remove();
        greenLabelsLayerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const loadGreenLayer = async () => {
      try {
        // Fetch green index data (all years) once
        if (!greenDataRef.current) {
          const res = await fetch("/api/hazard/green-index/");
          if (!res.ok) throw new Error(`Failed to load green index data: ${res.status}`);
          const json = await res.json();
          greenDataRef.current = json;
          greenYearsRef.current = Object.keys(json).sort();
        }

        // If layer already exists, just re-add to map and update colors
        if (greenLayerRef.current) {
          greenLayerRef.current.addTo(map);
          if (greenLabelsLayerRef.current) greenLabelsLayerRef.current.addTo(map);
          const years = greenYearsRef.current;
          const yearKey = String(greenYearRef.current ?? (years.length ? parseInt(years[0], 10) : 2025));
          const slice = greenDataRef.current?.[yearKey];
          if (slice) {
            greenLayerRef.current.eachLayer((layer: L.Layer) => {
              const id = L.Util.stamp(layer);
              const brgy = greenBarangayByLayerIdRef.current[id];
              if (!brgy) return;
              const d = slice[brgy];
              const gi = d?.green_index;
              const fillColor = typeof gi === "number" ? getGreenIndexColor(gi) : "#cccccc";
              (layer as L.Path).setStyle({
                fillColor,
                fillOpacity: typeof gi === "number" ? 0.7 : 0.2,
                weight: 2,
                color: "#ffffff",
              });
            });
          }
          const bounds = greenLayerRef.current.getBounds();
          if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
          return;
        }

        // Fetch barangay boundaries GeoJSON
        const geoRes = await fetch("/api/hazard/barangays/");
        if (!geoRes.ok) throw new Error(`Failed to load barangay GeoJSON: ${geoRes.status}`);
        const geoJson = await geoRes.json();

        if (cancelled) return;

        const years = greenYearsRef.current;
        const sampleYear = years[0];
        const sampleSlice = sampleYear ? greenDataRef.current?.[sampleYear] : null;
        const dataBarangays: string[] = sampleSlice ? Object.keys(sampleSlice) : [];

        const normalizeBrgy = (name: string) =>
          name.toLowerCase().trim().replace(/^barangay\s+/, "").replace(/^brgy\s+/, "").replace(/-/g, " ");

        const mapBrgyName = (raw: string) => {
          const key = normalizeBrgy(raw);
          if (key === "poblacion") return "Poblacion";
          const match = dataBarangays.find((b) => normalizeBrgy(b) === key);
          return match || raw;
        };

        const initialYearKey = String(greenYearRef.current ?? (years.length ? parseInt(years[0], 10) : 2025));
        const initialSlice = greenDataRef.current?.[initialYearKey];

        greenLayerRef.current = L.geoJSON(geoJson as any, {
          style: (feature) => {
            if (!feature || !feature.properties) {
              return { color: "#ffffff", weight: 2, opacity: 0.9, fillOpacity: 0.2, fillColor: "#cccccc" };
            }
            const rawName = (feature.properties.brgy_name || feature.properties.name) || "";
            const mappedName = mapBrgyName(rawName);
            const d = initialSlice?.[mappedName];
            const gi = d?.green_index;
            const fillColor = typeof gi === "number" ? getGreenIndexColor(gi) : "#cccccc";
            return {
              color: "#ffffff",
              weight: 2,
              opacity: 0.9,
              fillOpacity: typeof gi === "number" ? 0.7 : 0.2,
              fillColor,
            };
          },
          onEachFeature: (feature, layer) => {
            const rawName = (feature.properties && (feature.properties.brgy_name || feature.properties.name)) || "";
            const mappedName = mapBrgyName(rawName);
            if (!feature.properties) feature.properties = {};
            feature.properties.brgy_name = mappedName;

            const id = L.Util.stamp(layer);
            greenBarangayByLayerIdRef.current[id] = mappedName;

            layer.on("mouseover", () => {
              (layer as L.Path).setStyle({ weight: 3, fillOpacity: 0.85 });
              const yearKey = String(greenYearRef.current ?? "");
              const slice = greenDataRef.current?.[yearKey];
              const d = slice?.[mappedName];
              if (d) {
                onGreenIndexBarangaySelectRef.current?.(mappedName, yearKey, d as GreenIndexBarangayData);
              }
            });

            layer.on("mouseout", () => {
              const yearKey = String(greenYearRef.current ?? "");
              const slice = greenDataRef.current?.[yearKey];
              const d = slice?.[mappedName];
              const gi = d?.green_index;
              const fillColor = typeof gi === "number" ? getGreenIndexColor(gi) : "#cccccc";
              (layer as L.Path).setStyle({
                weight: 2,
                fillOpacity: typeof gi === "number" ? 0.7 : 0.2,
                color: "#ffffff",
                fillColor,
              });
            });
          },
        }).addTo(map);

        // Add labels for each barangay
        if (greenLabelsLayerRef.current) {
          greenLabelsLayerRef.current.remove();
          greenLabelsLayerRef.current = null;
        }
        greenLabelsLayerRef.current = L.layerGroup().addTo(map);
        greenLayerRef.current.eachLayer((layer: L.Layer) => {
          const id = L.Util.stamp(layer);
          const brgy = greenBarangayByLayerIdRef.current[id];
          if (!brgy) return;
          const polygon = layer as L.Polygon;
          const bounds = polygon.getBounds();
          if (!bounds.isValid()) return;
          const center = bounds.getCenter();
          const estimatedWidth = Math.max(60, brgy.length * 7 + 16);
          const estimatedHeight = 22;
          L.marker(center, {
            icon: L.divIcon({
              className: "barangay-label",
              html: `<span>${brgy}</span>`,
              iconSize: [estimatedWidth, estimatedHeight],
              iconAnchor: [estimatedWidth / 2, estimatedHeight / 2],
            }),
          }).addTo(greenLabelsLayerRef.current as L.LayerGroup);
        });

        const bounds = greenLayerRef.current.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
      } catch (err) {
        console.error("Failed to set up green index choropleth:", err);
      }
    };

    loadGreenLayer();
    return () => { cancelled = true; };
  }, [mapView, dataLayer]);

  // Update green index choropleth colors when year changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!greenLayerRef.current) return;
    if (mapView !== "choropleth" || dataLayer !== "green") return;

    const greenData = greenDataRef.current;
    if (!greenData) return;

    const years = greenYearsRef.current;
    if (!years.length) return;

    const yearKey = String(hazardYear ?? parseInt(years[0], 10));
    const slice = greenData[yearKey];
    if (!slice) return;

    greenLayerRef.current.eachLayer((layer: L.Layer) => {
      const id = L.Util.stamp(layer);
      const brgy = greenBarangayByLayerIdRef.current[id];
      if (!brgy) return;

      const d = slice[brgy];
      const gi = d?.green_index;
      const fillColor = typeof gi === "number" ? getGreenIndexColor(gi) : "#cccccc";
      (layer as L.Path).setStyle({
        fillColor,
        fillOpacity: typeof gi === "number" ? 0.7 : 0.2,
        weight: 2,
        color: "#ffffff",
      });
      (layer as L.Path).unbindPopup();
    });
  }, [hazardYear, mapView, dataLayer]);

  // Calamity Risk choropleth: load data + GeoJSON and create barangay polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const shouldShowCalamityChoropleth =
      mapView === "choropleth" && dataLayer === "calamity";

    if (!shouldShowCalamityChoropleth) {
      if (calamityLayerRef.current) {
        calamityLayerRef.current.remove();
        calamityLayerRef.current = null;
        calamityBarangayByLayerIdRef.current = {};
      }
      if (calamityLabelsLayerRef.current) {
        calamityLabelsLayerRef.current.remove();
        calamityLabelsLayerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const loadCalamityLayer = async () => {
      try {
        if (!calamityDataRef.current) {
          const res = await fetch("/api/hazard/calamity-risk/forecast/");
          if (!res.ok) {
            const fallbackRes = await fetch("/api/hazard/calamity-risk/");
            if (!fallbackRes.ok) throw new Error(`Failed to load calamity risk data`);
            const json = await fallbackRes.json();
            calamityDataRef.current = json;
          } else {
            const json = await res.json();
            calamityDataRef.current = json;
          }
          calamityYearsRef.current = Object.keys(calamityDataRef.current).sort();
        }

        if (calamityLayerRef.current) {
          calamityLayerRef.current.addTo(map);
          if (calamityLabelsLayerRef.current) calamityLabelsLayerRef.current.addTo(map);
          const years = calamityYearsRef.current;
          const yearKey = String(calamityYearRef.current ?? (years.length ? parseInt(years[0], 10) : 2020));
          const slice = calamityDataRef.current?.[yearKey];
          if (slice) {
            calamityLayerRef.current.eachLayer((layer: L.Layer) => {
              const id = L.Util.stamp(layer);
              const brgy = calamityBarangayByLayerIdRef.current[id];
              if (!brgy) return;
              const d = slice[brgy];
              const cr = d?.calamity_risk;
              const fillColor = typeof cr === "number" ? getCalamityRiskColor(cr) : "#cccccc";
              (layer as L.Path).setStyle({
                fillColor,
                fillOpacity: typeof cr === "number" ? 0.75 : 0.2,
                weight: 1.5,
                color: "#ffffff",
              });
            });
          }
          const bounds = calamityLayerRef.current.getBounds();
          if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
          return;
        }

        const geoRes = await fetch("/api/hazard/barangays/");
        if (!geoRes.ok) throw new Error(`Failed to load barangay GeoJSON: ${geoRes.status}`);
        const geoJson = await geoRes.json();

        if (cancelled) return;

        const years = calamityYearsRef.current;
        const sampleYear = years[0];
        const sampleSlice = sampleYear ? calamityDataRef.current?.[sampleYear] : null;
        const dataBarangays: string[] = sampleSlice ? Object.keys(sampleSlice) : [];

        const normalizeBrgy = (name: string) =>
          name.toLowerCase().trim().replace(/^barangay\s+/, "").replace(/^brgy\s+/, "").replace(/-/g, " ");

        const mapBrgyName = (raw: string) => {
          const key = normalizeBrgy(raw);
          if (key === "poblacion") return "Poblacion";
          const match = dataBarangays.find((b) => normalizeBrgy(b) === key);
          return match || raw;
        };

        const initialYearKey = String(calamityYearRef.current ?? (years.length ? parseInt(years[0], 10) : 2020));
        const initialSlice = calamityDataRef.current?.[initialYearKey];

        calamityLayerRef.current = L.geoJSON(geoJson as any, {
          style: (feature) => {
            if (!feature || !feature.properties) {
              return { color: "#ffffff", weight: 1.5, opacity: 0.9, fillOpacity: 0.2, fillColor: "#cccccc" };
            }
            const rawName = (feature.properties.brgy_name || feature.properties.name) || "";
            const mappedName = mapBrgyName(rawName);
            const d = initialSlice?.[mappedName];
            const cr = d?.calamity_risk;
            const fillColor = typeof cr === "number" ? getCalamityRiskColor(cr) : "#cccccc";
            return {
              color: "#ffffff",
              weight: 1.5,
              opacity: 0.9,
              fillOpacity: typeof cr === "number" ? 0.75 : 0.2,
              fillColor,
            };
          },
          onEachFeature: (feature, layer) => {
            const rawName = (feature.properties && (feature.properties.brgy_name || feature.properties.name)) || "";
            const mappedName = mapBrgyName(rawName);
            if (!feature.properties) feature.properties = {};
            feature.properties.brgy_name = mappedName;

            const id = L.Util.stamp(layer);
            calamityBarangayByLayerIdRef.current[id] = mappedName;

            layer.on("mouseover", () => {
              (layer as L.Path).setStyle({ weight: 3, fillOpacity: 0.9 });
              const yearKey = String(calamityYearRef.current ?? "");
              const slice = calamityDataRef.current?.[yearKey];
              const d = slice?.[mappedName];
              if (d) {
                onCalamityRiskBarangaySelectRef.current?.(mappedName, yearKey, d as CalamityRiskBarangayData);
              }
            });

            layer.on("mouseout", () => {
              const yearKey = String(calamityYearRef.current ?? "");
              const slice = calamityDataRef.current?.[yearKey];
              const d = slice?.[mappedName];
              const cr = d?.calamity_risk;
              const fillColor = typeof cr === "number" ? getCalamityRiskColor(cr) : "#cccccc";
              (layer as L.Path).setStyle({
                weight: 1.5,
                fillOpacity: typeof cr === "number" ? 0.75 : 0.2,
                color: "#ffffff",
                fillColor,
              });
            });
          },
        }).addTo(map);

        if (calamityLabelsLayerRef.current) {
          calamityLabelsLayerRef.current.remove();
          calamityLabelsLayerRef.current = null;
        }
        calamityLabelsLayerRef.current = L.layerGroup().addTo(map);
        calamityLayerRef.current.eachLayer((layer: L.Layer) => {
          const id = L.Util.stamp(layer);
          const brgy = calamityBarangayByLayerIdRef.current[id];
          if (!brgy) return;
          const polygon = layer as L.Polygon;
          const bounds = polygon.getBounds();
          if (!bounds.isValid()) return;
          const center = bounds.getCenter();
          const estimatedWidth = Math.max(60, brgy.length * 7 + 16);
          const estimatedHeight = 22;
          L.marker(center, {
            icon: L.divIcon({
              className: "barangay-label",
              html: `<span>${brgy}</span>`,
              iconSize: [estimatedWidth, estimatedHeight],
              iconAnchor: [estimatedWidth / 2, estimatedHeight / 2],
            }),
          }).addTo(calamityLabelsLayerRef.current as L.LayerGroup);
        });

        const bounds = calamityLayerRef.current.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
      } catch (err) {
        console.error("Failed to set up calamity risk choropleth:", err);
      }
    };

    loadCalamityLayer();
    return () => { cancelled = true; };
  }, [mapView, dataLayer]);

  // Update calamity risk choropleth colors when year changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!calamityLayerRef.current) return;
    if (mapView !== "choropleth" || dataLayer !== "calamity") return;

    const calamityData = calamityDataRef.current;
    if (!calamityData) return;

    const years = calamityYearsRef.current;
    if (!years.length) return;

    const yearKey = String(hazardYear ?? parseInt(years[0], 10));
    const slice = calamityData[yearKey];
    if (!slice) return;

    calamityLayerRef.current.eachLayer((layer: L.Layer) => {
      const id = L.Util.stamp(layer);
      const brgy = calamityBarangayByLayerIdRef.current[id];
      if (!brgy) return;

      const d = slice[brgy];
      const cr = d?.calamity_risk;
      const fillColor = typeof cr === "number" ? getCalamityRiskColor(cr) : "#cccccc";
      (layer as L.Path).setStyle({
        fillColor,
        fillOpacity: typeof cr === "number" ? 0.75 : 0.2,
        weight: 1.5,
        color: "#ffffff",
      });
      (layer as L.Path).unbindPopup();
    });
  }, [hazardYear, mapView, dataLayer]);

  // Handle Barangay Boundaries layer toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const showBarangays = activeLayers.includes("Barangay Boundaries");

    // Remove existing layer
    if (barangayBoundariesLayerRef.current) {
      barangayBoundariesLayerRef.current.remove();
      barangayBoundariesLayerRef.current = null;
    }

    if (!showBarangays) return;

    const layerGroup = L.layerGroup().addTo(map);
    barangayBoundariesLayerRef.current = layerGroup;

    const fetchBarangayBoundaries = async () => {
      try {
        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `
            [out:json][timeout:25];
            area["name"="Cabuyao"]["boundary"="administrative"]->.a;
            relation["admin_level"="10"](area.a);
            out geom;
          `,
        });

        if (!res.ok) throw new Error("Overpass failed");
        const data: OverpassResponse = await res.json();

        data.elements.forEach((el) => {
          if (!el.members) return;

          const outers: [number, number][][] = [];
          const inners: [number, number][][] = [];

          el.members.forEach((m) => {
            if (m.type !== "way" || !m.geometry) return;

            const ring = m.geometry.map(g => [g.lat, g.lon] as [number, number]);

            if (m.role === "outer") {
              outers.push(ring);
            } else if (m.role === "inner") {
              inners.push(ring);
            }
          });

          if (!outers.length) return;

          const name = el.tags?.name || "Unnamed Barangay";

          const polygon = L.polygon(
            outers.map(outer => [outer, ...inners]),
            {
              color: "#1e40af",
              weight: 2,
              fillColor: "#60a5fa",
              fillOpacity: 0.45,
            }
          ).addTo(layerGroup);

          polygon.bindTooltip(name, {
            sticky: true,
            direction: "center",
            className: "barangay-boundary-tooltip",
          });
        });
        console.log("[Barangay Boundaries] toggle ON");
      } catch (err) {
        console.error("Failed to load barangay boundaries:", err);
      }
    };

    fetchBarangayBoundaries();
  }, [activeLayers]);

  // Handle barangay search - highlight and zoom to searched barangay
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous search marker if exists
    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
      searchMarkerRef.current = null;
    }

    // If no search term, do nothing
    if (!searchedBarangay || searchedBarangay.trim() === "") return;

    // Find matching barangay (case-insensitive partial match)
    const searchTerm = searchedBarangay.toLowerCase().trim();
    const matchedBarangay = barangayDataRef.current.find((brgy) =>
      brgy.name.toLowerCase().includes(searchTerm)
    );

    if (matchedBarangay) {
      const { name, lat, lon } = matchedBarangay;

      // Use severity from reports if available, otherwise use default
      const severity = (searchedSeverity || "low") as keyof typeof severityColors;
      const colors = severityColors[severity] || severityColors.low;

      // Create a highlighted search marker with severity-based colors
      const searchIcon = L.divIcon({
        html: `
          <div class="search-marker-container">
            <div class="search-marker-pulse" style="background: ${colors.secondary}40;"></div>
            <div class="search-marker-pin" style="background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary}); box-shadow: 0 4px 12px ${colors.primary}80;"></div>
          </div>
        `,
        className: "search-marker-icon",
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      // Add the search marker
      searchMarkerRef.current = L.marker([lat, lon], { icon: searchIcon })
        .addTo(map)
        .bindPopup(`
          <div style="text-align: center;">
            <h3 style="margin: 0 0 8px 0; color: ${colors.primary};">📍 ${name}</h3>
            <p style="margin: 0; font-size: 14px;">
              <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; background: ${colors.primary}; color: white; font-weight: bold; font-size: 12px;">
                ${colors.text} RISK
              </span>
            </p>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">Cabuyao, Laguna</p>
          </div>
        `)
        .openPopup();

      // Zoom to the barangay location
      map.setView([lat, lon], 15, { animate: true });
    }
  }, [searchedBarangay, searchedSeverity]);

  // Handle Fault Lines layer toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const showFaultLines = activeLayers.includes("Fault Lines");

    // Remove existing fault lines layer if it exists
    if (faultLinesLayerRef.current) {
      faultLinesLayerRef.current.remove();
      faultLinesLayerRef.current = null;
    }

    // Add fault lines if layer is active
    if (showFaultLines) {
      faultLinesLayerRef.current = createFaultLinesLayer(map);
    }
  }, [activeLayers]);

  // Handle Flood Zones layer toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const showFloodZones = activeLayers.includes("Flood Zones");

    // Remove existing flood zones layer if it exists
    if (floodZonesLayerRef.current) {
      floodZonesLayerRef.current.remove();
      floodZonesLayerRef.current = null;
    }

    // Add flood zones if layer is active
    if (showFloodZones) {
      floodZonesLayerRef.current = createFloodZonesLayer(map);
    }
  }, [activeLayers]);

  // Handle Landslide Risk layer toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const showLandslideRisk = activeLayers.includes("Landslide Risk");

    // Remove existing landslide risk layer if it exists
    if (landslideRiskLayerRef.current) {
      landslideRiskLayerRef.current.remove();
      landslideRiskLayerRef.current = null;
    }

    // Add landslide risk zones if layer is active
    if (showLandslideRisk) {
      landslideRiskLayerRef.current = createLandslideRiskLayer(map);
    }
  }, [activeLayers]);

  // Handle Evacuation Centers layer toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const showEvacuationCenters = activeLayers.includes("Evacuation Centers");

    if (!showEvacuationCenters) {
      if (evacuationCentersLayerRef.current) {
        evacuationCentersLayerRef.current.remove();
        evacuationCentersLayerRef.current = null;
      }
      return;
    }

    if (evacuationCentersLayerRef.current) return;

    const loadLayer = async () => {
      evacuationCentersLayerRef.current =
        await createEvacuationCentersLayer(map, {
          showOnMap: true,
          showPopupOnMap,
          onSelectCenter: onSelectEvacuationCenter,
        });
    };

    loadLayer();

  }, [activeLayers, showPopupOnMap, onSelectEvacuationCenter]);



  // Handle Roads layer toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const showRoads = activeLayers.includes("Roads");

    // Remove existing roads layer if it exists
    if (roadsLayerRef.current) {
      roadsLayerRef.current.remove();
      roadsLayerRef.current = null;
    }

    // Add roads if layer is active
    if (showRoads) {
      roadsLayerRef.current = createRoadsLayer(map);
    }
  }, [activeLayers]);

  // Handle Traffic Conditions layer toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const showTraffic = activeLayers.includes("Traffic Conditions");

    if (trafficLayerRef.current) {
      trafficLayerRef.current.remove();
      trafficLayerRef.current = null;
    }

    if (showTraffic) {
      trafficLayerRef.current = createTrafficLayer(map);
    }
  }, [activeLayers]);

  // Handle NDVI (green index) layer toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const showNDVI = activeLayers.includes("NDVI");

    if (ndviLayerRef.current) {
      ndviLayerRef.current.remove();
      ndviLayerRef.current = null;
    }

    if (showNDVI) {
      ndviLayerRef.current = createNDVILayer(map, {
        opacity: ndviOpacity,
        year: ndviYear,
        month: ndviMonth,
        fromDate: ndviFromDate,
        toDate: ndviToDate,
        ...(ndviMaxCloud !== undefined && { maxCloud: ndviMaxCloud }),
      });
    }
  }, [activeLayers, ndviOpacity, ndviYear, ndviMonth, ndviFromDate, ndviToDate, ndviMaxCloud]);

  // Handle Verified Reports layer 
  const reportMarkersMap = useRef<Map<number, L.Marker>>(new Map());
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const showVerifiedReports = activeLayers.includes("Verified Reports");

    if (!showVerifiedReports) {
      if (verifiedReportsLayerRef.current) {
        verifiedReportsLayerRef.current.clearLayers();
      }
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!verifiedReportsLayerRef.current) {
      verifiedReportsLayerRef.current = L.layerGroup().addTo(map);
    }

    const layerGroup = verifiedReportsLayerRef.current;

    fetch("/api/incident-reports/verified/", {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })
      .then(res => res.json())
      .then(data => {
        layerGroup.clearLayers();
        reportMarkersMap.current.clear();

        const reports = data.results || [];

        reports.forEach((r: any) => {

          // Wag parseFloat kasi nageerror sa iba :)
          const lat = r.lat ?? r.latitude;
          const lng = r.lng ?? r.longitude;

          if (lat == null || lng == null) return;

          //console.log("REPORT COORDS:", r.id, r.lat, r.lng);

          const severity = (r.verified_critical_level || "low").toLowerCase();
          const colors =
            severityColors[severity as keyof typeof severityColors] ??
            severityColors.low;

          const categoryIcons: Record<string, string> = {
            fire: "🔥",
            flood: "🌊",
            landslide: "⛰️",
            vehicular_accident: "🚗",
            chemical_gas_leak: "☣️",
            fallen_tree: "🌳",
            infrastructure_damage: "🏗️",
          };

          const iconEmoji = categoryIcons[r.category] || "⚠️";

          const reportIcon = L.divIcon({
            html: `
              <div class="verified-report-marker">
                <div class="pulse" style="background:${colors.secondary}40;"></div>
                <div class="pin"
                    style="
                      background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
                      border: 3px solid ${colors.border};
                    ">
                  <span class="verified-report-icon">${iconEmoji}</span>
                </div>
              </div>
            `,
            className: "",
            iconSize: [44, 44],
            iconAnchor: [22, 44],
          });


          const marker = L.marker([lat, lng], { icon: reportIcon })
            .addTo(layerGroup)
            .bindPopup(`
              <div class="verified-popup">
                <div class="popup-icon">${iconEmoji}</div>
                <h3>${r.category_display || "Incident"}</h3>
                <p>${r.location_display || "Cabuyao, Laguna"}</p>
                <span class="popup-pill" style="background:${colors.primary}">
                  ${colors.text} RISK
                </span>
              </div>
            `);

          reportMarkersMap.current.set(r.id, marker);
        });

      })
      .catch(err => {
        console.error("Failed to load verified reports:", err);
      });

  }, [activeLayers]);



  return (
    <div id="map" style={{ height: height, width: width }}></div>
  );
}

