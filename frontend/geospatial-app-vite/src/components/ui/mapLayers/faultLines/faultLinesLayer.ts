import L from "leaflet";
import { faultLinesData } from "./faultLinesData";

// PHIVOLCS Active Fault MapServer – Valley Fault System, West Valley Fault segment
// Bounding box extended beyond Calamba but still focused on the Laguna / Cavite corridor.
const PHIVOLCS_WVF_URL =
  "https://ulap-hazards.georisk.gov.ph/arcgis/rest/services/PHIVOLCSPublic/ActiveFault/MapServer/0/query" +
  "?where=fname%3D117+AND+segname%3D%2702%27" + // Valley Fault System (117), segname '02' = West Valley Fault
  "&geometry=120.9%2C13.9%2C121.5%2C15.0" +
  "&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects" +
  "&outFields=fccode%2Cltcode%2Csegname%2Cafcode" +
  "&f=geojson";

/** Draws the original, manually digitized fault lines (fallback when PHIVOLCS is unavailable). */
function addFallbackFaultLines(group: L.LayerGroup) {
  faultLinesData.forEach((fault) => {
    const isActive = fault.type === "active";
    const lineColor = isActive ? "#dc2626" : "#f97316";
    const dashArray = isActive ? undefined : "10, 8";

    const polyline = L.polyline(fault.coordinates, {
      color: lineColor,
      weight: 4,
      opacity: 0.85,
      dashArray,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(group);

    L.polyline(fault.coordinates, {
      color: lineColor,
      weight: 10,
      opacity: 0.25,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(group);

    polyline.bindPopup(`
      <div style="min-width: 220px;">
        <h3 style="margin: 0 0 8px 0; color: ${lineColor}; font-size: 14px; font-weight: 600;">
          ${fault.name}
        </h3>
        <div style="margin-bottom: 8px;">
          <span style="
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            background: ${isActive ? "#fecaca" : "#fed7aa"};
            color: ${isActive ? "#991b1b" : "#9a3412"};
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
          ">
            ${isActive ? "Active Fault" : "Potentially Active"}
          </span>
        </div>
        <p style="margin: 0; font-size: 12px; color: #555; line-height: 1.4;">
          ${fault.description}
        </p>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #888;">
          Cabuyao, Laguna
        </p>
      </div>
    `);

    polyline.bindTooltip(fault.name, {
      permanent: false,
      direction: "top",
      offset: [0, -5],
      className: "fault-line-tooltip",
    });

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
        .addTo(group)
        .bindPopup(
          `<b>Fault:</b> ${fault.name}<br><b>Status:</b> ${
            isActive ? "Active" : "Potentially Active"
          }`
        );
    });
  });
}

/** Draws the PHIVOLCS West Valley Fault geometry into the given group, or falls back on error. */
function addPhivolcsWestValleyFault(group: L.LayerGroup) {
  fetch(PHIVOLCS_WVF_URL)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`PHIVOLCS WVF request failed: ${res.status}`);
      }
      return res.json();
    })
    .then((geojson: any) => {
      const features = Array.isArray(geojson?.features) ? geojson.features : [];
      if (!features.length) {
        console.warn(
          "[FaultLines] No West Valley Fault features from PHIVOLCS, using static fallback data."
        );
        addFallbackFaultLines(group);
        return;
      }

      const dashedLtCodes = new Set(["01", "02", "14", "32"]); // dashed / dotted line types

      const geoLayer = L.geoJSON(geojson, {
        style: (feature: any) => {
          const props = feature?.properties ?? {};
          const isActive = props.fccode === "01";
          const color = isActive ? "#dc2626" : "#111827";

          const ltcode = String(props.ltcode ?? "");
          const dashArray = dashedLtCodes.has(ltcode) ? "10, 8" : undefined;

          return {
            color,
            weight: 4,
            opacity: 0.9,
            dashArray,
            lineCap: "round",
            lineJoin: "round",
          };
        },
        onEachFeature: (feature: any, layer: L.Layer) => {
          const props = feature?.properties ?? {};
          const isActive = props.fccode === "01";
          const lineColor = isActive ? "#dc2626" : "#111827";
          const segmentLabel =
            props.segname === "02"
              ? "West Valley Fault"
              : props.segname === "01"
              ? "East Valley Fault"
              : "Valley Fault";

          // Short, clean description when user clicks the line
          (layer as L.Path).bindPopup(`
            <div style="min-width: 220px;">
              <h3 style="margin: 0 0 8px 0; color: ${lineColor}; font-size: 14px; font-weight: 600;">
                ${segmentLabel}
              </h3>
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #555; line-height: 1.4;">
                Segment of the PHIVOLCS West Valley Fault capable of generating major earthquakes and producing ground rupture along this trace.
              </p>
              <p style="margin: 0; font-size: 11px; color: #888;">
                Source: PHIVOLCS Active Fault Map Service
              </p>
            </div>
          `);

          (layer as L.Path).bindTooltip(segmentLabel, {
            permanent: false,
            direction: "top",
            offset: [0, -5],
            className: "fault-line-tooltip",
          });

          // Add endpoint markers using the GeoJSON coordinates ([lng, lat] → [lat, lng]).
          const geom = feature?.geometry;
          const endpoints: [number, number][] = [];

          if (geom?.type === "LineString" && Array.isArray(geom.coordinates)) {
            if (geom.coordinates.length > 0) {
              const first = geom.coordinates[0];
              const last = geom.coordinates[geom.coordinates.length - 1];
              endpoints.push([first[1], first[0]], [last[1], last[0]]);
            }
          } else if (
            geom?.type === "MultiLineString" &&
            Array.isArray(geom.coordinates)
          ) {
            geom.coordinates.forEach((segment: any) => {
              if (Array.isArray(segment) && segment.length > 0) {
                const first = segment[0];
                const last = segment[segment.length - 1];
                endpoints.push([first[1], first[0]], [last[1], last[0]]);
              }
            });
          }

          endpoints.forEach(([lat, lng]) => {
            L.circleMarker([lat, lng], {
              radius: 6,
              color: lineColor,
              fillColor: lineColor,
              fillOpacity: 0.8,
              weight: 2,
            }).addTo(group);
          });
        },
      });

      geoLayer.addTo(group);
    })
    .catch((err) => {
      console.error(
        "[FaultLines] Failed to load West Valley Fault from PHIVOLCS, using static fallback data instead:",
        err
      );
      addFallbackFaultLines(group);
    });
}

/**
 * Creates and adds fault lines layer to the map.
 * Uses PHIVOLCS West Valley Fault geometry when available,
 * and falls back to locally defined faultLinesData otherwise.
 */
export function createFaultLinesLayer(map: L.Map): L.LayerGroup {
  const faultLinesGroup = L.layerGroup().addTo(map);
  addPhivolcsWestValleyFault(faultLinesGroup);
  return faultLinesGroup;
}
