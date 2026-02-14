# Training pipeline

Notebooks and scripts for training and projecting the hazard indices.

| File | Purpose |
|------|---------|
| **green_index.ipynb** | Train Green Index models (LSTM, RF, GB); save to `../green_index/model_artifacts/`, output to `../green_index/outputs/` |
| **hazard_index.ipynb** | Train Hazard Index LSTM; save to `../hazard_index/model_artifacts/`, output to `../hazard_index/outputs/` |
| **calamity_risk.ipynb** | Train Calamity Risk LSTM; save to `../calamity_risk/model_artifacts/` |
| **projection.ipynb** | Generate 2026–2030 projections; write to `../calamity_risk/outputs/calamity_risk_forecast_data.json` |
| **build_calamity_risk_data.py** | Build formula-based calamity risk JSON → `../calamity_risk/outputs/calamity_risk_data.json` |

**Important:** Set `BASE_PATH` (or equivalent) in each notebook to the root `api/data/` directory so that:
- Inputs are read from `../datasets/<purpose>/`.
- Artifacts and outputs are written to the correct `../<index>/model_artifacts/` and `../<index>/outputs/` folders.
