import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerImg from "/src/assets/marker.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerImg,
  shadowUrl: null,   
  iconSize: [38, 41],
  iconAnchor: [19, 41],
  popupAnchor: [0, -41],
});



export default function LeafletMap() {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map("map").setView([51.505, -0.09], 13);
      mapRef.current = map;

      // OpenStreetMap tile layer
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
    }

    const map = mapRef.current;

    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const latlng = [latitude, longitude];

        // Update or create marker
        if (!markerRef.current) {
          markerRef.current = L.marker(latlng).addTo(map);
        } else {
          markerRef.current.setLatLng(latlng);
        }

        // Update or create accuracy circle
        if (!circleRef.current) {
          circleRef.current = L.circle(latlng, { radius: accuracy }).addTo(map);
        } else {
          circleRef.current.setLatLng(latlng).setRadius(accuracy);
        }

        // Fit map to circle bounds on first load
        if (!map.getBounds().contains(latlng)) {
          const delta = accuracy / 111000;
          map.fitBounds([
            [latitude - delta, longitude - delta],
            [latitude + delta, longitude + delta],
          ]);
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

  return (
    <div>
      <div id="map" style={{ height: "600px", width: "100%", }}></div>
    </div>
  );
}
