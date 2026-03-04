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
  barangay: string;
}

export interface EvacuationTypeConfig {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
}

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
