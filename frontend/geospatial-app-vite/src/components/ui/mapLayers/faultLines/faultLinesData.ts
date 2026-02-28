// Fault lines data for Cabuyao–Carmona area (Laguna / Cavite)
// Extended north to Carmona so fault lines border Cabuyao and reach toward Carmona

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
      [14.3180, 121.0580],
      [14.3050, 121.0680],
      [14.2920, 121.0780],
      [14.2780, 121.0880],
      [14.2580, 121.0950],
      [14.2450, 121.1020],
      [14.2320, 121.1100],
      [14.2190, 121.1180],
      [14.2050, 121.1270],
    ],
    type: "active",
    description: "Major fault segment from Carmona area through western Cabuyao"
  },
  {
    name: "Laguna Lake Fault Zone",
    coordinates: [
      [14.3180, 121.1380],
      [14.3040, 121.1420],
      [14.2900, 121.1460],
      [14.2760, 121.1500],
      [14.2620, 121.1540],
      [14.2480, 121.1580],
      [14.2340, 121.1620],
      [14.2200, 121.1660],
      [14.2060, 121.1700],
    ],
    type: "active",
    description: "Fault zone along western Laguna de Bay shoreline (Santa Rosa–Cabuyao–Calamba lakeside corridor)"
  },
  {
    name: "Cabuyao Central Fault",
    coordinates: [
      [14.3180, 121.0820],
      [14.3060, 121.0924],
      [14.2940, 121.1028],
      [14.2820, 121.1132],
      [14.2700, 121.1236],
      [14.2580, 121.1340],
      [14.2460, 121.1444],
      [14.2340, 121.1548],
      [14.2220, 121.1650],
    ],
    type: "potentially_active",
    description: "West Valley Fault trace through Cabuyao (Carmona–Santa Rosa–Cabuyao–Calamba corridor)"
  },
  {
    name: "Southern Cabuyao Fracture",
    coordinates: [
      [14.3180, 121.0650],
      [14.3020, 121.0780],
      [14.2860, 121.0910],
      [14.2720, 121.1040],
      [14.2580, 121.1170],
      [14.2440, 121.1300],
      [14.2300, 121.1430],
      [14.2160, 121.1560],
      [14.2020, 121.1690],
    ],
    type: "potentially_active",
    description: "Secondary fault trace aligned with West Valley Fault trend, from Carmona through Cabuyao toward Calamba"
  },
];
