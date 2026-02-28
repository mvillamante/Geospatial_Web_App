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
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import type { StatItem, HealthItem } from "../../../../types/dashboard.types";

interface KeyFinding {
  label: string;
  description: string;
  insight?: string;
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
  populationCorrelation?: {
    corr: number;
    year?: string;
    points: Array<{ barangay: string; population: number; hazard_index: number }>;
  } | null;
  /** LSTM training: loss and val_loss per epoch */
  trainingHistory?: { loss: number[]; val_loss: number[] } | null;
  /** For residual plot: actual and predicted values */
  residuals?: { actual: number[]; predicted: number[] } | null;
  /** Distribution data for histograms */
  distribution?: { hazard: { bins: number[]; counts: number[] }; green: { bins: number[]; counts: number[] } } | null;
  /** Model comparison metrics */
  modelComparison?: { models: string[]; mae: number[]; rmse: number[]; r2: number[]; nmae: number[] } | null;
  /** Enhanced data quality metrics */
  enhancedDataQuality?: any | null;
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
  populationCorrelation = null,
  trainingHistory = null,
  residuals = null,
  distribution = null,
  modelComparison = null,
  enhancedDataQuality = null,
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

            {/* Correlation visualization */}
            <div className="eda-card">
              <h4>Correlation with Risk Indices</h4>
              <p className="eda-modal-subtitle" style={{ marginTop: 0, marginBottom: 8 }}>
                Population vs Hazard scatter (year {populationCorrelation?.year ?? "—"}) — r ={" "}
                <strong>{typeof populationCorrelation?.corr === "number" ? populationCorrelation.corr.toFixed(2) : "—"}</strong>
              </p>

