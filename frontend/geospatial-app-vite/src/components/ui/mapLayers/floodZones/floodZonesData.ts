// Flood zones for Cabuyao, Laguna: real barangay boundaries with risk from flood susceptibility data.
// Generated from cabuyao_barangays.geojson + flood_susceptibility.csv (see backend api/scripts/build_flood_zones.py).

import type { RiskLevel, ZoneColors } from "../types";

import floodZonesBoundary from "./floodZonesBoundary.json";

/** Single polygon ring: [lat, lng][] or multi: ring[] (e.g. Poblacion = Uno+Dos+Tres) */
export type FloodZoneCoordinates = [number, number][] | [number, number][][];

export interface FloodZoneData {
  name: string;
  coordinates: FloodZoneCoordinates;
  riskLevel: RiskLevel;
  description: string;
  affectedBarangays: string[];
}

/** Normalize to array of rings for drawing (one or more polygons per zone). */
export function getFloodZoneRings(zone: FloodZoneData): [number, number][][] {
  const c = zone.coordinates;
  if (!c?.length) return [];
  const first = c[0];
  if (Array.isArray(first) && first.length === 2 && typeof first[0] === "number") {
    return [c as [number, number][]];
  }
  return c as [number, number][][];
}

export const floodZonesData: FloodZoneData[] = floodZonesBoundary as FloodZoneData[];

// Flood zone color configuration by risk level
export const floodZoneColors: Record<RiskLevel, ZoneColors> = {
  high: { fill: "#3b82f6", stroke: "#1d4ed8", label: "High Risk Zone" },
  moderate: { fill: "#60a5fa", stroke: "#2563eb", label: "Moderate Risk Zone" },
  low: { fill: "#93c5fd", stroke: "#3b82f6", label: "Low Risk Zone" },
};
