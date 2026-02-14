const _DEPARTMENTS = [
  "Administrative and Training",
  "Research and Planning",
  "Operations and Warning",
  "Communications and Command",
  "Rescue and Emergency Medical Services"
] as const;

export type Departments = typeof _DEPARTMENTS[number];

export function getDepartments(): readonly Departments[] {
  return _DEPARTMENTS;
}
