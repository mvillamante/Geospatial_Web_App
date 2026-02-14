# Green Index

**Green Index** = NDVI-based environmental/vegetation health (0–100) per barangay.

- **model_artifacts/** — `gi_model_config.json`, LSTM + RF + GB models, feature/target scalers. Written by `training/green_index.ipynb`.
- **outputs/** — `green_index_data.json` (yearly per barangay, 2000–2030). Served by `GET /api/hazard/green-index/`.
