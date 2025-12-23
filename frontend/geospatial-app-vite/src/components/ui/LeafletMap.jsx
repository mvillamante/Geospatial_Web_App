import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fake risk levels
const barangayRisk = {
  "Banay-Banay": "High",
  "Mamatid": "Medium",
  "Baclaran": "Low",
  "Pittland": "Medium",
  "Sala": "Low",
  "Gulod": "High",
};

// Numeric values for choropleth
const barangayRiskValue = {
  "Banay-Banay": 6,
  "Mamatid": 7,
  "Baclaran": 4,
  "Pittland": 5,
  "Sala": 3,
  "Gulod": 8,
};

// Circle markers
const riskIcons = {
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
const getColor = (value) => {
  if (value >= 8) return "#8B0000";
  if (value >= 7) return "#FF4500";
  if (value >= 6) return "#FF8C00";
  if (value >= 5) return "#FFA500";
  if (value >= 4) return "#FFFF00";
  return "#ADFF2F";
};

export default function LeafletMap({ height = "600px", mapView = "interactive" }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const choroplethLayerRef = useRef(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map("map").setView([14.2349, 121.1211], 13);
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
    }
  }, []);

  // User location (only for interactive)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapView !== "interactive") return;

    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const latlng = [latitude, longitude];

        if (!markerRef.current) {
          markerRef.current = L.marker(latlng).addTo(map);
        } else {
          markerRef.current.setLatLng(latlng);
        }

        const circleRadius = accuracy * 0.001;
        if (!circleRef.current) {
          circleRef.current = L.circle(latlng, { radius: circleRadius }).addTo(map);
        } else {
          circleRef.current.setLatLng(latlng).setRadius(circleRadius);
        }

        map.setView(latlng);
      },
      (err) => {
        if (err.code === 1) alert("Please allow geolocation access");
        else alert("Cannot get current location");
      }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, [mapView]);

  // Load data
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous choropleth layer if exists
    if (choroplethLayerRef.current) {
      choroplethLayerRef.current.remove();
      choroplethLayerRef.current = null;
    }

    if (mapView === "interactive") {
      // Interactive markers
      fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: `
          [out:json];
          area["name"="Cabuyao"]["boundary"="administrative"]->.a;
          relation["admin_level"="10"](area.a);
          out center;
        `,
      })
        .then((res) => res.json())
        .then((data) => {
          data.elements.forEach((el) => {
            const lat = el.center?.lat;
            const lon = el.center?.lon;
            if (!lat || !lon) return;

            const name = el.tags.name || "Unnamed";
            const risk = barangayRisk[name] || "Low";

            L.marker([lat, lon], { icon: riskIcons[risk] }).addTo(map)
              .bindPopup(`<b>Barangay:</b> ${name}<br><b>Risk:</b> ${risk}`)
              .bindTooltip(name, {
                permanent: true,
                direction: "top",
                offset: [0, -10],
                className: "barangay-label",
              });
          });
        });
    } else if (mapView === "choropleth") {
      // Choropleth
      fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: `
          [out:json];
          area["name"="Cabuyao"]["boundary"="administrative"]->.a;
          relation["admin_level"="10"](area.a);
          out geom;
        `,
      })
        .then((res) => res.json())
        .then((data) => {
          const layerGroup = L.layerGroup().addTo(map);
          choroplethLayerRef.current = layerGroup;

          data.elements.forEach((el) => {
            if (!el.members) return;

            const coords = el.members
              .filter((m) => m.type === "way" && m.geometry)
              .map((m) => m.geometry.map((g) => [g.lat, g.lon]))
              .flat();

            const name = el.tags.name || "Unnamed";
            const value = barangayRiskValue[name] || 0;

            const polygon = L.polygon(coords, {
              color: getColor(value),
              weight: 2,
              fillOpacity: 0.6,
            }).addTo(layerGroup);

            polygon.bindTooltip(`<b>${name}</b><br>Risk: ${value}`, { permanent: false, direction: "top" });
          });
        });
    }
  }, [mapView]);

  return (
    <div>
      <div id="map" style={{ height: height, width: "100%" }}></div>

      <style>
        {`
          .barangay-label {
            background: rgba(255, 255, 255, 0.9);
            padding: 2px 6px;	
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            border: 1px solid #888;
            color: #222;
            white-space: nowrap;
          }
        `}
      </style>
    </div>
  );
}
