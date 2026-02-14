# Hazard (legacy flat layout)

**This folder is kept for backward compatibility.** The canonical layout is now one level up:

- **Datasets by purpose:** `../datasets/` (weather, population, hazards, susceptibility, infrastructure, vegetation, training, geography)
- **Green Index:** `../green_index/` (model_artifacts, outputs)
- **Hazard Index:** `../hazard_index/` (model_artifacts, outputs)
- **Calamity Risk:** `../calamity_risk/` (model_artifacts, outputs)
- **Training notebooks:** `../training/`

See **../README.md** for the full directory structure, dataset purposes, index components, and backend integration.

---

## Overview (unchanged)

This system uses **LSTM neural networks** (with Random Forest and Gradient Boosting as baselines for Green Index) to model and predict:

| Model | Scope | Historical Period | Prediction Period |
|-------|-------|-------------------|-------------------|
| **Calamity Risk Likelihood** | Multi-hazard composite risk | 2020–2025 | 2026–2030 |
| **Green Index** | NDVI-based vegetation/environmental health | 2000–2025 | 2026–2030 |
| **Hazard Index** | Multi-hazard severity (flood, landslide, earthquake, typhoon, rainfall) | 2020–2025 | 2026–2030 |

**Methodology (AHP-informed):**
- **Calamity Risk Likelihood (CRL)** = `0.5 * Hazard + 0.3 * Exposure + 0.2 * (1 - GreenIndex)`
- **Hazard Index**: Weighted combination — flood (0.25), landslide (0.20), earthquake (0.20), typhoon (0.20), rainfall (0.15)
- **Exposure**: Population density (0.60) + infrastructure density (0.40)

---

## For Guest ML Contributors

Welcome! If you are working on the machine learning models for this project, here is your quick-start guide.

### What you can change

| What | Where | Effect |
|------|-------|--------|
| **Model architecture** (layers, units, dropout) | `training/calamity_risk.ipynb`, `training/green_index.ipynb`, `training/hazard_index.ipynb` | Changes the neural network structure |
| **Hyperparameters** (learning rate, epochs, batch size) | Same notebooks above | Affects training behavior and convergence |
| **Feature list** | `model_artifacts/model_config.json` (`feature_cols`) and in the training notebooks | Changes which input variables the model uses |
| **Sequence length** (lookback window) | `model_artifacts/model_config.json` (`sequence_length`) and in notebooks | Changes how many past time steps the LSTM sees |
| **AHP weights** (hazard, exposure, environmental) | `training/build_calamity_risk_data.py` and `training/projection.ipynb` | Changes how component indices combine into calamity risk |
| **Scenario assumptions** (population growth, climate trend) | `training/projection.ipynb` | Changes how 2026–2030 future inputs are generated |
| **Training data** | `datasets/` (add or replace CSVs) | Model trains on updated/extended data |

### What you should NOT change

- The **output JSON structure** in `outputs/` (the backend API reads these files in a specific format).
- The **barangay names** (must match `cabuyao_barangays.geojson` feature names).
- The **file names** in `model_artifacts/` (backend and projection code reference these exact names).

### Workflow for retraining

```
1. Edit training notebook(s) — change architecture, hyperparams, features
2. (Optional) Add new data to datasets/
3. Run the training notebook → saves updated .keras + .joblib to model_artifacts/
4. Run projection.ipynb → generates updated output JSONs to outputs/
5. (Optional) Run build_calamity_risk_data.py → regenerates formula-based calamity risk JSON
6. Commit updated model_artifacts/ and outputs/ files
7. Backend uses the new outputs/ automatically on next restart
```

---

## Models Overview

### 1. Calamity Risk Likelihood (LSTM)

