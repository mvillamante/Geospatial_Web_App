import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fake risk levels for demonstration purposes
const barangayRisk = {
  "Banay-Banay": "High",
  "Mamatid": "Medium",
  "Baclaran": "Low",
  "Pittland": "Medium",
  "Sala": "Low",
  "Gulod": "High",
};


/* Override default Leaflet marker (blue pin) */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// HTML circle markers (no images)
const riskIcons = {
  High: L.divIcon({
    html: `<div style="
      width:20px;height:20px;
      background:red;
      border-radius:50%;
      border:2px solid #880000;"></div>`,
    className: "",
    iconSize: [20, 20],
  }),

  Medium: L.divIcon({
    html: `<div style="
      width:20px;height:20px;
      background:orange;
      border-radius:50%;
      border:2px solid #a65e00;"></div>`,
    className: "",
    iconSize: [20, 20],
  }),

  Low: L.divIcon({
    html: `<div style="
      width:20px;height:20px;
      background:yellow;
      border-radius:50%;
      border:2px solid #999900;"></div>`,
    className: "",
    iconSize: [20, 20],
  }),
};


export default function LeafletMap({ height = "600px" }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  {/* MAP INITIALIZATION */}
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map("map").setView([14.2349, 121.1211], 13);
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
    }

    const map = mapRef.current;

    {/* USER LIVE LOCATION TRACKING */}
    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const latlng = [latitude, longitude];

        if (!markerRef.current) {
          markerRef.current = L.marker(latlng).addTo(map);
        } else {
          markerRef.current.setLatLng(latlng);
        }

        if (!circleRef.current) {
          circleRef.current = L.circle(latlng, { radius: accuracy }).addTo(map);
        } else {
          circleRef.current.setLatLng(latlng).setRadius(accuracy);
        }

        map.setView(latlng);
      },
      (err) => {
        if (err.code === 1) alert("Please allow geolocation access");
        else alert("Cannot get current location");
      }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  {/* LOAD EVACUATION CENTERS + BARANGAYS */}
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    {/* EVACUATION CENTERS */}
    const evacuationQuery = `
      [out:json];
      area["name"="Cabuyao"]["boundary"="administrative"]->.a;
      (
        node["amenity"="evacuation_center"](area.a);
        way["amenity"="evacuation_center"](area.a);
      );
      out center;
    `;

    fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: evacuationQuery,
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.elements.length) {
          console.warn("⚠ No evacuation centers found for Cabuyao.");
        }

        data.elements.forEach((el) => {
          const lat = el.lat || el.center?.lat;
          const lon = el.lon || el.center?.lon;
          if (!lat || !lon) return;

          L.marker([lat, lon], { icon: evacIcon })
            .addTo(map)
            .bindPopup(`<b>Evacuation Center</b><br>${el.tags.name || "Unnamed"}`);
        });
      });

    {/* BARANGAYS */}
    const barangayQuery = `
      [out:json];
      area["name"="Cabuyao"]["boundary"="administrative"]->.a;
      relation["admin_level"="10"](area.a);
      out center;
    `;

    fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: barangayQuery,
    })
      .then((res) => res.json())
      .then((data) => {
        data.elements.forEach((el) => {
          const lat = el.center?.lat;
          const lon = el.center?.lon;
          if (!lat || !lon) return;

          const name = el.tags.name || "Unnamed";
          const risk = barangayRisk[name] || "Low";

          // Barangay marker
          const marker = L.marker([lat, lon], { icon: riskIcons[risk] }).addTo(map)
            .bindPopup(`<b>Barangay:</b> ${name}<br><b>Risk:</b> ${risk}`)
            .bindTooltip(name, {
              permanent: true,
              direction: "top",
              offset: [0, -10], 
              className: "barangay-label",
            });

        });
      });
  }, []);

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
