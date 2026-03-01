import React, { useState, useEffect, type JSX } from "react";
import {
  RiskLikelihoodChart,
  GreenIndexProjectionChart,
  HazardIndexTrendChart
} from "../../../../components/ui/AnalyticsCharts";
import "../../DashboardMapPage.css";

import DbEdaModal from "../right/DbEdaModal";

// Use same base as Import page so AI-insights hit the same backend (proxy in dev). Import uses relative "/api".
const API_BASE = "";

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
  year?: number;
}

const DbAnalyticsSection: React.FC<Props> = ({
  keyInsights = [],
  colors = [],
  insightIcons = [],
  userRole2,
  showEdaModal = false,
  setShowEdaModal,
  edaSect = "edastats",
  setEdaSect,
  statisticalSummaryItems = [],
  keyFindings = [],
  modelHealthItems = [],
  mapView,
  selected,
  year,
}) => {
  // AI-generated Green Index insights (only fetched when on Green layer — saves tokens)
  const [greenAiInsight, setGreenAiInsight] = useState<string | null>(null);
  const [greenHotspotsInsight, setGreenHotspotsInsight] = useState<string | null>(null);
  const [greenAreasForGreeningInsight, setGreenAreasForGreeningInsight] = useState<string | null>(null);
  const [greenAiInsightLoading, setGreenAiInsightLoading] = useState(false);
  const [greenAiInsightError, setGreenAiInsightError] = useState<string | null>(null);

  // AI-generated Hazard Index insights (only fetched when on Hazard layer — saves tokens)
  const [hazardAiSummary, setHazardAiSummary] = useState<string | null>(null);
  const [hazardHotspotsInsight, setHazardHotspotsInsight] = useState<string | null>(null);
  const [hazardLowerRiskInsight, setHazardLowerRiskInsight] = useState<string | null>(null);
  const [hazardEarthquakeTyphoonInsight, setHazardEarthquakeTyphoonInsight] = useState<string | null>(null);
  const [hazardAiInsightLoading, setHazardAiInsightLoading] = useState(false);
  const [hazardAiInsightError, setHazardAiInsightError] = useState<string | null>(null);

  // AI-generated Calamity Risk insights (only fetched when on Calamity Risk layer — saves tokens)
  const [calamityAiSummary, setCalamityAiSummary] = useState<string | null>(null);
  const [calamityRiskPeakInsight, setCalamityRiskPeakInsight] = useState<string | null>(null);
  const [calamityAdaptationInsight, setCalamityAdaptationInsight] = useState<string | null>(null);
  const [calamityAiInsightLoading, setCalamityAiInsightLoading] = useState(false);
  const [calamityAiInsightError, setCalamityAiInsightError] = useState<string | null>(null);

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
      const res = await fetch(`${API_BASE}/api/hazard/eda/summary/`);
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

  // Data and AI insights are only available for 2020–2030
  const yearInRange = year != null && year >= 2020 && year <= 2030;

  // Fetch AI-generated Green Index insights (summary + hotspots + areas for greening) when user is on green layer and changes year
  useEffect(() => {
    if (!isGreenLayer || !yearInRange) {
      setGreenAiInsight(null);
      setGreenHotspotsInsight(null);
      setGreenAreasForGreeningInsight(null);
      setGreenAiInsightError(null);
      return;
    }
    let cancelled = false;
    setGreenAiInsightLoading(true);
    setGreenAiInsightError(null);
    setGreenAiInsight(null);
    setGreenHotspotsInsight(null);
    setGreenAreasForGreeningInsight(null);
    fetch(`${API_BASE}/api/hazard/green-index/ai-insight/?year=${year}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.summary != null) {
          setGreenAiInsight(data.summary);
          setGreenHotspotsInsight(data.hotspots_insight ?? null);
          setGreenAreasForGreeningInsight(data.areas_for_greening_insight ?? null);
          setGreenAiInsightError(null);
        } else {
          setGreenAiInsightError(data.error || "Failed to load insight");
          setGreenAiInsight(null);
          setGreenHotspotsInsight(null);
          setGreenAreasForGreeningInsight(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setGreenAiInsightError(err?.message || "Failed to load insight");
          setGreenAiInsight(null);
          setGreenHotspotsInsight(null);
          setGreenAreasForGreeningInsight(null);
        }
      })
      .finally(() => {
        if (!cancelled) setGreenAiInsightLoading(false);
      });
    return () => { cancelled = true; };
  }, [isGreenLayer, year, yearInRange]);

  const isHazardLayer = isChoropleth && selected === "hazard";
  const isCalamityLayer = isChoropleth && selected === "calamity";

  // Fetch Hazard Index AI insights only when on Hazard layer (green prompt is not called)
  useEffect(() => {
    if (!isHazardLayer || !yearInRange) {
      setHazardAiSummary(null);
      setHazardHotspotsInsight(null);
      setHazardLowerRiskInsight(null);
      setHazardEarthquakeTyphoonInsight(null);
      setHazardAiInsightError(null);
      return;
    }
    let cancelled = false;
    setHazardAiInsightLoading(true);
    setHazardAiInsightError(null);
    setHazardAiSummary(null);
    setHazardHotspotsInsight(null);
    setHazardLowerRiskInsight(null);
    setHazardEarthquakeTyphoonInsight(null);
    fetch(`${API_BASE}/api/hazard/hazard-index/ai-insight/?year=${year}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.summary != null) {
          setHazardAiSummary(data.summary);
          setHazardHotspotsInsight(data.hotspots_insight ?? null);
          setHazardLowerRiskInsight(data.lower_risk_insight ?? null);
          setHazardEarthquakeTyphoonInsight(data.earthquake_typhoon_insight ?? null);
          setHazardAiInsightError(null);
        } else {
          setHazardAiInsightError(data.error || "Failed to load insight");
          setHazardAiSummary(null);
          setHazardHotspotsInsight(null);
          setHazardLowerRiskInsight(null);
          setHazardEarthquakeTyphoonInsight(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setHazardAiInsightError(err?.message || "Failed to load insight");
          setHazardAiSummary(null);
          setHazardHotspotsInsight(null);
          setHazardLowerRiskInsight(null);
          setHazardEarthquakeTyphoonInsight(null);
        }
      })
      .finally(() => {
        if (!cancelled) setHazardAiInsightLoading(false);
      });
    return () => { cancelled = true; };
  }, [isHazardLayer, year, yearInRange]);

  // Fetch Calamity Risk AI insights only when on Calamity Risk layer (no green/hazard prompt)
  useEffect(() => {
    if (!isCalamityLayer || !yearInRange) {
      setCalamityAiSummary(null);
      setCalamityRiskPeakInsight(null);
      setCalamityAdaptationInsight(null);
      setCalamityAiInsightError(null);
      return;
    }
    let cancelled = false;
    setCalamityAiInsightLoading(true);
    setCalamityAiInsightError(null);
    setCalamityAiSummary(null);
    setCalamityRiskPeakInsight(null);
    setCalamityAdaptationInsight(null);
    fetch(`${API_BASE}/api/hazard/calamity-risk/ai-insight/?year=${year}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.summary != null) {
          setCalamityAiSummary(data.summary);
          setCalamityRiskPeakInsight(data.risk_peak_insight ?? null);
          setCalamityAdaptationInsight(data.adaptation_insight ?? null);
          setCalamityAiInsightError(null);
        } else {
          setCalamityAiInsightError(data.error || "Failed to load insight");
          setCalamityAiSummary(null);
          setCalamityRiskPeakInsight(null);
          setCalamityAdaptationInsight(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCalamityAiInsightError(err?.message || "Failed to load insight");
          setCalamityAiSummary(null);
          setCalamityRiskPeakInsight(null);
          setCalamityAdaptationInsight(null);
        }
      })
      .finally(() => {
        if (!cancelled) setCalamityAiInsightLoading(false);
      });
    return () => { cancelled = true; };
  }, [isCalamityLayer, year, yearInRange]);

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
        description: greenAiInsightLoading && greenHotspotsInsight == null
          ? "Loading…"
          : (greenHotspotsInsight ?? "Top barangays sustain green index scores above the city average, indicating stable vegetation cover that buffers urban heat and surface runoff."),
      },
      {
        label: "Areas for Greening",
        description: greenAiInsightLoading && greenAreasForGreeningInsight == null
          ? "Loading…"
          : (greenAreasForGreeningInsight ?? "Several inland and roadside barangays continue to trail the city average, highlighting priority zones for street‑tree planting and pocket parks."),
      },
    );
  } else if (isHazardLayer) {
    // Placeholder entries; when we have API data, hazard insights are shown via hazardInsightsToShow below
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

  // When on Green Index layer: show ONLY Green Index insights (AI). No hazard prompt = fewer tokens.
  const greenAiCard =
    isGreenLayer && year != null
      ? {
          label: `Green Index — ${year}`,
          description: greenAiInsightLoading
            ? "Loading..."
            : greenAiInsightError
              ? greenAiInsightError
              : greenAiInsight ?? "No summary available.",
          isAi: true,
        }
      : null;

  // When on Hazard Index layer: show ONLY 4 Hazard AI insights. No green prompt = fewer tokens.
  const hazardAiCard =
    isHazardLayer && year != null
      ? {
          label: `Hazard Index — ${year}`,
          description: hazardAiInsightLoading
            ? "Loading..."
            : hazardAiInsightError
              ? hazardAiInsightError
              : hazardAiSummary ?? "No summary available.",
          isAi: true,
        }
      : null;
  const hazardInsightCards = isHazardLayer
    ? [
        hazardAiCard,
        {
          label: "Hazard Hotspots",
          description:
            hazardAiInsightLoading && hazardHotspotsInsight == null
              ? "Loading…"
              : (hazardHotspotsInsight ??
                "Hazard index clusters highest along river corridors and upland slopes (flood, landslide, strong‑wind exposure)."),
        },
        {
          label: "Lower‑Risk Zones",
          description:
            hazardAiInsightLoading && hazardLowerRiskInsight == null
              ? "Loading…"
              : (hazardLowerRiskInsight ??
                "Low‑lying central barangays remain below the citywide hazard index; relatively lower physical risk for planning."),
        },
        {
          label: "Earthquake & Typhoon",
          description:
            hazardAiInsightLoading && hazardEarthquakeTyphoonInsight == null
              ? "Loading…"
              : (hazardEarthquakeTyphoonInsight ??
                "Rare high-intensity earthquake and typhoon events can cause sharp spikes in the hazard index; preparedness is needed even in lower-frequency years."),
        },
      ].filter(Boolean)
    : [];

  // When on Calamity Risk layer: show ONLY 3 Calamity AI insights. No green/hazard prompt.
  const calamityAiCard =
    isCalamityLayer && year != null
      ? {
          label: `Calamity Risk — ${year}`,
          description: calamityAiInsightLoading
            ? "Loading…"
            : calamityAiInsightError
              ? calamityAiInsightError
              : calamityAiSummary ?? "No summary available.",
          isAi: true,
        }
      : null;
  const calamityInsightCards = isCalamityLayer
    ? [
        calamityAiCard,
        {
          label: "Projected Risk Peak",
          description:
            calamityAiInsightLoading && calamityRiskPeakInsight == null
              ? "Loading…"
              : (calamityRiskPeakInsight ??
                "Calamity risk likelihood peaks in the late 2020s under current assumptions, driven by compounding heavy‑rainfall and typhoon seasons."),
        },
        {
          label: "Impact of Adaptation",
          description:
            calamityAiInsightLoading && calamityAdaptationInsight == null
              ? "Loading…"
              : (calamityAdaptationInsight ??
                "Barangays that recently improved drainage and slope stabilization show flatter risk trajectories compared with other high‑exposure areas."),
        },
      ].filter(Boolean)
    : [];

  const insightsToShow = isGreenLayer
    ? (greenAiCard ? [greenAiCard, ...extraInsights] : extraInsights)
    : isHazardLayer
      ? hazardInsightCards
      : isCalamityLayer
        ? calamityInsightCards
        : combinedInsights;

  return (
    <>
        <div>
        {/* <h4>Analytics Section</h4>
        <h5>Forecasting and Trends</h5> */}

        {/* Layer-aware forecasting cards */}
        {/* Default / non-choropleth / no selection: show all three */}
        {(!isChoropleth || !selected || selected === "none") && (
          <>
            <div className="panel-card">
              <span className="panel-card-title">Risk Likelihood (2020–2030)</span>
              <RiskLikelihoodChart chartId="chart-risk-likelihood" />
            </div>
            <div className="panel-card">
              <span className="panel-card-title">Green Index Trends and Projection (2020–2030)</span>
              <GreenIndexProjectionChart chartId="chart-green-index-projection" />
            </div>
            <div className="panel-card">
              <span className="panel-card-title">Hazard Index Trends and Projection (2020–2030)</span>
              <HazardIndexTrendChart chartId="chart-hazard-index-trend" />
            </div>
          </>
        )}

        {/* Green layer: only green index projection */}
        {isGreenLayer && (
          <div className="panel-card">
            <span className="panel-card-title">Green Index Trends and Projection (2020–2030)</span>
            <GreenIndexProjectionChart chartId="chart-green-index-projection" />
          </div>
        )}

        {/* Hazard layer: only hazard index trend */}
        {isHazardLayer && (
          <div className="panel-card">
            <span className="panel-card-title">Hazard Index Trends and Projection (2020–2030)</span>
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
              <span className="panel-card-title">Green Index Trends and Projection (2020–2030)</span>
              <GreenIndexProjectionChart chartId="chart-green-index-projection" />
            </div>
            <div className="panel-card">
              <span className="panel-card-title">Hazard Index Trends and Projection (2020–2030)</span>
              <HazardIndexTrendChart chartId="chart-hazard-index-trend" />
            </div>
          </>
        )}

        {/* Key Insights */}
        <div className="panel-card">
            <span className="panel-card-title">Key Insights</span>
            <div className="columnpanel-card">
            {insightsToShow.map((item: any, index: number) => (
                <div key={index} className={`panel-card insight-card ${colors[index % colors.length]} ${item.isAi ? "insight-card--ai" : ""}`}>
                <span className="insight-icon">{insightIcons[index % insightIcons.length]}</span>
                <div className="insight-text"><strong>{item.label}:</strong> {item.description}</div>
                </div>
            ))}
            </div>
            <p className="insight-disclaimer">* Automatically generated — please have an expert review for final assessment.</p>
        </div>

        {userRole2?.[0] === "Researcher" && (
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
        )}
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
