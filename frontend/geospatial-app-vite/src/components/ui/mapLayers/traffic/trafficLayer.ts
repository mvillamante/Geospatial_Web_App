import L from "leaflet";

const TRAFFIC_TILE_URL = "/api/tomtom/traffic/{z}/{x}/{y}.png";

/**
 * Creates and adds TomTom traffic flow tile layer to the map.
 */
export function createTrafficLayer(map: L.Map): L.TileLayer {
  const trafficLayer = L.tileLayer(TRAFFIC_TILE_URL, {
    attribution: "© TomTom",
    maxZoom: 19,
    opacity: 0.8,
  }).addTo(map);

  return trafficLayer;
}
