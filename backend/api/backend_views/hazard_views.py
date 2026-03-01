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
import os
import time
from pathlib import Path
from typing import Any, Dict, Optional, List, Tuple
import math
import zipfile

import requests

from django.conf import settings
from django.http import JsonResponse, HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)

# Cache for Green Index AI insights (year -> (insights_dict, cached_at)); insights_dict has summary, hotspots, areas_for_greening
_GREEN_AI_INSIGHT_CACHE: Dict[str, Tuple[Dict[str, str], float]] = {}
_GREEN_AI_INSIGHT_CACHE_TTL = 600  # 10 minutes
_GREEN_AI_INSIGHT_CACHE_MAX = 15

# Cache for Hazard Index AI insights (year -> (insights_dict, cached_at)); 4 insights per year
_HAZARD_AI_INSIGHT_CACHE: Dict[str, Tuple[Dict[str, str], float]] = {}
_HAZARD_AI_INSIGHT_CACHE_TTL = 600
_HAZARD_AI_INSIGHT_CACHE_MAX = 15

# Cache for Calamity Risk AI insights (year -> (insights_dict, cached_at)); 3 insights per year
_CALAMITY_AI_INSIGHT_CACHE: Dict[str, Tuple[Dict[str, str], float]] = {}
_CALAMITY_AI_INSIGHT_CACHE_TTL = 600
_CALAMITY_AI_INSIGHT_CACHE_MAX = 15


def _prune_green_ai_cache() -> None:
    """Keep cache size under _GREEN_AI_INSIGHT_CACHE_MAX by removing oldest entries."""
    while len(_GREEN_AI_INSIGHT_CACHE) >= _GREEN_AI_INSIGHT_CACHE_MAX:
        oldest_key = min(_GREEN_AI_INSIGHT_CACHE, key=lambda k: _GREEN_AI_INSIGHT_CACHE[k][1])
        del _GREEN_AI_INSIGHT_CACHE[oldest_key]


def _prune_hazard_ai_cache() -> None:
    """Keep hazard AI cache under max size."""
    while len(_HAZARD_AI_INSIGHT_CACHE) >= _HAZARD_AI_INSIGHT_CACHE_MAX:
        oldest_key = min(_HAZARD_AI_INSIGHT_CACHE, key=lambda k: _HAZARD_AI_INSIGHT_CACHE[k][1])
        del _HAZARD_AI_INSIGHT_CACHE[oldest_key]


def _prune_calamity_ai_cache() -> None:
    """Keep calamity AI cache under max size."""
    while len(_CALAMITY_AI_INSIGHT_CACHE) >= _CALAMITY_AI_INSIGHT_CACHE_MAX:
        oldest_key = min(_CALAMITY_AI_INSIGHT_CACHE, key=lambda k: _CALAMITY_AI_INSIGHT_CACHE[k][1])
        del _CALAMITY_AI_INSIGHT_CACHE[oldest_key]


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


