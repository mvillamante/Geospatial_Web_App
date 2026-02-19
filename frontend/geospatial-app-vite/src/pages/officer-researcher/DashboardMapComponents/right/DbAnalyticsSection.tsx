import React, { useState, type JSX } from "react";
import {
  RiskLikelihoodChart,
  GreenIndexProjectionChart,
  HazardIndexTrendChart
} from "../../../../components/ui/AnalyticsCharts";
import "../../DashboardMapPage.css";

import DbEdaModal from "../right/DbEdaModal";

interface Props {
  keyInsights?: any[];
  colors?: string[];
  insightIcons?: JSX.Element[];
  userRole2?: string[];

  showEdaModal?: boolean;
  setShowEdaModal?: (val: boolean) => void;
  edaSect?: "edastats" | "modelperf";
  setEdaSect?: (val: "edastats" | "modelperf") => void;
  statisticalSummaryItems?: any[];
  keyFindings?: any[];
  modelHealthItems?: any[];

  // Map context
  mapView?: string;
  selected?: string;
}

const DbAnalyticsSection: React.FC<Props> = ({
  keyInsights = [],
  colors = [],
  insightIcons = [],
  showEdaModal = false,
  setShowEdaModal,
  edaSect = "edastats",
  setEdaSect,
  statisticalSummaryItems = [],
  keyFindings = [],
  modelHealthItems = [],
  mapView,
  selected,
}) => {
  // Local state for fetched EDA / model performance data
  const [loadingEda, setLoadingEda] = useState(false);
  const [edaError, setEdaError] = useState<string | null>(null);
  const [fetchedStatItems, setFetchedStatItems] = useState<any[]>([]);
  const [fetchedKeyFindings, setFetchedKeyFindings] = useState<any[]>([]);
  const [fetchedModelHealth, setFetchedModelHealth] = useState<any[]>([]);
  const [fetchedTimeSeries, setFetchedTimeSeries] = useState<any | null>(null);
  const [fetchedPerBarangay, setFetchedPerBarangay] = useState<Record<string, any> | null>(null);
  const [fetchedTrainingHistory, setFetchedTrainingHistory] = useState<{ loss: number[]; val_loss: number[] } | null>(null);
  const [fetchedResiduals, setFetchedResiduals] = useState<{ actual: number[]; predicted: number[] } | null>(null);
  const [fetchedPopulationCorrelation, setFetchedPopulationCorrelation] = useState<any | null>(null);
  const [fetchedDistribution, setFetchedDistribution] = useState<any | null>(null);
  const [fetchedModelComparison, setFetchedModelComparison] = useState<any | null>(null);
  const [fetchedEnhancedDataQuality, setFetchedEnhancedDataQuality] = useState<any | null>(null);

  const loadEdaData = async () => {
    setEdaError(null);
    setLoadingEda(true);
    try {
      const res = await fetch("/api/hazard/eda/summary/");
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const payload = await res.json();

      setFetchedStatItems(payload.statisticalSummaryItems || []);
      setFetchedKeyFindings(payload.keyFindings || []);
      setFetchedModelHealth(payload.modelHealthItems || []);
      setFetchedTimeSeries(payload.timeSeries || null);
      setFetchedPerBarangay(payload.perBarangaySummary || null);
      setFetchedTrainingHistory(payload.trainingHistory || null);
      setFetchedResiduals(payload.residuals || null);
      setFetchedPopulationCorrelation(payload.populationCorrelation || null);
      setFetchedDistribution(payload.distribution || null);
      setFetchedModelComparison(payload.modelComparison || null);
      setFetchedEnhancedDataQuality(payload.enhancedDataQuality || null);
    } catch (err: any) {
      setEdaError(err?.message || "Failed to load EDA data");
      setFetchedStatItems([]);
      setFetchedKeyFindings([]);
      setFetchedModelHealth([]);
    } finally {
      setLoadingEda(false);
    }
  };

  const isChoropleth = mapView === "choropleth";
  const isGreenLayer = isChoropleth && selected === "green";
  const isHazardLayer = isChoropleth && selected === "hazard";
  const isCalamityLayer = isChoropleth && selected === "calamity";

  // Filter insights by layer if a category/type field is present.
  let filteredInsights = keyInsights;
  if ((isGreenLayer || isHazardLayer || isCalamityLayer) && keyInsights.length) {
    const layerKey = isGreenLayer ? "green" : isHazardLayer ? "hazard" : "calamity";
    const byCategory = keyInsights.filter(
      (item: any) =>
        item?.category === layerKey ||
        item?.type === layerKey ||
        item?.layer === layerKey,
    );
    if (byCategory.length) {
      filteredInsights = byCategory;
    }
  }

  const extraInsights: any[] = [];
  if (isGreenLayer) {
    extraInsights.push(
      {
        label: "Green Index Hotspots",
        description:
          "Top barangays sustain green index scores above the city average, indicating stable vegetation cover that buffers urban heat and surface runoff.",
      },
      {
        label: "Areas for Greening",
        description:
          "Several inland and roadside barangays continue to trail the city average, highlighting priority zones for street‑tree planting and pocket parks.",
      },
    );
  } else if (isHazardLayer) {
    extraInsights.push(
      {
        label: "Multi‑Hazard Concentration",
        description:
          "Hazard index scores cluster highest along river corridors and upland slopes, where flood, landslide, and strong‑wind exposure overlap.",
      },
      {
        label: "Below‑Average Hazard Zones",
        description:
          "Low‑lying central barangays remain below the citywide hazard index, offering opportunities for densification with relatively lower physical risk.",
      },
    );
  } else if (isCalamityLayer) {
    extraInsights.push(
      {
        label: "Projected Risk Peak",
        description:
          "Calamity risk likelihood peaks in the late 2020s under current assumptions, driven by compounding heavy‑rainfall and typhoon seasons.",
      },
      {
        label: "Impact of Adaptation",
        description:
          "Barangays that recently improved drainage and slope stabilization show flatter risk trajectories compared with other high‑exposure areas.",
      },
    );
  }

  const combinedInsights = [...filteredInsights, ...extraInsights];

  return (
    <>
        <div>
        <h4>Analytics Section</h4>
        <h5>Forecasting and Trends</h5>

        {/* Layer-aware forecasting cards */}
        {/* Default / non-choropleth / no selection: show all three */}
        {(!isChoropleth || !selected || selected === "none") && (
          <>
            <div className="panel-card">
              <span className="panel-card-title">Risk Likelihood (2020–2030)</span>
              <RiskLikelihoodChart chartId="chart-risk-likelihood" />
            </div>
            <div className="panel-card">
              <span className="panel-card-title">Green Index Projection (2020–2030)</span>
              <GreenIndexProjectionChart chartId="chart-green-index-projection" />
            </div>
            <div className="panel-card">
              <span className="panel-card-title">Hazard Index Trend (2020–2030)</span>
              <HazardIndexTrendChart chartId="chart-hazard-index-trend" />
            </div>
          </>
        )}

        {/* Green layer: only green index projection */}
        {isGreenLayer && (
          <div className="panel-card">
            <span className="panel-card-title">Green Index Projection (2020–2030)</span>
            <GreenIndexProjectionChart chartId="chart-green-index-projection" />
          </div>
        )}

        {/* Hazard layer: only hazard index trend */}
        {isHazardLayer && (
          <div className="panel-card">
            <span className="panel-card-title">Hazard Index Trend (2020–2030)</span>
            <HazardIndexTrendChart chartId="chart-hazard-index-trend" />
          </div>
        )}

        {/* Calamity layer: show all three, with Risk Likelihood emphasized first */}
        {isCalamityLayer && (
          <>
            <div className="panel-card">
              <span className="panel-card-title">Risk Likelihood (2020–2030)</span>
              <RiskLikelihoodChart chartId="chart-risk-likelihood" />
            </div>
            <div className="panel-card">
              <span className="panel-card-title">Green Index Projection (2020–2030)</span>
              <GreenIndexProjectionChart chartId="chart-green-index-projection" />
            </div>
            <div className="panel-card">
              <span className="panel-card-title">Hazard Index Trend (2020–2030)</span>
              <HazardIndexTrendChart chartId="chart-hazard-index-trend" />
            </div>
          </>
        )}

        {/* Key Insights */}
        <div className="panel-card">
            <span className="panel-card-title">Key Insights</span>
            <div className="columnpanel-card">
            {combinedInsights.map((item, index) => (
                <div key={index} className={`panel-card insight-card ${colors[index % colors.length]}`}>
                <span className="insight-icon">{insightIcons[index % insightIcons.length]}</span>
                <div className="insight-text"><strong>{item.label}:</strong> {item.description}</div>
                </div>
            ))}
            </div>
        </div>

        {/*userRole2?.[0] === "Researcher" && (*/}
            <div
            className="panel-card researcher"
            onClick={async () => {
              // Fetch data first, then show modal. Fall back to placeholders if fetch fails.
              await loadEdaData();
              setShowEdaModal?.(true);
            }}
            role="button"
            tabIndex={0}
            >
            <span className="panel-btn-eda">{loadingEda ? "Loading EDA..." : "View EDA & Model Performance"}</span>
            </div>
        {/*)*/}
        </div>
        
        {/* EDA Modal */}
        <DbEdaModal
          show={!!showEdaModal}
          onClose={() => setShowEdaModal?.(false)}
          edaSect={edaSect ?? "edastats"}
          setEdaSect={setEdaSect as any}
          statisticalSummaryItems={(fetchedStatItems.length ? fetchedStatItems : statisticalSummaryItems) ?? []}
          keyFindings={(fetchedKeyFindings.length ? fetchedKeyFindings : keyFindings) ?? []}
          modelHealthItems={(fetchedModelHealth.length ? fetchedModelHealth : modelHealthItems) ?? []}
          loadingEda={loadingEda}
          edaError={edaError}
          timeSeries={fetchedTimeSeries}
          perBarangaySummary={fetchedPerBarangay}
          populationCorrelation={fetchedPopulationCorrelation}
          trainingHistory={fetchedTrainingHistory}
          residuals={fetchedResiduals}
          distribution={fetchedDistribution}
          modelComparison={fetchedModelComparison}
          enhancedDataQuality={fetchedEnhancedDataQuality}
        />
    </>
  );
};

export default DbAnalyticsSection;
