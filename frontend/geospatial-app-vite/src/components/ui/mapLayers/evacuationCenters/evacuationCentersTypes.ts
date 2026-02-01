export type EvacuationCenterType =
  | "school"
  | "court"
  | "hall"
  | "gymnasium";

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

export const evacuationTypeConfig: Record<EvacuationCenterType, EvacuationTypeConfig> = {
  school: { icon: "🏫", label: "School", color: "#2563eb", bgColor: "#dbeafe" },
  court: { icon: "🏀", label: "Covered Court", color: "#059669", bgColor: "#d1fae5" },
  hall: { icon: "🏛️", label: "Multi-Purpose Hall", color: "#7c3aed", bgColor: "#ede9fe" },
  gymnasium: { icon: "🏟️", label: "Gymnasium", color: "#dc2626", bgColor: "#fee2e2" },
};