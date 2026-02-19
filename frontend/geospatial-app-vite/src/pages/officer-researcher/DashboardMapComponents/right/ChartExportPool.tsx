/**
 * Renders all exportable charts in a hidden off-screen container when the Export tab is active.
 * Ensures every chart is in the DOM for capture, regardless of map view or layer selection.
 */
import React from "react";
import {
  RiskLikelihoodChart,
  GreenIndexProjectionChart,
  HazardIndexTrendChart,
  GreenIndexScoresChart,
  CalamityRiskBarangayChart,
  EarthquakeFrequencyChart,
  TyphoonFrequencyChart,
  HazardIndexBarangayChart,
} from "../../../../components/ui/AnalyticsCharts";
import "../../DashboardMapPage.css";

interface ChartExportPoolProps {
  visible: boolean;
  year?: number;
}

const CHART_WRAPPER_STYLE: React.CSSProperties = {
  width: 800,
  minHeight: 320, // Extra height to include caption
  marginBottom: 20,
  padding: "12px",
  backgroundColor: "#fafafa",
  borderRadius: "8px",
  border: "1px solid #e8e8e8",
};

const ChartExportPool: React.FC<ChartExportPoolProps> = ({ visible, year = 2025 }) => {
  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: -9999,
        top: 0,
        width: 800,
        minHeight: 3000,
        overflow: "hidden",
        zIndex: -1,
        pointerEvents: "none",
        opacity: 0,
      }}
    >
      <div style={CHART_WRAPPER_STYLE}>
        <RiskLikelihoodChart chartId="chart-risk-likelihood" />
      </div>
      <div style={CHART_WRAPPER_STYLE}>
        <GreenIndexProjectionChart chartId="chart-green-index-projection" />
      </div>
      <div style={CHART_WRAPPER_STYLE}>
        <HazardIndexTrendChart chartId="chart-hazard-index-trend" />
      </div>
      <div style={CHART_WRAPPER_STYLE}>
        <GreenIndexScoresChart chartId="chart-green-index-scores" />
      </div>
      <div style={CHART_WRAPPER_STYLE}>
        <CalamityRiskBarangayChart chartId="chart-calamity-risk-barangay" />
      </div>
      <div style={CHART_WRAPPER_STYLE}>
        <EarthquakeFrequencyChart chartId="chart-earthquake-frequency" />
      </div>
      <div style={CHART_WRAPPER_STYLE}>
        <TyphoonFrequencyChart chartId="chart-typhoon-frequency" />
      </div>
      <div style={CHART_WRAPPER_STYLE}>
        <HazardIndexBarangayChart year={year} chartId="chart-hazard-index-barangay" />
      </div>
    </div>
  );
};

export default ChartExportPool;
