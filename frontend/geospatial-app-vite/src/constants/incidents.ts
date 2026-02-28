const _INCIDENT_CATEGORIES = [
  "Fire",
  "Flood",
  "Typhoon",
  "Chemical / Gas Leak",
  "Fallen Tree",
  "Infrastructure Damage",
  "Landslide",
  "Vehicular Accident",
  "Others",
] as const;

export type IncidentCategories = typeof _INCIDENT_CATEGORIES[number];

export function getIncidentCategories(): readonly IncidentCategories[] {
  return _INCIDENT_CATEGORIES;
}


