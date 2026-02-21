"""
Build flood zone data from barangay boundaries (GeoJSON) and flood susceptibility (CSV).
- Each zone uses the full barangay boundary (same as green/choropleth layer); risk is one level per barangay (high/moderate/low).
- Barangay Uno, Dos, Tres and Poblacion are merged into one zone "Poblacion" with full boundary so it matches the green layer.

Run from backend/api: python scripts/build_flood_zones.py [--out <path>]
Output for frontend: .../mapLayers/floodZones/floodZonesBoundary.json
"""
import csv
import json
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
GEOJSON_PATH = BASE / "data" / "datasets" / "geography" / "cabuyao_barangays.geojson"
CSV_PATH = BASE / "data" / "datasets" / "susceptibility" / "flood_susceptibility.csv"

# Risk-level thresholds (flood_recurrence_pct)
HIGH_PCT = 50
MODERATE_PCT = 20
# Barangay Uno, Dos, Tres and Poblacion -> one zone "Poblacion" (full boundary = same as green layer)
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
    """Single polygon: return its outer ring. MultiPolygon: return first part's outer ring only."""
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
    """(lng, lat) of polygon centroid (average of vertices, closed ring)."""
    if not ring:
        return (0.0, 0.0)
    n = len(ring)
    pts = ring if (n < 2 or ring[0] != ring[-1]) else ring[:-1]
    if not pts:
        return (ring[0][0], ring[0][1])
    s_lng = sum(p[0] for p in pts)
    s_lat = sum(p[1] for p in pts)
    return (s_lng / len(pts), s_lat / len(pts))


def dist_sq(lng1, lat1, lng2, lat2):
    return (lng1 - lng2) ** 2 + (lat1 - lat2) ** 2


def geojson_ring_to_leaflet(ring: list) -> list:
    return [[p[1], p[0]] for p in ring]


def main():
    argv = sys.argv[1:]
    emit_ts = "--ts" in argv
    out_path = None
    if "--out" in argv:
        i = argv.index("--out")
        if i + 1 < len(argv):
            out_path = Path(argv[i + 1])

    with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
        geojson = json.load(f)

    # Build barangays: one entry per barangay; Barangay Uno/Dos/Tres and Poblacion merged into "Poblacion"
    # Use all rings from MultiPolygon so Poblacion boundary matches green layer (full extent)
    barangays = []
    poblacion_rings = []
    for feature in geojson.get("features", []):
        name = (feature.get("properties") or {}).get("name") or "Unknown"
        geom = feature.get("geometry") or {}
        if name in POBLACION_NAMES:
            rings_for_feature = get_all_rings(geom)
            for ring in rings_for_feature:
                if ring and len(ring) >= 3:
                    poblacion_rings.append(ring)
        else:
            ring = get_outer_ring(geom)
            if not ring or len(ring) < 3:
                continue
            centroid = ring_centroid(ring)
            barangays.append({"name": name, "rings": [ring], "centroid": centroid})
    if poblacion_rings:
        centroid = ring_centroid(poblacion_rings[0])
        barangays.append({"name": "Poblacion", "rings": poblacion_rings, "centroid": centroid})

    # Load susceptibility points
    points = []
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            lng = float(row["longitude"])
            lat = float(row["latitude"])
            pct = float(row["flood_recurrence_pct"])
            points.append((lng, lat, pct))

    # Assign each point to a barangay: inside any ring first, else nearest centroid
    by_barangay = {b["name"]: [] for b in barangays}
    for lng, lat, pct in points:
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
            best = barangays[0]["name"]
            best_d = dist_sq(lng, lat, cx, cy)
            for b in barangays[1:]:
                cx, cy = b["centroid"]
                d = dist_sq(lng, lat, cx, cy)
                if d < best_d:
                    best_d = d
                    best = b["name"]
            assigned = best
        by_barangay[assigned].append((lng, lat, pct))

    zones = []
    for b in barangays:
        name = b["name"]
        rings = b["rings"]
        inside = by_barangay.get(name, [])
        pcts = [pct for _, _, pct in inside] if inside else []
        max_pct = max(pcts) if pcts else 0
        p75 = 0
        if len(pcts) >= 4:
            pcts_sorted = sorted(pcts, reverse=True)
            p75 = pcts_sorted[len(pcts_sorted) * 3 // 4]
        elif pcts:
            p75 = max_pct

        if max_pct >= HIGH_PCT or p75 >= 40:
            risk_level = "high"
            desc = f"High flood risk (max recurrence {max_pct:.0f}%). Prone to overflow and typhoon flooding."
        elif max_pct >= MODERATE_PCT or p75 >= 15:
            risk_level = "moderate"
            desc = f"Moderate flood risk (max recurrence {max_pct:.0f}%). Seasonal waterlogging and creek overflow."
        else:
            risk_level = "low"
            desc = f"Low flood risk (max recurrence {max_pct:.0f}%). Monitor during extreme events and typhoons." if max_pct > 0 else "Low flood risk. Minimal recurrence in data; monitor during extreme events."

        # Full barangay boundary for all zones (same as green/choropleth layer)
        leaflet_rings = [geojson_ring_to_leaflet(r) for r in rings if len(r) >= 3]
        if not leaflet_rings:
            continue
        coordinates = leaflet_rings[0] if len(leaflet_rings) == 1 else leaflet_rings
        zones.append({
            "name": name,
            "coordinates": coordinates,
            "riskLevel": risk_level,
            "description": desc,
            "affectedBarangays": [name],
        })

    order = {"high": 0, "moderate": 1, "low": 2}
    zones.sort(key=lambda z: (order.get(z["riskLevel"], 3), z["name"]))

    if out_path:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(zones, f, indent=2)
        print(f"Wrote {len(zones)} flood zones (full barangay bounds) to {out_path}", file=sys.stderr)
    elif emit_ts:
        lines = ["export const floodZonesData: FloodZoneData[] = ["]
        for z in zones:
            coords = z["coordinates"]
            if coords and isinstance(coords[0][0], (int, float)):
                coord_str = ",\n      ".join(f"[{c[0]}, {c[1]}]" for c in coords)
                coord_ts = f"[\n      {coord_str}\n    ]"
            else:
                parts = []
                for ring in coords:
                    coord_str = ",\n        ".join(f"[{c[0]}, {c[1]}]" for c in ring)
                    parts.append(f"[\n        {coord_str}\n      ]")
                coord_ts = "[\n      " + ",\n      ".join(parts) + "\n    ]"
            lines.append(f"  {{")
            lines.append(f'    name: "{z["name"]}",')
            lines.append(f"    coordinates: {coord_ts},")
            lines.append(f'    riskLevel: "{z["riskLevel"]}",')
            lines.append(f'    description: "{z["description"].replace(chr(34), chr(39))}",')
            aff = ", ".join(f'"{a}"' for a in z["affectedBarangays"])
            lines.append(f"    affectedBarangays: [{aff}],")
            lines.append(f"  }},")
        lines.append("];")
        print("\n".join(lines))
    else:
        print(json.dumps(zones, indent=2))


if __name__ == "__main__":
    main()
