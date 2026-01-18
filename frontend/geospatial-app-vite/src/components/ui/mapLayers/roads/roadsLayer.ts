import L from "leaflet";
import { roadsData, roadsColors } from "./roadsData";

/**
 * Creates and adds roads layer to the map
 * @param map - Leaflet map instance
 * @returns LayerGroup containing all road elements
 */
export function createRoadsLayer(map: L.Map): L.LayerGroup {
  const roadsGroup = L.layerGroup().addTo(map);

  roadsData.forEach((road) => {
    const isClosed = road.status === "closed";
    const isBridge = road.type === "bridge";
    
    // Determine line style based on road type and status
    const baseColor = isClosed 
      ? roadsColors.closed.stroke 
      : roadsColors[road.type].stroke;
    const baseWeight = isClosed 
      ? roadsColors.closed.weight 
      : roadsColors[road.type].weight;
    
    // Create dash pattern for closed roads
    const dashArray = isClosed ? "12, 8" : undefined;

    // Add a glow/shadow effect layer first (wider, semi-transparent)
    L.polyline(road.coordinates, {
      color: baseColor,
      weight: baseWeight + 6,
      opacity: 0.2,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(roadsGroup);

    // Add white outline for road edge effect
    L.polyline(road.coordinates, {
      color: isClosed ? "#fecaca" : (isBridge ? "#a5f3fc" : "#ffffff"),
      weight: baseWeight + 2,
      opacity: 0.9,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(roadsGroup);

    // Create the main road polyline
    const polyline = L.polyline(road.coordinates, {
      color: baseColor,
      weight: baseWeight,
      opacity: 0.95,
      dashArray: dashArray,
      lineCap: "round",
      lineJoin: "round",
      className: isClosed ? "road-closed-animate" : "",
    }).addTo(roadsGroup);

    // Build popup content based on road type
    let popupContent = `
      <div class="road-popup" style="min-width: 240px;">
        <div class="road-popup-header" style="
          background: linear-gradient(135deg, ${baseColor}, ${baseColor}cc);
          padding: 10px 14px;
          margin: -13px -16px 12px -16px;
          border-radius: 4px 4px 0 0;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          <span style="font-size: 20px;">${isBridge ? "🌉" : isClosed ? "🚧" : "🛣️"}</span>
          <span style="color: white; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
            ${isBridge ? "Bridge" : isClosed ? "Road Closed" : road.type === "major_road" ? "Major Road" : "Secondary Road"}
          </span>
        </div>
        <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px; font-weight: 600;">
          ${road.name}
        </h3>
        <div style="margin-bottom: 10px;">
          <span style="
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            background: ${isClosed ? "#fef2f2" : "#ecfdf5"};
            color: ${isClosed ? "#dc2626" : "#059669"};
            font-size: 11px;
            font-weight: 600;
            border: 1px solid ${isClosed ? "#fecaca" : "#a7f3d0"};
          ">
            ${isClosed ? "⛔ CLOSED" : "✓ OPEN"}
          </span>
        </div>
        <p style="margin: 0 0 10px 0; font-size: 12px; color: #555; line-height: 1.5;">
          ${road.description}
        </p>
        <div style="
          display: flex;
          gap: 12px;
          padding: 8px 12px;
          background: #f9fafb;
          border-radius: 8px;
          font-size: 11px;
          color: #6b7280;
        ">
          <span>🚗 ${road.lanes} Lanes</span>
          ${isBridge && road.bridgeLength ? `<span>📏 ${road.bridgeLength}</span>` : ""}
        </div>
    `;

    if (isClosed && road.closureReason) {
      popupContent += `
        <div style="
          margin-top: 10px;
          padding: 10px 12px;
          background: #fef2f2;
          border-radius: 8px;
          border-left: 3px solid #dc2626;
        ">
          <p style="margin: 0; font-size: 11px; font-weight: 600; color: #991b1b;">
            ⚠️ Closure Reason:
          </p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #b91c1c;">
            ${road.closureReason}
          </p>
        </div>
      `;
    }

    popupContent += `
        <p style="margin: 10px 0 0 0; font-size: 11px; color: #9ca3af;">
          📍 Cabuyao, Laguna
        </p>
      </div>
    `;

    polyline.bindPopup(popupContent);

    // Bind tooltip for quick identification on hover
    polyline.bindTooltip(`
      <div style="text-align: center;">
        <span style="font-size: 14px;">${isBridge ? "🌉" : isClosed ? "🚧" : "🛣️"}</span>
        <strong style="display: block; margin-top: 2px;">${road.name}</strong>
        <span style="
          display: inline-block;
          margin-top: 4px;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 600;
          background: ${isClosed ? "#fef2f2" : "#ecfdf5"};
          color: ${isClosed ? "#dc2626" : "#059669"};
        ">
          ${isClosed ? "CLOSED" : "OPEN"}
        </span>
      </div>
    `, {
      permanent: false,
      direction: "top",
      offset: [0, -5],
      className: `road-tooltip ${road.type} ${road.status}`,
    });

    // Add special markers for bridges
    if (isBridge) {
      const midPoint = road.coordinates[Math.floor(road.coordinates.length / 2)];
      
      const bridgeIcon = L.divIcon({
        html: `
          <div class="bridge-marker ${isClosed ? "closed" : ""}">
            <span class="bridge-icon">${isClosed ? "🚧" : "🌉"}</span>
          </div>
        `,
        className: "bridge-marker-wrapper",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const bridgeMarker = L.marker(midPoint, { icon: bridgeIcon })
        .addTo(roadsGroup);

      bridgeMarker.on('click', () => {
        polyline.openPopup();
      });
    }

    // Add warning markers at each end of closed roads
    if (isClosed) {
      const startPoint = road.coordinates[0];
      const endPoint = road.coordinates[road.coordinates.length - 1];

      [startPoint, endPoint].forEach((point, index) => {
        const closedIcon = L.divIcon({
          html: `
            <div class="road-closed-marker">
              <span class="closed-icon">🚧</span>
            </div>
          `,
          className: "road-closed-marker-wrapper",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        L.marker(point, { icon: closedIcon })
          .addTo(roadsGroup)
          .bindPopup(`
            <div style="text-align: center; min-width: 160px;">
              <span style="font-size: 28px;">🚧</span>
              <h4 style="margin: 8px 0 4px 0; color: #dc2626;">Road Closed</h4>
              <p style="margin: 0; font-size: 12px; color: #666;">${road.name}</p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #999;">${index === 0 ? "Start" : "End"} of closure</p>
            </div>
          `);
      });
    }
  });

  return roadsGroup;
}
