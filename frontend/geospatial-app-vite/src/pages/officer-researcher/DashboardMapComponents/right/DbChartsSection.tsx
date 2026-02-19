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
  year?: number;
  mapView?: string;
  selected?: string;
  universalGreenAvg?: number | null;
  universalHazardAvg?: number | null;
  universalCalamityAvg?: number | null;
  greenDataByBarangay?: Record<string, any> | null;
  hazardDataByBarangay?: Record<string, any> | null;
  calamityDataByBarangay?: Record<string, any> | null;
}

type IndexSummary = {
  mostName: string;
  mostValue: number;
  lowestName: string;
  lowestValue: number;
  avg: number;
  belowAvgCount: number;
};

function computeIndexSummary(
  data: Record<string, any> | null | undefined,
  valueKey: "green_index" | "hazard_index" | "calamity_risk",
  fallbackAvg: number | null | undefined,
): IndexSummary | null {
  if (!data) return null;
  const entries = Object.entries(data);
  if (!entries.length) return null;

  let mostName = entries[0][0];
  let mostValue = (entries[0][1] as any)?.[valueKey] ?? 0;
  let lowestName = mostName;
  let lowestValue = mostValue;
  let sum = 0;
  let count = 0;

  entries.forEach(([name, raw]) => {
    const value = (raw as any)?.[valueKey];
    if (typeof value !== "number") return;
    if (value > mostValue) {
      mostValue = value;
      mostName = name;
    }
    if (value < lowestValue) {
      lowestValue = value;
      lowestName = name;
    }
    sum += value;
    count += 1;
  });

  const avg = count > 0 ? sum / count : fallbackAvg ?? 0;
  const belowAvgCount = entries.reduce((acc, [, raw]) => {
    const value = (raw as any)?.[valueKey];
    if (typeof value !== "number") return acc;
    return value < avg ? acc + 1 : acc;
  }, 0);

  return {
    mostName,
    mostValue,
    lowestName,
    lowestValue,
    avg,
    belowAvgCount,
  };
}