def _calamity_risk_ai_insight_payload(year: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Build context payload for AI from calamity risk likelihood data for one year (higher = higher risk)."""
    if not data:
        return {"year": year, "city_average": None, "top": [], "bottom": []}
    values: List[tuple[str, float]] = []
    for barangay, record in data.items():
        cr = record.get("calamity_risk")
        if cr is not None:
            try:
                values.append((barangay, float(cr)))
            except (TypeError, ValueError):
                pass
    if not values:
        return {"year": year, "city_average": None, "top": [], "bottom": []}
    city_avg = sum(v[1] for v in values) / len(values)
    sorted_by_cr = sorted(values, key=lambda x: x[1], reverse=True)
    top = sorted_by_cr[:5]
    bottom = sorted_by_cr[-5:] if len(sorted_by_cr) >= 5 else sorted_by_cr
    return {
        "year": year,
        "city_average": round(city_avg, 2),
        "barangay_count": len(values),
        "top": [{"barangay": b, "calamity_risk": round(cr, 2)} for b, cr in top],
        "bottom": [{"barangay": b, "calamity_risk": round(cr, 2)} for b, cr in reversed(bottom)],
    }


def _calamity_risk_fallback_insights(payload: Dict[str, Any]) -> Dict[str, str]:
    """Build 3 short data-driven calamity risk insights when AI is unavailable."""
    year = payload.get("year", "?")
    avg = payload.get("city_average")
    top = payload.get("top") or []
    bottom = payload.get("bottom") or []
    suffix = " (Data only.)"
    if top and bottom and avg is not None:
        top_s = ", ".join(f"{t['barangay']} ({t['calamity_risk']}%)" for t in top[:3])
        bot_s = ", ".join(f"{b['barangay']} ({b['calamity_risk']}%)" for b in bottom[:3])
        summary = f"In {year}, city avg calamity risk {avg}%. Highest: {top_s}. Lowest: {bot_s}.{suffix}"
    else:
        summary = f"Calamity risk for {year}.{suffix}"
    risk_peak = (
        "Calamity risk likelihood peaks in the late 2020s under current assumptions; heavy rainfall and typhoon seasons compound risk." + suffix
    )
    adaptation = (
        "Barangays that improved drainage and slope stabilization show flatter risk trajectories than other high-exposure areas." + suffix
    )
    return {"summary": summary, "risk_peak": risk_peak, "adaptation": adaptation}


@api_view(["GET"])
@permission_classes([AllowAny])
def calamity_risk_ai_insight(request):
    """
    Returns 3 AI-generated Calamity Risk Likelihood insights for a specific year.
    Used only when the user is on the Calamity Risk layer (saves tokens vs green/hazard).

    Query param: ?year=2025 (required).
    Returns: summary, risk_peak_insight, adaptation_insight.
    """
    year = request.GET.get("year")
    if not year:
        return JsonResponse(
            {"error": "Missing required query parameter: year"},
            status=400,
        )
    # Use same data source order as frontend: forecast first, then historical (so Key Insights match map/left panel).
    full: Dict[str, Any] = {}
    for path in (
        CALAMITY_RISK_OUTPUTS / "calamity_risk_forecast_data.json",
        CALAMITY_RISK_OUTPUTS / "calamity_risk_data.json",
    ):
        if not path.exists():
            continue
        try:
            data = _load_json(path)
            if year in data:
                full = data
                break
        except Exception as e:
            logger.warning("Failed to load %s: %s", path, e)
    if not full or year not in full:
        return JsonResponse(
            {"error": f"Year {year} not found. Available: {sorted(full.keys()) if full else 'none'}", "summary": None},
            status=404,
        )
    payload = _calamity_risk_ai_insight_payload(year, full[year])

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        fallback = _calamity_risk_fallback_insights(payload)
        return JsonResponse({
            "summary": fallback["summary"],
            "risk_peak_insight": fallback["risk_peak"],
            "adaptation_insight": fallback["adaptation"],
            "year": year,
            "payload": payload,
        })

    now = time.time()
    if year in _CALAMITY_AI_INSIGHT_CACHE:
        cached, cached_at = _CALAMITY_AI_INSIGHT_CACHE[year]
        if now - cached_at < _CALAMITY_AI_INSIGHT_CACHE_TTL:
            return JsonResponse({
                "summary": cached["summary"],
                "risk_peak_insight": cached["risk_peak"],
                "adaptation_insight": cached["adaptation"],
                "year": year,
                "payload": payload,
            })
        del _CALAMITY_AI_INSIGHT_CACHE[year]

    year_val = payload["year"]
    is_projection = year_val.isdigit() and int(year_val) >= 2025
    year_note = " Year is 2025–2030 (projected). Still output exactly 3 paragraphs." if is_projection else ""
    prompt = (
        "You are a concise analyst for a city calamity risk dashboard (Cabuyao). "
        "Based ONLY on the Calamity Risk Likelihood data below (hazard, exposure, green index), "
        "reply with exactly THREE short paragraphs. "
        "CRITICAL: Put each paragraph on its own, then a line with only: --- then the next paragraph. Do NOT combine all info into one.\n\n"
        + year_note
        + "\n\n"
        "1) Calamity Risk Trend: Year, city avg calamity risk (%), highest and lowest risk barangays. 2-3 sentences max. Do not invent numbers.\n"
        "2) Projected Risk Peak: When calamity risk peaks (e.g. late 2020s); role of heavy rainfall and typhoon. 1-2 sentences.\n"
        "3) Impact of Adaptation: How drainage and slope stabilization in some barangays affect risk trajectory. 1-2 sentences.\n\n"
        "Data:\n"
        f"Year: {payload['year']}\n"
        f"City average Calamity Risk (%): {payload['city_average']}\n"
        f"Highest risk: {payload['top']}\n"
        f"Lowest risk: {payload['bottom']}\n"
    )
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 400,
        "temperature": 0.3,
    }
    try:
        r = requests.post(url, json=body, headers=headers, timeout=15)
        if r.status_code == 429:
            logger.warning("Groq rate limit (429) for calamity insight")
            fallback = _calamity_risk_fallback_insights(payload)
            _prune_calamity_ai_cache()
            _CALAMITY_AI_INSIGHT_CACHE[year] = (fallback, now)
            return JsonResponse({
                "summary": fallback["summary"],
                "risk_peak_insight": fallback["risk_peak"],
                "adaptation_insight": fallback["adaptation"],
                "year": year,
                "payload": payload,
            })
        r.raise_for_status()
        out = r.json()
        text = None
        for choice in out.get("choices") or []:
            msg = choice.get("message") or {}
            if "content" in msg and msg["content"]:
                text = msg["content"].strip()
                break
        if not text:
            fallback = _calamity_risk_fallback_insights(payload)
            _prune_calamity_ai_cache()
            _CALAMITY_AI_INSIGHT_CACHE[year] = (fallback, now)
            return JsonResponse({
                "summary": fallback["summary"],
                "risk_peak_insight": fallback["risk_peak"],
                "adaptation_insight": fallback["adaptation"],
                "year": year,
                "payload": payload,
            })
        for sep in ("\n---\n", "\n---", "---"):
            parts = [p.strip() for p in text.split(sep) if p.strip()]
            if len(parts) >= 3:
                break
        if len(parts) == 1 and len(parts[0]) > 200:
            chunks = [p.strip() for p in parts[0].split("\n\n") if p.strip()]
            if len(chunks) >= 3:
                parts = chunks[:3]
        fallback = _calamity_risk_fallback_insights(payload)
        if len(parts) >= 3:
            insights = {"summary": parts[0], "risk_peak": parts[1], "adaptation": parts[2]}
        else:
            insights = {
                "summary": parts[0] if len(parts) >= 1 else fallback["summary"],
                "risk_peak": parts[1] if len(parts) >= 2 else fallback["risk_peak"],
                "adaptation": parts[2] if len(parts) >= 3 else fallback["adaptation"],
            }
        if len(insights["summary"]) > 320:
            s = insights["summary"]
            cut = s.rfind(". ", 0, 321)
            insights["summary"] = s[: cut + 1] if cut > 100 else (s[:320].rstrip().rsplit(" ", 1)[0] + " …")
        _prune_calamity_ai_cache()
        _CALAMITY_AI_INSIGHT_CACHE[year] = (insights, now)
        return JsonResponse({
            "summary": insights["summary"],
            "risk_peak_insight": insights["risk_peak"],
            "adaptation_insight": insights["adaptation"],
            "year": year,
            "payload": payload,
        })
    except requests.RequestException as e:
        logger.exception("Calamity AI request failed: %s", e)
        fallback = _calamity_risk_fallback_insights(payload)
        _prune_calamity_ai_cache()
        _CALAMITY_AI_INSIGHT_CACHE[year] = (fallback, now)
        return JsonResponse({
            "summary": fallback["summary"],
            "risk_peak_insight": fallback["risk_peak"],
            "adaptation_insight": fallback["adaptation"],
            "year": year,
            "payload": payload,
        })


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


def _green_index_ai_insight_payload(year: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Build context payload for AI from green index data for one year."""
    if not data:
        return {"year": year, "city_average": None, "barangays": [], "top": [], "bottom": []}
    values: List[tuple[str, float]] = []
    for barangay, record in data.items():
        gi = record.get("green_index")
        if gi is not None:
            try:
                values.append((barangay, float(gi)))
            except (TypeError, ValueError):
                pass
    if not values:
        return {"year": year, "city_average": None, "barangays": [], "top": [], "bottom": []}
    city_avg = sum(v[1] for v in values) / len(values)
    sorted_by_gi = sorted(values, key=lambda x: x[1], reverse=True)
    top = sorted_by_gi[:5]
    bottom = sorted_by_gi[-5:] if len(sorted_by_gi) >= 5 else sorted_by_gi
    return {
        "year": year,
        "city_average": round(city_avg, 2),
        "barangay_count": len(values),
        "top": [{"barangay": b, "green_index": round(gi, 2)} for b, gi in top],
        "bottom": [{"barangay": b, "green_index": round(gi, 2)} for b, gi in reversed(bottom)],
    }


def _green_index_fallback_insights(payload: Dict[str, Any]) -> Dict[str, str]:
    """Build short data-driven summary, hotspots, and areas-for-greening when AI is unavailable."""
    year = payload.get("year", "?")
    avg = payload.get("city_average")
    top = payload.get("top") or []
    bottom = payload.get("bottom") or []
    suffix = " (Data only.)"
    if avg is not None:
        parts = [f"In {year}, city avg green index {avg}."]
    else:
        parts = [f"Green index for {year}."]
    if top:
        parts.append(" Highest: " + ", ".join(f"{t['barangay']} ({t['green_index']})" for t in top[:3]) + ".")
    if bottom:
        parts.append(" Lowest: " + ", ".join(f"{b['barangay']} ({b['green_index']})" for b in bottom[:3]) + ".")
    summary = "".join(parts).strip() + suffix
    hotspots = (
        "Top: " + ", ".join(f"{t['barangay']} ({t['green_index']})" for t in top[:5])
        + ". Stable vegetation, buffers urban heat." + suffix
        if top
        else f"No hotspot data for {year}." + suffix
    )
    areas = (
        "Lowest: " + ", ".join(f"{b['barangay']} ({b['green_index']})" for b in bottom[:5])
        + ". Priority for street trees and pocket parks." + suffix
        if bottom
        else f"No areas-for-greening data for {year}." + suffix
    )
    return {"summary": summary, "hotspots": hotspots, "areas_for_greening": areas}


@api_view(["GET"])
@permission_classes([AllowAny])
def green_index_ai_insight(request):
    """
    Returns an AI-generated summary of Green Index scores for a specific year.
    Used by the Analytics Key Insights when the user is on the Green Index layer
    and selects a year (history/projection slider).

    Query param: ``?year=2025`` (required).

    Uses Groq (Llama) for short key insights. Set GROQ_API_KEY in environment.
    Free API key: https://console.groq.com/keys
    """
    year = request.GET.get("year")
    if not year:
        return JsonResponse(
            {"error": "Missing required query parameter: year"},
            status=400,
        )
    try:
        full = _load_json(GREEN_INDEX_OUTPUTS / "green_index_data.json")
    except FileNotFoundError as exc:
        logger.error(str(exc))
        return JsonResponse(
            {"error": "Green index data not found. Run the pipeline first.", "summary": None},
            status=404,
        )
    if year not in full:
        return JsonResponse(
            {"error": f"Year {year} not found. Available: {sorted(full.keys())}", "summary": None},
            status=404,
        )
    payload = _green_index_ai_insight_payload(year, full[year])

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        fallback = _green_index_fallback_insights(payload)
        return JsonResponse({
            "summary": fallback["summary"],
            "hotspots_insight": fallback["hotspots"],
            "areas_for_greening_insight": fallback["areas_for_greening"],
            "year": year,
            "payload": payload,
        })

    # Return cached insights if still valid (reduces API calls and avoids 429)
    now = time.time()
    if year in _GREEN_AI_INSIGHT_CACHE:
        cached_insights, cached_at = _GREEN_AI_INSIGHT_CACHE[year]
        if now - cached_at < _GREEN_AI_INSIGHT_CACHE_TTL:
            return JsonResponse({
                "summary": cached_insights["summary"],
                "hotspots_insight": cached_insights["hotspots"],
                "areas_for_greening_insight": cached_insights["areas_for_greening"],
                "year": year,
                "payload": payload,
            })
        del _GREEN_AI_INSIGHT_CACHE[year]

    year_val = payload["year"]
    is_projection = year_val.isdigit() and int(year_val) >= 2026
    year_note = (
        " Year is 2026–2030 (projected). Still output exactly 3 paragraphs." if is_projection else ""
    )
    prompt = (
        "You are a concise analyst for a city geospatial dashboard (Cabuyao). "
        "Based ONLY on the Green Index (NDVI + GAR) data below, reply with exactly THREE short paragraphs. "
        "CRITICAL: Put each paragraph on its own, then a line with only: --- then the next paragraph. Do NOT combine all info into one paragraph.\n\n"
        + year_note
        + "\n\n"
        "1) Key insight: Year, city avg Green Index, strongest/weakest areas. 2-3 sentences max. Do not invent numbers.\n"
        "2) Green Index Hotspots: Which barangays have highest green index; why (vegetation, urban heat, runoff). 1-2 sentences.\n"
        "3) Areas for Greening: Which barangays have lowest green index; one suggestion (street trees, pocket parks). 1-2 sentences.\n\n"
        "Data:\n"
        f"Year: {payload['year']}\n"
        f"City average Green Index: {payload['city_average']}\n"
        f"Barangays with highest green index: {payload['top']}\n"
        f"Barangays with lowest green index: {payload['bottom']}\n"
    )
    # Groq: OpenAI-compatible chat completions (Llama models, free tier)
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 512,
        "temperature": 0.3,
    }
    try:
        r = requests.post(url, json=body, headers=headers, timeout=15)
        if r.status_code == 429:
            logger.warning("Groq rate limit (429)")
            fallback = _green_index_fallback_insights(payload)
            _prune_green_ai_cache()
            _GREEN_AI_INSIGHT_CACHE[year] = (fallback, now)
            return JsonResponse({
                "summary": fallback["summary"],
                "hotspots_insight": fallback["hotspots"],
                "areas_for_greening_insight": fallback["areas_for_greening"],
                "year": year,
                "payload": payload,
            })
        r.raise_for_status()
        out = r.json()
        text = None
        for choice in out.get("choices") or []:
            msg = choice.get("message") or {}
            if "content" in msg and msg["content"]:
                text = msg["content"].strip()
                break
        if not text:
            fallback = _green_index_fallback_insights(payload)
            _prune_green_ai_cache()
            _GREEN_AI_INSIGHT_CACHE[year] = (fallback, now)
            return JsonResponse({
                "summary": fallback["summary"],
                "hotspots_insight": fallback["hotspots"],
                "areas_for_greening_insight": fallback["areas_for_greening"],
                "year": year,
                "payload": payload,
            })
        # Parse "---" separated sections
        for sep in ("\n---\n", "\n---", "---"):
            parts = [p.strip() for p in text.split(sep) if p.strip()]
            if len(parts) >= 3:
                break
        # If model returned one long paragraph, split by double newline so all 3 cards get content
        if len(parts) == 1 and len(parts[0]) > 280:
            chunks = [p.strip() for p in parts[0].split("\n\n") if p.strip()]
            if len(chunks) >= 3:
                parts = chunks[:3]
            elif len(chunks) >= 2:
                parts = chunks
        fallback = _green_index_fallback_insights(payload)
        if len(parts) >= 3:
            insights = {"summary": parts[0], "hotspots": parts[1], "areas_for_greening": parts[2]}
        else:
            insights = {
                "summary": parts[0] if len(parts) >= 1 else fallback["summary"],
                "hotspots": parts[1] if len(parts) >= 2 else fallback["hotspots"],
                "areas_for_greening": parts[2] if len(parts) >= 3 else fallback["areas_for_greening"],
            }
        # Cap first card length so it does not dominate
        if len(insights["summary"]) > 320:
            s = insights["summary"]
            cut = s.rfind(". ", 0, 321)
            insights["summary"] = s[: cut + 1] if cut > 100 else (s[:320].rstrip().rsplit(" ", 1)[0] + " …")
        _prune_green_ai_cache()
        _GREEN_AI_INSIGHT_CACHE[year] = (insights, now)
        return JsonResponse({
            "summary": insights["summary"],
            "hotspots_insight": insights["hotspots"],
            "areas_for_greening_insight": insights["areas_for_greening"],
            "year": year,
            "payload": payload,
        })
    except requests.RequestException as e:
        logger.exception("Groq API request failed: %s", e)
        fallback = _green_index_fallback_insights(payload)
        _prune_green_ai_cache()
        _GREEN_AI_INSIGHT_CACHE[year] = (fallback, now)
        return JsonResponse({
            "summary": fallback["summary"],
            "hotspots_insight": fallback["hotspots"],
            "areas_for_greening_insight": fallback["areas_for_greening"],
            "year": year,
            "payload": payload,
        })


