import React from "react";
import "../../DashboardMapPage.css";

interface DbRiskLegendProps {
  selectedLayer: string;
}

const DbRiskLegend: React.FC<DbRiskLegendProps> = ({ selectedLayer }) => {
  switch (selectedLayer) {
    case "hazard":
      return (
        <div className="risklegend-container panel-card">
          <div className="hazard-map-risk-scale-title">Hazard Index Scale</div>
          <ul className="hazard-map-risk-scale-list">
            <li className="very-high"><span className="hazard-map-legend-color" /> 80–100: Very High Risk</li>
            <li className="high"><span className="hazard-map-legend-color" /> 60–79: High Risk</li>
            <li className="moderate"><span className="hazard-map-legend-color" /> 40–59: Moderate Risk</li>
            <li className="low"><span className="hazard-map-legend-color" /> 20–39: Low Risk</li>
            <li className="very-low"><span className="hazard-map-legend-color" /> 0–19: Very Low Risk</li>
          </ul>
        </div>
      );
    case "green":
      return (
        <div className="risklegend-container panel-card">
          <div className="green-map-legend-title">Green Index Scale</div>
          <ul className="green-map-legend-list">
            <li className="green-map-legend-item"><span className="green-map-legend-color" style={{ background: "#006400" }} /> 80–100: Very Dense Forest / Parks</li>
            <li className="green-map-legend-item"><span className="green-map-legend-color" style={{ background: "#228B22" }} /> 60-79: Dense Vegetation</li>
            <li className="green-map-legend-item"><span className="green-map-legend-color" style={{ background: "#7CCD7C" }} /> 11-59: Sparse Vegetation</li>
            <li className="green-map-legend-item"><span className="green-map-legend-color" style={{ background: "#CDCD00" }} /> 1-10: Rocks / Sand</li>
            <li className="green-map-legend-item"><span className="green-map-legend-color" style={{ background: "#8B6914" }} /> -1-0: Water /Clouds / Barren Areas</li>
          </ul>
        </div>
      );
    case "calamity":
      return (
        <div className="risklegend-container panel-card">
          <div className="calamity-map-risk-scale-title">Risk Likelihood Scale</div>
            <ul className="calamity-map-risk-scale-list">
              <li className="very-high"><span className="calamity-map-legend-color" /> 80–100%: Very High</li>
              <li className="high"><span className="calamity-map-legend-color" /> 60–79%: High</li>
              <li className="moderate"><span className="calamity-map-legend-color" /> 40–59%: Moderate</li>
              <li className="low"><span className="calamity-map-legend-color" /> 20–39%: Low</li>
              <li className="very-low"><span className="calamity-map-legend-color" /> 0–19%: Very Low</li>
            </ul>
        </div>
      );
  }
};

export default DbRiskLegend;