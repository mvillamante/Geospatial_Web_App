"""
Hazard / Calamity Risk API views.

Serves precomputed hazard analysis data (Green Index, Hazard Index,
Calamity Risk Likelihood) and barangay GeoJSON boundaries from the
``HAZARD_DATA_DIR`` configured in Django settings.

These endpoints return **static JSON files** that are generated offline
by the ML training and projection pipeline located in
``api/data/training/``.  No model inference happens at request
time — only file I/O.

Query parameters
----------------
Most endpoints accept an optional ``?year=YYYY`` parameter to return
data for a single year instead of the full dataset.

Endpoint summary
----------------
- GET /api/hazard/calamity-risk/           → calamity_risk_data.json
- GET /api/hazard/calamity-risk/forecast/  → calamity_risk_forecast_data.json
- GET /api/hazard/green-index/             → green_index_data.json
- GET /api/hazard/hazard-index/            → hazard_index_data.json
- GET /api/hazard/barangays/               → cabuyao_barangays.geojson
- GET /api/hazard/model-info/              → model configs & metadata
"""

from __future__ import annotations

import csv
import io
import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional, List
import math
import zipfile

from django.conf import settings
from django.http import JsonResponse, HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths — derived from HAZARD_DATA_DIR (api/data)
# Datasets are grouped by purpose; each index has its own model_artifacts and outputs.
# ---------------------------------------------------------------------------

DATA_DIR: Path = getattr(settings, "HAZARD_DATA_DIR", Path(__file__).resolve().parent.parent / "data")

# Index-specific outputs (precomputed JSON served by API)
GREEN_INDEX_OUTPUTS: Path = DATA_DIR / "green_index" / "outputs"
HAZARD_INDEX_OUTPUTS: Path = DATA_DIR / "hazard_index" / "outputs"
CALAMITY_RISK_OUTPUTS: Path = DATA_DIR / "calamity_risk" / "outputs"

# Datasets by purpose (geography = barangay boundaries, hazards = earthquake/typhoon)
DATASETS_DIR: Path = DATA_DIR / "datasets"
GEOGRAPHY_DIR: Path = DATASETS_DIR / "geography"
HAZARDS_DIR: Path = DATASETS_DIR / "hazards"