@api_view(["POST"])
@permission_classes([AllowAny])
def green_index_import_ai_insight(request):
    """
    Returns an AI-generated key insight for user-imported Green Index data.
    Used by the Import section to help users understand trends, projections,
    and data quality in plain language.

    POST body (JSON): {
        "chartData": [{"year": "2020", "value": 52.3}, ...],
        "rowCount": 96,
        "hasError": false,
        "parseError": null
    }

    Uses Groq (Llama). Set GROQ_API_KEY in environment.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return JsonResponse(
            {
                "error": "AI not configured. Set GROQ_API_KEY in your environment.",
                "insight": None,
            },
            status=503,
        )
    try:
        body = json.loads(request.body.decode("utf-8")) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse(
            {"error": "Invalid JSON body", "insight": None},
            status=400,
        )
    chart_data = body.get("chartData") or []
    row_count = body.get("rowCount") or 0
    has_error = body.get("hasError", False)
    parse_error = body.get("parseError") or ""
    selected_year = body.get("selectedYear")
    year_avg = body.get("yearAvg")
    val_2026 = body.get("val2026")
    data_quality = body.get("dataQuality") or {}
    has_negative = data_quality.get("hasNegative", False)
    has_over_100 = data_quality.get("hasOver100", False)
    min_gi = data_quality.get("minGreenIndex")
    max_gi = data_quality.get("maxGreenIndex")
    bad_data = has_negative or has_over_100
    has_2026 = any(d.get("year") == "2026" for d in chart_data) if chart_data else False
    prev_2026_val: Optional[float] = None
    prev_year_num: Optional[int] = None
    prev_year_val: Optional[float] = None
    bad_projection = False

    if has_error and parse_error:
        prompt = (
            "Analyst for Green Index import. The user imported wrong data (invalid or missing columns). "
            "Write ONE short paragraph (2 sentences): state that wrong data was imported, what is missing or invalid, and how to fix it. "
            f"Technical detail: {parse_error}. Use 'you/your'. Do NOT say 'you're getting a validation error'. Under 60 words."
        )
    elif not chart_data:
        prompt = (
            "Analyst for Green Index import. User has no data yet. "
            "One sentence encouraging upload. CSV needs year, barangay, green_index. Under 25 words."
        )
    else:
        years = [d.get("year") for d in chart_data if d.get("year")]
        values = [d.get("value") for d in chart_data if isinstance(d.get("value"), (int, float))]
        min_year = min(years, key=lambda x: int(x)) if years else None
        max_year = max(years, key=lambda x: int(x)) if years else None
        trend = "upward" if len(values) >= 2 and values[-1] > values[0] else "downward" if len(values) >= 2 and values[-1] < values[0] else "flat"

        numeric_points: List[Tuple[int, float]] = []
        for d in chart_data:
            y = d.get("year")
            v = d.get("value")
            if not y or not isinstance(v, (int, float)):
                continue
            try:
                yi = int(y)
            except (TypeError, ValueError):
                continue
            numeric_points.append((yi, v))
        numeric_points.sort(key=lambda x: x[0])
        if has_2026:
            for yi, v in numeric_points:
                if yi == 2026:
                    break
                prev_2026_val = v

        if has_2026 and isinstance(val_2026, (int, float)):
            bad_projection = (
                val_2026 < 0
                or val_2026 > 100
                or (
                    prev_2026_val is not None
                    and val_2026 >= prev_2026_val + 20
                    and val_2026 >= prev_2026_val * 1.3
                )
            )
        bad_warning = ""
        if bad_data:
            bad_warning = (
                "CRITICAL: Data quality issue detected. Green Index should be 0-100. "
                + (f"Your data has values outside range: min={min_gi}, max={max_gi}. " if min_gi is not None and max_gi is not None else "")
                + "You MUST warn the user their dataset appears invalid. "
                "Say: check your CSV for negative values or values over 100. Suggest re-uploading valid data."
            )
        prev_year_num = int(numeric_points[-2][0]) if len(numeric_points) >= 2 and numeric_points[-1][0] == 2026 else None
        prev_year_val = numeric_points[-2][1] if prev_year_num is not None else prev_2026_val
        prompt = (
            "Analyst for Cabuyao Green Index. Reply with EXACTLY 2 short paragraphs separated by a line with only: ---\n\n"
            + bad_warning
            + ("\n\n" if bad_warning else "")
            + "Paragraph 1 (City average): 1–2 sentences on the historical city average. "
            + ("If bad data: warn user first, then brief trend. " if bad_data else "")
            + f"Selected year: {selected_year}, value: {year_avg}%. Years {min_year}–{max_year}. Trend: {trend}. Under 50 words.\n\n"
            + "Paragraph 2 (2026 projection): ONE sentence. Compare 2026 to the last year before it. "
            + (f"2026: {val_2026}%, last year ({prev_year_num}): {prev_year_val}%. " if has_2026 and val_2026 is not None and prev_year_val is not None and prev_year_num is not None else f"2026: {val_2026}%. " if has_2026 and val_2026 is not None else "No 2026 data. ")
            + "Say clearly if the projection is good (up/improving) or bad (down/declining) compared to last year. "
            + ("If 2026 is outside 0–100 or unrealistic, warn the user to check their CSV. " if bad_projection else "")
            + "Under 35 words. No filler.\n\n"
            "No intro. No bullets. Output only the 2 paragraphs."
        )

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    req_body = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 180,
        "temperature": 0.3,
    }
    try:
        r = requests.post(url, json=req_body, headers=headers, timeout=15)
        if r.status_code == 429:
            logger.warning("Groq rate limit (429) on import insight")
            if has_error:
                fallback_avg = f"Fix your data: {parse_error}. CSV needs year, barangay, green_index."
                fallback_2026 = ""
            elif bad_data:
                fallback_avg = (
                    "Data quality issue: Green Index should be 0–100. "
                    f"Your data has values outside range (min={min_gi}, max={max_gi}). "
                    "Check your CSV for negatives or values over 100 and re-upload."
                )
                fallback_2026 = (
                    f"2026 projection ({val_2026}%) appears invalid. "
                    "Check your CSV and re-upload valid data."
                    if bad_projection
                    else (
                        f"2026 projection ({val_2026}%) is good — up from {prev_year_val}% in {prev_year_num}."
                        if prev_year_val is not None and prev_year_num is not None and val_2026 is not None and val_2026 > prev_year_val
                        else f"2026 projection ({val_2026}%) is concerning — down from {prev_year_val}% in {prev_year_num}."
                        if prev_year_val is not None and prev_year_num is not None and val_2026 is not None and val_2026 < prev_year_val
                        else f"2026 projection: {val_2026}%." if has_2026 and val_2026 is not None else "No 2026 projection."
                    )
                )
            else:
                fallback_avg = "City average reflects your historical Green Index scores."
                if has_2026 and val_2026 is not None and prev_year_val is not None and prev_year_num is not None:
                    fallback_2026 = (
                        f"2026 projection ({val_2026}%) is good — up from {prev_year_val}% in {prev_year_num}."
                        if val_2026 > prev_year_val
                        else f"2026 projection ({val_2026}%) is concerning — down from {prev_year_val}% in {prev_year_num}."
                        if val_2026 < prev_year_val
                        else f"2026 projection: {val_2026}% (flat vs {prev_year_num})."
                    )
                else:
                    fallback_2026 = f"2026 projection: {val_2026}%." if has_2026 and val_2026 is not None else "No 2026 projection."
            return JsonResponse({"insight_avg": fallback_avg, "insight_2026": fallback_2026, "error": None})
        r.raise_for_status()
        out = r.json()
        text = None
        for choice in out.get("choices") or []:
            msg = choice.get("message") or {}
            if "content" in msg and msg["content"]:
                text = msg["content"].strip()
                break
        if not text:
            if bad_data:
                fallback_avg = (
                    "Data quality issue: Green Index should be 0–100. "
                    f"Your data has values outside range (min={min_gi}, max={max_gi}). "
                    "Check your CSV for negatives or values over 100 and re-upload."
                )
                if has_2026 and val_2026 is not None:
                    if bad_projection:
                        fallback_2026 = (
                            f"Warning: the 2026 Green Index projection ({val_2026}%) looks unrealistic. "
                            "Green Index should normally stay between 0–100 and follow past trends. "
                            "Check your CSV for errors before using this projection."
                        )
                    else:
                        fallback_2026 = (
                            f"2026 projection ({val_2026}%) is good — up from {prev_year_val}% in {prev_year_num}."
                            if prev_year_val is not None and prev_year_num is not None and val_2026 and val_2026 > prev_year_val
                            else f"2026 projection ({val_2026}%) is concerning — down from {prev_year_val}% in {prev_year_num}."
                            if prev_year_val is not None and prev_year_num is not None and val_2026 and val_2026 < prev_year_val
                            else f"2026 projection: {val_2026}%."
                        )
                else:
                    fallback_2026 = ""
            else:
                fallback_avg = "City average reflects your imported Green Index data."
                if has_2026 and val_2026 is not None and prev_year_val is not None and prev_year_num is not None:
                    fallback_2026 = (
                        f"2026 projection ({val_2026}%) is good — up from {prev_year_val}% in {prev_year_num}."
                        if val_2026 > prev_year_val
                        else f"2026 projection ({val_2026}%) is concerning — down from {prev_year_val}% in {prev_year_num}."
                        if val_2026 < prev_year_val
                        else f"2026 projection: {val_2026}% (flat vs {prev_year_num})."
                    )
                else:
                    fallback_2026 = f"2026 projection: {val_2026}%." if has_2026 and val_2026 is not None else ""
            return JsonResponse({"insight_avg": fallback_avg, "insight_2026": fallback_2026, "error": None})
        parts = [p.strip() for p in text.split("---") if p.strip()]
        insight_avg = parts[0] if parts else "City average reflects your imported data."
        if len(parts) >= 2:
            insight_2026 = parts[1]
        elif not has_2026 or val_2026 is None:
            insight_2026 = ""
        elif bad_projection:
            insight_2026 = (
                f"Warning: the 2026 Green Index projection ({val_2026}%) spiked unusually high. "
                "This projection may be invalid; Green Index should stay within 0–100 and align with previous years. "
                "Double-check your CSV before relying on this value."
            )
        elif bad_data:
            insight_2026 = (
                f"2026 projection ({val_2026}%) may be unreliable because your dataset has values outside 0–100. "
                "Review and clean your CSV before trusting this forecast."
            )
        else:
            insight_2026 = f"2026 projection: {val_2026}%."
        return JsonResponse({"insight_avg": insight_avg, "insight_2026": insight_2026, "error": None})
    except requests.RequestException as e:
        logger.exception("Groq API failed for import insight: %s", e)
        if bad_data and chart_data:
            fallback_avg = (
                "Data quality issue: Green Index should be 0–100. "
                f"Your data has min={min_gi}, max={max_gi}. Check CSV and re-upload."
            )
            if has_2026 and val_2026 is not None:
                if bad_projection:
                    fallback_2026 = (
                        f"Warning: the 2026 Green Index projection ({val_2026}%) looks unrealistic. "
                        "Check your CSV for errors before using this projection."
                    )
                else:
                    fallback_2026 = f"2026: {val_2026}%."
            else:
                fallback_2026 = ""
        else:
            fallback_avg = "Chart is valid; AI insight unavailable. Review the trends above."
            fallback_2026 = f"2026: {val_2026}%." if has_2026 and val_2026 is not None else ""
        return JsonResponse({"insight_avg": fallback_avg, "insight_2026": fallback_2026, "error": str(e)})


@api_view(["POST"])
@permission_classes([AllowAny])
def hazard_index_import_ai_insight(request):
    """
    Returns an AI-generated key insight for user-imported Hazard Index data.
    Used by the Import section. Higher hazard index = higher risk (0–100).
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return JsonResponse(
            {
                "error": "AI not configured. Set GROQ_API_KEY in your environment.",
                "insight_avg": None,
                "insight_2026": None,
            },
            status=503,
        )
    try:
        body = json.loads(request.body.decode("utf-8")) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse(
            {"error": "Invalid JSON body", "insight_avg": None, "insight_2026": None},
            status=400,
        )
    chart_data = body.get("chartData") or []
    row_count = body.get("rowCount") or 0
    has_error = body.get("hasError", False)
    parse_error = body.get("parseError") or ""
    selected_year = body.get("selectedYear")
    year_avg = body.get("yearAvg")
    val_2026 = body.get("val2026")
    data_quality = body.get("dataQuality") or {}
    has_negative = data_quality.get("hasNegative", False)
    has_over_100 = data_quality.get("hasOver100", False)
    min_hi = data_quality.get("minHazardIndex")
    max_hi = data_quality.get("maxHazardIndex")
    bad_data = has_negative or has_over_100
    has_2026 = any(d.get("year") == "2026" for d in chart_data) if chart_data else False
    prev_2026_val: Optional[float] = None
    prev_year_num: Optional[int] = None
    prev_year_val: Optional[float] = None
    bad_projection = False

    if has_error and parse_error:
        prompt = (
            "Analyst for Hazard Index import. The user imported wrong data (invalid or missing columns). "
            "Write ONE short paragraph (2 sentences): state that wrong data was imported, what is missing or invalid, and how to fix it. "
            f"Technical detail: {parse_error}. Use 'you/your'. Do NOT say 'you're getting a validation error'. Under 60 words."
        )
    elif not chart_data:
        prompt = (
            "Analyst for Hazard Index import. User has no data yet. "
            "One sentence encouraging upload. CSV needs year, barangay, hazard_index. Under 25 words."
        )
    else:
        years = [d.get("year") for d in chart_data if d.get("year")]
        values = [d.get("value") for d in chart_data if isinstance(d.get("value"), (int, float))]
        min_year = min(years, key=lambda x: int(x)) if years else None
        max_year = max(years, key=lambda x: int(x)) if years else None
        trend = "upward" if len(values) >= 2 and values[-1] > values[0] else "downward" if len(values) >= 2 and values[-1] < values[0] else "flat"

        numeric_points: List[Tuple[int, float]] = []
        for d in chart_data:
            y = d.get("year")
            v = d.get("value")
            if not y or not isinstance(v, (int, float)):
                continue
            try:
                yi = int(y)
            except (TypeError, ValueError):
                continue
            numeric_points.append((yi, v))
        numeric_points.sort(key=lambda x: x[0])
        if has_2026:
            for yi, v in numeric_points:
                if yi == 2026:
                    break
                prev_2026_val = v

        if has_2026 and isinstance(val_2026, (int, float)):
            bad_projection = (
                val_2026 < 0
                or val_2026 > 100
                or (
                    prev_2026_val is not None
                    and val_2026 >= prev_2026_val + 25
                    and val_2026 >= prev_2026_val * 1.4
                )
            )
        bad_warning = ""
        if bad_data:
            bad_warning = (
                "CRITICAL: Data quality issue detected. Hazard Index should be 0-100. "
                + (f"Your data has values outside range: min={min_hi}, max={max_hi}. " if min_hi is not None and max_hi is not None else "")
                + "You MUST warn the user their dataset appears invalid. "
                "Say: check your CSV for negative values or values over 100. Suggest re-uploading valid data."
            )
        prev_year_num = int(numeric_points[-2][0]) if len(numeric_points) >= 2 and numeric_points[-1][0] == 2026 else None
        prev_year_val = numeric_points[-2][1] if prev_year_num is not None else prev_2026_val
        prompt = (
            "Analyst for Cabuyao Hazard Index (higher = more risk, 0–100). Reply with EXACTLY 2 short paragraphs separated by a line with only: ---\n\n"
            + bad_warning
            + ("\n\n" if bad_warning else "")
            + "Paragraph 1 (Hazard average): 1–2 sentences on the historical city average hazard. "
            + ("If bad data: warn user first, then brief trend. " if bad_data else "")
            + f"Selected year: {selected_year}, value: {year_avg}%. Years {min_year}–{max_year}. Trend: {trend}. Note: higher hazard = more risk. Under 50 words.\n\n"
            + "Paragraph 2 (2026 projection): ONE sentence. Compare 2026 to the last year before it. "
            + (f"2026: {val_2026}%, last year ({prev_year_num}): {prev_year_val}%. " if has_2026 and val_2026 is not None and prev_year_val is not None and prev_year_num is not None else f"2026: {val_2026}%. " if has_2026 and val_2026 is not None else "No 2026 data. ")
            + "Say clearly if rising hazard (concerning) or falling hazard (improving) compared to last year. "
            + ("If 2026 is outside 0–100 or unrealistic, warn the user to check their CSV. " if bad_projection else "")
            + "Under 35 words. No filler.\n\n"
            "No intro. No bullets. Output only the 2 paragraphs."
        )

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    req_body = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 180,
        "temperature": 0.3,
    }
    try:
        r = requests.post(url, json=req_body, headers=headers, timeout=15)
        if r.status_code == 429:
            if has_error:
                fallback_avg = f"Fix your data: {parse_error}. CSV needs year, barangay, hazard_index."
                fallback_2026 = ""
            elif bad_data:
                fallback_avg = (
                    "Data quality issue: Hazard Index should be 0–100. "
                    f"Your data has values outside range (min={min_hi}, max={max_hi}). "
                    "Check your CSV for negatives or values over 100 and re-upload."
                )
                fallback_2026 = (
                    f"2026 projection ({val_2026}%) appears invalid. "
                    "Check your CSV and re-upload valid data."
                    if bad_projection
                    else (
                        f"2026 hazard projection ({val_2026}%) — {'concerning (risk up)' if val_2026 and prev_year_val is not None and val_2026 > prev_year_val else 'improving (risk down)' if val_2026 and prev_year_val is not None and val_2026 < prev_year_val else 'unchanged'} from {prev_year_val}% in {prev_year_num}."
                        if prev_year_val is not None and prev_year_num is not None and val_2026 is not None
                        else f"2026 hazard projection: {val_2026}%."
                    )
                )
            else:
                fallback_avg = "City average reflects your historical Hazard Index scores."
                if has_2026 and val_2026 is not None and prev_year_val is not None and prev_year_num is not None:
                    fallback_2026 = (
                        f"2026 hazard projection ({val_2026}%) — risk up from {prev_year_val}% in {prev_year_num}."
                        if val_2026 > prev_year_val
                        else f"2026 hazard projection ({val_2026}%) — risk down from {prev_year_val}% in {prev_year_num}."
                        if val_2026 < prev_year_val
                        else f"2026 hazard projection: {val_2026}% (flat vs {prev_year_num})."
                    )
                else:
                    fallback_2026 = f"2026 hazard projection: {val_2026}%." if has_2026 and val_2026 is not None else "No 2026 projection."
            return JsonResponse({"insight_avg": fallback_avg, "insight_2026": fallback_2026, "error": None})
        r.raise_for_status()
        out = r.json()
        text = None
        for choice in out.get("choices") or []:
            msg = choice.get("message") or {}
            if "content" in msg and msg["content"]:
                text = msg["content"].strip()
                break
        if not text:
            if bad_data:
                fallback_avg = (
                    "Data quality issue: Hazard Index should be 0–100. "
                    f"Your data has min={min_hi}, max={max_hi}. Check CSV and re-upload."
                )
                if has_2026 and val_2026 is not None:
                    if bad_projection:
                        fallback_2026 = (
                            f"Warning: the 2026 Hazard Index projection ({val_2026}%) looks unrealistic. "
                            "Hazard Index should stay between 0–100. Check your CSV for errors."
                        )
                    else:
                        fallback_2026 = (
                            f"2026 hazard projection ({val_2026}%) — risk up from {prev_year_val}% in {prev_year_num}."
                            if prev_year_val is not None and prev_year_num is not None and val_2026 and val_2026 > prev_year_val
                            else f"2026 hazard projection ({val_2026}%) — risk down from {prev_year_val}% in {prev_year_num}."
                            if prev_year_val is not None and prev_year_num is not None and val_2026 and val_2026 < prev_year_val
                            else f"2026 hazard projection: {val_2026}%."
                        )
                else:
                    fallback_2026 = ""
            else:
                fallback_avg = "City average reflects your imported Hazard Index data."
                if has_2026 and val_2026 is not None and prev_year_val is not None and prev_year_num is not None:
                    fallback_2026 = (
                        f"2026 hazard projection ({val_2026}%) — risk up from {prev_year_val}% in {prev_year_num}."
                        if val_2026 > prev_year_val
                        else f"2026 hazard projection ({val_2026}%) — risk down from {prev_year_val}% in {prev_year_num}."
                        if val_2026 < prev_year_val
                        else f"2026 hazard projection ({val_2026}%) (flat vs {prev_year_num})."
                    )
                else:
                    fallback_2026 = f"2026 hazard projection: {val_2026}%." if has_2026 and val_2026 is not None else ""
            return JsonResponse({"insight_avg": fallback_avg, "insight_2026": fallback_2026, "error": None})
        parts = [p.strip() for p in text.split("---") if p.strip()]
        insight_avg = parts[0] if parts else "City average reflects your imported hazard data."
        if len(parts) >= 2:
            insight_2026 = parts[1]
        elif not has_2026 or val_2026 is None:
            insight_2026 = ""
        elif bad_projection:
            insight_2026 = (
                f"Warning: the 2026 Hazard Index projection ({val_2026}%) looks unrealistic. "
                "Hazard Index should stay within 0–100. Check your CSV before using this value."
            )
        elif bad_data:
            insight_2026 = (
                f"2026 projection ({val_2026}%) may be unreliable because your dataset has values outside 0–100. "
                "Review and clean your CSV before trusting this forecast."
            )
        else:
            insight_2026 = f"2026 hazard projection: {val_2026}%."
        return JsonResponse({"insight_avg": insight_avg, "insight_2026": insight_2026, "error": None})
    except requests.RequestException as e:
        logger.exception("Groq API failed for hazard import insight: %s", e)
        if bad_data and chart_data:
            fallback_avg = (
                "Data quality issue: Hazard Index should be 0–100. "
                f"Your data has min={min_hi}, max={max_hi}. Check CSV and re-upload."
            )
            if has_2026 and val_2026 is not None:
                if bad_projection:
                    fallback_2026 = (
                        f"Warning: the 2026 Hazard Index projection ({val_2026}%) looks unrealistic. "
                        "Check your CSV for errors before using this projection."
                    )
                else:
                    fallback_2026 = f"2026: {val_2026}%."
            else:
                fallback_2026 = ""
        else:
            fallback_avg = "Chart is valid; AI insight unavailable. Review the trends above."
            fallback_2026 = f"2026: {val_2026}%." if has_2026 and val_2026 is not None else ""
        return JsonResponse({"insight_avg": fallback_avg, "insight_2026": fallback_2026, "error": str(e)})


