# Calamity Risk

**Calamity Risk Likelihood** = composite index (0–100): `0.5*Hazard + 0.3*Exposure + 0.2*(1 - GreenIndex)`.

- **model_artifacts/** — `model_config.json`, LSTM model, feature/target scalers. Written by `training/calamity_risk.ipynb`.
- **outputs/** — `calamity_risk_data.json` (formula-based), `calamity_risk_forecast_data.json` (LSTM-projected). Served by `GET /api/hazard/calamity-risk/` and `GET /api/hazard/calamity-risk/forecast/`.
