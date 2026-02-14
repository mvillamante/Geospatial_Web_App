# Hazard Analysis & Calamity Risk Data

> **Purpose:** This directory holds all data, model artifacts, training pipelines, and precomputed outputs for **Cabuyao, Laguna** barangay-level hazard analysis and calamity risk projection (2020–2025 historical results and 2026–2030 predictions).

Data is organized in two ways:
1. **Datasets by purpose** — raw and processed inputs grouped by type (weather, population, hazards, etc.).
2. **Components by index** — each of Green Index, Hazard Index, and Calamity Risk has its own folder with `model_artifacts/` and `outputs/`.

---

## Directory Structure

```
api/data/
├── datasets/                      # Input data grouped by purpose
│   ├── weather/                   # Temperature, humidity, rainfall
│   │   └── weather_data.csv
│   ├── population/                 # Population per barangay over time
│   │   └── population_barangay.csv
│   ├── hazards/                    # Earthquake and typhoon events
│   │   ├── earthquake_freq.csv
│   │   └── typhoon_freq.csv
│   ├── susceptibility/            # Flood and landslide susceptibility
│   │   ├── flood_susceptibility.csv
│   │   └── landslide_susceptibility.csv
│   ├── infrastructure/            # Infrastructure counts
│   │   └── infrastructure.csv
│   ├── vegetation/                # NDVI and green index source data
│   │   ├── green_index_complete.csv
│   │   └── green_index_barangay.csv
│   ├── training/                  # Combined LSTM training dataset
│   │   └── lstm_training_data.csv
│   └── geography/                 # Barangay boundaries (GeoJSON)
│       └── cabuyao_barangays.geojson
│
├── green_index/                   # Green Index (NDVI-based environmental health)
│   ├── model_artifacts/           # Config + trained model + scalers
│   │   ├── gi_model_config.json
│   │   ├── lstm_green_index.keras
│   │   ├── gi_feature_scaler.joblib
│   │   ├── gi_target_scaler.joblib
│   │   ├── rf_green_index.joblib
│   │   └── gb_green_index.joblib
│   └── outputs/
│       └── green_index_data.json  # Yearly green index per barangay (2000–2030)
│
├── hazard_index/                  # Hazard Index (multi-hazard severity)
│   ├── model_artifacts/           # Trained LSTM + scalers
│   │   ├── lstm_hazard_index.keras
│   │   ├── hi_feature_scaler.joblib
│   │   └── hi_target_scaler.joblib
│   └── outputs/
│       └── hazard_index_data.json # Yearly hazard index per barangay (2020–2030)
│
├── calamity_risk/                 # Calamity Risk Likelihood (composite)
│   ├── model_artifacts/           # Config + LSTM + scalers
│   │   ├── model_config.json
│   │   ├── lstm_calamity_model.keras
│   │   ├── feature_scaler.joblib
│   │   └── target_scaler.joblib
│   └── outputs/
│       ├── calamity_risk_data.json        # Formula-based (2020–2030)
│       └── calamity_risk_forecast_data.json # LSTM-projected (2020–2030)
│
├── training/                      # Notebooks and scripts for ML pipeline
│   ├── calamity_risk.ipynb
│   ├── green_index.ipynb
│   ├── hazard_index.ipynb
│   ├── projection.ipynb
│   └── build_calamity_risk_data.py
│
├── hazard/                        # [Legacy] Old flat layout; prefer paths above
└── README.md                      # This file
```

---

## Datasets by Purpose

| Folder | Purpose | Main files |
|--------|---------|------------|
| **weather** | Climate inputs for indices and LSTM | `weather_data.csv` (temp, humidity, rainfall) |
| **population** | Population per barangay over time | `population_barangay.csv` |
| **hazards** | Earthquake and typhoon event data | `earthquake_freq.csv`, `typhoon_freq.csv` |
| **susceptibility** | Flood and landslide risk scores per barangay | `flood_susceptibility.csv`, `landslide_susceptibility.csv` |
| **infrastructure** | Infrastructure count per barangay | `infrastructure.csv` |
| **vegetation** | NDVI and green index source data | `green_index_complete.csv`, `green_index_barangay.csv` |
| **training** | Combined monthly training data for LSTM | `lstm_training_data.csv` |
| **geography** | Barangay boundary geometries | `cabuyao_barangays.geojson` |

When adding or updating data, place files in the folder that matches their purpose so other contributors can find them easily.

---

## Index Components

| Index | Folder | model_artifacts | outputs |
|-------|--------|-----------------|---------|
| **Green Index** | `green_index/` | Config + LSTM + RF + GB + scalers | `green_index_data.json` |
| **Hazard Index** | `hazard_index/` | LSTM + scalers | `hazard_index_data.json` |
| **Calamity Risk** | `calamity_risk/` | Config + LSTM + scalers | `calamity_risk_data.json`, `calamity_risk_forecast_data.json` |

Training notebooks write **model_artifacts** and **outputs** into these index-specific folders. The backend API serves from the `outputs/` paths (see [Backend integration](#backend-integration)).

---

## For Guest ML Contributors

- **Training and projection** scripts live in `training/`. Open the notebooks there and set `BASE_PATH` (or equivalent) to this `api/data/` directory so that:
  - Inputs are read from `datasets/<purpose>/`.
  - Artifacts are saved to `<index>/model_artifacts/`.
  - Output JSONs are written to `<index>/outputs/`.
- **Adding new data:** put CSVs (or other files) in the appropriate `datasets/<purpose>/` folder, then re-run the training/projection pipeline.
- **Changing weights or parameters:** edit the training notebooks (architecture, hyperparameters, feature list) and/or the config JSONs in the index `model_artifacts/` folders, then retrain. Updated artifacts and outputs will be written to the same index folders.

See the rest of this README and the in-folder READMEs for more detail.

---

## Backend Integration

The Django backend uses `HAZARD_DATA_DIR = BASE_DIR / 'api' / 'data'` and serves:

| Endpoint | Source path |
|----------|-------------|
| `GET /api/hazard/calamity-risk/` | `calamity_risk/outputs/calamity_risk_data.json` |
| `GET /api/hazard/calamity-risk/forecast/` | `calamity_risk/outputs/calamity_risk_forecast_data.json` |
| `GET /api/hazard/green-index/` | `green_index/outputs/green_index_data.json` |
| `GET /api/hazard/hazard-index/` | `hazard_index/outputs/hazard_index_data.json` |
| `GET /api/hazard/barangays/` | `datasets/geography/cabuyao_barangays.geojson` |
| `GET /api/hazard/model-info/` | Configs and file presence in each index `model_artifacts/` and `outputs/` |

---

## Methodology (summary)

- **Calamity Risk Likelihood (CRL)** = `0.5 * Hazard + 0.3 * Exposure + 0.2 * (1 - GreenIndex)`
- **Hazard Index:** AHP-weighted — flood (0.25), landslide (0.20), earthquake (0.20), typhoon (0.20), rainfall (0.15)
- **Exposure:** Population (0.60) + infrastructure (0.40)
- **Green Index:** NDVI-based environmental/vegetation health (0–100)

For full methodology, dataset schemas, and step-by-step retraining, see the previous detailed README content (e.g. in `hazard/README.md` or project docs).
