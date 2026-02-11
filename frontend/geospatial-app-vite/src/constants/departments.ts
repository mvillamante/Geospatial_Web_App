const _DEPARTMENTS = [
  "Training Division",
  "Operations & Warning Division"
] as const;

export type Departments = typeof _DEPARTMENTS[number];

export function getDepartments(): readonly Departments[] {
  return _DEPARTMENTS;
}
