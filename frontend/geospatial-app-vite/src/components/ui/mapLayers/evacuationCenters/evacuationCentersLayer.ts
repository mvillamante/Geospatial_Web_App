import L from "leaflet";

import { evacuationTypeConfig } from "./evacuationCentersTypes";
import type { EvacuationCenterData, EvacuationCenterType } from "./evacuationCentersTypes";
import { getEvacuationPopupHTML } from "./evacCenterMapPopup";

// API response types
interface EvacuationCenterAPI {
  id: number;
  name: string;
  type: EvacuationCenterType;
  barangay: string;
  latitude: string | number;
  longitude: string | number;
  capacity: number;
  contact: string;
  address: string;
  facilities: string[];
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Fetch all evacuation centers (ignoring pagination)
async function fetchEvacuationCenters(): Promise<EvacuationCenterData[]> {
  const response = await fetch("/api/evacuation-centers/?page_size=1000", {
    credentials: "include",
    headers: { "Accept": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch evacuation centers: ${response.status}`);
  }

  const data: PaginatedResponse<EvacuationCenterAPI> | EvacuationCenterAPI[] = await response.json();

  const results: EvacuationCenterAPI[] = Array.isArray(data) ? data : data.results;

  return results.map(center => ({
    id: center.id,
    name: center.name,
    type: center.type,
    barangay: center.barangay,
    coordinates: [parseFloat(center.latitude as any), parseFloat(center.longitude as any)] as [number, number],
    capacity: center.capacity,
    contact: center.contact,
    address: center.address,
    facilities: center.facilities || [],
  }));
}

// Create Leaflet layer
export async function createEvacuationCentersLayer(
  map: L.Map,
  options?: {
    showOnMap?: boolean;
    showPopupOnMap?: boolean;
    onSelectCenter?: (center: EvacuationCenterData) => void;
  }
): Promise<L.LayerGroup | null> {
  const { showOnMap = true, showPopupOnMap = true, onSelectCenter } = options || {};

  const oldLayer = (map as any)._evacuationLayer as L.LayerGroup | undefined;
  if (oldLayer) {
    oldLayer.clearLayers();
    map.removeLayer(oldLayer);
  }

  let evacuationCentersGroup: L.LayerGroup | null = null;
  if (showOnMap) {
    evacuationCentersGroup = L.layerGroup().addTo(map);
    (map as any)._evacuationLayer = evacuationCentersGroup;
  }

  let centers: EvacuationCenterData[] = [];
  try {
    centers = await fetchEvacuationCenters();
  } catch (error) {
    console.error(error);
    return evacuationCentersGroup;
  }

  if (showOnMap && evacuationCentersGroup) {
    centers.forEach(center => {
      const config = evacuationTypeConfig[center.type];

      const markerIcon = L.divIcon({
        html: `
          <div class="evac-marker-container">
            <div class="evac-marker-pulse" style="background: ${config.color}30;"></div>
            <div class="evac-marker-pin" style="background: linear-gradient(135deg, ${config.color}, ${config.color}dd); box-shadow: 0 4px 12px ${config.color}60;">
              <span class="evac-marker-icon">${config.icon}</span>
            </div>
          </div>
        `,
        className: "evac-marker-wrapper",
        iconSize: [44, 44],
        iconAnchor: [22, 44],
      });

      const marker = L.marker(center.coordinates, { icon: markerIcon }).addTo(evacuationCentersGroup);
      marker.bindPopup(getEvacuationPopupHTML(center, showPopupOnMap));
      marker.on("click", () => {
        if (onSelectCenter) {
          onSelectCenter(center);
        }
      });

      marker.bindTooltip(`
        <div style="text-align: center;">
          <span style="font-size: 16px;">${config.icon}</span>
          <strong style="display: block; margin-top: 2px;">${center.name.length > 25 ? center.name.substring(0, 25) + '...' : center.name}</strong>
          <span style="color: ${config.color}; font-size: 11px; font-weight: 600;">${config.label}</span>
        </div>
      `, { permanent: false, direction: "top", offset: [0, -40], className: `evac-tooltip ${center.type}` });
    });
  }

  return evacuationCentersGroup;
}