@api_view(["POST"])
@permission_classes([AllowAny])
def calamity_risk_import_ai_insight(request):
    """
    Returns an AI-generated key insight for user-imported Calamity Risk data.
    Used by the Import section. Higher calamity risk = higher risk (0–100).
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return JsonResponse(
            {
                "error": "AI not configured. Set GROQ_API_KEY in your environment.",
                "insight_avg": None,
                "insight_2026": None,
            },
            status=503,
        )
    try:
        body = json.loads(request.body.decode("utf-8")) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse(
            {"error": "Invalid JSON body", "insight_avg": None, "insight_2026": None},
            status=400,
        )
    chart_data = body.get("chartData") or []
    row_count = body.get("rowCount") or 0
    has_error = body.get("hasError", False)
    parse_error = body.get("parseError") or ""
    selected_year = body.get("selectedYear")
    year_avg = body.get("yearAvg")
    val_2026 = body.get("val2026")
    data_quality = body.get("dataQuality") or {}
    has_negative = data_quality.get("hasNegative", False)
    has_over_100 = data_quality.get("hasOver100", False)
    min_cr = data_quality.get("minCalamityRisk")
    max_cr = data_quality.get("maxCalamityRisk")
    bad_data = has_negative or has_over_100
    has_2026 = any(d.get("year") == "2026" for d in chart_data) if chart_data else False
    prev_2026_val: Optional[float] = None
    prev_year_num: Optional[int] = None
    prev_year_val: Optional[float] = None
    bad_projection = False

    if has_error and parse_error:
        prompt = (
            "Analyst for Calamity Risk import. The user imported wrong data (invalid or missing columns). "
            "Write ONE short paragraph (2 sentences): state that wrong data was imported, what is missing or invalid, and how to fix it. "
            f"Technical detail: {parse_error}. Use 'you/your'. Do NOT say 'you're getting a validation error'. Under 60 words."
        )
    elif not chart_data:
        prompt = (
            "Analyst for Calamity Risk import. User has no data yet. "
            "One sentence encouraging upload. CSV needs year, barangay, calamity_risk. Under 25 words."
        )
    else:
        years = [d.get("year") for d in chart_data if d.get("year")]
        values = [d.get("value") for d in chart_data if isinstance(d.get("value"), (int, float))]
        min_year = min(years, key=lambda x: int(x)) if years else None
        max_year = max(years, key=lambda x: int(x)) if years else None
        trend = "upward" if len(values) >= 2 and values[-1] > values[0] else "downward" if len(values) >= 2 and values[-1] < values[0] else "flat"

        numeric_points: List[Tuple[int, float]] = []
        for d in chart_data:
            y = d.get("year")
            v = d.get("value")
            if not y or not isinstance(v, (int, float)):
                continue
            try:
                yi = int(y)
            except (TypeError, ValueError):
                continue
            numeric_points.append((yi, v))
        numeric_points.sort(key=lambda x: x[0])
        if has_2026:
            for yi, v in numeric_points:
                if yi == 2026:
                    break
                prev_2026_val = v

        if has_2026 and isinstance(val_2026, (int, float)):
            bad_projection = (
                val_2026 < 0
                or val_2026 > 100
                or (
                    prev_2026_val is not None
                    and val_2026 >= prev_2026_val + 25
                    and val_2026 >= prev_2026_val * 1.4
                )
            )
        bad_warning = ""
        if bad_data:
            bad_warning = (
                "CRITICAL: Data quality issue detected. Calamity Risk should be 0-100. "
                + (f"Your data has values outside range: min={min_cr}, max={max_cr}. " if min_cr is not None and max_cr is not None else "")
                + "You MUST warn the user their dataset appears invalid. "
                "Say: check your CSV for negative values or values over 100. Suggest re-uploading valid data."
            )
        prev_year_num = int(numeric_points[-2][0]) if len(numeric_points) >= 2 and numeric_points[-1][0] == 2026 else None
        prev_year_val = numeric_points[-2][1] if prev_year_num is not None else prev_2026_val
        prompt = (
            "Analyst for Cabuyao Calamity Risk Likelihood (higher = more risk, 0–100). Reply with EXACTLY 2 short paragraphs separated by a line with only: ---\n\n"
            + bad_warning
            + ("\n\n" if bad_warning else "")
            + "Paragraph 1 (Calamity risk average): 1–2 sentences on the historical city average calamity risk. "
            + ("If bad data: warn user first, then brief trend. " if bad_data else "")
            + f"Selected year: {selected_year}, value: {year_avg}%. Years {min_year}–{max_year}. Trend: {trend}. Note: higher calamity risk = more risk. Under 50 words.\n\n"
            + "Paragraph 2 (2026 projection): ONE sentence. Compare 2026 to the last year before it. "
            + (f"2026: {val_2026}%, last year ({prev_year_num}): {prev_year_val}%. " if has_2026 and val_2026 is not None and prev_year_val is not None and prev_year_num is not None else f"2026: {val_2026}%. " if has_2026 and val_2026 is not None else "No 2026 data. ")
            + "Say clearly if rising calamity risk (concerning) or falling risk (improving) compared to last year. "
            + ("If 2026 is outside 0–100 or unrealistic, warn the user to check their CSV. " if bad_projection else "")
            + "Under 35 words. No filler.\n\n"
            "No intro. No bullets. Output only the 2 paragraphs."
        )

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    req_body = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 180,
        "temperature": 0.3,
    }
    try:
        r = requests.post(url, json=req_body, headers=headers, timeout=15)
        if r.status_code == 429:
            if has_error:
                fallback_avg = f"Fix your data: {parse_error}. CSV needs year, barangay, calamity_risk."
                fallback_2026 = ""
            elif bad_data:
                fallback_avg = (
                    "Data quality issue: Calamity Risk should be 0–100. "
                    f"Your data has values outside range (min={min_cr}, max={max_cr}). "
                    "Check your CSV for negatives or values over 100 and re-upload."
                )
                fallback_2026 = (
                    f"2026 projection ({val_2026}%) appears invalid. "
                    "Check your CSV and re-upload valid data."
                    if bad_projection
                    else (
                        f"2026 calamity risk projection ({val_2026}%) — {'concerning (risk up)' if val_2026 and prev_year_val is not None and val_2026 > prev_year_val else 'improving (risk down)' if val_2026 and prev_year_val is not None and val_2026 < prev_year_val else 'unchanged'} from {prev_year_val}% in {prev_year_num}."
                        if prev_year_val is not None and prev_year_num is not None and val_2026 is not None
                        else f"2026 calamity risk projection: {val_2026}%."
                    )
                )
            else:
                fallback_avg = "City average reflects your historical Calamity Risk scores."
                if has_2026 and val_2026 is not None and prev_year_val is not None and prev_year_num is not None:
                    fallback_2026 = (
                        f"2026 calamity risk projection ({val_2026}%) — risk up from {prev_year_val}% in {prev_year_num}."
                        if val_2026 > prev_year_val
                        else f"2026 calamity risk projection ({val_2026}%) — risk down from {prev_year_val}% in {prev_year_num}."
                        if val_2026 < prev_year_val
                        else f"2026 calamity risk projection: {val_2026}% (flat vs {prev_year_num})."
                    )
                else:
                    fallback_2026 = f"2026 calamity risk projection: {val_2026}%." if has_2026 and val_2026 is not None else "No 2026 projection."
            return JsonResponse({"insight_avg": fallback_avg, "insight_2026": fallback_2026, "error": None})
        r.raise_for_status()
        out = r.json()
        text = None
        for choice in out.get("choices") or []:
            msg = choice.get("message") or {}
            if "content" in msg and msg["content"]:
                text = msg["content"].strip()
                break
        if not text:
            if bad_data:
                fallback_avg = (
                    "Data quality issue: Calamity Risk should be 0–100. "
                    f"Your data has min={min_cr}, max={max_cr}. Check CSV and re-upload."
                )
            if has_2026 and val_2026 is not None:
                if bad_projection:
                    fallback_2026 = (
                        f"Warning: the 2026 Calamity Risk projection ({val_2026}%) looks unrealistic. "
                        "Calamity Risk should stay within 0–100. Check your CSV before using this value."
                    )
                else:
                    fallback_2026 = (
                        f"2026 calamity risk projection ({val_2026}%) — risk up from {prev_year_val}% in {prev_year_num}."
                        if prev_year_val is not None and prev_year_num is not None and val_2026 and val_2026 > prev_year_val
                        else f"2026 calamity risk projection ({val_2026}%) — risk down from {prev_year_val}% in {prev_year_num}."
                        if prev_year_val is not None and prev_year_num is not None and val_2026 and val_2026 < prev_year_val
                        else f"2026 calamity risk projection: {val_2026}%."
                    )
            else:
                fallback_avg = "City average reflects your imported Calamity Risk data."
                if has_2026 and val_2026 is not None and prev_year_val is not None and prev_year_num is not None:
                    fallback_2026 = (
                        f"2026 calamity risk projection ({val_2026}%) — risk up from {prev_year_val}% in {prev_year_num}."
                        if val_2026 > prev_year_val
                        else f"2026 calamity risk projection ({val_2026}%) — risk down from {prev_year_val}% in {prev_year_num}."
                        if val_2026 < prev_year_val
                        else f"2026 calamity risk projection ({val_2026}%) (flat vs {prev_year_num})."
                    )
                else:
                    fallback_2026 = f"2026 calamity risk projection: {val_2026}%." if has_2026 and val_2026 is not None else ""
            return JsonResponse({"insight_avg": fallback_avg, "insight_2026": fallback_2026, "error": None})
        parts = [p.strip() for p in text.split("---") if p.strip()]
        insight_avg = parts[0] if parts else "City average reflects your imported calamity risk data."
        if len(parts) >= 2:
            insight_2026 = parts[1]
        elif not has_2026 or val_2026 is None:
            insight_2026 = ""
        elif bad_projection:
            insight_2026 = (
                f"Warning: the 2026 Calamity Risk projection ({val_2026}%) looks unrealistic. "
                "Calamity Risk should stay within 0–100. Check your CSV before using this value."
            )
        elif bad_data:
            insight_2026 = (
                f"2026 projection ({val_2026}%) may be unreliable because your dataset has values outside 0–100. "
                "Review and clean your CSV before trusting this forecast."
            )
        else:
            insight_2026 = f"2026 calamity risk projection: {val_2026}%."
        return JsonResponse({"insight_avg": insight_avg, "insight_2026": insight_2026, "error": None})
    except requests.RequestException as e:
        logger.exception("Groq API failed for calamity import insight: %s", e)
        if bad_data and chart_data:
            fallback_avg = (
                "Data quality issue: Calamity Risk should be 0–100. "
                f"Your data has min={min_cr}, max={max_cr}. Check CSV and re-upload."
            )
            if has_2026 and val_2026 is not None:
                if bad_projection:
                    fallback_2026 = (
                        f"Warning: the 2026 Calamity Risk projection ({val_2026}%) looks unrealistic. "
                        "Check your CSV for errors before using this projection."
                    )
                else:
                    fallback_2026 = f"2026: {val_2026}%."
            else:
                fallback_2026 = ""
        else:
            fallback_avg = "Chart is valid; AI insight unavailable. Review the trends above."
            fallback_2026 = f"2026: {val_2026}%." if has_2026 and val_2026 is not None else ""
        return JsonResponse({"insight_avg": fallback_avg, "insight_2026": fallback_2026, "error": str(e)})


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


def _hazard_index_ai_insight_payload(year: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Build context payload for AI from hazard index data for one year (higher = more risk)."""
    if not data:
        return {"year": year, "city_average": None, "top": [], "bottom": []}
    values: List[tuple[str, float]] = []
    for barangay, record in data.items():
        hi = record.get("hazard_index")
        if hi is not None:
            try:
                values.append((barangay, float(hi)))
            except (TypeError, ValueError):
                pass
    if not values:
        return {"year": year, "city_average": None, "top": [], "bottom": []}
    city_avg = sum(v[1] for v in values) / len(values)
    sorted_by_hi = sorted(values, key=lambda x: x[1], reverse=True)  # highest risk first
    top = sorted_by_hi[:5]
    bottom = sorted_by_hi[-5:] if len(sorted_by_hi) >= 5 else sorted_by_hi
    return {
        "year": year,
        "city_average": round(city_avg, 2),
        "barangay_count": len(values),
        "top": [{"barangay": b, "hazard_index": round(hi, 2)} for b, hi in top],
        "bottom": [{"barangay": b, "hazard_index": round(hi, 2)} for b, hi in reversed(bottom)],
    }


