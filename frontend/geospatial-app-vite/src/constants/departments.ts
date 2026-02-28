const _DEPARTMENTS = [
"hi"
] as const;

export type Departments = typeof _DEPARTMENTS[number];

export function getDepartments(): readonly Departments[] {
  return _DEPARTMENTS;
}
