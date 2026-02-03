const _DEPARTMENTS = [
  "DRRMO",
  "PNP",
  "BFP",
  "Health Office",
] as const;

export type Departments = typeof _DEPARTMENTS[number];

export function getDepartments(): readonly Departments[] {
  return _DEPARTMENTS;
}
