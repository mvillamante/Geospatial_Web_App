import React from "react";
import "../../DashboardMapPage.css";
import {
  FaChartLine,
  FaArrowUp,
  FaExclamationTriangle,
  FaCheck,
} from "react-icons/fa";
import { PiWarningBold } from "react-icons/pi";

import type { StatItem, HealthItem } from "../../../../types/dashboard.types";

interface KeyFinding {
  label: string;
  description: string;
  type: "correlation" | "positive" | "warning";
}

interface DbEdaModalProps {
  show: boolean;
  onClose: () => void;

  edaSect: "edastats" | "modelperf";
  setEdaSect: React.Dispatch<
    React.SetStateAction<"edastats" | "modelperf">
  >;

  statisticalSummaryItems: StatItem[];
  keyFindings: KeyFinding[];
  modelHealthItems: HealthItem[];
}

const DbEdaModal: React.FC<DbEdaModalProps> = ({
  show,
  onClose,
  edaSect,
  setEdaSect,
  statisticalSummaryItems,
  keyFindings,
  modelHealthItems,
}) => {
  if (!show) return null;

  return (
    <div
      className="eda-modal-overlay"
      onClick={onClose}
    >
      <div
        className="eda-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="eda-modal-header">
          <h2>Exploratory Data Analysis & Model Performance</h2>
          <button className="eda-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="segmented-control slide four">
          <span className={`slider ${edaSect}`} />

          <button
            className={edaSect === "edastats" ? "active" : ""}
            onClick={() => setEdaSect("edastats")}
          >
            EDA & Statistics
          </button>

          <button
            className={edaSect === "modelperf" ? "active" : ""}
            onClick={() => setEdaSect("modelperf")}
          >
            Model Performance
          </button>
        </div>

        {/* ========================= */}
        {/* EDA & STATS SECTION */}
        {/* ========================= */}

        {edaSect === "edastats" ? (
          <div className="eda-modal-content">
            <h3>Exploratory Data Analysis</h3>
            <p className="eda-modal-subtitle">
              Statistical insights and distributions
            </p>

            {/* Statistical Summary */}
            <div className="eda-card">
              <h4>Statistical Summary</h4>

              {statisticalSummaryItems.map((item, index) => (
                <div key={index} className="eda-stat-row">
                  <span>{item.label}</span>

                  <span className="eda-stat-value">
                    {typeof item.value === "number"
                      ? item.value.toFixed(2)
                      : item.value}

                    {typeof item.change === "number" && (
                      <span
                        className={`eda-badge ${
                          item.change >= 0 ? "red" : "green"
                        }`}
                      >
                        {item.change > 0 ? "+" : ""}
                        {item.change}%
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Correlation Placeholder */}
            <div className="eda-card">
              <h4>Correlation with Risk Indices</h4>
              <div className="chart-placeholder">
                Chart goes here
              </div>
            </div>

            {/* Index Distribution */}
            <div className="eda-card">
              <h4>Index Distribution</h4>
              <div className="chart-placeholder">
                Chart goes here
              </div>
            </div>

            {/* Outlier Detection */}
            <div className="eda-card">
              <h4>Outlier Detection (Hazard vs Green)</h4>
              <div className="chart-placeholder">
                Chart goes here
              </div>
            </div>

            {/* Key Findings */}
            <div className="eda-card">
              <h4>Key Statistical Findings</h4>

              <div className="eda-findings">
                {keyFindings.map((item, index) => (
                  <div
                    key={index}
                    className={`eda-finding ${item.type}`}
                  >
                    <span className="eda-finding-icon">
                      {item.type === "correlation" && <FaChartLine />}
                      {item.type === "positive" && <FaArrowUp />}
                      {item.type === "warning" && (
                        <FaExclamationTriangle />
                      )}
                    </span>

                    <div className="eda-finding-text">
                      <strong>{item.label}:</strong>{" "}
                      {item.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ========================= */
          /* MODEL PERFORMANCE SECTION */
          /* ========================= */
          <div className="eda-modal-content">
            <h3>Model Performance Monitoring</h3>
            <p className="eda-modal-subtitle">
              ML model metrics and validation
            </p>

            <div className="eda-card-row">
              <div className="eda-card">
                <h4>Accuracy</h4>
              </div>
              <div className="eda-card">
                <h4>F1 Score</h4>
              </div>
            </div>

            <div className="eda-card">
              <h4>Performance Metrics Trend</h4>
              <div className="chart-placeholder">
                Chart goes here
              </div>
            </div>

            <div className="eda-card">
              <h4>Confusion Matrix (Last 30 Days)</h4>
              <div className="chart-placeholder">
                Chart goes here
              </div>
            </div>

            <div className="eda-card">
              <h4>Model Drift Detection</h4>
              <div className="chart-placeholder">
                Chart goes here
              </div>

              <div className="eda-warning">
                <PiWarningBold />{" "}
                <strong>Moderate Drift:</strong> Model drift
                increasing. Consider retraining within 2 weeks.
              </div>
            </div>

            <div className="eda-card">
              <h4>Model Health Status</h4>

              {modelHealthItems.map((item, index) => (
                <div
                  key={index}
                  className={`eda-health-row ${
                    item.status === "good" ? "good" : "warning"
                  }`}
                >
                  <span className="eda-health-label">
                    {item.status === "good" ? (
                      <FaCheck color="#137333" />
                    ) : (
                      <PiWarningBold color="#ff9800" />
                    )}{" "}
                    {item.label}
                  </span>

                  <span
                    className={`eda-health-badge ${
                      item.status === "good"
                        ? "green"
                        : "orange"
                    }`}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DbEdaModal;
