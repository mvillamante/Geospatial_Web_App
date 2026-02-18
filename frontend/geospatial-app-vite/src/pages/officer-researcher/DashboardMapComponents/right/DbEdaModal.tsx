import React from "react";
import "../../DashboardMapPage.css";
import {
  FaChartLine,
  FaArrowUp,
  FaExclamationTriangle,
  FaCheck,
} from "react-icons/fa";
import { PiWarningBold } from "react-icons/pi";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
  loadingEda?: boolean;
  edaError?: string | null;
  timeSeries?: any | null;
  perBarangaySummary?: Record<string, any> | null;
  confusionMatrix?: number[][] | null;
}

const DbEdaModal: React.FC<DbEdaModalProps> = ({
  show,
  onClose,
  edaSect,
  setEdaSect,
  statisticalSummaryItems,
  keyFindings,
  modelHealthItems,
  loadingEda = false,
  edaError = null,
  timeSeries = null,
  perBarangaySummary = null,
  confusionMatrix = null,
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

        {loadingEda ? (
          <div className="eda-modal-content">
            <h3>Loading EDA...</h3>
            <p className="eda-modal-subtitle">Fetching statistics and model metrics.</p>
          </div>
        ) : edaError ? (
          <div className="eda-modal-content">
            <h3>Unable to load EDA</h3>
            <p className="eda-modal-subtitle">{edaError}</p>
          </div>
        ) : edaSect === "edastats" ? (
          <div className="eda-modal-content">
            <h3>Exploratory Data Analysis</h3>
            <p className="eda-modal-subtitle">
              Statistical insights and distributions
            </p>

            {/* Statistical Summary */}
            <div className="eda-card">
              <h4>Statistical Summary</h4>

                {statisticalSummaryItems.length === 0 ? (
                  <div className="eda-card">
                    <p>No statistical summary available.</p>
                  </div>
                ) : (
                  statisticalSummaryItems.map((item, index) => (
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
                ))
              )}
            </div>

            {/* Correlation Placeholder */}
            <div className="eda-card">
              <h4>Correlation with Risk Indices</h4>
              <div className="chart-placeholder">
                {keyFindings.length === 0 ? (
                  <div>No correlation findings available.</div>
                ) : (
                  keyFindings.map((k, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <strong>{k.label}:</strong> {k.description}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Index Distribution */}
            <div className="eda-card">
              <h4>Index Distribution</h4>
              <div style={{ width: "100%", height: 240 }}>
                {perBarangaySummary ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={Object.entries(perBarangaySummary).map(([k, v]) => ({ barangay: k, value: v.hazard_index }))}
                      margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="barangay" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#e65100" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-placeholder">No per-barangay data available.</div>
                )}
              </div>
            </div>

            {/* Outlier Detection */}
            <div className="eda-card">
              <h4>Outlier Detection (Hazard vs Green)</h4>
              <div className="chart-placeholder">
                {perBarangaySummary ? (
                  <div>
                    <strong>Detected outliers:</strong>
                    <ul>
                      {Object.entries(perBarangaySummary)
                        .filter(([, v]) => v.hazard_index != null && v.hazard_index > 80)
                        .slice(0, 10)
                        .map(([k, v]) => (
                          <li key={k}>{k}: {v.hazard_index}</li>
                        ))}
                    </ul>
                  </div>
                ) : (
                  <div>No outlier info available.</div>
                )}
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
              <div className="eda-card" style={{ minWidth: 160 }}>
                <h4>
                  Accuracy
                  <div className="small-metric">
                    {(() => {
                      const acc = modelHealthItems.find((m) => /accuracy/i.test(m.label) || /mae/i.test(m.label) === false && /accuracy/i.test(m.label));
                      return acc ? <span>{acc.value}</span> : <span>—</span>;
                    })()}
                  </div>
                </h4>
              </div>

              <div className="eda-card" style={{ minWidth: 160 }}>
                <h4>
                  F1 Score
                  <div className="small-metric">
                    {(() => {
                      const f1 = modelHealthItems.find((m) => /f1/i.test(m.label));
                      return f1 ? <span>{f1.value}</span> : <span>—</span>;
                    })()}
                  </div>
                </h4>
              </div>
            </div>

            <div className="eda-card">
              <h4>Performance Metrics Trend</h4>
              <div style={{ width: "100%", height: 260 }}>
                {timeSeries && timeSeries.years && timeSeries.years.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={timeSeries.years.map((y: string, i: number) => ({ year: y, mean_hazard: timeSeries.mean_hazard[i], mean_green: timeSeries.mean_green[i] }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="mean_hazard" stroke="#e65100" name="Mean Hazard" />
                      <Line type="monotone" dataKey="mean_green" stroke="#2e7d32" name="Mean Green" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-placeholder">No time-series available.</div>
                )}
              </div>
            </div>

            <div className="eda-card">
              <h4>Confusion Matrix (Last 30 Days)</h4>
              <div className="chart-placeholder">
                {confusionMatrix && confusionMatrix.length ? (
                  <div style={{ display: "inline-block" }}>
                    <table style={{ borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th></th>
                          <th style={{ padding: 6 }}>Pred: Neg</th>
                          <th style={{ padding: 6 }}>Pred: Pos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {confusionMatrix.map((row, i) => (
                          <tr key={i}>
                            <td style={{ padding: 6, fontWeight: 600 }}>{i === 0 ? "Actual: Neg" : "Actual: Pos"}</td>
                            {row.map((val, j) => {
                              const max = Math.max(...confusionMatrix.flat());
                              const intensity = max > 0 ? Math.round((val / max) * 200) : 0;
                              return (
                                <td key={j} style={{ padding: 6, background: `rgba(230,81,0,${0.08 + intensity/255})`, textAlign: "center" }}>{val}</td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div>No confusion matrix available.</div>
                )}
              </div>
            </div>

            <div className="eda-card">
              <h4>Model Drift Detection</h4>
              <div style={{ width: "100%", height: 180 }}>
                {timeSeries && timeSeries.years && timeSeries.years.length > 1 ? (
                  (() => {
                    const years = timeSeries.years;
                    const diffs = timeSeries.mean_hazard.map((v: number, i: number) => {
                      if (i === 0) return 0;
                      return Math.abs(v - timeSeries.mean_hazard[i - 1]);
                    }).slice(1);
                    const driftData = years.slice(1).map((y: string, i: number) => ({ year: y, drift: diffs[i] }));
                    return (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={driftData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="drift" fill="#ff9800" />
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })()
                ) : (
                  <div className="chart-placeholder">No drift data available.</div>
                )}
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