const DbChartsSection: React.FC<Props> = ({
  year,
  mapView,
  selected,
  universalGreenAvg,
  universalHazardAvg,
  universalCalamityAvg,
  greenDataByBarangay,
  hazardDataByBarangay,
  calamityDataByBarangay,
}) => {
  const showKpis = mapView === "choropleth" && selected && selected !== "none";
  const showSelectLayerComment =
    mapView === "choropleth" && (!selected || selected === "none");

  const isChoroplethGreen = mapView === "choropleth" && selected === "green";
  const isChoroplethHazard = mapView === "choropleth" && selected === "hazard";
  const isChoroplethCalamity = mapView === "choropleth" && selected === "calamity";

  const greenSummary =
    showKpis && selected === "green"
      ? computeIndexSummary(greenDataByBarangay ?? null, "green_index", universalGreenAvg)
      : null;

  const hazardSummary =
    showKpis && selected === "hazard"
      ? computeIndexSummary(hazardDataByBarangay ?? null, "hazard_index", universalHazardAvg)
      : null;

  const calamitySummary =
    showKpis && selected === "calamity"
      ? computeIndexSummary(calamityDataByBarangay ?? null, "calamity_risk", universalCalamityAvg)
      : null;

  const activeSummary =
    selected === "green"
      ? greenSummary
      : selected === "hazard"
      ? hazardSummary
      : selected === "calamity"
      ? calamitySummary
      : null;

  const indexLabel =
    selected === "green"
      ? "Green Index"
      : selected === "hazard"
      ? "Hazard Index"
      : selected === "calamity"
      ? "Calamity Risk Likelihood"
      : "";

  const kpiThemeClass =
    selected === "green"
      ? "index-kpi-green"
      : selected === "hazard"
      ? "index-kpi-hazard"
      : selected === "calamity"
      ? "index-kpi-calamity"
      : "";

  return (
    <>
        <h4>Data Visualization</h4>
        {showSelectLayerComment && (
          <p className="right-panel-select-hint">
            Select a layer to view this.
          </p>
        )}

        {showKpis && activeSummary && (
          <div className={`index-kpi-grid ${kpiThemeClass}`}>
            <div className="index-kpi-card">
              <div className="index-kpi-label">Most {indexLabel} Barangay</div>
              <div className="index-kpi-value">
                {activeSummary.mostName || "—"}
              </div>
              <div className="index-kpi-meta">
                {activeSummary.mostValue.toFixed(1)} {selected === "calamity" ? "%" : ""}
              </div>
            </div>

            <div className="index-kpi-card">
              <div className="index-kpi-label">Lowest {indexLabel} Barangay</div>
              <div className="index-kpi-value">
                {activeSummary.lowestName || "—"}
              </div>
              <div className="index-kpi-meta">
                {activeSummary.lowestValue.toFixed(1)} {selected === "calamity" ? "%" : ""}
              </div>
            </div>

            <div className="index-kpi-card">
              <div className="index-kpi-label">Projected {indexLabel}</div>
              <div className="index-kpi-value">
                {activeSummary.avg.toFixed(1)}
                {selected === "calamity" ? "%" : ""}
              </div>
              <div className="index-kpi-meta">
                Projection year: {year ?? "—"}
              </div>
            </div>

            <div className="index-kpi-card">
              <div className="index-kpi-label">
                No. of Barangays Below {indexLabel}
              </div>
              <div className="index-kpi-value">
                {activeSummary.belowAvgCount}
              </div>
              <div className="index-kpi-meta">Compared to city average</div>
            </div>
          </div>
        )}

        {/* Charts */}
        {isChoroplethGreen && (
          <>
            <div className="panel-card">
              <span className="panel-card-title">Green Index Scores</span>
              <GreenIndexScoresChart chartId="chart-green-index-scores" />
            </div>
          </>
        )}

        {isChoroplethHazard && (
          <>
            <div className="panel-card">
              <span className="panel-card-title">Hazard Index by Barangay</span>
              <HazardIndexBarangayChart
                year={year}
                chartId="chart-hazard-index-barangay"
              />
            </div>
            <div className="panel-card">
              <span className="panel-card-title">Earthquake Frequency</span>
              <EarthquakeFrequencyChart chartId="chart-earthquake-frequency" />
            </div>
            <div className="panel-card">
              <span className="panel-card-title">Typhoon Frequency & Intensity</span>
              <TyphoonFrequencyChart chartId="chart-typhoon-frequency" />
            </div>
          </>
        )}

        {isChoroplethCalamity && (
          <>
            <div className="panel-card">
              <span className="panel-card-title">Calamity Risk Likelihood</span>
              <CalamityRiskBarangayChart chartId="chart-calamity-risk-barangay" />
            </div>
            <div className="panel-card">
              <span className="panel-card-title">Green Index Scores</span>
              <GreenIndexScoresChart chartId="chart-green-index-scores" />
            </div>
            <div className="panel-card">
              <span className="panel-card-title">Hazard Index by Barangay</span>
              <HazardIndexBarangayChart
                year={year}
                chartId="chart-hazard-index-barangay"
              />
            </div>
            <div className="panel-card">
              <span className="panel-card-title">Earthquake Frequency</span>
              <EarthquakeFrequencyChart chartId="chart-earthquake-frequency" />
            </div>
            <div className="panel-card">
              <span className="panel-card-title">Typhoon Frequency & Intensity</span>
              <TyphoonFrequencyChart chartId="chart-typhoon-frequency" />
            </div>
          </>
        )}

        {/* Default (interactive view or other states): show all charts */}
        {mapView !== "choropleth" && (
          <>
            <div className="panel-card">
              <span className="panel-card-title">Green Index Scores</span>
              <GreenIndexScoresChart chartId="chart-green-index-scores" />
            </div>
            <div className="panel-card">
              <span className="panel-card-title">Hazard Index by Barangay</span>
              <HazardIndexBarangayChart
                year={year}
                chartId="chart-hazard-index-barangay"
              />
            </div>
            <div className="panel-card">
              <span className="panel-card-title">Calamity Risk Likelihood</span>
              <CalamityRiskBarangayChart chartId="chart-calamity-risk-barangay" />
            </div>
            <div className="panel-card">
              <span className="panel-card-title">Earthquake Frequency</span>
              <EarthquakeFrequencyChart chartId="chart-earthquake-frequency" />
            </div>
            <div className="panel-card">
              <span className="panel-card-title">Typhoon Frequency & Intensity</span>
              <TyphoonFrequencyChart chartId="chart-typhoon-frequency" />
            </div>
          </>
        )}
    </>
  );
};

export default DbChartsSection;
