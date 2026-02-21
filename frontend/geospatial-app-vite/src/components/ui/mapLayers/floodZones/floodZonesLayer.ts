import L from "leaflet";
import { floodZonesData, floodZoneColors, getFloodZoneRings } from "./floodZonesData";
import floodZoneIcon from "../../../../assets/icons/floodzone.png";

/**
 * Creates and adds flood zones layer to the map
 * @param map - Leaflet map instance
 * @returns LayerGroup containing all flood zone elements
 */
export function createFloodZonesLayer(map: L.Map): L.LayerGroup {
  const floodZonesGroup = L.layerGroup().addTo(map);

  floodZonesData.forEach((zone) => {
    const colors = floodZoneColors[zone.riskLevel];
    const rings = getFloodZoneRings(zone);

    // Create flood zone polygon(s) — one per ring for full barangay bounds (Poblacion may have multiple)
    const polygons: L.Polygon[] = [];
    rings.forEach((ring) => {
      const polygon = L.polygon(ring, {
        color: colors.stroke,
        weight: 3,
        opacity: 0.9,
        fillColor: colors.fill,
        fillOpacity: 0.4,
        dashArray: zone.riskLevel === "high" ? undefined : "8, 4",
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
      <div class="flood-zone-popup" style="min-width: 240px;">
        <h3 style="margin: 0 0 10px 0; color: ${colors.stroke}; font-size: 15px; font-weight: 600;">
          <img src="${floodZoneIcon}" alt="" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 6px;" />${zone.name}
        </h3>
        <div style="margin-bottom: 10px;">
          <span style="
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            background: ${colors.fill}30;
            color: ${colors.stroke};
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            border: 1px solid ${colors.stroke};
          ">
            ${colors.label}
          </span>
        </div>
        <p style="margin: 0 0 10px 0; font-size: 12px; color: #555; line-height: 1.5;">
          ${zone.description}
        </p>
        <div style="
          padding: 8px 12px;
          background: #f0f9ff;
          border-radius: 8px;
          border-left: 3px solid ${colors.stroke};
        ">
          <p style="margin: 0; font-size: 11px; color: #1e40af; font-weight: 500;">
            📍Affected Barangays:
          </p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #374151;">
            ${zone.affectedBarangays.join(", ")}
          </p>
        </div>
      </div>
    `;
    polygons.forEach((p) => p.bindPopup(popupContent));

    // Bind tooltip to first polygon for quick identification on hover
    const polygon = polygons[0];
    polygon.bindTooltip(`
      <div style="text-align: center;">
        <img src="${floodZoneIcon}" alt="" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;" /><strong>${zone.name}</strong><br>
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
          <img src="${floodZoneIcon}" alt="Flood Zone" class="flood-zone-label-icon" />
          <span class="flood-zone-label-text">${zone.name.split(' ').slice(0, 2).join(' ')}</span>
        </div>
      `,
      className: "flood-zone-label-wrapper",
      iconSize: [120, 40],
      iconAnchor: [60, 20],
    });

    const labelMarker = L.marker(center, { icon: labelIcon })
      .addTo(floodZonesGroup);

    // Clicking label opens the polygon's popup
    labelMarker.on('click', () => {
      polygon.openPopup();
    });
  });

  return floodZonesGroup;
}
