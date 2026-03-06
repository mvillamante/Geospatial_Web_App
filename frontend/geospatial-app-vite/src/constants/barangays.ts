const _CABUYAO_BARANGAYS = [
  "Baclaran", "Banay-Banay", "Banlic", "Bigaa", "Butong",
  "Casile", "Diezmo", "Gulod", "Mamatid", "Marinig",
  "Niugan", "Pittland", "Pulo", "Sala", "San Isidro",
  "Uno (Poblacion 1)", "Dos (Poblacion 2)", "Tres (Poblacion 3)",
] as const;

export type CabuyaoBarangay = typeof _CABUYAO_BARANGAYS[number];

export function getCabuyaoBarangays(): readonly CabuyaoBarangay[] {
  return _CABUYAO_BARANGAYS;
}