def _hazard_index_fallback_insights(payload: Dict[str, Any]) -> Dict[str, str]:
    """Build 4 short data-driven hazard insights when AI is unavailable."""
    year = payload.get("year", "?")
    avg = payload.get("city_average")
    top = payload.get("top") or []
    bottom = payload.get("bottom") or []
    suffix = " (Data only.)"
    if top and bottom and avg is not None:
        top_s = ", ".join(f"{t['barangay']} ({t['hazard_index']})" for t in top[:3])
        bot_s = ", ".join(f"{b['barangay']} ({b['hazard_index']})" for b in bottom[:3])
        summary = f"In {year}, city avg hazard index {avg}. Highest risk: {top_s}. Lower risk: {bot_s}.{suffix}"
    else:
        summary = f"Hazard index for {year}.{suffix}"
    hotspots = (
        "Top risk: " + ", ".join(f"{t['barangay']} ({t['hazard_index']})" for t in top[:5])
        + ". Flood, landslide, strong-wind exposure." + suffix
        if top
        else f"No hotspot data for {year}.{suffix}"
    )
    lower_risk = (
        "Lower risk: " + ", ".join(f"{b['barangay']} ({b['hazard_index']})" for b in bottom[:5])
        + ". Suitable for densification." + suffix
        if bottom
        else f"No lower-risk data for {year}.{suffix}"
    )
    earthquake_typhoon = "Flood, landslide, earthquake, typhoon. Prepare for rare high-intensity events." + suffix
    return {"summary": summary, "hotspots": hotspots, "lower_risk": lower_risk, "earthquake_typhoon": earthquake_typhoon}


