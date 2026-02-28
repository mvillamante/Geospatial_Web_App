import L from "leaflet";
import { landslideRiskData, landslideZoneColors, getLandslideZoneRings } from "./landslideRiskData";
import landslideIcon from "../../../../assets/icons/landslide.png";

/**
 * Creates and adds landslide risk zones layer to the map
 * @param map - Leaflet map instance
 * @returns LayerGroup containing all landslide risk zone elements
 */
export function createLandslideRiskLayer(map: L.Map): L.LayerGroup {
  const landslideRiskGroup = L.layerGroup().addTo(map);

  landslideRiskData.forEach((zone) => {
    const colors = landslideZoneColors[zone.riskLevel];
    const rings = getLandslideZoneRings(zone);

    const polygons: L.Polygon[] = [];
    rings.forEach((ring) => {
      const polygon = L.polygon(ring, {
        color: colors.stroke,
        weight: 3,
        opacity: 0.9,
        fillColor: colors.fill,
        fillOpacity: 0.45,
        dashArray: zone.riskLevel === "high" ? undefined : "6, 4",
      }).addTo(landslideRiskGroup);
      polygons.push(polygon);
    });

    if (zone.riskLevel === "high") {
      rings.forEach((ring) => {
        L.polygon(ring, {
          color: "transparent",
          weight: 0,
          fillColor: colors.fill,
          fillOpacity: 0.2,
          className: "landslide-zone-pulse",
        }).addTo(landslideRiskGroup);
      });
    }

    const popupContent = `
      <div class="landslide-zone-popup" style="min-width: 260px;">
        <h3 style="margin: 0 0 10px 0; color: ${colors.stroke}; font-size: 15px; font-weight: 600;">
          <img src="${landslideIcon}" alt="" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 6px;" />${zone.name}
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
          display: flex;
          gap: 12px;
          margin-bottom: 10px;
          font-size: 11px;
          color: #666;
        ">
          <span>📐 Slope: ${zone.slope}</span>
          <span>📍 Elev: ${zone.elevation}</span>
        </div>
        <div style="
          padding: 8px 12px;
          background: #fef3c7;
          border-radius: 8px;
          border-left: 3px solid ${colors.stroke};
        ">
          <p style="margin: 0; font-size: 11px; color: #92400e; font-weight: 500;">
            ⚠️ Affected Barangays:
          </p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #374151;">
            ${zone.affectedBarangays.join(", ")}
          </p>
        </div>
      </div>
    `;
    polygons.forEach((p) => p.bindPopup(popupContent));

    const polygon = polygons[0];
    polygon.bindTooltip(`
      <div style="text-align: center;">
        <strong><img src="${landslideIcon}" alt="" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;" />${zone.name}</strong><br>
        <span style="color: ${colors.stroke}; font-weight: 600;">${colors.label}</span>
      </div>
    `, {
      permanent: false,
      direction: "center",
      className: `landslide-zone-tooltip ${zone.riskLevel}`,
    });

    let bounds = polygons[0].getBounds();
    for (let i = 1; i < polygons.length; i++) bounds = bounds.extend(polygons[i].getBounds());
    const center = bounds.getCenter();

    // Add a label marker at the center of each landslide zone
    const labelIcon = L.divIcon({
      html: `
        <div class="landslide-zone-label ${zone.riskLevel}">
          <img src="${landslideIcon}" alt="" class="landslide-zone-label-icon" />
          <span class="landslide-zone-label-text">${zone.name.split(' ').slice(0, 2).join(' ')}</span>
        </div>
      `,
      className: "landslide-zone-label-wrapper",
      iconSize: [120, 40],
      iconAnchor: [60, 20],
    });

    const labelMarker = L.marker(center, { icon: labelIcon })
      .addTo(landslideRiskGroup);

    // Clicking label opens the polygon's popup
    labelMarker.on('click', () => {
      polygon.openPopup();
    });
  });

  return landslideRiskGroup;
}
