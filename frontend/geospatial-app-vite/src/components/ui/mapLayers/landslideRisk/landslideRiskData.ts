// Landslide risk zones for Cabuyao, Laguna: real barangay boundaries with risk from landslide susceptibility.
// Generated from cabuyao_barangays.geojson + landslide_susceptibility.csv (slope/elevation); see backend api/scripts/build_landslide_zones.py.

import type { RiskLevel, ZoneColors } from "../types";

import landslideRiskBoundary from "./landslideRiskBoundary.json";

/** Single polygon ring: [lat, lng][] or multi: ring[] (e.g. Poblacion MultiPolygon) */
export type LandslideZoneCoordinates = [number, number][] | [number, number][][];

export interface LandslideRiskData {
  name: string;
  coordinates: LandslideZoneCoordinates;
  riskLevel: RiskLevel;
  description: string;
  affectedBarangays: string[];
  elevation: string;
  slope: string;
}

/** Normalize to array of rings for drawing (one or more polygons per zone). */
export function getLandslideZoneRings(zone: LandslideRiskData): [number, number][][] {
  const c = zone.coordinates;
  if (!c?.length) return [];
  const first = c[0];
  if (Array.isArray(first) && first.length === 2 && typeof first[0] === "number") {
    return [c as [number, number][]];
  }
  return c as [number, number][][];
}

export const landslideRiskData: LandslideRiskData[] = landslideRiskBoundary as LandslideRiskData[];

// Landslide zone color configuration by risk level
export const landslideZoneColors: Record<RiskLevel, ZoneColors> = {
  high: { fill: "#b45309", stroke: "#92400e", label: "High Risk Zone" },
  moderate: { fill: "#d97706", stroke: "#b45309", label: "Moderate Risk Zone" },
  low: { fill: "#fbbf24", stroke: "#d97706", label: "Low Risk Zone" },
};
