// Flood zones data for Cabuyao, Laguna area
// These represent flood-prone areas based on elevation, proximity to waterways, and historical data
// Eastern barangays (near Laguna Lake) are flood-prone
// Based on actual barangay positions from OpenStreetMap

import type { RiskLevel, ZoneColors } from "../types";

export interface FloodZoneData {
  name: string;
  coordinates: [number, number][];
  riskLevel: RiskLevel;
  description: string;
  affectedBarangays: string[];
}

export const floodZonesData: FloodZoneData[] = [
  {
    name: "Marinig-Gulod Lakeshore",
    coordinates: [
      [14.2750, 121.1380],
      [14.2780, 121.1420],
      [14.2760, 121.1480],
      [14.2700, 121.1500],
      [14.2640, 121.1480],
      [14.2620, 121.1420],
      [14.2660, 121.1370],
      [14.2710, 121.1360],
    ],
    riskLevel: "high",
    description: "Low-lying lakeshore area prone to flooding during heavy rains and Laguna Lake overflow",
    affectedBarangays: ["Marinig", "Gulod"],
  },
  {
    name: "Mamatid-Baclaran Lakeside",
    coordinates: [
      [14.2380, 121.1420],
      [14.2420, 121.1480],
      [14.2400, 121.1550],
      [14.2340, 121.1560],
      [14.2290, 121.1500],
      [14.2310, 121.1430],
      [14.2350, 121.1400],
    ],
    riskLevel: "high",
    description: "Eastern lakeside area susceptible to flooding during lake overflow and typhoons",
    affectedBarangays: ["Mamatid", "Baclaran"],
  },
  {
    name: "Banlic-San Isidro Zone",
    coordinates: [
      [14.2280, 121.1280],
      [14.2330, 121.1330],
      [14.2310, 121.1400],
      [14.2250, 121.1410],
      [14.2200, 121.1350],
      [14.2230, 121.1280],
    ],
    riskLevel: "moderate",
    description: "Low-lying residential area with moderate waterlogging during monsoon season",
    affectedBarangays: ["Banlic", "San Isidro"],
  },
  {
    name: "Sala-Niugan Creek Zone",
    coordinates: [
      [14.2620, 121.1200],
      [14.2670, 121.1250],
      [14.2650, 121.1320],
      [14.2590, 121.1330],
      [14.2540, 121.1270],
      [14.2570, 121.1200],
    ],
    riskLevel: "moderate",
    description: "Creek overflow zone with moderate flood occurrence during rainy season",
    affectedBarangays: ["Sala", "Niugan"],
  },
  {
    name: "Banay-Banay-Pulo Basin",
    coordinates: [
      [14.2480, 121.1180],
      [14.2530, 121.1230],
      [14.2510, 121.1300],
      [14.2450, 121.1310],
      [14.2400, 121.1250],
      [14.2430, 121.1180],
    ],
    riskLevel: "moderate",
    description: "Central basin area with seasonal flooding",
    affectedBarangays: ["Banay-Banay", "Pulo"],
  },
  {
    name: "Butong-Bigaa Northern Area",
    coordinates: [
      [14.2780, 121.1150],
      [14.2830, 121.1200],
      [14.2810, 121.1280],
      [14.2750, 121.1290],
      [14.2700, 121.1230],
      [14.2730, 121.1160],
    ],
    riskLevel: "low",
    description: "Northern area with improved drainage infrastructure",
    affectedBarangays: ["Butong", "Bigaa"],
  },
];

// Flood zone color configuration by risk level
export const floodZoneColors: Record<RiskLevel, ZoneColors> = {
  high: { fill: "#3b82f6", stroke: "#1d4ed8", label: "High Risk Zone" },
  moderate: { fill: "#60a5fa", stroke: "#2563eb", label: "Moderate Risk Zone" },
  low: { fill: "#93c5fd", stroke: "#3b82f6", label: "Low Risk Zone" },
};
