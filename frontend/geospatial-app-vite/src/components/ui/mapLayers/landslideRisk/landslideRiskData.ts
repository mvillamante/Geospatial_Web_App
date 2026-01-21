// Landslide risk zones data for Cabuyao, Laguna area
// These represent areas with varying landslide susceptibility based on slope, soil type, and vegetation

import type { RiskLevel, ZoneColors } from "../types";

export interface LandslideRiskData {
  name: string;
  coordinates: [number, number][];
  riskLevel: RiskLevel;
  description: string;
  affectedBarangays: string[];
  elevation: string;
  slope: string;
}

export const landslideRiskData: LandslideRiskData[] = [
  {
    name: "Pittland Foothills Zone",
    coordinates: [
      // Western upland edge (green/forested area proxy)
      [14.2520, 121.0840],
      [14.2580, 121.0900],
      [14.2560, 121.0990],
      [14.2480, 121.1000],
      [14.2420, 121.0940],
      [14.2440, 121.0860],
    ],
    riskLevel: "high",
    description: "Foothill slopes along vegetated upland edge; higher susceptibility during prolonged/heavy rainfall",
    affectedBarangays: ["Pittland", "Diezmo", "Bigaa"],
    elevation: "35-90m",
    slope: "18-35°"
  },
  {
    name: "Casile Elevated Ridge",
    coordinates: [
      // Southwestern upland ridge / Makiling foothills side
      [14.2140, 121.0820],
      [14.2230, 121.0880],
      [14.2270, 121.1000],
      [14.2200, 121.1080],
      [14.2110, 121.1030],
      [14.2080, 121.0900],
    ],
    riskLevel: "high",
    description: "Mountainous area with historical landslide events, requires monitoring",
    affectedBarangays: ["Casile"],
    elevation: "60-140m",
    slope: "30-45°"
  },
  {
    name: "Diezmo Hillside Zone",
    coordinates: [
      [14.2460, 121.0950],
      [14.2520, 121.1020],
      [14.2500, 121.1120],
      [14.2420, 121.1140],
      [14.2370, 121.1060],
      [14.2390, 121.0960],
    ],
    riskLevel: "moderate",
    description: "Mixed vegetation slopes; erosion-prone sections during intense/prolonged rainfall",
    affectedBarangays: ["Diezmo", "Banay-Banay"],
    elevation: "25-70m",
    slope: "12-28°"
  },
  {
    name: "Bigaa Upland Slope",
    coordinates: [
      [14.2680, 121.0980],
      [14.2740, 121.1050],
      [14.2720, 121.1150],
      [14.2640, 121.1160],
      [14.2580, 121.1090],
      [14.2600, 121.1000],
    ],
    riskLevel: "moderate",
    description: "Upland edge slopes with mixed cover; localized failures possible during heavy rains",
    affectedBarangays: ["Bigaa", "Butong"],
    elevation: "25-65m",
    slope: "10-25°"
  },
  {
    name: "Niugan Terrace Zone",
    coordinates: [
      [14.2140, 121.0980],
      [14.2180, 121.1040],
      [14.2160, 121.1120],
      [14.2080, 121.1120],
      [14.2040, 121.1050],
      [14.2060, 121.0980],
    ],
    riskLevel: "low",
    description: "Terraced area with good drainage and vegetation cover",
    affectedBarangays: ["Niugan"],
    elevation: "18-40m",
    slope: "5-15°"
  },
  {
    name: "Banay-Banay Upland Transition",
    coordinates: [
      [14.2480, 121.1080],
      [14.2540, 121.1150],
      [14.2520, 121.1260],
      [14.2440, 121.1280],
      [14.2390, 121.1210],
      [14.2410, 121.1100],
    ],
    riskLevel: "low",
    description: "Transition between upland edge and built-up areas; generally low risk but monitor drainage and cut slopes",
    affectedBarangays: ["Banay-Banay", "Pulo"],
    elevation: "15-35m",
    slope: "4-12°"
  },
];

// Landslide zone color configuration by risk level
export const landslideZoneColors: Record<RiskLevel, ZoneColors> = {
  high: { fill: "#b45309", stroke: "#92400e", label: "High Risk Zone" },
  moderate: { fill: "#d97706", stroke: "#b45309", label: "Moderate Risk Zone" },
  low: { fill: "#fbbf24", stroke: "#d97706", label: "Low Risk Zone" },
};