- **Config:** `model_artifacts/model_config.json`
- **Features (12):** temp, humidity, rainfall, population, flood_susceptibility, landslide_susceptibility, ndvi, earthquake_mag, typhoon_severity, infra_count, green_index, hazard_index
- **Target:** `calamity_risk_likelihood`
- **Sequence length:** 6 (months lookback)
- **Artifacts:** `lstm_calamity_model.keras`, `feature_scaler.joblib`, `target_scaler.joblib`

### 2. Green Index (LSTM + RF + GB ensemble)

- **Config:** `model_artifacts/gi_model_config.json`
- **Features (6):** green_index, mean_ndvi, gar, rolling_mean_3yr, gi_trend_3yr, year_norm
- **Target:** `green_index`
- **Sequence length:** 5 (years lookback)
- **Best model:** LSTM (R² = 0.401, MAE = 5.94)
- **Ensemble blend:** alpha=0.4 (ML), beta=0.6 (statistical)
- **Artifacts:** `lstm_green_index.keras`, `gi_feature_scaler.joblib`, `gi_target_scaler.joblib`, `rf_green_index.joblib`, `gb_green_index.joblib`

### 3. Hazard Index (LSTM)

- **Artifacts:** `lstm_hazard_index.keras`, `hi_feature_scaler.joblib`, `hi_target_scaler.joblib`
- **Trained in:** `training/hazard_index.ipynb`

---

## Datasets Schema

### `lstm_training_data.csv` (main training data)

| Column | Type | Description |
|--------|------|-------------|
| `date` | datetime | Monthly timestamp (YYYY-MM-DD) |
| `barangay` | string | Barangay name (18 barangays) |
| `temp` | float | Temperature (°C) |
| `humidity` | float | Humidity (%) |
| `rainfall` | float | Rainfall (mm) |
| `population` | float | Estimated population |
| `flood_susceptibility` | float | Flood risk score |
| `landslide_susceptibility` | float | Landslide risk score |
| `ndvi` | float | Normalized Difference Vegetation Index |
| `earthquake_mag` | float | Maximum earthquake magnitude |
| `typhoon_severity` | float | Maximum typhoon severity |
| `infra_count` | float | Infrastructure count |
| `green_index` | float | Computed green index (0–100) |
| `hazard_index` | float | Computed hazard index (0–100) |
| `calamity_risk_likelihood` | float | Target variable (0–100) |

### Barangays (18)

Baclaran, Banay-Banay, Banlic, Barangay Dos, Barangay Tres, Barangay Uno, Bigaa, Butong, Casile, Diezmo, Gulod, Mamatid, Marinig, Niugan, Pittland, Pulo, Sala, San Isidro

---

## Training & Retraining Guide

### Prerequisites

```bash
pip install tensorflow pandas numpy scikit-learn joblib matplotlib
```

> TensorFlow 2.x is required. The notebooks were developed with TensorFlow 2.20+ and Keras 3.13+.

### Step 1: Train the models

Open and run the notebooks **in this order** (each saves its artifacts to `model_artifacts/`):

1. **`training/green_index.ipynb`** → produces:
   - `lstm_green_index.keras`, `gi_feature_scaler.joblib`, `gi_target_scaler.joblib`
   - `rf_green_index.joblib`, `gb_green_index.joblib`
   - `gi_model_config.json`

2. **`training/hazard_index.ipynb`** → produces:
   - `lstm_hazard_index.keras`, `hi_feature_scaler.joblib`, `hi_target_scaler.joblib`

3. **`training/calamity_risk.ipynb`** → produces:
   - `lstm_calamity_model.keras`, `feature_scaler.joblib`, `target_scaler.joblib`
   - `model_config.json`

> **Important:** Before running these notebooks, update the `BASE_PATH` variable at the top of each notebook to point to your local `api/data/hazard/` directory. For example:
> ```python
> BASE_PATH = Path(__file__).resolve().parent.parent  # adjust to your setup
> ```

### Step 2: Generate projections (2026–2030)

4. **`training/projection.ipynb`** → produces:
   - `calamity_risk_forecast_data.json` (LSTM-driven 2026–2030 projections)

