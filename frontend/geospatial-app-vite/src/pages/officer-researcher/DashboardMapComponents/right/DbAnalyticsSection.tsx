import React, { useState, useEffect, type JSX } from "react";
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
}) => {
  // Local state for fetched EDA / model performance data
  const [loadingEda, setLoadingEda] = useState(false);
  const [edaError, setEdaError] = useState<string | null>(null);
  const [fetchedStatItems, setFetchedStatItems] = useState<any[]>([]);
  const [fetchedKeyFindings, setFetchedKeyFindings] = useState<any[]>([]);
  const [fetchedModelHealth, setFetchedModelHealth] = useState<any[]>([]);
  const [fetchedTimeSeries, setFetchedTimeSeries] = useState<any | null>(null);
  const [fetchedPerBarangay, setFetchedPerBarangay] = useState<Record<string, any> | null>(null);
  const [fetchedConfusionMatrix, setFetchedConfusionMatrix] = useState<number[][] | null>(null);

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
      setFetchedConfusionMatrix(payload.confusion_matrix || payload.confusionMatrix || payload.model_confusion_matrix || null);
    } catch (err: any) {
      setEdaError(err?.message || "Failed to load EDA data");
      setFetchedStatItems([]);
      setFetchedKeyFindings([]);
      setFetchedModelHealth([]);
    } finally {
      setLoadingEda(false);
    }
  };
  return (
    <>
        <div>
        <h4>Analytics Section</h4>
        <h5>Forecasting and Trends</h5>

        <div className="rowpanel-card">
            <div className="panel-card"><span className="panel-card-sub-title">Risk Trend</span></div>
            <div className="panel-card"><span className="panel-card-sub-title">Green Trend</span></div>
            <div className="panel-card"><span className="panel-card-sub-title">Accuracy</span></div>
        </div>
        <div className="panel-card"><span className="panel-card-title">Risk Likelihood (2020–2030)</span><RiskLikelihoodChart /></div>
        <div className="panel-card"><span className="panel-card-title">Green Index Projection (2020–2030)</span><GreenIndexProjectionChart /></div>
        <div className="panel-card"><span className="panel-card-title">Hazard Index Trend (2020–2030)</span><HazardIndexTrendChart /></div>

        {/* Key Insights */}
        <div className="panel-card">
            <span className="panel-card-title">Key Insights</span>
            <div className="columnpanel-card">
            {keyInsights.map((item, index) => (
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
          confusionMatrix={fetchedConfusionMatrix}
        />
    </>
  );
};

export default DbAnalyticsSection;
