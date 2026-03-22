import React from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import '../../../pages/shared/EvacCenterPage.css';
import { getIncidentIcon, severityColors } from "../../../constants";

// Fix default Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Report {
  lat?: number | string;
  lng?: number | string;
  category?: string;
  verified_critical_level?: "critical" | "high" | "moderate" | "low";
  suggested_critical_level?: "critical" | "high" | "moderate" | "low";
  [key: string]: any;
}

interface Props {
  report: Report | null;
  height?: number; // optional map height
}

const ReportPreviewMap: React.FC<Props> = ({ report, height = 250 }) => {
  if (!report || report.lat === undefined || report.lng === undefined) return null;

  const lat = Number(report.lat);
  const lng = Number(report.lng);

  if (!lat || !lng) return null;

  const position: [number, number] = [lat, lng];

  // Determine severity colors
  const severity =
    report.verified_critical_level ||
    report.suggested_critical_level ||
    "low";
  const colors = severityColors[severity as keyof typeof severityColors];

  const iconEmoji = getIncidentIcon(report.category || "");

  const reportIcon = L.divIcon({
    html: `
      <div class="verified-report-marker">
        <div class="pulse" style="background:${colors.secondary}40;"></div>
        <div class="pin"
          style="
            background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
            border: 3px solid ${colors.border};
          ">
          <span class="verified-report-icon">${iconEmoji}</span>
        </div>
      </div>
    `,
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 44],
  });

  return (
    <div style={{ width: "100%", borderRadius: 10, overflow: "hidden" }}>
      <MapContainer
        center={position}
        zoom={15}
        style={{ width: "100%", height }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={reportIcon} />
      </MapContainer>
    </div>
  );
};

export default ReportPreviewMap;