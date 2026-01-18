// Evacuation Centers data for Cabuyao, Laguna
// These represent schools, covered courts, multi-purpose halls, and gymnasiums that serve as evacuation sites

export type EvacuationCenterType = "school" | "covered_court" | "multi_purpose_hall" | "gymnasium";

export interface EvacuationCenterData {
  name: string;
  type: EvacuationCenterType;
  coordinates: [number, number];
  capacity: number;
  address: string;
  facilities: string[];
}

export interface EvacuationTypeConfig {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
}

export const evacuationCentersData: EvacuationCenterData[] = [
  // Schools
  {
    name: "Cabuyao Central Elementary School",
    type: "school",
    coordinates: [14.2765, 121.1220],
    capacity: 500,
    address: "Brgy. Uno, Cabuyao, Laguna",
    facilities: ["Classrooms", "Covered Court", "Comfort Rooms", "Water Supply"],
  },
  {
    name: "Mamatid Elementary School",
    type: "school",
    coordinates: [14.2420, 121.1380],
    capacity: 400,
    address: "Brgy. Mamatid, Cabuyao, Laguna",
    facilities: ["Classrooms", "Stage Area", "Comfort Rooms"],
  },
  {
    name: "Banay-Banay Elementary School",
    type: "school",
    coordinates: [14.2510, 121.1150],
    capacity: 350,
    address: "Brgy. Banay-Banay, Cabuyao, Laguna",
    facilities: ["Classrooms", "Multi-Purpose Hall", "Comfort Rooms"],
  },
  {
    name: "Sala Elementary School",
    type: "school",
    coordinates: [14.2650, 121.1280],
    capacity: 300,
    address: "Brgy. Sala, Cabuyao, Laguna",
    facilities: ["Classrooms", "Covered Court", "Water Supply"],
  },
  {
    name: "Pittland National High School",
    type: "school",
    coordinates: [14.2480, 121.0920],
    capacity: 600,
    address: "Brgy. Pittland, Cabuyao, Laguna",
    facilities: ["Classrooms", "Gymnasium", "Comfort Rooms", "Canteen"],
  },
  {
    name: "Gulod Elementary School",
    type: "school",
    coordinates: [14.2700, 121.1400],
    capacity: 280,
    address: "Brgy. Gulod, Cabuyao, Laguna",
    facilities: ["Classrooms", "Covered Court", "Comfort Rooms"],
  },
  // Covered Courts
  {
    name: "Baclaran Covered Court",
    type: "covered_court",
    coordinates: [14.2340, 121.1450],
    capacity: 200,
    address: "Brgy. Baclaran, Cabuyao, Laguna",
    facilities: ["Open Court", "Stage", "Comfort Rooms"],
  },
  {
    name: "Banlic Covered Court",
    type: "covered_court",
    coordinates: [14.2280, 121.1320],
    capacity: 180,
    address: "Brgy. Banlic, Cabuyao, Laguna",
    facilities: ["Basketball Court", "Stage Area", "Comfort Rooms"],
  },
  {
    name: "Marinig Covered Court",
    type: "covered_court",
    coordinates: [14.2730, 121.1420],
    capacity: 220,
    address: "Brgy. Marinig, Cabuyao, Laguna",
    facilities: ["Multi-Purpose Court", "Bleachers", "Comfort Rooms"],
  },
  {
    name: "Bigaa Covered Court",
    type: "covered_court",
    coordinates: [14.2780, 121.1080],
    capacity: 250,
    address: "Brgy. Bigaa, Cabuyao, Laguna",
    facilities: ["Basketball Court", "Stage", "Power Supply"],
  },
  // Multi-Purpose Halls
  {
    name: "Cabuyao Municipal Multi-Purpose Hall",
    type: "multi_purpose_hall",
    coordinates: [14.2720, 121.1250],
    capacity: 800,
    address: "Municipal Compound, Cabuyao, Laguna",
    facilities: ["Main Hall", "Kitchen", "Comfort Rooms", "Generator", "First Aid Station"],
  },
  {
    name: "Pulo Multi-Purpose Hall",
    type: "multi_purpose_hall",
    coordinates: [14.2440, 121.1200],
    capacity: 300,
    address: "Brgy. Pulo, Cabuyao, Laguna",
    facilities: ["Assembly Hall", "Storage Room", "Comfort Rooms"],
  },
  {
    name: "Niugan Multi-Purpose Center",
    type: "multi_purpose_hall",
    coordinates: [14.2580, 121.1300],
    capacity: 350,
    address: "Brgy. Niugan, Cabuyao, Laguna",
    facilities: ["Main Hall", "Stage", "Comfort Rooms", "Kitchen Area"],
  },
  {
    name: "Diezmo Community Hall",
    type: "multi_purpose_hall",
    coordinates: [14.2450, 121.1050],
    capacity: 250,
    address: "Brgy. Diezmo, Cabuyao, Laguna",
    facilities: ["Assembly Area", "Comfort Rooms", "Water Supply"],
  },
  // Gymnasiums
  {
    name: "Cabuyao Sports Complex Gymnasium",
    type: "gymnasium",
    coordinates: [14.2680, 121.1180],
    capacity: 1200,
    address: "Sports Complex, Cabuyao, Laguna",
    facilities: ["Indoor Court", "Bleachers", "Locker Rooms", "Generator", "First Aid", "Kitchen"],
  },
  {
    name: "Butong Barangay Gymnasium",
    type: "gymnasium",
    coordinates: [14.2800, 121.1150],
    capacity: 400,
    address: "Brgy. Butong, Cabuyao, Laguna",
    facilities: ["Indoor Court", "Bleachers", "Comfort Rooms", "Storage"],
  },
  {
    name: "San Isidro Community Gymnasium",
    type: "gymnasium",
    coordinates: [14.2220, 121.1350],
    capacity: 350,
    address: "Brgy. San Isidro, Cabuyao, Laguna",
    facilities: ["Indoor Court", "Stage", "Comfort Rooms"],
  },
  {
    name: "Casile Mountain Gymnasium",
    type: "gymnasium",
    coordinates: [14.2150, 121.0950],
    capacity: 280,
    address: "Brgy. Casile, Cabuyao, Laguna",
    facilities: ["Indoor Court", "Bleachers", "Emergency Supplies Storage"],
  },
];

// Evacuation center type configuration
export const evacuationTypeConfig: Record<EvacuationCenterType, EvacuationTypeConfig> = {
  school: {
    icon: "🏫",
    label: "School",
    color: "#2563eb",
    bgColor: "#dbeafe",
  },
  covered_court: {
    icon: "🏀",
    label: "Covered Court",
    color: "#059669",
    bgColor: "#d1fae5",
  },
  multi_purpose_hall: {
    icon: "🏛️",
    label: "Multi-Purpose Hall",
    color: "#7c3aed",
    bgColor: "#ede9fe",
  },
  gymnasium: {
    icon: "🏟️",
    label: "Gymnasium",
    color: "#dc2626",
    bgColor: "#fee2e2",
  },
};
