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

import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

from django.conf import settings
from django.http import JsonResponse
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

# Datasets by purpose (geography = barangay boundaries)
DATASETS_DIR: Path = DATA_DIR / "datasets"
GEOGRAPHY_DIR: Path = DATASETS_DIR / "geography"

# Index-specific model artifacts (for model_info endpoint)
GREEN_INDEX_ARTIFACTS: Path = DATA_DIR / "green_index" / "model_artifacts"
HAZARD_INDEX_ARTIFACTS: Path = DATA_DIR / "hazard_index" / "model_artifacts"
CALAMITY_RISK_ARTIFACTS: Path = DATA_DIR / "calamity_risk" / "model_artifacts"


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


@api_view(["GET"])
@permission_classes([AllowAny])
def model_info(request):
    """
    Returns metadata about the trained models (configs, metrics,
    year splits, feature lists) so the frontend or collaborators
    can inspect model state without opening config files.
    """
    info: Dict[str, Any] = {}

    # Calamity risk model config
    cr_config_path = CALAMITY_RISK_ARTIFACTS / "model_config.json"
    if cr_config_path.exists():
        info["calamity_risk"] = _load_json(cr_config_path)

    # Green index model config
    gi_config_path = GREEN_INDEX_ARTIFACTS / "gi_model_config.json"
    if gi_config_path.exists():
        info["green_index"] = _load_json(gi_config_path)

    # Report which artifact files are present (per index)
    info["artifacts_status"] = {
        "calamity_risk": {
            name: (CALAMITY_RISK_ARTIFACTS / name).exists()
            for name in ("model_config.json", "lstm_calamity_model.keras", "feature_scaler.joblib", "target_scaler.joblib")
        },
        "green_index": {
            name: (GREEN_INDEX_ARTIFACTS / name).exists()
            for name in ("gi_model_config.json", "lstm_green_index.keras", "gi_feature_scaler.joblib", "gi_target_scaler.joblib", "rf_green_index.joblib", "gb_green_index.joblib")
        },
        "hazard_index": {
            name: (HAZARD_INDEX_ARTIFACTS / name).exists()
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
