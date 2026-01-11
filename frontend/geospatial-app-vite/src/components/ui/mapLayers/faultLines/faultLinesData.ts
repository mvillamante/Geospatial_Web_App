// Fault lines data for Cabuyao, Laguna area
// These represent hypothetical fault lines running through the region

export interface FaultLineData {
  name: string;
  coordinates: [number, number][];
  type: "active" | "potentially_active";
  description: string;
}

export const faultLinesData: FaultLineData[] = [
  {
    name: "West Valley Fault - Cabuyao Segment",
    coordinates: [
      [14.2580, 121.0950],
      [14.2450, 121.1020],
      [14.2320, 121.1100],
      [14.2190, 121.1180],
      [14.2050, 121.1270],
    ],
    type: "active",
    description: "Major fault segment running through western Cabuyao"
  },
  {
    name: "Laguna Lake Fault Zone",
    coordinates: [
      [14.2700, 121.1400],
      [14.2550, 121.1450],
      [14.2400, 121.1500],
      [14.2250, 121.1520],
      [14.2100, 121.1480],
    ],
    type: "active",
    description: "Fault zone near Laguna Lake shoreline"
  },
  {
    name: "Cabuyao Central Fault",
    coordinates: [
      [14.2650, 121.1150],
      [14.2500, 121.1200],
      [14.2350, 121.1250],
      [14.2200, 121.1300],
      [14.2050, 121.1350],
    ],
    type: "potentially_active",
    description: "Central fault running through urban areas"
  },
  {
    name: "Southern Cabuyao Fracture",
    coordinates: [
      [14.2150, 121.0900],
      [14.2100, 121.1050],
      [14.2080, 121.1200],
      [14.2120, 121.1350],
      [14.2180, 121.1500],
    ],
    type: "potentially_active",
    description: "Fracture zone in southern barangays"
  },
];
