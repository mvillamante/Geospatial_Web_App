// Map Layers - Central Export
// This module provides organized access to all map layer components

// Types
export * from "./types";

// Fault Lines Layer
export { faultLinesData, createFaultLinesLayer } from "./faultLines";
export type { FaultLineData } from "./faultLines";

// Flood Zones Layer
export { floodZonesData, floodZoneColors, createFloodZonesLayer } from "./floodZones";
export type { FloodZoneData } from "./floodZones";

// Landslide Risk Layer
export { landslideRiskData, landslideZoneColors, createLandslideRiskLayer } from "./landslideRisk";
export type { LandslideRiskData } from "./landslideRisk";

// Evacuation Centers Layer
export { evacuationCentersData, evacuationTypeConfig, createEvacuationCentersLayer } from "./evacuationCenters";
export type { EvacuationCenterData, EvacuationCenterType, EvacuationTypeConfig } from "./evacuationCenters";

// Roads Layer
export { roadsData, roadsColors, createRoadsLayer } from "./roads";
export type { RoadData, RoadType, RoadStatus, RoadColorConfig } from "./roads";

// NDVI Layer
export { createNDVILayer } from "./ndvi";
export type { NDVILayerOptions } from "./ndvi";