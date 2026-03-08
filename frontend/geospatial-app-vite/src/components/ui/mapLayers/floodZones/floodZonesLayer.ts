import L from "leaflet";
import { floodZonesData, floodZoneColors, getFloodZoneRings } from "./floodZonesData";

// LiPAD 25-year flood hazard WMS (Cabuyao)
// Defaults can be overridden via:
//   VITE_LIPAD_WMS_URL, VITE_LIPAD_25YR_LAYER
const LIPAD_WMS_URL =
  import.meta.env.VITE_LIPAD_WMS_URL ??
  "https://lipad-fmc.dream.upd.edu.ph/geoserver/geonode/wms";

const LIPAD_25YR_LAYER =
  import.meta.env.VITE_LIPAD_25YR_LAYER ??
  "geonode:ph043404000_fh25yr_10m";

/**
 * Creates and adds flood zones layer to the map
 * @param map - Leaflet map instance
 * @returns LayerGroup containing all flood zone elements
 */
export function createFloodZonesLayer(map: L.Map): L.LayerGroup {
  const floodZonesGroup = L.layerGroup().addTo(map);

  // 1) LiPAD 25-year flood hazard raster overlay (semi‑transparent)
  const lipadFloodLayer = L.tileLayer.wms(LIPAD_WMS_URL, {
    layers: LIPAD_25YR_LAYER,
    format: "image/png",
    transparent: true,
    opacity: 0.7,
    tiled: true,
    attribution: "LiPAD LiDAR Portal (UP DREAM Program)",
  } as any);
  lipadFloodLayer.addTo(floodZonesGroup);

  const cleanZoneName = (name: string): string =>
    name
      .replace(/25[-\s]*year/gi, "")
      .replace(/\(\s*\)/g, "")
      .replace(/\s+/g, " ")
      .trim();

  floodZonesData.forEach((zone) => {
    const colors = floodZoneColors[zone.riskLevel];
    const rings = getFloodZoneRings(zone);
    const displayName = cleanZoneName(zone.name);

    // Create barangay boundary polygon(s) — one per ring for full barangay bounds (Poblacion may have multiple)
    const polygons: L.Polygon[] = [];
    rings.forEach((ring) => {
      const polygon = L.polygon(ring, {
        color: "#111827",
        weight: 1.5,
        opacity: 0.9,
        fillColor: colors.fill,
        fillOpacity: 0.18,
        dashArray: "3, 2",
      }).addTo(floodZonesGroup);
      polygons.push(polygon);
    });

    // Add wave-like pattern overlay for high risk zones (each ring)
    if (zone.riskLevel === "high") {
      rings.forEach((ring) => {
        L.polygon(ring, {
          color: "transparent",
          weight: 0,
          fillColor: colors.fill,
          fillOpacity: 0.2,
          className: "flood-zone-pulse",
        }).addTo(floodZonesGroup);
      });
    }

    const popupContent = `
      <div class="flood-zone-popup" style="min-width: 220px;">
        <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 14px; font-weight: 600;">
          ${displayName}
        </h3>
        <div style="margin-bottom: 10px;">
          <span style="
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            background: ${colors.fill}30;
            color: ${colors.stroke};
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            border: 1px solid ${colors.stroke};
          ">
            ${colors.label}
          </span>
        </div>
        <p style="margin: 0; font-size: 11px; color: #555; line-height: 1.4;">
          ${zone.description}
        </p>
      </div>
    `;
    polygons.forEach((p) => p.bindPopup(popupContent));

    // Bind tooltip to first polygon for quick identification on hover
    const polygon = polygons[0];
    polygon.bindTooltip(`
      <div style="text-align: center;">
        <strong>${displayName}</strong><br>
        <span style="color: ${colors.stroke}; font-weight: 600;">${colors.label}</span>
      </div>
    `, {
      permanent: false,
      direction: "center",
      className: `flood-zone-tooltip ${zone.riskLevel}`,
    });

    // Calculate centroid for the label (combined bounds if multi-ring)
    let bounds = polygons[0].getBounds();
    for (let i = 1; i < polygons.length; i++) bounds = bounds.extend(polygons[i].getBounds());
    const center = bounds.getCenter();

    // Add a label marker at the center of each flood zone
    const labelIcon = L.divIcon({
      html: `
        <div class="flood-zone-label ${zone.riskLevel}">
          <span class="flood-zone-label-text">${displayName}</span>
        </div>
      `,
      className: "flood-zone-label-wrapper",
      iconSize: [110, 32],
      iconAnchor: [55, 18],
    });

    const labelMarker = L.marker(center, { icon: labelIcon }).addTo(floodZonesGroup);

    // Clicking label opens the polygon's popup
    labelMarker.on('click', () => {
      polygon.openPopup();
    });
  });

  return floodZonesGroup;
}
