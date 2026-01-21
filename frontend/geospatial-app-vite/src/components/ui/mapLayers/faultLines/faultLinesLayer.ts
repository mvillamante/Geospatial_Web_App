import L from "leaflet";
import { faultLinesData } from "./faultLinesData";

/**
 * Creates and adds fault lines layer to the map
 * @param map - Leaflet map instance
 * @returns LayerGroup containing all fault line elements
 */
export function createFaultLinesLayer(map: L.Map): L.LayerGroup {
  const faultLinesGroup = L.layerGroup().addTo(map);

  faultLinesData.forEach((fault) => {
    // Determine line style based on fault type
    const isActive = fault.type === "active";
    const lineColor = isActive ? "#dc2626" : "#f97316"; // Red for active, orange for potentially active
    const dashArray = isActive ? undefined : "10, 8"; // Dashed line for potentially active

    // Create the fault line polyline
    const polyline = L.polyline(fault.coordinates, {
      color: lineColor,
      weight: 4,
      opacity: 0.85,
      dashArray: dashArray,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(faultLinesGroup);

    // Add a glowing effect with a thicker background line
    L.polyline(fault.coordinates, {
      color: lineColor,
      weight: 10,
      opacity: 0.25,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(faultLinesGroup);

    // Bind popup with fault information
    polyline.bindPopup(`
      <div style="min-width: 220px;">
        <h3 style="margin: 0 0 8px 0; color: ${lineColor}; font-size: 14px; font-weight: 600;">
          ⚠️ ${fault.name}
        </h3>
        <div style="margin-bottom: 8px;">
          <span style="
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            background: ${isActive ? '#fecaca' : '#fed7aa'};
            color: ${isActive ? '#991b1b' : '#9a3412'};
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
          ">
            ${isActive ? 'Active Fault' : 'Potentially Active'}
          </span>
        </div>
        <p style="margin: 0; font-size: 12px; color: #555; line-height: 1.4;">
          ${fault.description}
        </p>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #888;">
          📍 Cabuyao, Laguna
        </p>
      </div>
    `);

    // Bind tooltip for quick identification on hover
    polyline.bindTooltip(fault.name, {
      permanent: false,
      direction: "top",
      offset: [0, -5],
      className: "fault-line-tooltip",
    });

    // Add markers at fault line endpoints for better visibility
    const startPoint = fault.coordinates[0];
    const endPoint = fault.coordinates[fault.coordinates.length - 1];

    [startPoint, endPoint].forEach((point) => {
      L.circleMarker(point, {
        radius: 6,
        color: lineColor,
        fillColor: lineColor,
        fillOpacity: 0.8,
        weight: 2,
      })
        .addTo(faultLinesGroup)
        .bindPopup(`<b>Fault:</b> ${fault.name}<br><b>Status:</b> ${isActive ? 'Active' : 'Potentially Active'}`);
    });
  });

  return faultLinesGroup;
}