              <div style={{ width: "100%", height: 260 }}>
                {populationCorrelation?.points?.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <ScatterChart margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="population" name="Population" type="number" tick={{ fontSize: 11 }} tickMargin={8} />
                      <YAxis dataKey="hazard_index" name="Hazard Index" type="number" tick={{ fontSize: 11 }} tickMargin={8} />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        formatter={(value: any, name: any) => {
                          if (name === "population") return [value, "Population"];
                          if (name === "hazard_index") return [value, "Hazard Index"];
                          return [value, name];
                        }}
                        labelFormatter={(_: any, payload: any) => {
                          const p = payload?.[0]?.payload;
                          return p?.barangay ? `Barangay: ${p.barangay}` : "";
                        }}
                      />
                      <Scatter name="Population vs Hazard" data={populationCorrelation.points} fill="#1565c0" fillOpacity={0.65} />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-placeholder">
                    No correlation scatter data available. (Backend must return <code>populationCorrelation.points</code>.)
                  </div>
                )}
              </div>

              {/* Keep textual findings as backup */}
              {keyFindings.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {keyFindings.map((k, i) => (
                    <div key={i} style={{ marginBottom: 6 }}>
                      <strong>{k.label}:</strong> {k.description}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Index Distribution - Bar Chart */}
            <div className="eda-card">
              <h4>Index Distribution (Per Barangay)</h4>
              <div style={{ width: "100%", height: 240 }}>
                {perBarangaySummary ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={Object.entries(perBarangaySummary).map(([k, v]) => ({ barangay: k, value: v.hazard_index }))}
                      margin={{ top: 8, right: 8, left: 8, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="barangay" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={74} tickMargin={8} />
                      <YAxis tick={{ fontSize: 11 }} tickMargin={8} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#e65100" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-placeholder">No per-barangay data available.</div>
                )}
              </div>
            </div>

            {/* Distribution Plots - Histograms */}
            <div className="eda-card">
              <h4>Distribution Plots</h4>
              <p className="eda-modal-subtitle" style={{ marginTop: 0, marginBottom: 8 }}>
                Histogram distributions of Hazard and Green indices
              </p>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {/* Hazard Index Histogram */}
                <div style={{ flex: 1, minWidth: 300 }}>
                  <h5 style={{ fontSize: 13, marginBottom: 8, color: "#666" }}>Hazard Index Distribution</h5>
                  {distribution?.hazard?.bins?.length ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={distribution.hazard.bins.map((bin, i) => ({ bin, count: distribution.hazard.counts[i] || 0 }))}
                        margin={{ top: 8, right: 8, left: 8, bottom: 24 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="bin" name="Hazard Index" tick={{ fontSize: 10 }} tickMargin={8} />
                        <YAxis tick={{ fontSize: 10 }} tickMargin={8} />
                        <Tooltip formatter={(value: any) => [value, "Frequency"]} />
                        <Bar dataKey="count" fill="#e65100" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-placeholder" style={{ height: 200 }}>No distribution data available.</div>
                  )}
                </div>

                {/* Green Index Histogram */}
                <div style={{ flex: 1, minWidth: 300 }}>
                  <h5 style={{ fontSize: 13, marginBottom: 8, color: "#666" }}>Green Index Distribution</h5>
                  {distribution?.green?.bins?.length ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={distribution.green.bins.map((bin, i) => ({ bin, count: distribution.green.counts[i] || 0 }))}
                        margin={{ top: 8, right: 8, left: 8, bottom: 24 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="bin" name="Green Index" tick={{ fontSize: 10 }} tickMargin={8} />
                        <YAxis tick={{ fontSize: 10 }} tickMargin={8} />
                        <Tooltip formatter={(value: any) => [value, "Frequency"]} />
                        <Bar dataKey="count" fill="#2e7d32" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-placeholder" style={{ height: 200 }}>No distribution data available.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Outlier Detection */}
            <div className="eda-card">
              <h4>Outlier Detection (Hazard vs Green)</h4>
              <p className="eda-modal-subtitle" style={{ marginTop: 0, marginBottom: 8 }}>
                Hazard vs Green scatter; outliers highlighted using IQR rule (either axis).
              </p>

              {(() => {
                if (!perBarangaySummary) {
                  return <div className="chart-placeholder">No per-barangay data available.</div>;
                }

                const points = Object.entries(perBarangaySummary)
                  .map(([barangay, v]: any) => ({
                    barangay,
                    hazard: typeof v?.hazard_index === "number" ? v.hazard_index : Number(v?.hazard_index),
                    green: typeof v?.green_index === "number" ? v.green_index : Number(v?.green_index),
                  }))
                  .filter((p) => Number.isFinite(p.hazard) && Number.isFinite(p.green));

                const quantile = (sorted: number[], q: number) => {
                  const pos = (sorted.length - 1) * q;
                  const base = Math.floor(pos);
                  const rest = pos - base;
                  if (sorted[base + 1] !== undefined) {
                    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
                  }
                  return sorted[base];
                };

                const iqrBounds = (vals: number[]) => {
                  const s = [...vals].sort((a, b) => a - b);
                  if (s.length < 4) return { lo: -Infinity, hi: Infinity };
                  const q1 = quantile(s, 0.25);
                  const q3 = quantile(s, 0.75);
                  const iqr = q3 - q1;
                  return { lo: q1 - 1.5 * iqr, hi: q3 + 1.5 * iqr };
                };

                const hb = iqrBounds(points.map((p) => p.hazard));
                const gb = iqrBounds(points.map((p) => p.green));

                const outliers = points.filter((p) => p.hazard < hb.lo || p.hazard > hb.hi || p.green < gb.lo || p.green > gb.hi);
                const normals = points.filter((p) => !outliers.includes(p));

                return (
                  <>
                    <div style={{ width: "100%", height: 260 }}>
                      {points.length ? (
                        <ResponsiveContainer width="100%" height={260}>
                          <ScatterChart margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="hazard" name="Hazard Index" type="number" tick={{ fontSize: 11 }} tickMargin={8} />
                            <YAxis dataKey="green" name="Green Index" type="number" tick={{ fontSize: 11 }} tickMargin={8} />
                            <Tooltip
                              cursor={{ strokeDasharray: "3 3" }}
                              labelFormatter={(_: any, payload: any) => {
                                const p = payload?.[0]?.payload;
                                return p?.barangay ? `Barangay: ${p.barangay}` : "";
                              }}
                            />
                            <Scatter name="Normal" data={normals} fill="#2e7d32" fillOpacity={0.55} />
                            <Scatter name="Outlier" data={outliers} fill="#d32f2f" fillOpacity={0.85} />
                          </ScatterChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="chart-placeholder">No hazard/green points available.</div>
                      )}
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <strong>Detected outliers:</strong>{" "}
                      {outliers.length ? (
                        <span>{outliers.slice(0, 12).map((o) => o.barangay).join(", ")}{outliers.length > 12 ? "…" : ""}</span>
                      ) : (
                        <span>None</span>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Key Statistical Findings — derived from EDA statistics in this section; short insights for researchers */}
            <div className="eda-card">
              <h4>Key Statistical Findings</h4>
              <p className="eda-modal-subtitle" style={{ marginTop: 0, marginBottom: 10 }}>
                These findings are derived from the Statistical Summary, Correlation, and Per-barangay data above. Use them to interpret data quality and LSTM input suitability.
              </p>

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
                      {item.insight && (
                        <div style={{ marginTop: 6, fontSize: "0.9em", opacity: 0.9 }}>
                          {item.insight}
                        </div>
                      )}
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
              {(["MAE", "RMSE", "R²", "NMAE"] as const).map((metric) => {
                const item = modelHealthItems.find((m) => m.label === metric);
                return (
                  <div key={metric} className="eda-card" style={{ minWidth: 120 }}>
                    <h4>
                      {metric}
                      <div className="small-metric">
                        {item ? <span>{item.value}</span> : <span>—</span>}
                      </div>
                    </h4>
                  </div>
                );
              })}
            </div>

            {/* Model Comparison */}
            {modelComparison && modelComparison.models?.length > 0 && (
              <div className="eda-card">
                <h4>Model Comparison</h4>
                <p className="eda-modal-subtitle" style={{ marginTop: 0, marginBottom: 8 }}>
                  Comparison of LSTM, Random Forest, and Gradient Boosting models evaluated on test set. Metrics from your training notebooks (gi_model_config.json).
                </p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {(["MAE", "RMSE", "R²", "NMAE"] as const).map((metric) => {
                    if (!modelComparison) return null;
                    const metricKey = metric.toLowerCase().replace("²", "2") as "mae" | "rmse" | "r2" | "nmae";
                    const metricData = modelComparison[metricKey] || [];
                    const chartData = modelComparison.models.map((model: string, i: number) => ({
                      model,
                      value: metricData[i] ?? 0,
                    }));

                    return (
                      <div key={metric} style={{ flex: 1, minWidth: 280 }}>
                        <h5 style={{ fontSize: 13, marginBottom: 8, color: "#666" }}>{metric}</h5>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart 
                            data={chartData} 
                            margin={{ top: 8, right: 8, left: 8, bottom: 45 }}
                            barCategoryGap="20%"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="model" 
                              tick={{ fontSize: 9, width: 70 }} 
                              tickMargin={6}
                              interval={0}
                              height={55}
                              angle={0}
                              tickFormatter={(value: string) => {
                                // Split multi-word model names with line breaks
                                if (value === "Random Forest") return "Random\nForest";
                                if (value === "Gradient Boosting") return "Gradient\nBoosting";
                                return value;
                              }}
                            />
                            <YAxis tick={{ fontSize: 10 }} tickMargin={8} />
                            <Tooltip formatter={(value: any) => [typeof value === "number" ? value.toFixed(4) : value, metric]} />
                            <Bar dataKey="value" barSize={40}>
                              {chartData.map((_entry: any, index: number) => {
                                const colors = ["#2e7d32", "#1976d2", "#e65100"];
                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: "#666", fontStyle: "italic" }}>
                  <strong>Note:</strong> Lower values are better for MAE, RMSE, and NMAE. Higher values are better for R².
                </div>
              </div>
            )}

            <div className="eda-card">
              <h4>Training vs Validation Loss</h4>
              <p className="eda-modal-subtitle" style={{ marginTop: 0, marginBottom: 8 }}>
                LSTM loss over epochs during training
              </p>
              <div style={{ width: "100%", height: 220 }}>
                {trainingHistory && trainingHistory.loss?.length && trainingHistory.val_loss?.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart
                      data={trainingHistory.loss.map((loss, i) => ({
                        epoch: i + 1,
                        loss,
                        val_loss: trainingHistory!.val_loss[i] ?? null,
                      }))}
                      margin={{ top: 8, right: 8, left: 8, bottom: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="epoch" name="Epoch" tick={{ fontSize: 11 }} tickMargin={8} />
                      <YAxis tick={{ fontSize: 11 }} tickMargin={8} />
                      <Tooltip />
                      <Line type="monotone" dataKey="loss" stroke="#2e7d32" name="Train Loss" dot={false} />
                      <Line type="monotone" dataKey="val_loss" stroke="#e65100" name="Val Loss" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-placeholder">
                    Save <code>training_history.json</code> (with <code>loss</code> and <code>val_loss</code> arrays) in model_artifacts to show this chart.
                  </div>
                )}
              </div>
            </div>

            <div className="eda-card">
              <h4>Residual Plot</h4>
              <p className="eda-modal-subtitle" style={{ marginTop: 0, marginBottom: 8 }}>
                Residuals (actual − predicted) vs predicted
              </p>
              <div style={{ width: "100%", height: 240 }}>
                {residuals && residuals.actual?.length && residuals.predicted?.length ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <ScatterChart margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="predicted" name="Predicted" type="number" tick={{ fontSize: 11 }} tickMargin={8} />
                      <YAxis dataKey="residual" name="Residual" type="number" tick={{ fontSize: 11 }} tickMargin={8} />
                      <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                      <Scatter
                        name="Residuals"
                        data={residuals.actual.map((actual, i) => ({
                          predicted: residuals!.predicted[i],
                          residual: actual - (residuals!.predicted[i] ?? 0),
                        }))}
                        fill="#e65100"
                        fillOpacity={0.6}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-placeholder">
                    Save <code>residuals.json</code> (with <code>actual</code> and <code>predicted</code> arrays) in model_artifacts to show this chart.
                  </div>
                )}
              </div>
            </div>

            <div className="eda-card">
              <h4>Performance Metrics Trend</h4>
              <div style={{ width: "100%", height: 260 }}>
                {timeSeries && timeSeries.years && timeSeries.years.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart
                      data={timeSeries.years.map((y: string, i: number) => ({
                        year: y,
                        mean_hazard: timeSeries.mean_hazard[i],
                        mean_green: timeSeries.mean_green[i],
                      }))}
                      margin={{ top: 8, right: 8, left: 8, bottom: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} tickMargin={8} />
                      <YAxis tick={{ fontSize: 11 }} tickMargin={8} />
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
              <h4>Model Health Status</h4>
              <p className="eda-modal-subtitle" style={{ marginTop: 0, marginBottom: 10 }}>
                Data Quality reflects the inputs used in the EDA section (Hazard, Green, Population). Good = suitable for interpreting EDA and model inputs.
              </p>

              {modelHealthItems.map((item, index) => (
                <div key={index}>
                  <div
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
                      {item.label === "Data Quality" && String(item.value).length > 50
                        ? (item.status === "good" ? "Good" : "Partial")
                        : item.value}
                    </span>
                  </div>

                  {item.label === "Data Quality" && String(item.value).length > 50 && (
                    <div style={{ fontSize: 12, color: "#555", marginTop: 4, paddingLeft: 24 }}>{item.value}</div>
                  )}
                </div>
              ))}

              {/* Enhanced Data Quality Metrics */}
              {enhancedDataQuality && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #eee" }}>
                  <h4 style={{ fontSize: 14, marginBottom: 12 }}>Enhanced Data Quality Metrics</h4>
                  
                  {/* Completeness */}
                  {enhancedDataQuality.completeness && (
                    <div style={{ marginBottom: 16 }}>
                      <h5 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#666" }}>Data Completeness (%)</h5>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Hazard Index</div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: enhancedDataQuality.completeness.hazard >= 90 ? "#137333" : enhancedDataQuality.completeness.hazard >= 70 ? "#ff9800" : "#d32f2f" }}>
                            {enhancedDataQuality.completeness.hazard}%
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Green Index</div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: enhancedDataQuality.completeness.green >= 90 ? "#137333" : enhancedDataQuality.completeness.green >= 70 ? "#ff9800" : "#d32f2f" }}>
                            {enhancedDataQuality.completeness.green}%
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Population</div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: enhancedDataQuality.completeness.population >= 90 ? "#137333" : enhancedDataQuality.completeness.population >= 70 ? "#ff9800" : "#d32f2f" }}>
                            {enhancedDataQuality.completeness.population}%
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Overall</div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: enhancedDataQuality.completeness.overall >= 90 ? "#137333" : enhancedDataQuality.completeness.overall >= 70 ? "#ff9800" : "#d32f2f" }}>
                            {enhancedDataQuality.completeness.overall}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Consistency */}
                  {enhancedDataQuality.consistency && (
                    <div style={{ marginBottom: 16 }}>
                      <h5 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#666" }}>Data Consistency (%)</h5>
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Hazard Index</div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: enhancedDataQuality.consistency.hazard >= 90 ? "#137333" : "#ff9800" }}>
                            {enhancedDataQuality.consistency.hazard}%
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Green Index</div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: enhancedDataQuality.consistency.green >= 90 ? "#137333" : "#ff9800" }}>
                            {enhancedDataQuality.consistency.green}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Missing Data */}
                  {enhancedDataQuality.missing_data_pct && (
                    <div style={{ marginBottom: 16 }}>
                      <h5 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#666" }}>Missing Data (%)</h5>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 100 }}>
                          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Hazard</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: enhancedDataQuality.missing_data_pct.hazard <= 10 ? "#137333" : enhancedDataQuality.missing_data_pct.hazard <= 30 ? "#ff9800" : "#d32f2f" }}>
                            {enhancedDataQuality.missing_data_pct.hazard}%
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 100 }}>
                          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Green</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: enhancedDataQuality.missing_data_pct.green <= 10 ? "#137333" : enhancedDataQuality.missing_data_pct.green <= 30 ? "#ff9800" : "#d32f2f" }}>
                            {enhancedDataQuality.missing_data_pct.green}%
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 100 }}>
                          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Population</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: enhancedDataQuality.missing_data_pct.population <= 10 ? "#137333" : enhancedDataQuality.missing_data_pct.population <= 30 ? "#ff9800" : "#d32f2f" }}>
                            {enhancedDataQuality.missing_data_pct.population}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Data Range Validation */}
                  {enhancedDataQuality.data_range && (
                    <div>
                      <h5 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#666" }}>Data Range Validation</h5>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {enhancedDataQuality.data_range.hazard && (
                          <div style={{ flex: 1, minWidth: 150 }}>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Hazard Index</div>
                            <div style={{ fontSize: 12 }}>
                              Range: {enhancedDataQuality.data_range.hazard.min} - {enhancedDataQuality.data_range.hazard.max}
                              {enhancedDataQuality.data_range.hazard.valid ? (
                                <span style={{ color: "#137333", marginLeft: 8 }}>✓ Valid</span>
                              ) : (
                                <span style={{ color: "#d32f2f", marginLeft: 8 }}>⚠ Out of Range</span>
                              )}
                            </div>
                          </div>
                        )}
                        {enhancedDataQuality.data_range.green && (
                          <div style={{ flex: 1, minWidth: 150 }}>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Green Index</div>
                            <div style={{ fontSize: 12 }}>
                              Range: {enhancedDataQuality.data_range.green.min} - {enhancedDataQuality.data_range.green.max}
                              {enhancedDataQuality.data_range.green.valid ? (
                                <span style={{ color: "#137333", marginLeft: 8 }}>✓ Valid</span>
                              ) : (
                                <span style={{ color: "#d32f2f", marginLeft: 8 }}>⚠ Out of Range</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DbEdaModal;