@api_view(["GET"])
@permission_classes([AllowAny])
def hazard_index_ai_insight(request):
    """
    Returns 4 AI-generated Hazard Index insights for a specific year.
    Used only when the user is on the Hazard Index layer (reduces tokens vs running green prompt).

    Query param: ``?year=2025`` (required).
    Returns: summary, hotspots_insight, lower_risk_insight, earthquake_typhoon_insight.
    """
    year = request.GET.get("year")
    if not year:
        return JsonResponse(
            {"error": "Missing required query parameter: year"},
            status=400,
        )
    try:
        full = _load_json(HAZARD_INDEX_OUTPUTS / "hazard_index_data.json")
    except FileNotFoundError as exc:
        logger.error(str(exc))
        return JsonResponse(
            {"error": "Hazard index data not found. Run the pipeline first.", "summary": None},
            status=404,
        )
    if year not in full:
        return JsonResponse(
            {"error": f"Year {year} not found. Available: {sorted(full.keys())}", "summary": None},
            status=404,
        )
    payload = _hazard_index_ai_insight_payload(year, full[year])

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        fallback = _hazard_index_fallback_insights(payload)
        return JsonResponse({
            "summary": fallback["summary"],
            "hotspots_insight": fallback["hotspots"],
            "lower_risk_insight": fallback["lower_risk"],
            "earthquake_typhoon_insight": fallback["earthquake_typhoon"],
            "year": year,
            "payload": payload,
        })

    now = time.time()
    if year in _HAZARD_AI_INSIGHT_CACHE:
        cached, cached_at = _HAZARD_AI_INSIGHT_CACHE[year]
        if now - cached_at < _HAZARD_AI_INSIGHT_CACHE_TTL:
            return JsonResponse({
                "summary": cached["summary"],
                "hotspots_insight": cached["hotspots"],
                "lower_risk_insight": cached["lower_risk"],
                "earthquake_typhoon_insight": cached["earthquake_typhoon"],
                "year": year,
                "payload": payload,
            })
        del _HAZARD_AI_INSIGHT_CACHE[year]

    year_val = payload["year"]
    is_projection = year_val.isdigit() and int(year_val) >= 2025
    year_note = (
        " Year is 2025–2030 (projected). Still output exactly 4 paragraphs." if is_projection else ""
    )
    prompt = (
        "You are a concise analyst for a city hazard dashboard (Cabuyao). "
        "Based ONLY on the data below, reply with exactly FOUR short paragraphs. "
        "CRITICAL: Put each paragraph on its own, then a line with only: --- then the next paragraph. Do NOT combine all info into one paragraph.\n\n"
        + year_note
        + "\n\n"
        "1) Key insight: Year, city avg hazard index, top/bottom risk areas. 2-3 sentences max. Do not invent numbers.\n"
        "2) Hazard Hotspots: Which barangays have highest hazard index and why (river, upland, flood/landslide/wind). 1-2 sentences.\n"
        "3) Lower-Risk Zones: Which barangays have lowest hazard index; planning relevance. 1-2 sentences.\n"
        "4) Earthquake & Typhoon: Rare high-intensity events and preparedness. 1-2 sentences.\n\n"
        "Data:\n"
        f"Year: {payload['year']}\n"
        f"City average Hazard Index: {payload['city_average']}\n"
        f"Highest hazard (risk): {payload['top']}\n"
        f"Lowest hazard (risk): {payload['bottom']}\n"
    )
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 512,
        "temperature": 0.3,
    }
    try:
        r = requests.post(url, json=body, headers=headers, timeout=15)
        if r.status_code == 429:
            logger.warning("Groq rate limit (429) for hazard insight")
            fallback = _hazard_index_fallback_insights(payload)
            _prune_hazard_ai_cache()
            _HAZARD_AI_INSIGHT_CACHE[year] = (fallback, now)
            return JsonResponse({
                "summary": fallback["summary"],
                "hotspots_insight": fallback["hotspots"],
                "lower_risk_insight": fallback["lower_risk"],
                "earthquake_typhoon_insight": fallback["earthquake_typhoon"],
                "year": year,
                "payload": payload,
            })
        r.raise_for_status()
        out = r.json()
        text = None
        for choice in out.get("choices") or []:
            msg = choice.get("message") or {}
            if "content" in msg and msg["content"]:
                text = msg["content"].strip()
                break
        if not text:
            fallback = _hazard_index_fallback_insights(payload)
            _prune_hazard_ai_cache()
            _HAZARD_AI_INSIGHT_CACHE[year] = (fallback, now)
            return JsonResponse({
                "summary": fallback["summary"],
                "hotspots_insight": fallback["hotspots"],
                "lower_risk_insight": fallback["lower_risk"],
                "earthquake_typhoon_insight": fallback["earthquake_typhoon"],
                "year": year,
                "payload": payload,
            })
        for sep in ("\n---\n", "\n---", "---"):
            parts = [p.strip() for p in text.split(sep) if p.strip()]
            if len(parts) >= 4:
                break
        # If model returned one long paragraph, try splitting by double newline so all 4 cards get content
        if len(parts) == 1 and len(parts[0]) > 280:
            chunks = [p.strip() for p in parts[0].split("\n\n") if p.strip()]
            if len(chunks) >= 4:
                parts = chunks[:4]
            elif len(chunks) >= 2:
                parts = chunks
        fallback = _hazard_index_fallback_insights(payload)
        if len(parts) >= 4:
            insights = {
                "summary": parts[0],
                "hotspots": parts[1],
                "lower_risk": parts[2],
                "earthquake_typhoon": parts[3],
            }
        else:
            insights = {
                "summary": parts[0] if len(parts) >= 1 else fallback["summary"],
                "hotspots": parts[1] if len(parts) >= 2 else fallback["hotspots"],
                "lower_risk": parts[2] if len(parts) >= 3 else fallback["lower_risk"],
                "earthquake_typhoon": parts[3] if len(parts) >= 4 else fallback["earthquake_typhoon"],
            }
        # Keep first card from dominating: cap summary length when it's a long single paragraph
        _max_summary_len = 320
        if len(insights["summary"]) > _max_summary_len:
            s = insights["summary"]
            cut = s.rfind(". ", 0, _max_summary_len + 1)
            if cut > 100:
                insights["summary"] = s[: cut + 1]
            else:
                truncated = s[:_max_summary_len].rstrip()
                last_space = truncated.rfind(" ")
                insights["summary"] = (truncated[: last_space + 1] if last_space > 0 else truncated) + " …"
        _prune_hazard_ai_cache()
        _HAZARD_AI_INSIGHT_CACHE[year] = (insights, now)
        return JsonResponse({
            "summary": insights["summary"],
            "hotspots_insight": insights["hotspots"],
            "lower_risk_insight": insights["lower_risk"],
            "earthquake_typhoon_insight": insights["earthquake_typhoon"],
            "year": year,
            "payload": payload,
        })
    except requests.RequestException as e:
        logger.exception("Hazard AI request failed: %s", e)
        fallback = _hazard_index_fallback_insights(payload)
        _prune_hazard_ai_cache()
        _HAZARD_AI_INSIGHT_CACHE[year] = (fallback, now)
        return JsonResponse({
            "summary": fallback["summary"],
            "hotspots_insight": fallback["hotspots"],
            "lower_risk_insight": fallback["lower_risk"],
            "earthquake_typhoon_insight": fallback["earthquake_typhoon"],
            "year": year,
            "payload": payload,
        })


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


