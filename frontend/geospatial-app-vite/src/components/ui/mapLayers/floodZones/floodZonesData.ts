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
  // LiPAD flood hazard legend colors
  high: {
    fill: "#e53935",
    stroke: "#b71c1c",
    label: "High Flood Hazard",
  },
  moderate: {
    fill: "#ffb74d",
    stroke: "#f57c00",
    label: "Medium Flood Hazard",
  },
  low: {
    fill: "#fff176",
    stroke: "#fbc02d",
    label: "Low Flood Hazard",
  },
};
