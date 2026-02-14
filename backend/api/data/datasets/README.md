# Datasets (by purpose)

Input data for hazard analysis and calamity risk models, grouped by **purpose**.

| Folder | Purpose | Files |
|--------|---------|-------|
| **weather/** | Temperature, humidity, rainfall (city/monthly) | `weather_data.csv` |
| **population/** | Population per barangay over time | `population_barangay.csv` |
| **hazards/** | Earthquake and typhoon event data | `earthquake_freq.csv`, `typhoon_freq.csv` |
| **susceptibility/** | Flood and landslide susceptibility per barangay | `flood_susceptibility.csv`, `landslide_susceptibility.csv` |
| **infrastructure/** | Infrastructure count per barangay | `infrastructure.csv` |
| **vegetation/** | NDVI and green index source data | `green_index_complete.csv`, `green_index_barangay.csv` |
| **training/** | Combined monthly LSTM training dataset | `lstm_training_data.csv` |
| **geography/** | Barangay boundary geometries | `cabuyao_barangays.geojson` |

When adding or updating data, place files in the folder that matches their purpose. Training notebooks and scripts should read from these paths (e.g. `datasets/weather/weather_data.csv`).
