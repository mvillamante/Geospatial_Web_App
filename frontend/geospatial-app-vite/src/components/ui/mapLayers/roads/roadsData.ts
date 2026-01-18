// Roads data for Cabuyao, Laguna area
// These represent major roads, bridges, and includes a closed road scenario

export type RoadType = "major_road" | "secondary_road" | "bridge";
export type RoadStatus = "open" | "closed";

export interface RoadData {
  name: string;
  coordinates: [number, number][];
  type: RoadType;
  status: RoadStatus;
  description: string;
  lanes: number;
  bridgeLength?: string;
  closureReason?: string;
}

export interface RoadColorConfig {
  stroke: string;
  weight: number;
  label: string;
}

export const roadsData: RoadData[] = [
  // Major Roads
  {
    name: "National Highway (Manila South Road)",
    coordinates: [
      [14.2850, 121.1100],
      [14.2750, 121.1180],
      [14.2650, 121.1220],
      [14.2550, 121.1280],
      [14.2450, 121.1340],
      [14.2350, 121.1380],
      [14.2250, 121.1420],
      [14.2150, 121.1460],
    ],
    type: "major_road",
    status: "open",
    description: "Main highway connecting Cabuyao to Metro Manila and other Laguna municipalities",
    lanes: 4,
  },
  {
    name: "Cabuyao-Sta. Rosa Road",
    coordinates: [
      [14.2720, 121.1250],
      [14.2780, 121.1180],
      [14.2830, 121.1100],
      [14.2880, 121.1020],
      [14.2920, 121.0940],
    ],
    type: "major_road",
    status: "open",
    description: "Connector road to Santa Rosa City",
    lanes: 2,
  },
  {
    name: "Banay-Banay Road",
    coordinates: [
      [14.2550, 121.1280],
      [14.2520, 121.1200],
      [14.2500, 121.1120],
      [14.2480, 121.1040],
      [14.2460, 121.0960],
    ],
    type: "secondary_road",
    status: "open",
    description: "Barangay connector road through Banay-Banay",
    lanes: 2,
  },
  {
    name: "Mamatid-Gulod Road",
    coordinates: [
      [14.2420, 121.1380],
      [14.2480, 121.1400],
      [14.2560, 121.1410],
      [14.2640, 121.1400],
      [14.2700, 121.1380],
    ],
    type: "secondary_road",
    status: "open",
    description: "Eastern barangay connector along the lake",
    lanes: 2,
  },
  {
    name: "Pittland Access Road",
    coordinates: [
      [14.2480, 121.1040],
      [14.2440, 121.0980],
      [14.2400, 121.0920],
      [14.2360, 121.0860],
    ],
    type: "secondary_road",
    status: "open",
    description: "Access road to Pittland barangay",
    lanes: 2,
  },
  {
    name: "Casile Mountain Road",
    coordinates: [
      [14.2200, 121.1300],
      [14.2180, 121.1200],
      [14.2160, 121.1100],
      [14.2140, 121.1000],
      [14.2120, 121.0900],
    ],
    type: "secondary_road",
    status: "closed",
    description: "⚠️ CLOSED: Road damaged due to landslide. Estimated reopening: 2 weeks",
    lanes: 2,
    closureReason: "Landslide damage",
  },
  // Bridges
  {
    name: "Mamatid Bridge",
    coordinates: [
      [14.2400, 121.1420],
      [14.2420, 121.1450],
    ],
    type: "bridge",
    status: "open",
    description: "Bridge crossing Mamatid creek, connects to lakeside barangays",
    lanes: 2,
    bridgeLength: "45m",
  },
  {
    name: "Banlic Overpass Bridge",
    coordinates: [
      [14.2280, 121.1320],
      [14.2300, 121.1350],
    ],
    type: "bridge",
    status: "open",
    description: "Overpass bridge over the main highway intersection",
    lanes: 4,
    bridgeLength: "120m",
  },
  {
    name: "Marinig Creek Bridge",
    coordinates: [
      [14.2720, 121.1400],
      [14.2740, 121.1430],
    ],
    type: "bridge",
    status: "open",
    description: "Small bridge crossing Marinig creek",
    lanes: 2,
    bridgeLength: "30m",
  },
  {
    name: "Sala River Bridge",
    coordinates: [
      [14.2620, 121.1260],
      [14.2650, 121.1290],
    ],
    type: "bridge",
    status: "open",
    description: "Bridge over Sala River connecting to Niugan",
    lanes: 2,
    bridgeLength: "55m",
  },
  {
    name: "Old Bigaa Bridge",
    coordinates: [
      [14.2780, 121.1120],
      [14.2800, 121.1150],
    ],
    type: "bridge",
    status: "closed",
    description: "⚠️ CLOSED: Under rehabilitation. Use alternate route via Butong",
    lanes: 2,
    bridgeLength: "40m",
    closureReason: "Rehabilitation work",
  },
];

// Roads color configuration by type and status
export const roadsColors: Record<RoadType | "closed", RoadColorConfig> = {
  major_road: { stroke: "#4f46e5", weight: 6, label: "Major Road" },
  secondary_road: { stroke: "#8b5cf6", weight: 4, label: "Secondary Road" },
  bridge: { stroke: "#0891b2", weight: 5, label: "Bridge" },
  closed: { stroke: "#dc2626", weight: 4, label: "Closed" },
};