# ---------------------------------------------------------------------------
# Dataset CSV downloads
# ---------------------------------------------------------------------------

DATASET_CSV_PATHS: Dict[str, Path] = {
    "Hazard Index by Barangay": HAZARD_INDEX_OUTPUTS / "hazard_index_data.json",  # Will convert JSON to CSV
    "Green Index Scores": GREEN_INDEX_OUTPUTS / "green_index_data.json",  # Will convert JSON to CSV
    "Green Index Complete": DATASETS_DIR / "vegetation" / "green_index_complete.csv",
    "Green Index by Barangay": DATASETS_DIR / "vegetation" / "green_index_barangay.csv",
    "Earthquake Historical Data": HAZARDS_DIR / "earthquake_freq.csv",
    "Typhoon Tracking Data": HAZARDS_DIR / "typhoon_freq.csv",
    "Flood Zone Mapping": DATASETS_DIR / "susceptibility" / "flood_susceptibility.csv",
    "Landslide Risk Assessment": DATASETS_DIR / "susceptibility" / "landslide_susceptibility.csv",
    "Population by Barangay": DATASETS_DIR / "population" / "population_barangay.csv",
    "Weather Data": DATASETS_DIR / "weather" / "weather_data.csv",
    "Infrastructure Data": DATASETS_DIR / "infrastructure" / "infrastructure.csv",
    "LSTM Training Data": DATASETS_DIR / "training" / "lstm_training_data.csv",
    "Evaluation Predictions": DATASETS_DIR / "training" / "eval_predictions.csv",
}

