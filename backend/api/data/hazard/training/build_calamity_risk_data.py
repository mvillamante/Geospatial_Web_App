"""
Builds yearly calamity risk likelihood data (2020–2030) per barangay.

Inputs (must exist in the project root):
- green_index_data.json     : yearly green index per barangay
- hazard_index_data.json    : yearly hazard index per barangay (incl. LSTM projections 2026–2030)
- lstm_training_data.csv    : monthly training data with `exposure` per barangay

Output:
- calamity_risk_data.json   : yearly calamity risk likelihood per barangay

Methodology (multiplicative approach):
- Each component is expressed on a 0–1 scale:
  - Hazard component  (H):   hazard_index_raw  (already 0–1 from hazard_index_data.json)
  - Exposure component (E):  exposure index    (derived from training data, 0–1)
  - Environmental component (G): green_index   (converted from 0–100 to 0–1)

- Calamity Risk Likelihood (CRL) is computed as:

      CRL = H × E × (1 - G)

  where:
    - H   = hazard severity
    - E   = exposure (population + infrastructure)
    - G   = environmental capacity (green index; higher is better)

The output JSON stores CRL both as 0–1 (`calamity_risk_raw`) and 0–100
(`calamity_risk`), together with the underlying components so the web
visualization can show details in the info panel.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Any

import pandas as pd


# Paths relative to api/data — read from hazard, write to calamity_risk (served by API)
_DATA_DIR = Path(__file__).resolve().parent.parent.parent  # api/data
GREEN_PATH = _DATA_DIR / "hazard" / "outputs" / "green_index_data.json"
HAZARD_PATH = _DATA_DIR / "hazard" / "outputs" / "hazard_index_data.json"
TRAINING_PATH = _DATA_DIR / "hazard" / "datasets" / "lstm_training_data.csv"
OUTPUT_PATH = _DATA_DIR / "calamity_risk" / "outputs" / "calamity_risk_data.json"
FORECAST_PATH = _DATA_DIR / "calamity_risk" / "outputs" / "calamity_risk_forecast_data.json"

# Poblacion is displayed as the average of Barangay Uno, Dos, Tres
POBLACION_SOURCE_BARANGAYS = ("Barangay Uno", "Barangay Dos", "Barangay Tres")

# Minimum exposure (0–1) so low-exposure barangays (e.g. Sala) still show a visible CRL
MIN_EXPOSURE_NORM = 0.35


def _load_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Required JSON file not found: {path}")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _load_exposure_from_training(path: Path) -> Dict[str, float]:
    """
    Derive a stable exposure index per barangay from the LSTM training data.

    The calamity_risk.ipynb notebook defines:
        exposure = 0.6 * normalize(population) + 0.4 * normalize(infra_count)
    on a 0–100 scale.

    We collapse monthly values into a single representative 0–1 score per
    barangay by taking the mean over all available months and dividing by 100.
    """
    if not path.exists():
        raise FileNotFoundError(f"Training data not found: {path}")

    df = pd.read_csv(path)
    if "barangay" not in df.columns or "exposure" not in df.columns:
        raise ValueError(
            "Training data must contain 'barangay' and 'exposure' columns."
        )

    expo_mean = (
        df.groupby("barangay")["exposure"]
        .mean()
        .clip(lower=0.0)  # safety guard
    )

    # Convert from 0–100 to 0–1
    expo_norm = (expo_mean / 100.0).clip(0.0, 1.0)

    # Fallback if something odd happens
    overall_default = float(expo_norm.mean()) if not expo_norm.empty else 0.5

    exposure_lookup: Dict[str, float] = {
        str(brgy): float(val) for brgy, val in expo_norm.items()
    }
    exposure_lookup["__DEFAULT__"] = overall_default

    return exposure_lookup


def _poblacion_from_three(
    year_data: Dict[str, Any], source_names: tuple
) -> Dict[str, Any] | None:
    """Build Poblacion entry as average of Barangay Uno, Dos, Tres. Returns None if any missing."""
    entries = [year_data.get(b) for b in source_names]
    if any(e is None for e in entries):
        return None
    n = len(entries)
    crl_raw_avg = sum(e["calamity_risk_raw"] for e in entries) / n
    return {
        "calamity_risk": round(crl_raw_avg * 100.0, 2),
        "calamity_risk_raw": round(crl_raw_avg, 4),
        "risk_class": _classify_crl(crl_raw_avg),
        "hazard_index": round(sum(e["hazard_index"] for e in entries) / n, 2),
        "hazard_index_raw": round(sum(e["hazard_index_raw"] for e in entries) / n, 4),
        "green_index": round(sum(e["green_index"] for e in entries) / n, 2),
        "green_index_raw": round(sum(e["green_index_raw"] for e in entries) / n, 4),
        "exposure_norm": round(sum(e["exposure_norm"] for e in entries) / n, 4),
    }


def _classify_crl(raw: float) -> str:
    """
    Map calamity risk likelihood (0–1) to qualitative class.

    Thresholds mirror the five-zone scheme used for hazard index:
        0.00–0.20 : Very Low
        0.20–0.40 : Low
        0.40–0.60 : Moderate
        0.60–0.80 : High
        0.80–1.00 : Very High
    """
    if raw < 0.20:
        return "Very Low"
    if raw < 0.40:
        return "Low"
    if raw < 0.60:
        return "Moderate"
    if raw < 0.80:
        return "High"
    return "Very High"


def main() -> None:
    print("=== Building calamity_risk_data.json ===")
    print(f"Output: {OUTPUT_PATH}")

    green_data = _load_json(GREEN_PATH)
    hazard_data = _load_json(HAZARD_PATH)
    exposure_lookup = _load_exposure_from_training(TRAINING_PATH)

    print(f"- Years in hazard_index_data: {sorted(hazard_data.keys())}")

    # Only consider years present in hazard_index_data.json, since this already
    # includes LSTM-based projections for 2026–2030.
    years = sorted(int(y) for y in hazard_data.keys())

    # Identify all barangays that appear in hazard_index_data
    all_barangays = set()
    for year_str, brgy_dict in hazard_data.items():
        all_barangays.update(brgy_dict.keys())
    print(f"- Barangays in hazard_index_data: {sorted(all_barangays)}")

    # Convert green index JSON years to int keys for easier matching
    green_by_year: Dict[int, Dict[str, Any]] = {
        int(y): brgys for y, brgys in green_data.items()
    }

    out: Dict[str, Dict[str, Any]] = {}

    for year in years:
        year_str = str(year)
        out[year_str] = {}

        hazard_year = hazard_data.get(year_str, {})
        green_year = green_by_year.get(year, {})

        for brgy, h_entry in hazard_year.items():
            # Hazard component H: hazard_index_raw (already 0–1)
            h_raw = float(h_entry.get("hazard_index_raw", 0.0))
            h_raw = max(0.0, min(1.0, h_raw))

            # Exposure component E: per-barangay value (0–1), with floor so CRL is visible
            e_raw = float(exposure_lookup.get(brgy, exposure_lookup["__DEFAULT__"]))
            e_raw = max(MIN_EXPOSURE_NORM, min(1.0, e_raw))

            # Environmental component G: green_index from 0–100 → 0–1
            g_entry = green_year.get(brgy) or {}
            g_idx = float(g_entry.get("green_index", 0.0))
            g_raw = max(0.0, min(1.0, g_idx / 100.0))

            # Calamity Risk Likelihood (0–1) — multiplicative: CRL = H × E × (1−G)
            crl_raw = h_raw * e_raw * (1.0 - g_raw)
            crl_raw = max(0.0, min(1.0, crl_raw))
            crl_100 = crl_raw * 100.0

            out[year_str][brgy] = {
                # Main calamity risk index
                "calamity_risk": round(crl_100, 2),
                "calamity_risk_raw": round(crl_raw, 4),
                "risk_class": _classify_crl(crl_raw),
                # Components for visualization / debugging
                "hazard_index": float(h_entry.get("hazard_index", 0.0)),
                "hazard_index_raw": round(h_raw, 4),
                "green_index": g_idx,
                "green_index_raw": round(g_raw, 4),
                "exposure_norm": round(e_raw, 4),
            }

        # Poblacion = average of Barangay Uno, Dos, Tres for consistent CRL view
        poblacion_entry = _poblacion_from_three(out[year_str], POBLACION_SOURCE_BARANGAYS)
        if poblacion_entry is not None:
            out[year_str]["Poblacion"] = poblacion_entry

    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)

    print(f"[OK] Saved calamity risk data to: {OUTPUT_PATH}")
    print(f"  Years: {years[0]}–{years[-1]}  | Barangays: {len(all_barangays)}")

    # Patch forecast JSON: consistent E from training, CRL = H×E×(1−G), add Poblacion
    if FORECAST_PATH.exists():
        forecast = _load_json(FORECAST_PATH)
        for year_str, year_data in forecast.items():
            for brgy, entry in list(year_data.items()):
                h_raw = max(0.0, min(1.0, float(entry.get("hazard_index_raw", 0.0))))
                g_raw = max(0.0, min(1.0, float(entry.get("green_index_raw", 0.0))))
                e_raw = float(exposure_lookup.get(brgy, exposure_lookup["__DEFAULT__"]))
                e_raw = max(MIN_EXPOSURE_NORM, min(1.0, e_raw))
                crl_raw = h_raw * e_raw * (1.0 - g_raw)
                crl_raw = max(0.0, min(1.0, crl_raw))
                entry["exposure_norm"] = round(e_raw, 4)
                entry["calamity_risk_raw"] = round(crl_raw, 4)
                entry["calamity_risk"] = round(crl_raw * 100.0, 2)
                entry["risk_class"] = _classify_crl(crl_raw)
            poblacion_entry = _poblacion_from_three(year_data, POBLACION_SOURCE_BARANGAYS)
            if poblacion_entry is not None:
                forecast[year_str]["Poblacion"] = poblacion_entry
        with FORECAST_PATH.open("w", encoding="utf-8") as f:
            json.dump(forecast, f, indent=2)
        print(f"[OK] Patched forecast (exposure + CRL formula + Poblacion) to: {FORECAST_PATH}")


if __name__ == "__main__":
    main()

