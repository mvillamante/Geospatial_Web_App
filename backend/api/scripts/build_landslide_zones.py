"""
Build landslide risk zone data from barangay boundaries (GeoJSON) and landslide susceptibility (CSV).
- Zone boundaries use the actual barangay polygon from GeoJSON (readjusted boundaries, no overlap).
- Poblacion (and Barangay Uno/Dos/Tres) merged into one zone with full MultiPolygon extent, same as flood/green layer.
- Assigns each CSV point to a barangay (inside polygon first, else nearest centroid) for risk level.
- Risk from slope_degrees: high >= 10°, moderate >= 5°, low >= LOW_SLOPE_DEG.

Run from backend/api: python scripts/build_landslide_zones.py [--out <path>]
Output for frontend: .../mapLayers/landslideRisk/landslideRiskBoundary.json
"""
import csv
import json
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
GEOJSON_PATH = BASE / "data" / "datasets" / "geography" / "cabuyao_barangays.geojson"
CSV_PATH = BASE / "data" / "datasets" / "susceptibility" / "landslide_susceptibility.csv"

# Slope thresholds (degrees): high >= 10°, moderate >= 5°, low = has landslide potential if slope >= this
HIGH_SLOPE_DEG = 10
MODERATE_SLOPE_DEG = 5
LOW_SLOPE_DEG = 1.0
# Barangay Uno, Dos, Tres and Poblacion -> one zone "Poblacion" (full MultiPolygon extent)
POBLACION_NAMES = {"Barangay Uno", "Barangay Dos", "Barangay Tres", "Poblacion"}


def point_in_polygon(lng: float, lat: float, ring: list) -> bool:
    n = len(ring)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def get_outer_ring(geom: dict) -> list:
    coords = geom.get("coordinates") or []
    if geom.get("type") == "Polygon" and coords:
        return coords[0]
    if geom.get("type") == "MultiPolygon" and coords:
        return coords[0][0]
    return []


def get_all_rings(geom: dict) -> list:
    """Return all outer rings (one per polygon part) so MultiPolygon Poblacion gets full extent."""
    coords = geom.get("coordinates") or []
    if geom.get("type") == "Polygon" and coords:
        return [coords[0]] if coords[0] else []
    if geom.get("type") == "MultiPolygon" and coords:
        return [part[0] for part in coords if part and part[0]]
    return []


def ring_centroid(ring: list) -> tuple:
    if not ring:
        return (0.0, 0.0)
    pts = ring if (len(ring) < 2 or ring[0] != ring[-1]) else ring[:-1]
    if not pts:
        return (ring[0][0], ring[0][1])
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


def dist_sq(lng1, lat1, lng2, lat2):
    return (lng1 - lng2) ** 2 + (lat1 - lat2) ** 2


def geojson_ring_to_leaflet(ring: list) -> list:
    return [[p[1], p[0]] for p in ring]


def main():
    argv = sys.argv[1:]
    out_path = None
    if "--out" in argv:
        i = argv.index("--out")
        if i + 1 < len(argv):
            out_path = Path(argv[i + 1])

    with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
        geojson = json.load(f)

    barangays = []
    poblacion_rings = []
    for feature in geojson.get("features", []):
        name = (feature.get("properties") or {}).get("name") or "Unknown"
        geom = feature.get("geometry") or {}
        if name in POBLACION_NAMES:
            for ring in get_all_rings(geom):
                if ring and len(ring) >= 3:
                    poblacion_rings.append(ring)
        else:
            ring = get_outer_ring(geom)
            if not ring or len(ring) < 3:
                continue
            barangays.append({"name": name, "rings": [ring], "centroid": ring_centroid(ring)})
    if poblacion_rings:
        barangays.append({"name": "Poblacion", "rings": poblacion_rings, "centroid": ring_centroid(poblacion_rings[0])})

    points = []
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            lng = float(row["longitude"])
            lat = float(row["latitude"])
            slope = float(row["slope_degrees"])
            elev = int(float(row["elevation_meters"]))
            points.append((lng, lat, slope, elev))

    by_barangay = {b["name"]: [] for b in barangays}
    for lng, lat, slope, elev in points:
        assigned = None
        for b in barangays:
            for ring in b["rings"]:
                if point_in_polygon(lng, lat, ring):
                    assigned = b["name"]
                    break
            if assigned is not None:
                break
        if assigned is None:
            cx, cy = barangays[0]["centroid"]
            best, best_d = barangays[0]["name"], dist_sq(lng, lat, cx, cy)
            for b in barangays[1:]:
                cx, cy = b["centroid"]
                d = dist_sq(lng, lat, cx, cy)
                if d < best_d:
                    best_d, best = d, b["name"]
            assigned = best
        by_barangay[assigned].append((lng, lat, slope, elev))

    zones = []
    for b in barangays:
        name = b["name"]
        rings = b["rings"]
        inside = by_barangay.get(name, [])
        leaflet_rings = [geojson_ring_to_leaflet(r) for r in rings if len(r) >= 3]
        if not leaflet_rings:
            continue
        coordinates = leaflet_rings[0] if len(leaflet_rings) == 1 else leaflet_rings

        if not inside:
            zones.append({
                "name": name,
                "coordinates": coordinates,
                "riskLevel": "low",
                "description": "Minimal landslide potential in available data; monitor steep cut slopes and drainage during heavy rainfall.",
                "affectedBarangays": [name],
                "elevation": "—",
                "slope": "—",
            })
            continue

        slopes = [s for _, _, s, _ in inside]
        elevs = [e for _, _, _, e in inside]
        mean_slope = sum(slopes) / len(slopes)
        max_slope = max(slopes)
        elev_min, elev_max = min(elevs), max(elevs)
        elevation_str = f"{elev_min}-{elev_max}m"
        slopes_sorted = sorted(slopes, reverse=True)
        p75 = slopes_sorted[len(slopes_sorted) * 3 // 4] if len(slopes_sorted) >= 4 else max_slope

        if max_slope >= HIGH_SLOPE_DEG or p75 >= 8:
            risk_level = "high"
            desc = f"Higher slope (max {max_slope:.1f}°). Steeper terrain with elevated landslide susceptibility during heavy or prolonged rainfall."
        elif max_slope >= MODERATE_SLOPE_DEG or p75 >= 4:
            risk_level = "moderate"
            desc = f"Moderate slope (max {max_slope:.1f}°). Slopes and cut areas may be erosion- or slide-prone during intense rainfall."
        elif max_slope >= LOW_SLOPE_DEG:
            risk_level = "low"
            desc = f"Low landslide potential (max slope {max_slope:.1f}°). Generally stable; monitor cut slopes and drainage during extreme events."
        else:
            risk_level = "low"
            desc = "Minimal landslide potential in available data; monitor steep cut slopes and drainage during heavy rainfall."

        slope_str = f"{min(slopes):.0f}-{max_slope:.0f}°" if len(slopes) > 1 else f"{mean_slope:.0f}°"

        zones.append({
            "name": name,
            "coordinates": coordinates,
            "riskLevel": risk_level,
            "description": desc,
            "affectedBarangays": [name],
            "elevation": elevation_str,
            "slope": slope_str,
        })

    order = {"high": 0, "moderate": 1, "low": 2}
    zones.sort(key=lambda z: (order.get(z["riskLevel"], 3), z["name"]))

    if out_path:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(zones, f, indent=2)
        print(f"Wrote {len(zones)} landslide zones to {out_path}", file=sys.stderr)
    else:
        print(json.dumps(zones, indent=2))


if __name__ == "__main__":
    main()