# Index-specific model artifacts (for model_info endpoint)
GREEN_INDEX_ARTIFACTS: Path = DATA_DIR / "green_index" / "model_artifacts"
HAZARD_ARTIFACTS: Path = DATA_DIR / "hazard" / "model_artifacts"  # canonical location for hazard/green models
HAZARD_INDEX_ARTIFACTS: Path = DATA_DIR / "hazard_index" / "model_artifacts"
CALAMITY_RISK_ARTIFACTS: Path = DATA_DIR / "calamity_risk" / "model_artifacts"
# Workspace-level fallback artifacts (outside backend/api/data)
WORKSPACE_ARTIFACTS: Path = Path(r"C:\Users\arbut\geoappxd\Hazard\model_artifacts")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_json(path: Path) -> Dict[str, Any]:
    """Load and parse a JSON file, raising a clear error if missing."""
    if not path.exists():
        raise FileNotFoundError(f"Expected data file not found: {path}")
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _json_response_for_data(
    data_path: Path,
    year: Optional[str] = None,
    label: str = "data",
) -> JsonResponse:
    """
    Return a JsonResponse for a yearly-keyed JSON file.

    If ``year`` is given, returns only that year's slice wrapped in
    ``{"year": ..., "data": ...}``.  Otherwise returns the full dataset.
    """
    try:
        data = _load_json(data_path)
    except FileNotFoundError as exc:
        logger.error(str(exc))
        return JsonResponse(
            {"error": f"{label} file not found. Run the training/projection pipeline first."},
            status=404,
        )

    if year:
        if year not in data:
            available = sorted(data.keys())
            return JsonResponse(
                {"error": f"Year {year} not found. Available years: {available}"},
                status=404,
            )
        return JsonResponse({"year": year, "data": data[year]})

    return JsonResponse(data)


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def calamity_risk(request):
    """
    Returns calamity risk likelihood data (formula-based) for all
    barangays, keyed by year (2020–2030).

    Optional query param: ``?year=2025``
    """
    year = request.GET.get("year")
    return _json_response_for_data(
        CALAMITY_RISK_OUTPUTS / "calamity_risk_data.json",
        year=year,
        label="Calamity risk",
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def calamity_risk_forecast(request):
    """
    Returns LSTM-projected calamity risk likelihood data for all
    barangays, keyed by year (2020–2030).

    Optional query param: ``?year=2028``
    """
    year = request.GET.get("year")
    return _json_response_for_data(
        CALAMITY_RISK_OUTPUTS / "calamity_risk_forecast_data.json",
        year=year,
        label="Calamity risk forecast",
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def green_index(request):
    """
    Returns green index (NDVI-based) data for all barangays, keyed by
    year (2000–2030).

    Optional query param: ``?year=2020``
    """
    year = request.GET.get("year")
    return _json_response_for_data(
        GREEN_INDEX_OUTPUTS / "green_index_data.json",
        year=year,
        label="Green index",
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def hazard_index(request):
    """
    Returns hazard index data for all barangays, keyed by year
    (2020–2030).

    Optional query param: ``?year=2026``
    """
    year = request.GET.get("year")
    return _json_response_for_data(
        HAZARD_INDEX_OUTPUTS / "hazard_index_data.json",
        year=year,
        label="Hazard index",
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def barangay_geojson(request):
    """
    Returns the Cabuyao barangay boundary GeoJSON.
    """
    geojson_path = GEOGRAPHY_DIR / "cabuyao_barangays.geojson"
    try:
        data = _load_json(geojson_path)
    except FileNotFoundError as exc:
        logger.error(str(exc))
        return JsonResponse(
            {"error": "Barangay GeoJSON not found."},
            status=404,
        )
    return JsonResponse(data)


def _load_csv_as_json(csv_path: Path) -> List[Dict[str, Any]]:
    """Load a CSV file and return a list of row dicts (numeric values as float/int, dates kept as str)."""
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV not found: {csv_path}")
    rows: List[Dict[str, Any]] = []
    with csv_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            out: Dict[str, Any] = {}
            for k, v in row.items():
                if not k:
                    continue
                if k.lower() == "date" or k.lower().endswith("_place"):
                    out[k] = v
                    continue
                try:
                    if "." in str(v):
                        out[k] = float(v)
                    else:
                        out[k] = int(v)
                except (ValueError, TypeError):
                    out[k] = v
            rows.append(out)
    return rows

def _zip_response_from_files(
    *,
    zip_filename: str,
    files: List[tuple[Path, str]],
) -> HttpResponse:
    """
    Create an in-memory ZIP and return it as an HTTP attachment.

    `files`: list of (path_on_disk, arcname_in_zip).
    """
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for file_path, arcname in files:
            try:
                if not file_path.exists() or not file_path.is_file():
                    continue
                zf.write(file_path, arcname=arcname)
            except Exception as exc:
                logger.warning("Failed to add %s to zip: %s", file_path, exc)
                continue
    data = buf.getvalue()
    resp = HttpResponse(data, content_type="application/zip")
    resp["Content-Disposition"] = f'attachment; filename="{zip_filename}"'
    resp["Content-Length"] = str(len(data))
    return resp


def _collect_artifact_files(
    *,
    prefix: str,
    candidates: List[Path],
    filenames: List[str],
) -> List[tuple[Path, str]]:
    """
    Collect specific artifact filenames from candidate directories.
    First directory that contains a filename wins for that filename.
    """
    out: List[tuple[Path, str]] = []
    included: set[str] = set()
    for name in filenames:
        if name in included:
            continue
        for base in candidates:
            p = base / name
            if p.exists() and p.is_file():
                out.append((p, f"{prefix}/{name}"))
                included.add(name)
                break
    return out


def _collect_entire_dir(
    *,
    prefix: str,
    directory: Path,
) -> List[tuple[Path, str]]:
    """Zip every file inside a directory recursively."""
    if not directory.exists() or not directory.is_dir():
        return []
    out: List[tuple[Path, str]] = []
    for p in directory.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(directory).as_posix()
        out.append((p, f"{prefix}/{rel}"))
    return out


@api_view(["GET"])
@permission_classes([AllowAny])
def earthquake_freq(request):
    """
    Returns earthquake frequency data (date, max_magnitude, quake_count) for charts.
    Source: datasets/hazards/earthquake_freq.csv
    """
    path = HAZARDS_DIR / "earthquake_freq.csv"
    try:
        data = _load_csv_as_json(path)
    except FileNotFoundError as exc:
        logger.warning(str(exc))
        return JsonResponse({"error": "Earthquake data not found.", "data": []}, status=404)
    return JsonResponse({"data": data})


@api_view(["GET"])
@permission_classes([AllowAny])
def typhoon_freq(request):
    """
    Returns typhoon frequency data (date, typhoon_count, max_severity) for charts.
    Source: datasets/hazards/typhoon_freq.csv
    """
    path = HAZARDS_DIR / "typhoon_freq.csv"
    try:
        data = _load_csv_as_json(path)
    except FileNotFoundError as exc:
        logger.warning(str(exc))
        return JsonResponse({"error": "Typhoon data not found.", "data": []}, status=404)
    return JsonResponse({"data": data})


@api_view(["GET"])
@permission_classes([AllowAny])
def model_info(request):
    """
    Returns metadata about the trained models (configs, metrics,
    year splits, feature lists) so the frontend or collaborators
    can inspect model state without opening config files.
    """
    info: Dict[str, Any] = {}

    # Calamity risk model config (check workspace fallback)
    cr_config_path = CALAMITY_RISK_ARTIFACTS / "model_config.json"
    if not cr_config_path.exists() and WORKSPACE_ARTIFACTS.exists():
        cr_config_path = WORKSPACE_ARTIFACTS / "model_config.json"
    if cr_config_path.exists():
        info["calamity_risk"] = _load_json(cr_config_path)

    # Green index model config (green_index → hazard → workspace fallback)
    gi_config_path = GREEN_INDEX_ARTIFACTS / "gi_model_config.json"
    if not gi_config_path.exists():
        gi_config_path = HAZARD_ARTIFACTS / "gi_model_config.json"
    if not gi_config_path.exists() and WORKSPACE_ARTIFACTS.exists():
        gi_config_path = WORKSPACE_ARTIFACTS / "gi_model_config.json"
    if gi_config_path.exists():
        info["green_index"] = _load_json(gi_config_path)

    # Report which artifact files are present (per index)
    info["artifacts_status"] = {
        "calamity_risk": {
            name: ((CALAMITY_RISK_ARTIFACTS / name).exists() or (WORKSPACE_ARTIFACTS / name).exists())
            for name in ("model_config.json", "lstm_calamity_model.keras", "feature_scaler.joblib", "target_scaler.joblib")
        },
        "green_index": {
            name: (
                (GREEN_INDEX_ARTIFACTS / name).exists()
                or (HAZARD_ARTIFACTS / name).exists()
                or (WORKSPACE_ARTIFACTS / name).exists()
            )
            for name in ("gi_model_config.json", "lstm_green_index.keras", "gi_feature_scaler.joblib", "gi_target_scaler.joblib", "rf_green_index.joblib", "gb_green_index.joblib")
        },
        "hazard_index": {
            name: ((HAZARD_INDEX_ARTIFACTS / name).exists() or (WORKSPACE_ARTIFACTS / name).exists())
            for name in ("lstm_hazard_index.keras", "hi_feature_scaler.joblib", "hi_target_scaler.joblib")
        },
    }

    # Report which output files are present (per index)
    info["outputs_status"] = {
        "calamity_risk": {
            "calamity_risk_data.json": (CALAMITY_RISK_OUTPUTS / "calamity_risk_data.json").exists(),
            "calamity_risk_forecast_data.json": (CALAMITY_RISK_OUTPUTS / "calamity_risk_forecast_data.json").exists(),
        },
        "green_index": {
            "green_index_data.json": (GREEN_INDEX_OUTPUTS / "green_index_data.json").exists(),
        },
        "hazard_index": {
            "hazard_index_data.json": (HAZARD_INDEX_OUTPUTS / "hazard_index_data.json").exists(),
        },
    }

    return JsonResponse(info)


# ---------------------------------------------------------------------------
# Model artifact downloads (ZIP)
# ---------------------------------------------------------------------------

GREEN_ARTIFACT_FILES = [
    "gi_model_config.json",
    "lstm_green_index.keras",
    "gi_feature_scaler.joblib",
    "gi_target_scaler.joblib",
    "rf_green_index.joblib",
    "gb_green_index.joblib",
]

HAZARD_ARTIFACT_FILES = [
    "model_config.json",
    "training_history.json",
    "residuals.json",
    "lstm_hazard_index.keras",
    "hi_feature_scaler.joblib",
    "hi_target_scaler.joblib",
]

CALAMITY_ARTIFACT_FILES = [
    "model_config.json",
    "lstm_calamity_model.keras",
    "feature_scaler.joblib",
    "target_scaler.joblib",
]


@api_view(["GET"])
@permission_classes([AllowAny])
def green_artifacts_zip(request):
    """
    Download Green Index model artifacts as a ZIP.
    """
    # Prefer a dedicated green_index/model_artifacts folder when present,
    # otherwise pull known filenames from the canonical hazard/workspace folders.
    files = _collect_entire_dir(prefix="green_index", directory=GREEN_INDEX_ARTIFACTS)
    if not files:
        files = _collect_artifact_files(
            prefix="green_index",
            candidates=[GREEN_INDEX_ARTIFACTS, HAZARD_ARTIFACTS, WORKSPACE_ARTIFACTS],
            filenames=GREEN_ARTIFACT_FILES,
        )
    if not files:
        return JsonResponse({"error": "Green Index artifacts not found."}, status=404)
    return _zip_response_from_files(zip_filename="green_index_model_artifacts.zip", files=files)


@api_view(["GET"])
@permission_classes([AllowAny])
def hazard_artifacts_zip(request):
    """
    Download Hazard Index model artifacts as a ZIP.
    """
    files = _collect_entire_dir(prefix="hazard_index", directory=HAZARD_INDEX_ARTIFACTS)
    if not files:
        files = _collect_artifact_files(
            prefix="hazard_index",
            candidates=[HAZARD_INDEX_ARTIFACTS, HAZARD_ARTIFACTS, WORKSPACE_ARTIFACTS],
            filenames=HAZARD_ARTIFACT_FILES,
        )
    if not files:
        return JsonResponse({"error": "Hazard Index artifacts not found."}, status=404)
    return _zip_response_from_files(zip_filename="hazard_index_model_artifacts.zip", files=files)


@api_view(["GET"])
@permission_classes([AllowAny])
def calamity_risk_artifacts_zip(request):
    """
    Download Calamity Risk model artifacts as a ZIP.
    """
    files = _collect_entire_dir(prefix="calamity_risk", directory=CALAMITY_RISK_ARTIFACTS)
    if not files:
        files = _collect_artifact_files(
            prefix="calamity_risk",
            candidates=[CALAMITY_RISK_ARTIFACTS, WORKSPACE_ARTIFACTS],
            filenames=CALAMITY_ARTIFACT_FILES,
        )
    if not files:
        return JsonResponse({"error": "Calamity Risk artifacts not found."}, status=404)
    return _zip_response_from_files(zip_filename="calamity_risk_model_artifacts.zip", files=files)


@api_view(["GET"])
@permission_classes([AllowAny])
def lstm_bundle_zip(request):
    """
    Download a combined ZIP of all LSTM-related artifacts (green, hazard, calamity).
    """
    files: List[tuple[Path, str]] = []
    files += _collect_artifact_files(
        prefix="green_index",
        candidates=[GREEN_INDEX_ARTIFACTS, HAZARD_ARTIFACTS, WORKSPACE_ARTIFACTS],
        filenames=[f for f in GREEN_ARTIFACT_FILES if f.startswith("lstm_") or f.endswith(".joblib") or f.endswith(".json")],
    )
    files += _collect_artifact_files(
        prefix="hazard_index",
        candidates=[HAZARD_INDEX_ARTIFACTS, HAZARD_ARTIFACTS, WORKSPACE_ARTIFACTS],
        filenames=[f for f in HAZARD_ARTIFACT_FILES if f.startswith("lstm_") or f.endswith(".joblib") or f.endswith(".json")],
    )
    files += _collect_artifact_files(
        prefix="calamity_risk",
        candidates=[CALAMITY_RISK_ARTIFACTS, WORKSPACE_ARTIFACTS],
        filenames=[f for f in CALAMITY_ARTIFACT_FILES if f.startswith("lstm_") or f.endswith(".joblib") or f.endswith(".json")],
    )

    # de-dup by arcname
    seen: set[str] = set()
    deduped: List[tuple[Path, str]] = []
    for p, arc in files:
        if arc in seen:
            continue
        seen.add(arc)
        deduped.append((p, arc))

    if not deduped:
        return JsonResponse({"error": "LSTM artifact bundle not found."}, status=404)
    return _zip_response_from_files(zip_filename="lstm_model_artifacts_bundle.zip", files=deduped)


@api_view(["GET"])
@permission_classes([AllowAny])
def eda_summary(request):
    """
    Returns a compact EDA summary suitable for the frontend modal.

    Response JSON shape:
    {
      "statisticalSummaryItems": [{label, value, change}],
      "keyFindings": [{label, description, type}],
      "modelHealthItems": [{label, value, status}]
    }
    """
    try:
        # pick latest year for hazard index
        hazard_data = _load_json(HAZARD_INDEX_OUTPUTS / "hazard_index_data.json")
        latest_h_year = max(hazard_data.keys(), key=lambda k: int(k))
        hazard_vals = [v.get("hazard_index") for v in hazard_data[latest_h_year].values()]

        green_data = _load_json(GREEN_INDEX_OUTPUTS / "green_index_data.json")
        # prefer same year if present, else latest available
        green_year = latest_h_year if latest_h_year in green_data else max(green_data.keys(), key=lambda k: int(k))
        green_vals = [v.get("green_index") for v in green_data[green_year].values()]

        # basic stats helpers
        def mean(arr: List[float]) -> float:
            return sum(arr) / len(arr) if arr else 0.0

        def std(arr: List[float]) -> float:
            if not arr: return 0.0
            m = mean(arr)
            return math.sqrt(sum((x - m) ** 2 for x in arr) / len(arr))

        def median(arr: List[float]) -> float:
            s = sorted(arr)
            n = len(s)
            if n == 0: return 0.0
            if n % 2 == 1:
                return s[n // 2]
            return 0.5 * (s[n // 2 - 1] + s[n // 2])

        def skewness(arr: List[float]) -> float:
            if not arr: return 0.0
            m = mean(arr)
            s = std(arr)
            if s == 0: return 0.0
            return sum((x - m) ** 3 for x in arr) / len(arr) / (s ** 3)

        def kurtosis(arr: List[float]) -> float:
            if not arr: return 0.0
            m = mean(arr)
            s = std(arr)
            if s == 0: return 0.0
            return sum((x - m) ** 4 for x in arr) / len(arr) / (s ** 4) - 3.0

        # compute values for latest year
        mean_hi = mean(hazard_vals)
        std_hi = std(hazard_vals)
        median_gi = median(green_vals)
        skew_hi = skewness(hazard_vals)
        kurt_gi = kurtosis(green_vals)

        # compute previous-year comparisons when available
        prev_year = str(int(latest_h_year) - 1)
        prev_hazard_vals = []
        prev_green_vals = []
        if prev_year in hazard_data:
            prev_hazard_vals = [v.get("hazard_index") for v in hazard_data[prev_year].values()]
        if prev_year in green_data:
            prev_green_vals = [v.get("green_index") for v in green_data[prev_year].values()]

        def pct_change(curr: float, prev: float) -> Optional[float]:
            try:
                if prev == 0 or prev is None:
                    return None
                return round(((curr - prev) / abs(prev)) * 100, 1)
            except Exception:
                return None

        # correlation between population (latest) and hazard index
        pop_path = DATASETS_DIR / "population" / "population_barangay.csv"
        pop_vals = []
        pop_map: Dict[str, float] = {}
        try:
            # load last row of population CSV and map barangays present in hazard_vals
            if pop_path.exists():
                with pop_path.open("r", encoding="utf-8") as fh:
                    header = fh.readline().strip().split(",")
                    lines = fh.readlines()
                    if lines:
                        last = lines[-1].strip().split(",")
                        # header includes Date and many barangay columns; try to align keys
                        pop_map = {header[i]: float(last[i]) for i in range(1, min(len(header), len(last)))}
                        # assemble population list matching hazard barangays order
                        for b in hazard_data[latest_h_year].keys():
                            pop_vals.append(float(pop_map.get(b, 0)))
        except Exception:
            pop_vals = []
            pop_map = {}

        def pearson(x: List[float], y: List[float]) -> float:
            if not x or not y or len(x) != len(y):
                return 0.0
            mx, my = mean(x), mean(y)
            sx, sy = std(x), std(y)
            if sx == 0 or sy == 0: return 0.0
            return sum((a - mx) * (b - my) for a, b in zip(x, y)) / (len(x) * sx * sy)

        # Build point series for visualization and compute correlation on valid numeric pairs only
        pop_hazard_points: List[Dict[str, Any]] = []
        try:
            for b, info in hazard_data.get(latest_h_year, {}).items():
                h = info.get("hazard_index")
                p = pop_map.get(b)
                if p is None or h is None:
                    continue
                try:
                    pop_hazard_points.append({"barangay": b, "population": float(p), "hazard_index": float(h)})
                except Exception:
                    continue
        except Exception:
            pop_hazard_points = []

        if pop_hazard_points:
            corr_pop_hazard = pearson(
                [pt["population"] for pt in pop_hazard_points],
                [pt["hazard_index"] for pt in pop_hazard_points],
            )
        else:
            corr_pop_hazard = 0.0

        # attach percent-change vs previous year when available
        statisticalSummaryItems = [
            {"label": "Mean Hazard Index", "value": round(mean_hi, 2), "change": pct_change(mean_hi, mean(prev_hazard_vals) if prev_hazard_vals else None)},
            {"label": "Std Deviation", "value": round(std_hi, 2), "change": pct_change(std_hi, std(prev_hazard_vals) if prev_hazard_vals else None)},
            {"label": "Median Green Index", "value": round(median_gi, 2), "change": pct_change(median_gi, median(prev_green_vals) if prev_green_vals else None)},
            {"label": "Skewness (Hazard)", "value": round(skew_hi, 2), "change": pct_change(skew_hi, skewness(prev_hazard_vals) if prev_hazard_vals else None)},
            {"label": "Kurtosis (Green)", "value": round(kurt_gi, 2), "change": pct_change(kurt_gi, kurtosis(prev_green_vals) if prev_green_vals else None)},
        ]

        # Outlier count (IQR rule on hazard_index for latest year)
        def iqr_outlier_count(vals: List[float]) -> int:
            if not vals or len(vals) < 4:
                return 0
            s = sorted(vals)
            n = len(s)
            q1 = s[n // 4] if n >= 4 else s[0]
            q3 = s[(3 * n) // 4] if n >= 4 else s[-1]
            iqr = q3 - q1
            if iqr <= 0:
                return 0
            lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
            return sum(1 for v in vals if v < lo or v > hi)

        n_outliers_h = iqr_outlier_count(hazard_vals)
        n_outliers_g = iqr_outlier_count(green_vals) if green_vals else 0
        n_barangays = len(hazard_vals) if hazard_vals else 0

        # Key findings with short researcher-oriented insights (based on EDA statistics in this section)
        keyFindings = [
            {
                "label": "Population–Hazard correlation",
                "description": f"r = {round(corr_pop_hazard, 2)} (Population vs Hazard, year {latest_h_year})",
                "insight": "Weak positive correlation: population is one driver of hazard; other factors (e.g. geography, exposure) also matter. Use scatter in this section to inspect barangay-level relationship.",
                "type": "correlation",
            },
            {
                "label": "Mean Hazard Index",
                "description": f"{round(mean_hi, 2)} (latest year)",
                "insight": "Central tendency of hazard across barangays. Use with Std Dev and distribution charts to assess spread and suitability for LSTM inputs.",
                "type": "positive",
            },
            {
                "label": "Spread & shape",
                "description": f"Std Dev = {round(std_hi, 2)}, Skewness (Hazard) = {round(skew_hi, 2)}, Kurtosis (Green) = {round(kurt_gi, 2)}",
                "insight": "Std and skew/kurtosis describe variability and distribution shape. Near-symmetric (skew ≈ 0) and moderate spread support stable LSTM training.",
                "type": "positive",
            },
            {
                "label": "Outliers (IQR rule)",
                "description": f"Hazard: {n_outliers_h} of {n_barangays} barangays; Green: {n_outliers_g} of {n_barangays}",
                "insight": "Outliers can distort training. Use the Hazard vs Green scatter in this section to identify which barangays are flagged and decide whether to exclude or treat them.",
                "type": "warning" if (n_outliers_h > 0 or n_outliers_g > 0) else "positive",
            },
        ]

        # Data quality for EDA: based on data actually used in this section
        has_hazard = bool(hazard_data and latest_h_year in hazard_data)
        has_green = bool(green_data and green_year in green_data)
        has_pop = bool(pop_hazard_points)
        n_pts = len(pop_hazard_points)
        if has_hazard and has_green and has_pop and n_pts >= 3:
            data_quality_status = "good"
            data_quality_message = f"Good — Hazard, Green, and Population data available for {n_pts} barangays (year {latest_h_year}). Suitable for interpreting EDA."
        elif has_hazard and has_green:
            data_quality_status = "good"
            data_quality_message = "Partial — Hazard and Green data available; population missing or incomplete. EDA interpretable but correlation uses fewer points."
        elif has_hazard:
            data_quality_status = "warning"
            data_quality_message = "Partial — Only Hazard index data available. Add Green Index and population for full EDA."
        else:
            data_quality_status = "warning"
            data_quality_message = "Incomplete — Missing hazard index data. Run pipeline to generate outputs for EDA."

        # Model health: use EDA data quality for "Data Quality" row; then LSTM metrics
        model_health = [
            {"label": "Data Quality", "value": data_quality_message, "status": data_quality_status},
        ]
        try:
            gi_cfg_path = GREEN_INDEX_ARTIFACTS / "gi_model_config.json"
            if not gi_cfg_path.exists():
                gi_cfg_path = HAZARD_ARTIFACTS / "gi_model_config.json"
            if not gi_cfg_path.exists() and WORKSPACE_ARTIFACTS.exists():
                gi_cfg_path = WORKSPACE_ARTIFACTS / "gi_model_config.json"
            if gi_cfg_path.exists():
                gi_cfg = _load_json(gi_cfg_path)
                metrics = gi_cfg.get("metrics", {})
                lstm_metrics = metrics.get("LSTM") or {}
                if lstm_metrics:
                    mae = lstm_metrics.get("mae")
                    if mae is not None:
                        model_health.append({"label": "MAE", "value": f"{mae:.4f}" if isinstance(mae, (int, float)) else str(mae), "status": "good"})
                    rmse = lstm_metrics.get("rmse")
                    if rmse is not None:
                        model_health.append({"label": "RMSE", "value": f"{rmse:.4f}" if isinstance(rmse, (int, float)) else str(rmse), "status": "good"})
                    r2 = lstm_metrics.get("r2")
                    if r2 is not None:
                        model_health.append({"label": "R²", "value": f"{r2:.4f}" if isinstance(r2, (int, float)) else str(r2), "status": "good"})
                    nmae = lstm_metrics.get("nmae")
                    if nmae is not None:
                        model_health.append({"label": "NMAE", "value": f"{nmae:.4f}" if isinstance(nmae, (int, float)) else str(nmae), "status": "good"})
        except Exception:
            pass

        # Metric reference for LSTM forecasting (researcher-facing); fill current values from model_health
        metricReference = [
            {"metric": "MAE", "value": next((m["value"] for m in model_health if m.get("label") == "MAE"), None), "description": "Mean Absolute Error: average |actual − predicted|.", "reference": "Lower is better; same units as target. Compare across models or benchmarks."},
            {"metric": "RMSE", "value": next((m["value"] for m in model_health if m.get("label") == "RMSE"), None), "description": "Root Mean Squared Error: penalizes large errors more than MAE.", "reference": "Lower is better. Use with MAE and R² to assess LSTM forecast accuracy."},
            {"metric": "R²", "value": next((m["value"] for m in model_health if m.get("label") == "R²"), None), "description": "R-squared: fraction of variance in target explained by the model (0–1).", "reference": "Higher is better. >0.3–0.5 often acceptable for time-series; interpret with domain context."},
            {"metric": "NMAE", "value": next((m["value"] for m in model_health if m.get("label") == "NMAE"), None), "description": "Normalized MAE: MAE / mean(actual), scale-independent.", "reference": "Lower is better. Useful to compare across different scales or barangays."},
        ]

        # Time-series summary for last N years (means per year)
        try:
            all_h_years = sorted([int(y) for y in hazard_data.keys()])
            # choose last 6 years or available
            N = 6
            selected_years = [str(y) for y in all_h_years[-N:]]
            ts_years = []
            ts_mean_hazard = []
            ts_mean_green = []
            for y in selected_years:
                vals_h = [v.get("hazard_index") for v in hazard_data.get(y, {}).values()]
                vals_g = [v.get("green_index") for v in green_data.get(y, {}).values()]
                ts_years.append(y)
                ts_mean_hazard.append(round(mean(vals_h), 2) if vals_h else None)
                ts_mean_green.append(round(mean(vals_g), 2) if vals_g else None)
        except Exception:
            ts_years = []
            ts_mean_hazard = []
            ts_mean_green = []

        # Per-barangay summary for the latest year
        per_barangay = {}
        try:
            for b, info in hazard_data[latest_h_year].items():
                curr_h = info.get("hazard_index")
                prev_h = None
                if prev_year in hazard_data:
                    prev_h = hazard_data[prev_year].get(b, {}).get("hazard_index")
                curr_g = None
                if green_year in green_data:
                    curr_g = green_data[green_year].get(b, {}).get("green_index")
                per_barangay[b] = {
                    "hazard_index": curr_h,
                    "hazard_change_pct": pct_change(curr_h, prev_h) if prev_h is not None else None,
                    "green_index": curr_g,
                }
        except Exception:
            per_barangay = {}

        # Optional: training history (loss / val_loss per epoch) for LSTM training curve
        training_history: Optional[Dict[str, Any]] = None
        for artifacts_dir in (GREEN_INDEX_ARTIFACTS, HAZARD_ARTIFACTS, WORKSPACE_ARTIFACTS):
            path = artifacts_dir / "training_history.json"
            if path.exists():
                try:
                    raw = _load_json(path)
                    if isinstance(raw.get("loss"), list) and isinstance(raw.get("val_loss"), list):
                        training_history = {"loss": raw["loss"], "val_loss": raw["val_loss"]}
                except Exception:
                    pass
                break
        if training_history is None:
            try:
                _path = GREEN_INDEX_ARTIFACTS / "gi_model_config.json"
                if not _path.exists():
                    _path = HAZARD_ARTIFACTS / "gi_model_config.json"
                if not _path.exists() and WORKSPACE_ARTIFACTS.exists():
                    _path = WORKSPACE_ARTIFACTS / "gi_model_config.json"
                if _path.exists():
                    _cfg = _load_json(_path)
                    _th = _cfg.get("training_history")
                    if isinstance(_th, dict) and isinstance(_th.get("loss"), list) and isinstance(_th.get("val_loss"), list):
                        training_history = _th
            except Exception:
                pass

        # Optional: residuals (actual vs predicted) for residual plot
        residuals_data: Optional[Dict[str, Any]] = None
        for artifacts_dir in (GREEN_INDEX_ARTIFACTS, HAZARD_ARTIFACTS, WORKSPACE_ARTIFACTS):
            path = artifacts_dir / "residuals.json"
            if path.exists():
                try:
                    raw = _load_json(path)
                    if isinstance(raw.get("actual"), list) and isinstance(raw.get("predicted"), list):
                        residuals_data = {"actual": raw["actual"], "predicted": raw["predicted"]}
                except Exception:
                    pass
                break
        if residuals_data is None:
            try:
                _path = GREEN_INDEX_ARTIFACTS / "gi_model_config.json"
                if not _path.exists():
                    _path = HAZARD_ARTIFACTS / "gi_model_config.json"
                if not _path.exists() and WORKSPACE_ARTIFACTS.exists():
                    _path = WORKSPACE_ARTIFACTS / "gi_model_config.json"
                if _path.exists():
                    _cfg = _load_json(_path)
                    _res = _cfg.get("residuals")
                    if isinstance(_res, dict) and isinstance(_res.get("actual"), list) and isinstance(_res.get("predicted"), list):
                        residuals_data = _res
            except Exception:
                pass

        # Distribution plots: histogram bins for hazard and green indices
        def create_histogram_bins(vals: List[float], bins: int = 15) -> Dict[str, Any]:
            """Create histogram bins for distribution visualization."""
            if not vals:
                return {"bins": [], "counts": []}
            min_val = min(vals)
            max_val = max(vals)
            if min_val == max_val:
                return {"bins": [min_val], "counts": [len(vals)]}
            bin_width = (max_val - min_val) / bins
            bin_edges = [min_val + i * bin_width for i in range(bins + 1)]
            bin_counts = [0] * bins
            for v in vals:
                if v == max_val:
                    bin_counts[-1] += 1
                else:
                    idx = int((v - min_val) / bin_width)
                    if 0 <= idx < bins:
                        bin_counts[idx] += 1
            bin_centers = [(bin_edges[i] + bin_edges[i + 1]) / 2 for i in range(bins)]
            return {"bins": [round(b, 2) for b in bin_centers], "counts": bin_counts}

        distribution_data = {
            "hazard": create_histogram_bins(hazard_vals),
            "green": create_histogram_bins(green_vals) if green_vals else {"bins": [], "counts": []},
        }

        # Model comparison: extract all model metrics from gi_model_config.json
        model_comparison: Optional[Dict[str, Any]] = None
        try:
            gi_cfg_path = GREEN_INDEX_ARTIFACTS / "gi_model_config.json"
            if not gi_cfg_path.exists():
                gi_cfg_path = HAZARD_ARTIFACTS / "gi_model_config.json"
            if not gi_cfg_path.exists() and WORKSPACE_ARTIFACTS.exists():
                gi_cfg_path = WORKSPACE_ARTIFACTS / "gi_model_config.json"
            if gi_cfg_path.exists():
                gi_cfg = _load_json(gi_cfg_path)
                metrics = gi_cfg.get("metrics", {})
                if metrics:
                    # Ensure specific order: Random Forest (green), Gradient Boosting (blue), LSTM (orange)
                    model_order = ["Random Forest", "Gradient Boosting", "LSTM"]
                    model_comparison = {
                        "models": [],
                        "mae": [],
                        "rmse": [],
                        "r2": [],
                        "nmae": [],
                    }
                    for model_name in model_order:
                        model_metrics = metrics.get(model_name)
                        if model_metrics and isinstance(model_metrics, dict):
                            model_comparison["models"].append(model_name)
                            model_comparison["mae"].append(round(model_metrics.get("mae", 0), 4) if model_metrics.get("mae") is not None else None)
                            model_comparison["rmse"].append(round(model_metrics.get("rmse", 0), 4) if model_metrics.get("rmse") is not None else None)
                            model_comparison["r2"].append(round(model_metrics.get("r2", 0), 4) if model_metrics.get("r2") is not None else None)
                            model_comparison["nmae"].append(round(model_metrics.get("nmae", 0), 4) if model_metrics.get("nmae") is not None else None)
        except Exception:
            model_comparison = None

        # Enhanced data quality metrics
        def calculate_data_quality_metrics() -> Dict[str, Any]:
            """Calculate comprehensive data quality metrics."""
            quality_metrics = {}
            
            # Completeness: percentage of non-null values
            total_barangays = len(hazard_data.get(latest_h_year, {}))
            hazard_complete = sum(1 for v in hazard_vals if v is not None)
            green_complete = sum(1 for v in green_vals if v is not None) if green_vals else 0
            pop_complete = len(pop_hazard_points)
            
            quality_metrics["completeness"] = {
                "hazard": round((hazard_complete / total_barangays * 100) if total_barangays > 0 else 0, 1),
                "green": round((green_complete / total_barangays * 100) if total_barangays > 0 else 0, 1),
                "population": round((pop_complete / total_barangays * 100) if total_barangays > 0 else 0, 1),
                "overall": round(((hazard_complete + green_complete + pop_complete) / (total_barangays * 3) * 100) if total_barangays > 0 else 0, 1),
            }
            
            # Data consistency: check for outliers and extreme values
            def consistency_score(vals: List[float]) -> float:
                if not vals or len(vals) < 3:
                    return 0.0
                m = mean(vals)
                s = std(vals)
                if s == 0:
                    return 100.0
                # Count values within 2 standard deviations
                within_2sd = sum(1 for v in vals if abs(v - m) <= 2 * s)
                return round((within_2sd / len(vals)) * 100, 1)
            
            quality_metrics["consistency"] = {
                "hazard": consistency_score(hazard_vals),
                "green": consistency_score(green_vals) if green_vals else 0.0,
            }
            
            # Missing data percentage
            quality_metrics["missing_data_pct"] = {
                "hazard": round(100 - quality_metrics["completeness"]["hazard"], 1),
                "green": round(100 - quality_metrics["completeness"]["green"], 1),
                "population": round(100 - quality_metrics["completeness"]["population"], 1),
            }
            
            # Data range validation
            quality_metrics["data_range"] = {
                "hazard": {
                    "min": round(min(hazard_vals), 2) if hazard_vals else None,
                    "max": round(max(hazard_vals), 2) if hazard_vals else None,
                    "expected_range": [0, 100],
                    "valid": all(0 <= v <= 100 for v in hazard_vals) if hazard_vals else False,
                },
                "green": {
                    "min": round(min(green_vals), 2) if green_vals else None,
                    "max": round(max(green_vals), 2) if green_vals else None,
                    "expected_range": [0, 100],
                    "valid": all(0 <= v <= 100 for v in green_vals) if green_vals else False,
                },
            }
            
            return quality_metrics

        enhanced_data_quality = calculate_data_quality_metrics()

        resp = {
            "statisticalSummaryItems": statisticalSummaryItems,
            "keyFindings": keyFindings,
            "dataQuality": {"status": data_quality_status, "message": data_quality_message},
            "metricReference": metricReference,
            "populationCorrelation": {
                "corr": round(corr_pop_hazard, 2),
                "points": pop_hazard_points,
                "year": latest_h_year,
            },
            "modelHealthItems": model_health,
            "timeSeries": {
                "years": ts_years,
                "mean_hazard": ts_mean_hazard,
                "mean_green": ts_mean_green,
            },
            "perBarangaySummary": per_barangay,
            "trainingHistory": training_history,
            "residuals": residuals_data,
            "distribution": distribution_data,
            "modelComparison": model_comparison,
            "enhancedDataQuality": enhanced_data_quality,
            "availableDatasets": {
                "earthquake": str(HAZARDS_DIR / "earthquake_freq.csv"),
                "typhoon": str(HAZARDS_DIR / "typhoon_freq.csv"),
                "population": str(DATASETS_DIR / "population" / "population_barangay.csv"),
            },
        }

        return JsonResponse(resp)

    except FileNotFoundError as exc:
        logger.error(str(exc))
        return JsonResponse({"error": str(exc)}, status=404)
    except Exception as exc:
        logger.exception("EDA summary generation failed")
        return JsonResponse({"error": "Failed to generate EDA summary."}, status=500)
