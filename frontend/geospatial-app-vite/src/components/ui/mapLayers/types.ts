// Shared types for map layers
import L from "leaflet";

export interface LayerRefs {
  faultLines: L.LayerGroup | null;
  floodZones: L.LayerGroup | null;
  landslideRisk: L.LayerGroup | null;
  evacuationCenters: L.LayerGroup | null;
  roads: L.LayerGroup | null;
}

export type RiskLevel = "high" | "moderate" | "low";

export interface ZoneColors {
  fill: string;
  stroke: string;
  label: string;
}
