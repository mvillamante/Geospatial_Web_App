// Approximate polygon covering Cabuyao (lat, lng)
const cabuyaoPolygon: [number, number][] = [
  [14.230, 121.020], // bottom-left
  [14.230, 121.170], // bottom-right
  [14.360, 121.170], // top-right
  [14.360, 121.020], // top-left
  [14.230, 121.020], // close polygon
];

// Simple point-in-polygon check (ray-casting algorithm)
function isPointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect =
      (yi > lng) !== (yj > lng) &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi + Number.EPSILON) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

// Exported function
export function isWithinCabuyao(lat: number, lng: number): boolean {
  return isPointInPolygon(lat, lng, cabuyaoPolygon);
}