# Fallback paths (check hazard subdirectory if main path doesn't exist)
DATASET_CSV_FALLBACKS: Dict[str, List[Path]] = {
    "Green Index Complete": [
        DATA_DIR / "hazard" / "datasets" / "green_index_complete.csv",
        DATASETS_DIR / "vegetation" / "green_index_complete.csv",
    ],
    "Green Index by Barangay": [
        DATA_DIR / "hazard" / "datasets" / "green_index_barangay.csv",
        DATASETS_DIR / "vegetation" / "green_index_barangay.csv",
    ],
    "Earthquake Historical Data": [
        DATA_DIR / "hazard" / "datasets" / "earthquake_freq.csv",
        HAZARDS_DIR / "earthquake_freq.csv",
    ],
    "Typhoon Tracking Data": [
        DATA_DIR / "hazard" / "datasets" / "typhoon_freq.csv",
        HAZARDS_DIR / "typhoon_freq.csv",
    ],
    "Flood Zone Mapping": [
        DATA_DIR / "hazard" / "datasets" / "flood_susceptibility.csv",
        DATASETS_DIR / "susceptibility" / "flood_susceptibility.csv",
    ],
    "Landslide Risk Assessment": [
        DATA_DIR / "hazard" / "datasets" / "landslide_susceptibility.csv",
        DATASETS_DIR / "susceptibility" / "landslide_susceptibility.csv",
    ],
    "Population by Barangay": [
        DATA_DIR / "hazard" / "datasets" / "population_barangay.csv",
        DATASETS_DIR / "population" / "population_barangay.csv",
    ],
    "Weather Data": [
        DATA_DIR / "hazard" / "datasets" / "weather_data.csv",
        DATASETS_DIR / "weather" / "weather_data.csv",
    ],
    "Infrastructure Data": [
        DATA_DIR / "hazard" / "datasets" / "infrastructure.csv",
        DATASETS_DIR / "infrastructure" / "infrastructure.csv",
    ],
    "LSTM Training Data": [
        DATA_DIR / "hazard" / "datasets" / "lstm_training_data.csv",
        DATASETS_DIR / "training" / "lstm_training_data.csv",
    ],
    "Evaluation Predictions": [
        DATA_DIR / "hazard" / "datasets" / "eval_predictions.csv",
        DATASETS_DIR / "training" / "eval_predictions.csv",
    ],
}


def _json_to_csv_response(json_data: Dict[str, Any], filename: str) -> HttpResponse:
    """Convert yearly-keyed JSON data to CSV format."""
    
    if not json_data:
        return JsonResponse({"error": "No data available."}, status=404)
    
    # Flatten yearly data: year, barangay, value
    rows: List[Dict[str, str]] = []
    for year, barangays in json_data.items():
        if not isinstance(barangays, dict):
            continue
        for barangay, values in barangays.items():
            if isinstance(values, dict):
                row = {"year": year, "barangay": barangay}
                row.update({k: str(v) for k, v in values.items()})
                rows.append(row)
    
    if not rows:
        return JsonResponse({"error": "No data to export."}, status=404)
    
    # Write CSV to memory
    buf = io.StringIO()
    fieldnames = list(rows[0].keys())
    writer = csv.DictWriter(buf, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
    
    csv_content = buf.getvalue()
    resp = HttpResponse(csv_content, content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = f'attachment; filename="{filename}"'
    resp["Content-Length"] = str(len(csv_content.encode("utf-8")))
    return resp


@api_view(["GET"])
@permission_classes([AllowAny])
def download_dataset(request):
    """
    Download a dataset CSV file.
    
    Query param: ?name=<dataset_name>
    Example: /api/hazard/datasets/download?name=Earthquake Historical Data
    """
    dataset_name = request.GET.get("name", "").strip()
    if not dataset_name:
        return JsonResponse({"error": "Dataset name required. Use ?name=<dataset_name>"}, status=400)
    
    # Find the file path
    file_path: Optional[Path] = None
    
    # Check primary path
    if dataset_name in DATASET_CSV_PATHS:
        primary_path = DATASET_CSV_PATHS[dataset_name]
        
        # Special handling for JSON files that need conversion
        if primary_path.suffix == ".json":
            if primary_path.exists() and primary_path.is_file():
                try:
                    json_data = _load_json(primary_path)
                    safe_name = dataset_name.lower().replace(" ", "_").replace("/", "_")
                    logger.info("Converting JSON to CSV for %s from %s", dataset_name, primary_path)
                    return _json_to_csv_response(json_data, f"{safe_name}.csv")
                except Exception as exc:
                    logger.error("Failed to convert JSON to CSV for %s: %s", dataset_name, exc, exc_info=True)
                    return JsonResponse({"error": f"Failed to convert dataset '{dataset_name}': {str(exc)}"}, status=500)
            else:
                logger.warning("Primary JSON path does not exist for %s: %s", dataset_name, primary_path)
                # Continue to check fallbacks or return 404
        
        # Regular CSV file - check primary path first
        if primary_path.exists() and primary_path.is_file():
            file_path = primary_path
            logger.info("Found dataset %s at primary path: %s", dataset_name, primary_path)
    
    # Try fallback paths if primary path doesn't exist
    if not file_path and dataset_name in DATASET_CSV_FALLBACKS:
        for fallback in DATASET_CSV_FALLBACKS[dataset_name]:
            if fallback.exists() and fallback.is_file():
                file_path = fallback
                logger.info("Found dataset %s at fallback path: %s", dataset_name, fallback)
                break
    
    # If still not found, try a generic search in common locations
    if not file_path:
        # Try to find CSV files by name pattern in common directories
        safe_name = dataset_name.lower().replace(" ", "_").replace("/", "_").replace("-", "_")
        possible_names = [
            safe_name + ".csv",
            dataset_name.lower().replace(" ", "_") + ".csv",
        ]
        
        search_dirs = [
            DATASETS_DIR,
            DATA_DIR / "hazard" / "datasets",
            HAZARDS_DIR,
        ]
        
        for search_dir in search_dirs:
            if not search_dir.exists():
                continue
            for possible_name in possible_names:
                candidate = search_dir / possible_name
                if candidate.exists() and candidate.is_file():
                    file_path = candidate
                    logger.info("Found dataset %s via search: %s", dataset_name, candidate)
                    break
            if file_path:
                break
    
    if not file_path or not file_path.exists():
        logger.error("Dataset '%s' not found. Searched primary and fallback paths.", dataset_name)
        return JsonResponse({
            "error": f"Dataset '{dataset_name}' not found.",
            "searched_paths": [
                str(DATASET_CSV_PATHS.get(dataset_name, "N/A")),
                *[str(p) for p in DATASET_CSV_FALLBACKS.get(dataset_name, [])]
            ]
        }, status=404)
    
    # Serve the CSV file
    try:
        with file_path.open("r", encoding="utf-8") as f:
            content = f.read()
        resp = HttpResponse(content, content_type="text/csv; charset=utf-8")
        safe_name = dataset_name.lower().replace(" ", "_").replace("/", "_")
        resp["Content-Disposition"] = f'attachment; filename="{safe_name}.csv"'
        resp["Content-Length"] = str(len(content.encode("utf-8")))
        logger.info("Successfully serving dataset %s from %s", dataset_name, file_path)
        return resp
    except Exception as exc:
        logger.error("Failed to serve dataset %s from %s: %s", dataset_name, file_path, exc, exc_info=True)
        return JsonResponse({"error": f"Failed to read dataset file: {str(exc)}"}, status=500)


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
