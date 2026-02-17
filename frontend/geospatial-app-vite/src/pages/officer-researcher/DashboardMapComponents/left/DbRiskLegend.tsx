import React from "react";
import "../../DashboardMapPage.css";

interface DbRiskLegendProps {
  selectedLayer: string;
}

const DbRiskLegend: React.FC<DbRiskLegendProps> = ({ selectedLayer }) => {
  if (!selectedLayer || selectedLayer === "none") {
    return (
      <div className="risklegend-container panel-card index-legend-none">
        <h4>Index Legend</h4>
        <ul className="index-legend-three">
          <li><span className="legend-swatch index-green" /> Green Index</li>
          <li><span className="legend-swatch index-hazard" /> Hazard Index</li>
          <li><span className="legend-swatch index-crl" /> Calamity Risk Likelihood</li>
        </ul>
      </div>
    );
  }

  switch (selectedLayer) {
    case "hazard":
      return (
        <div className="risklegend-container panel-card">
          <h4>Hazard Index Scale</h4>
          <p className="hazard-scale-map-note">Hazard Index Scale is displayed on the map</p>
        </div>
      );
    case "green":
      return (
        <div className="risklegend-container panel-card">
          <h4>Green Index Scale</h4>
          <p className="hazard-scale-map-note">Green Index Scale is displayed on the map</p>
        </div>
      );
    case "calamity":
      return (
        <div className="risklegend-container panel-card">
          <h4>Risk Likelihood Scale</h4>
          <p className="hazard-scale-map-note">Risk Likelihood Scale is displayed on the map</p>
        </div>
      );
    default:
      return (
        <div className="risklegend-container panel-card">
          <h4>Index Legend</h4>
          <ul>
            <li className="low">Low Risk</li>
            <li className="moderate">Moderate Risk</li>
            <li className="high">High Risk</li>
            <li className="critical">Critical Risk</li>
          </ul>
        </div>
      );
  }
};

export default DbRiskLegend;
