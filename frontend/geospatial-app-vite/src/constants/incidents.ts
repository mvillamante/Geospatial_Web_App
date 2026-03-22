export const _INCIDENT_CATEGORIES = [
  "fire",
  "flood",
  "landslide",
  "typhoon",
  "earthquake",
  "vehicular_accident",
  "chemical_gas_leak",
  "fallen_tree",
  "infrastructure_damage",
  "others",
] as const;

export type IncidentCategories = typeof _INCIDENT_CATEGORIES[number];

export interface IncidentCategoryMeta {
  value: IncidentCategories;
  label: string;
  icon: string;
}

export const INCIDENT_CATEGORY_METADATA: readonly IncidentCategoryMeta[] = [
  { value: "fire", label: "Fire", icon: "🔥" },
  { value: "flood", label: "Flood", icon: "🌊" },
  { value: "landslide", label: "Landslide", icon: "⛰️" },
  { value: "typhoon", label: "Typhoon / Severe Weather", icon: "🌀" },
  { value: "earthquake", label: "Earthquake", icon: "🌍" },
  { value: "vehicular_accident", label: "Vehicular Accident", icon: "🚗" },
  { value: "chemical_gas_leak", label: "Chemical / Gas Leak", icon: "☣️" },
  { value: "fallen_tree", label: "Fallen Tree", icon: "🌳" },
  { value: "infrastructure_damage", label: "Infrastructure Damage", icon: "🏗️" },
  { value: "others", label: "Others", icon: "⚠️" }
];

export const severityColors: Record<
  "critical" | "high" | "moderate" | "low",
  { primary: string; secondary: string; border: string; text: string }
> = {
  critical: { primary: "#991b1b", secondary: "#dc2626", border: "#9c1515", text: "CRITICAL" },
  high: { primary: "#ef4444", secondary: "#f87171", border: "#df3838", text: "HIGH" },
  moderate: { primary: "#f59e0b", secondary: "#fbbf24", border: "#e78c23", text: "MODERATE" },
  low: { primary: "#10b981", secondary: "#34d399", border: "#0ba876", text: "LOW" },
};

export function getIncidentIcon(category: string): string {
  const normalized = category
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[\/\-]/g, "");

  return (
    INCIDENT_CATEGORY_METADATA.find(
      (c) => c.value === normalized
    )?.icon || "⚠️"
  );
}

export function getIncidentCategories() {
  return INCIDENT_CATEGORY_METADATA;
}

export function getIncidentLabel(value: IncidentCategories): string {
  return (
    INCIDENT_CATEGORY_METADATA.find((c) => c.value === value)?.label || value
  );
}