5. **`training/build_calamity_risk_data.py`** → produces:
   - `calamity_risk_data.json` (formula-based calamity risk for all years)

Move or save outputs to the `outputs/` folder so the backend serves the latest data.

### Step 3: Commit and push

```bash
git add api/data/hazard/model_artifacts/
git add api/data/hazard/outputs/
git commit -m "Update hazard model artifacts and projections"
git push
```

---

## Projection Pipeline

The `training/projection.ipynb` notebook performs the **2026–2030 multi-step forecast**:

1. **Loads** the trained LSTM model, scalers, and config from `model_artifacts/`.
2. **Loads** historical training data from `datasets/lstm_training_data.csv`.
3. **Builds scenario inputs** for 2026–2030:
   - **Weather:** seasonal pattern (monthly mean from history) + linear trend.
   - **NDVI:** seasonal per-barangay pattern + trend.
   - **Population:** CAGR extrapolation from last known per barangay.
   - **Earthquake/Typhoon:** historical monthly mean statistics.
   - **Flood/Landslide susceptibility, infrastructure:** last known (static).
4. **Computes** Green Index, Hazard Index, and Exposure for scenario rows.
5. **Runs LSTM rollout:** for each future month, feeds last 6 months → predicts next month's calamity risk → rolls forward.
6. **Outputs** yearly aggregated results per barangay as JSON.

---

## Feeding New Data

When new data becomes available (e.g., 2026 actual observations):

### 1. Update the CSVs in `datasets/`

- Append new rows to `lstm_training_data.csv` (same columns as above).
- Update `weather_data.csv`, `population_barangay.csv`, `earthquake_freq.csv`, `typhoon_freq.csv` with new records.
- If NDVI data has changed, update `green_index_complete.csv` and `green_index_barangay.csv`.

### 2. Retrain the models

Run the training notebooks (Step 1 above). The models will learn from the extended dataset and update the weights in `model_artifacts/`.

### 3. Regenerate projections

Run `projection.ipynb` to shift the prediction window (e.g., now 2027–2031 if you have 2026 actual data).

### 4. Commit and push the updated artifacts and outputs

The backend will serve the new data after deployment.

---

## Backend Integration

The Django backend serves hazard data through these API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/hazard/calamity-risk/` | GET | Calamity risk data (2020–2030), with optional `?year=` filter |
| `/api/hazard/calamity-risk/forecast/` | GET | LSTM-projected calamity risk (2020–2030 forecast), with optional `?year=` filter |
| `/api/hazard/green-index/` | GET | Green index data (2000–2030), with optional `?year=` filter |
| `/api/hazard/hazard-index/` | GET | Hazard index data (2020–2030), with optional `?year=` filter |
| `/api/hazard/barangays/` | GET | Barangay boundary GeoJSON |

**How it works:** The backend reads the precomputed JSON files from `api/data/hazard/outputs/` and the GeoJSON from `api/data/hazard/datasets/`. No model inference happens at request time — only serving pre-generated data.

**Path configuration:** Defined in `djangobackend/settings.py`:
```python
HAZARD_DATA_DIR = BASE_DIR / 'api' / 'data' / 'hazard'
```

---

## Environment Setup

### For backend developers (serving only)
No extra dependencies needed — the backend serves JSON files.

### For ML contributors (training and retraining)

```bash
# From the backend directory
pip install tensorflow>=2.15 pandas numpy scikit-learn joblib matplotlib
```

Or create a dedicated environment:
```bash
python -m venv ml-env
ml-env\Scripts\activate    # Windows
pip install tensorflow pandas numpy scikit-learn joblib matplotlib jupyter
```

Then open the training notebooks:
```bash
cd backend/api/data/hazard/training
jupyter notebook
```

---

## Contact

If you have questions about the model architecture, training data, or projection methodology, please reach out to the project maintainers or open an issue in the repository.
