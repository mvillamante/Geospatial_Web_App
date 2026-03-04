import L from "leaflet";
import {
  landslideRiskData,
  landslideZoneColors,
  getLandslideZoneRings,
} from "./landslideRiskData";
import type { RiskLevel } from "../types";

/**
 * Creates and adds landslide risk zones layer to the map.
 * Uses precomputed barangay‑based landslide risk boundaries.
 */
export function createLandslideRiskLayer(map: L.Map): L.LayerGroup {
  const landslideRiskGroup = L.layerGroup().addTo(map);

  landslideRiskData.forEach((zone) => {
    const risk: RiskLevel = zone.riskLevel;
    const colors = landslideZoneColors[risk];
    const rings = getLandslideZoneRings(zone);
    if (!rings.length) return;

    const polygon = L.polygon(
      rings.map((ring) =>
        ring.map(([lat, lng]) => [lat, lng] as [number, number])
      ),
      {
        color: colors.stroke,
        weight: 1.5,
        opacity: 0.9,
        dashArray: "4 4", // dotted-style outline like reference map
        fillColor: colors.fill,
        fillOpacity: 0.35,
      }
    );

    polygon.bindPopup(
      `
        <div class="landslide-zone-popup" style="min-width: 260px;">
          <h3 style="margin: 0 0 6px 0; color: ${colors.stroke}; font-size: 14px; font-weight: 600;">
            ${colors.label}
          </h3>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #111827; font-weight: 500;">
            ${zone.name}
          </p>
          <p style="margin: 0 0 2px 0; font-size: 11px; color: #4b5563;">
            Affected barangays: ${zone.affectedBarangays.join(", ")}
          </p>
          <p style="margin: 0; font-size: 11px; color: #6b7280;">
            Elevation: ${zone.elevation} · Slope: ${zone.slope}
          </p>
        </div>
      `
    );

    polygon.addTo(landslideRiskGroup);

    // Barangay name label at centroid (same pattern as flood zone)
    const center = polygon.getBounds().getCenter();
    const labelIcon = L.divIcon({
      html: `
        <div class="landslide-zone-label ${risk}">
          <span class="landslide-zone-label-text">${zone.name}</span>
        </div>
      `,
      className: "landslide-zone-label-wrapper",
      iconSize: [110, 32],
      iconAnchor: [55, 18],
    });
    const labelMarker = L.marker(center, { icon: labelIcon }).addTo(landslideRiskGroup);
    labelMarker.on("click", () => polygon.openPopup());
  });

  return landslideRiskGroup;
}

