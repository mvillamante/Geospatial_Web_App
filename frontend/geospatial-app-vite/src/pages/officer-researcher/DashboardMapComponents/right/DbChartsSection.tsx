import React from "react";
import {
  GreenIndexScoresChart,
  CalamityRiskBarangayChart,
  EarthquakeFrequencyChart,
  TyphoonFrequencyChart,
  HazardIndexBarangayChart,
} from "../../../../components/ui/AnalyticsCharts";
import "../../DashboardMapPage.css";

interface Props {
  universalGreenAvg?: number | null;
  universalHazardAvg?: number | null;
  universalCalamityAvg?: number | null;
  mapView?: string;
  selected?: string;
  year?: number;
  greenCityAverage?: number | null;
  hazardCityAverage?: number | null;
  calamityCityAverage?: number | null;
  getGreenIndexColor?: (val: number) => string;
  getCalamityRiskColor?: (val: number) => string;
}

const DbChartsSection: React.FC<Props> = ({
  universalGreenAvg,
  universalHazardAvg,
  universalCalamityAvg,
  mapView,
  selected,
  year,
  greenCityAverage,
  hazardCityAverage,
  calamityCityAverage,
  getGreenIndexColor,
  getCalamityRiskColor,
}) => {
  return (
    <>
        <h4>Data Visualization</h4>
        <div className="rowpanel-card">
            {/* Avg Risk Index */}
            <div className={`panel-card idx-summary-card ${universalCalamityAvg != null ? "idx-active calamity-active" : ""}`}>
            <span className="panel-card-sub-title">Avg Risk Index</span>
            <span className="panel-card-value idx-value calamity-idx-value">
                {universalCalamityAvg != null ? universalCalamityAvg.toFixed(1) + "%" : "—"}
            </span>
            </div>

            {/* Green Index */}
            <div className={`panel-card idx-summary-card ${universalGreenAvg != null ? "idx-active green-active" : ""}`}>
            <span className="panel-card-sub-title">Green Index</span>
            <span className="panel-card-value idx-value green-idx-value">
                {universalGreenAvg != null ? universalGreenAvg.toFixed(1) : "—"}
            </span>
            </div>

            {/* Hazard Index */}
            <div className={`panel-card idx-summary-card ${universalHazardAvg != null ? "idx-active hazard-active" : ""}`}>
            <span className="panel-card-sub-title">Hazard Index</span>
            <span className="panel-card-value idx-value hazard-idx-value">
                {universalHazardAvg != null ? universalHazardAvg.toFixed(1) : "—"}
            </span>
            </div>
        </div>

        {/* City-specific detail cards (for choropleth view) */}
        {mapView === "choropleth" && selected === "hazard" && (
            <div className="panel-card hazard-city-avg-card">
                <div className="hazard-city-avg-label">City Average Hazard Index</div>
                <div className="hazard-city-avg-value">
                    {hazardCityAverage != null
                    ? hazardCityAverage.toFixed(1) 
                    : "—"}
                    </div>
                <div className="hazard-city-avg-subtitle">LSTM Hazard Assessment (2020–2030)</div>
            </div>
        )}

        {mapView === "choropleth" && selected === "green" && (
            <div className="panel-card green-city-avg-card">
                <div className="green-city-avg-label">City Average Green Index</div>
                <div className="green-city-avg-value" style={{ color: greenCityAverage != null ? getGreenIndexColor?.(greenCityAverage) : "#27ae60" }}>
                    {greenCityAverage != null
                        ? greenCityAverage.toFixed(1)
                        : "—"}
                </div>
                <div className="green-city-avg-subtitle">NDVI Vegetation Assessment (2020–2030)</div>
            </div>
        )}

        {mapView === "choropleth" && selected === "calamity" && (
            <div className="panel-card calamity-city-avg-card">
                <div className="calamity-city-avg-label">City Average Calamity Risk Likelihood</div>
                <div className="calamity-city-avg-value" style={{ color: getCalamityRiskColor?.(calamityCityAverage ?? 0) }}>
                    {calamityCityAverage != null
                        ? calamityCityAverage.toFixed(1) + "%"
                        : "—"}
                </div>
                <div className="calamity-city-avg-subtitle">Multi-Source Geospatial Analytics | Hazard, Exposure, Green Index (2020–2030)</div>
            </div>
        )}

        {/* Charts */}
        <div className="panel-card"><span className="panel-card-title">Green Index Scores</span><GreenIndexScoresChart /></div>
        <div className="panel-card"><span className="panel-card-title">Hazard Index by Barangay</span><HazardIndexBarangayChart year={year} /></div>
        <div className="panel-card"><span className="panel-card-title">Calamity Risk Likelihood</span><CalamityRiskBarangayChart /></div>
        <div className="panel-card"><span className="panel-card-title">Earthquake Frequency</span><EarthquakeFrequencyChart /></div>
        <div className="panel-card"><span className="panel-card-title">Typhoon Frequency & Intensity</span><TyphoonFrequencyChart /></div>
    </>
  );
};

export default DbChartsSection;
