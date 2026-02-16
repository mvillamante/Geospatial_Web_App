import { useEffect, useRef, useState } from "react";
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

// Fake risk levels
const barangayRisk: Record<string, "High" | "Medium" | "Low"> = {
  "Banay-Banay": "High",
  "Mamatid": "Medium",
  "Baclaran": "Low",
  "Pittland": "Medium",
  "Sala": "Low",
  "Gulod": "High",
};

// Numeric values for choropleth
const barangayRiskValue: Record<string, number> = {
  "Banay-Banay": 6,
  "Mamatid": 7,
  "Baclaran": 4,
  "Pittland": 5,
  "Sala": 3,
  "Gulod": 8,
};

// Circle markers
const riskIcons: Record<"High" | "Medium" | "Low", L.DivIcon> = {
  High: L.divIcon({
    html: `<div style="width:20px;height:20px;background:red;border-radius:50%;border:2px solid #880000;"></div>`,
    className: "",
    iconSize: [20, 20],
  }),
  Medium: L.divIcon({
    html: `<div style="width:20px;height:20px;background:orange;border-radius:50%;border:2px solid #a65e00;"></div>`,
    className: "",
    iconSize: [20, 20],
  }),
  Low: L.divIcon({
    html: `<div style="width:20px;height:20px;background:yellow;border-radius:50%;border:2px solid #999900;"></div>`,
    className: "",
    iconSize: [20, 20],
  }),
};

// Choropleth color
const getColor = (value: number): string => {
  if (value >= 8) return "#8B0000";
  if (value >= 7) return "#FF4500";
  if (value >= 6) return "#FF8C00";
  if (value >= 5) return "#FFA500";
  if (value >= 4) return "#FFFF00";
  return "#ADFF2F";
};

// Severity colors matching the alerts panel
const severityColors: Record<"critical" | "high" | "moderate" | "low", { primary: string; secondary: string; text: string }> = {
  critical: { primary: "#991b1b", secondary: "#dc2626", text: "CRITICAL" },
  high: { primary: "#ef4444", secondary: "#f87171", text: "HIGH" },
  moderate: { primary: "#f59e0b", secondary: "#fbbf24", text: "MODERATE" },
  low: { primary: "#10b981", secondary: "#34d399", text: "LOW" },
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

interface LeafletMapProps {
  height?: string;
  width?: string;
  mapView?: "interactive" | "choropleth";
  mapType?: "basic" | "satellite" | "terrain";
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
  showPopupOnMap?: boolean;
  onSelectEvacuationCenter?: (center: EvacuationCenterData) => void;
}

export default function LeafletMap({
  height = "600px",
  width = "100%",
  mapView = "interactive",
  mapType = "basic",
  searchedBarangay = "",
  searchedSeverity = null,
  selectedReport = null,
  reportClickTimestamp = null,
  activeLayers = [],
  ndviOpacity = 0.8,
  ndviYear,
  ndviMonth,
  ndviFromDate,
  ndviToDate,
  ndviMaxCloud,
  showPopupOnMap = true,
  onSelectEvacuationCenter, // Let ndviLayer use smart defaults based on month selection
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const choroplethLayerRef = useRef<L.LayerGroup | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const reportMarkerRef = useRef<L.Marker | null>(null);
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


  // Load data
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous choropleth layer if exists
    if (choroplethLayerRef.current) {
      choroplethLayerRef.current.remove();
      choroplethLayerRef.current = null;
    }

    // Helper fetch function with timeout and error handling
    const fetchData = async (query: string, onSuccess: (data: OverpassResponse) => void) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

      try {
        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: query,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          throw new Error(`Overpass API error: ${res.status} ${res.statusText}`);
        }

        const data = await res.json() as OverpassResponse;
        onSuccess(data);
        return;
      } catch (err) {
        console.error("Overpass fetch failed:", err);
      }
    };


  }, [mapView]);

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
    layerGroup.clearLayers();
    reportMarkersMap.current.clear();

    fetch("/api/incident-reports/verified/", {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })
      .then(res => res.json())
      .then(data => {
        const reports = data.results || [];

        reports.forEach((r: any) => {

          const lat = r.lat ?? r.latitude;
          const lng = r.lng ?? r.longitude;
          if (lat == null || lng == null) return;

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
          };

          const iconEmoji = categoryIcons[r.category] || "📍";

          const reportIcon = L.divIcon({
            html: `
    <div class="verified-report-marker">
      <div class="pulse" style="background:${colors.secondary}40;"></div>
      <div class="pin"
           style="background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});">
        <span>${iconEmoji}</span>
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

