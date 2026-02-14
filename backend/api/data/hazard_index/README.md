# Hazard Index

**Hazard Index** = AHP-weighted multi-hazard severity (flood, landslide, earthquake, typhoon, rainfall) per barangay (0–100).

- **model_artifacts/** — LSTM model + feature/target scalers. Written by `training/hazard_index.ipynb`.
- **outputs/** — `hazard_index_data.json` (yearly per barangay, 2020–2030). Served by `GET /api/hazard/hazard-index/`.
