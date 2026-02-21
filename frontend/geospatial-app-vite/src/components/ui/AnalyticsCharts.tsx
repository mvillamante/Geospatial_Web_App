/**
 * Analytics charts for Dashboard — visualize geospatial model outputs.
 * Data aligned with green_index.ipynb and projection.ipynb (LSTM / formula-based).
 */

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import html2canvas from "html2canvas";
import "./AnalyticsCharts.css";

const API = "/api/hazard";

// ---------------------------------------------------------------------------
// Risk Likelihood (2020–2030): Calamity Risk Likelihood
// - 2020–2025: formula-based (/api/hazard/calamity-risk/)
// - 2026–2030: LSTM-projected from projection.ipynb (/api/hazard/calamity-risk/forecast/)
// Same source is used for the Dashboard Calamity Risk card and choropleth map.
// ---------------------------------------------------------------------------

type CalamityYearData = Record<string, { calamity_risk: number }>;
type CalamityData = Record<string, CalamityYearData>;

export type ChartExportFormat = "png" | "pdf";

const CHART_ID_REGISTRY: Record<string, string> = {
  "Calamity Risk Likelihood (City Average)": "chart-risk-likelihood",
  "Green Index Projection (City Average)": "chart-green-index-projection",
  "Hazard Index Trend (City Average)": "chart-hazard-index-trend",
  "Green Index Scores by Barangay": "chart-green-index-scores",
  "Calamity Risk Likelihood by Barangay": "chart-calamity-risk-barangay",
  "Earthquake Frequency": "chart-earthquake-frequency",
  "Typhoon Frequency": "chart-typhoon-frequency",
  "Hazard Index by Barangay": "chart-hazard-index-barangay",
};

async function exportSvgContainerToImage(
  containerId: string,
  filenameBase: string,
  format: ChartExportFormat,
): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    console.warn("[ChartExport] Container not found:", containerId);
    return false;
  }

  // Check if chart is still loading (has loading/error/empty state)
  const hasLoadingState =
    container.classList.contains("analytics-chart--loading") ||
    container.classList.contains("analytics-chart--error") ||
    container.classList.contains("analytics-chart--empty");
  
  const svg = container.querySelector("svg");
  if (!svg && !hasLoadingState) {
    console.warn("[ChartExport] No SVG found in container - chart may still be loading:", containerId);
    return false;
  }

  try {
    // Use html2canvas to capture the ENTIRE container including captions, padding, borders, etc.
    const canvas = await html2canvas(container, {
      backgroundColor: "#ffffff",
      scale: 2, // Higher resolution
      logging: false,
      useCORS: true,
      allowTaint: false,
      width: container.scrollWidth,
      height: container.scrollHeight,
      windowWidth: container.scrollWidth,
      windowHeight: container.scrollHeight,
    });

    const ext = format === "png" ? "png" : "png";
    const safeName = (filenameBase || "chart-export").replace(/[<>:"/\\|?*]/g, "_");
    const downloadName = safeName.toLowerCase().endsWith(`.${ext}`)
      ? safeName
      : `${safeName}.${ext}`;

    const pngUrl = canvas.toDataURL("image/png", 1.0);
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = downloadName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    if (format === "pdf") {
      window.alert("PDF export is not yet available; downloaded as PNG instead.");
    }
    return true;
  } catch (err) {
    console.warn("[ChartExport] Export failed:", err);
    // Fallback to SVG-only export
    return await exportSvgOnly(container, filenameBase, format);
  }
}

async function exportSvgOnly(
  container: HTMLElement,
  filenameBase: string,
  format: ChartExportFormat,
): Promise<boolean> {
  const svg = container.querySelector("svg");
  if (!svg) return false;

  const bbox = (svg as SVGSVGElement).getBoundingClientRect();
  let width = Math.round(bbox.width) || 800;
  let height = Math.round(bbox.height) || 400;
  if (width < 100 || height < 100) {
    width = 800;
    height = 400;
  }

  const clonedSvg = (svg as SVGSVGElement).cloneNode(true) as SVGSVGElement;
  clonedSvg.setAttribute("width", String(width));
  clonedSvg.setAttribute("height", String(height));

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);
  const base64 = btoa(unescape(encodeURIComponent(svgString)));
  const dataUri = `data:image/svg+xml;base64,${base64}`;

  try {
    const img = new Image();
    const imageLoaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = dataUri;
    });
    if (!imageLoaded) return false;

    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, width * scale, height * scale);

    const ext = format === "png" ? "png" : "png";
    const safeName = (filenameBase || "chart-export").replace(/[<>:"/\\|?*]/g, "_");
    const downloadName = safeName.toLowerCase().endsWith(`.${ext}`)
      ? safeName
      : `${safeName}.${ext}`;

    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = downloadName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (format === "pdf") {
      window.alert("PDF export is not yet available; downloaded as PNG instead.");
    }
    return true;
  } catch (err) {
    console.warn("[ChartExport] SVG export failed:", err);
    return false;
  }
}

export async function exportChartImageByName(
  chartName: string,
  format: ChartExportFormat,
): Promise<boolean> {
  const id = CHART_ID_REGISTRY[chartName];
  if (!id) return false;
  return exportSvgContainerToImage(id, chartName, format);
}

function computeCityAverageByYear(data: CalamityData): { year: string; value: number; isProjected?: boolean }[] {
  const years = Object.keys(data).filter((y) => /^\d{4}$/.test(y)).sort();
  const lastHistoricalYear = 2025;
  return years.map((year) => {
    const y = parseInt(year, 10);
    const bar = data[year];
    const vals = bar ? Object.values(bar).map((b) => b.calamity_risk) : [];
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return {
      year,
      value: Math.round(avg * 10) / 10,
      isProjected: y > lastHistoricalYear,
    };
  });
}

export function RiskLikelihoodChart({ chartId }: { chartId?: string }) {
  const [data, setData] = useState<{ year: string; value: number; isProjected?: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`${API}/calamity-risk/`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API}/calamity-risk/forecast/`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([formula, forecast]) => {
        if (cancelled) return;
        const formulaTyped = formula as CalamityData | null;
        const forecastTyped = forecast as CalamityData | null;

        if (forecastTyped && Object.keys(forecastTyped).length > 0 && formulaTyped) {
          const formulaSeries = computeCityAverageByYear(formulaTyped);
          const forecastSeries = computeCityAverageByYear(forecastTyped);
          const historical = formulaSeries.filter((d) => parseInt(d.year, 10) <= 2025);
          const projected = forecastSeries.filter((d) => parseInt(d.year, 10) >= 2026);
          const combined = [
            ...historical.map((d) => ({ ...d, isProjected: false })),
            ...projected.map((d) => ({ ...d, isProjected: true })),
          ].sort((a, b) => a.year.localeCompare(b.year));
          setData(combined);
        } else if (formulaTyped) {
          setData(computeCityAverageByYear(formulaTyped));
        } else if (forecastTyped && Object.keys(forecastTyped).length > 0) {
          setData(computeCityAverageByYear(forecastTyped).map((d) => ({ ...d, isProjected: true })));
        } else {
          setData([]);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Failed to load risk data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="analytics-chart analytics-chart--loading">
        <span>Loading risk likelihood data…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="analytics-chart analytics-chart--error">
        <span>{error}</span>
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div className="analytics-chart analytics-chart--empty">
        <span>No risk likelihood data available. Run the projection pipeline.</span>
      </div>
    );
  }

  return (
    <div
      className="analytics-chart analytics-chart--risk"
      id={chartId}
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="#555" />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            stroke="#555"
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            formatter={(value: number | undefined) => [`${value != null ? value : 0}%`, "City avg"]}
            labelFormatter={(label: string) => `Year ${label}`}
            contentStyle={{ fontSize: 12 }}
          />
          <ReferenceLine x="2025.5" stroke="#c62828" strokeDasharray="4 4" />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={() => "City avg calamity risk"}
          />
          <Line
            type="monotone"
            dataKey="value"
            name="City avg"
            stroke="#c62828"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="analytics-chart-caption">
        Historical (2020–2025) and LSTM-projected (2026–2030) calamity risk likelihood — Cabuyao city average.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Green Index Projection (2020–2030): from green_index.ipynb outputs
// ---------------------------------------------------------------------------

type GreenYearData = Record<string, { green_index: number }>;
type GreenData = Record<string, GreenYearData>;

const GREEN_INDEX_YEAR_MIN = 2020;
const GREEN_INDEX_YEAR_MAX = 2030;

function computeGreenCityAverageByYear(data: GreenData): { year: string; value: number }[] {
  const years = Object.keys(data)
    .filter((y) => /^\d{4}$/.test(y))
    .filter((y) => {
      const n = parseInt(y, 10);
      return n >= GREEN_INDEX_YEAR_MIN && n <= GREEN_INDEX_YEAR_MAX;
    })
    .sort();
  return years.map((year) => {
    const bar = data[year];
    const vals = bar ? Object.values(bar).map((b) => b.green_index) : [];
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { year, value: Math.round(avg * 10) / 10 };
  });
}

export function GreenIndexProjectionChart({
  chartId,
}: {
  chartId?: string;
}) {
  const [data, setData] = useState<{ year: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${API}/green-index/`)
      .then((r) => (r.ok ? r.json() : null))
      .then((green: GreenData | null) => {
        if (cancelled) return;
        if (green) setData(computeGreenCityAverageByYear(green));
        else setData([]);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Failed to load green index data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="analytics-chart analytics-chart--loading">
        <span>Loading green index data…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="analytics-chart analytics-chart--error">
        <span>{error}</span>
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div className="analytics-chart analytics-chart--empty">
        <span>No green index data available. Run the green index pipeline.</span>
      </div>
    );
  }

  return (
    <div
      className="analytics-chart analytics-chart--green"
      id={chartId}
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="#555" />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            stroke="#555"
            tickFormatter={(v: number) => `${v}`}
          />
          <Tooltip
            formatter={(value: number | undefined) => [value != null ? value : 0, "Green index"]}
            labelFormatter={(label: string) => `Year ${label}`}
            contentStyle={{ fontSize: 12 }}
          />
          <ReferenceLine x="2025.5" stroke="#2e7d32" strokeDasharray="4 4" />
          <Legend wrapperStyle={{ fontSize: 11 }} formatter={() => "City avg green index"} />
          <Line
            type="monotone"
            dataKey="value"
            name="City avg"
            stroke="#2e7d32"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="analytics-chart-caption">
        Green index (NDVI + GAR) 2020–2030 — Cabuyao city average. Vertical line: end of historical period.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hazard Index Trend (2020–2030): from hazard_index outputs
// ---------------------------------------------------------------------------

type HazardYearData = Record<string, { hazard_index: number }>;
type HazardData = Record<string, HazardYearData>;

function computeHazardCityAverageByYear(data: HazardData): { year: string; value: number }[] {
  const years = Object.keys(data).filter((y) => /^\d{4}$/.test(y)).sort();
  return years.map((year) => {
    const bar = data[year];
    const vals = bar ? Object.values(bar).map((b) => b.hazard_index) : [];
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { year, value: Math.round(avg * 10) / 10 };
  });
}

export function HazardIndexTrendChart({ chartId }: { chartId?: string }) {
  const [data, setData] = useState<{ year: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${API}/hazard-index/`)
      .then((r) => (r.ok ? r.json() : null))
      .then((hazard: HazardData | null) => {
        if (cancelled) return;
        if (hazard) setData(computeHazardCityAverageByYear(hazard));
        else setData([]);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Failed to load hazard data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="analytics-chart analytics-chart--loading">
        <span>Loading hazard index data…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="analytics-chart analytics-chart--error">
        <span>{error}</span>
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div className="analytics-chart analytics-chart--empty">
        <span>No hazard index data available.</span>
      </div>
    );
  }

  return (
    <div
      className="analytics-chart analytics-chart--hazard"
      id={chartId}
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="#555" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#555" tickFormatter={(v: number) => `${v}`} />
          <Tooltip
            formatter={(value: number | undefined) => [value != null ? value : 0, "Hazard index"]}
            labelFormatter={(label: string) => `Year ${label}`}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} formatter={() => "City avg hazard index"} />
          <Line
            type="monotone"
            dataKey="value"
            name="City avg"
            stroke="#e65100"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="analytics-chart-caption">
        Multi-hazard index (flood, landslide, earthquake, typhoon, rainfall) — Cabuyao city average.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Green Index Scores by Barangay (line graph, model-based 2020–2030)
// ---------------------------------------------------------------------------

const BARANGAY_COLORS = [
  "#2e7d32", "#1565c0", "#c62828", "#6a1b9a", "#ef6c00", "#00838f",
  "#558b2f", "#283593", "#ad1457", "#00695c", "#4527a0", "#37474f",
  "#795548", "#0277bd", "#bf360c", "#4e342e", "#37474f", "#607d8b",
];

const FIRST_N_BARANGAYS = 5;

function greenIndexToBarangaySeries(
  data: GreenData,
): { years: string[]; barangays: string[]; chartData: Record<string, number | string>[] } {
  const years = Object.keys(data)
    .filter((y) => /^\d{4}$/.test(y))
    .sort();

  // Compute average green index per barangay across all years so we can
  // rank barangays from highest to lowest.
  const barangayAgg: Record<string, { sum: number; count: number }> = {};

  years.forEach((year) => {
    const bar = data[year] || {};
    Object.entries(bar).forEach(([barangay, { green_index }]) => {
      if (typeof green_index !== "number") return;
      if (!barangayAgg[barangay]) {
        barangayAgg[barangay] = { sum: 0, count: 0 };
      }
      barangayAgg[barangay].sum += green_index;
      barangayAgg[barangay].count += 1;
    });
  });

  const rankedBarangays = Object.entries(barangayAgg)
    .map(([name, { sum, count }]) => ({
      name,
      avg: count > 0 ? sum / count : 0,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, FIRST_N_BARANGAYS)
    .map((b) => b.name);

  const barangays = rankedBarangays;

  const chartData = years.map((year) => {
    const row: Record<string, number | string> = { year };
    const bar = data[year] || {};
    barangays.forEach((b) => {
      row[b] = bar[b]?.green_index ?? 0;
    });
    return row;
  });

  return { years, barangays, chartData };
}

export function GreenIndexScoresChart({ chartId }: { chartId?: string }) {
  const [chartData, setChartData] = useState<Record<string, number | string>[]>([]);
  const [barangays, setBarangays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API}/green-index/`)
      .then((r) => (r.ok ? r.json() : null))
      .then((green: GreenData | null) => {
        if (cancelled) return;
        if (green) {
          const { chartData: data, barangays: brgys } = greenIndexToBarangaySeries(green);
          setChartData(data);
          setBarangays(brgys);
        } else {
          setChartData([]);
          setBarangays([]);
        }
      })
      .catch((e) => { if (!cancelled) setError(e.message || "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="analytics-chart analytics-chart--loading"><span>Loading green index data…</span></div>;
  if (error) return <div className="analytics-chart analytics-chart--error"><span>{error}</span></div>;
  if (chartData.length === 0) return <div className="analytics-chart analytics-chart--empty"><span>No green index data. Run the pipeline.</span></div>;

  return (
    <div
      className="analytics-chart analytics-chart--green"
      id={chartId}
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#555" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#555" width={28} />
          <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number | undefined) => [v != null ? v.toFixed(1) : 0, ""]} labelFormatter={(l: string) => `Year ${l}`} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {barangays.map((b, i) => (
            <Line key={b} type="monotone" dataKey={b} name={b} stroke={BARANGAY_COLORS[i % BARANGAY_COLORS.length]} strokeWidth={1.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="analytics-chart-caption">
        Green index (NDVI + GAR) — Top 5 barangays projected 2020–2030.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calamity Risk Likelihood by Barangay (line graph, formula + LSTM forecast)
// ---------------------------------------------------------------------------

function calamityToBarangaySeries(
  formula: CalamityData,
  forecast: CalamityData | null,
  referenceYear?: number | string,
): { chartData: Record<string, number | string>[]; barangays: string[] } {
  const combined: Record<string, CalamityYearData> = { ...formula };

  if (forecast) {
    Object.keys(forecast)
      .filter((y) => /^\d{4}$/.test(y))
      .forEach((y) => {
        combined[y] = forecast[y];
      });
  }

  const allYears = Object.keys(combined)
    .filter((y) => /^\d{4}$/.test(y))
    .sort();

  let barangays: string[];

  const yearKey = referenceYear != null ? String(referenceYear) : null;
  if (yearKey && combined[yearKey]) {
    // Top 5 by CRL in the selected year (slider)
    barangays = Object.entries(combined[yearKey])
      .map(([name, r]) => ({ name, cr: typeof (r?.calamity_risk) === "number" ? r.calamity_risk : 0 }))
      .sort((a, b) => b.cr - a.cr)
      .slice(0, FIRST_N_BARANGAYS)
      .map((b) => b.name);
  } else {
    const barangayAgg: Record<string, { sum: number; count: number }> = {};
    allYears.forEach((year) => {
      const bar = combined[year] || {};
      Object.entries(bar).forEach(([barangay, { calamity_risk }]) => {
        if (typeof calamity_risk !== "number") return;
        if (!barangayAgg[barangay]) {
          barangayAgg[barangay] = { sum: 0, count: 0 };
        }
        barangayAgg[barangay].sum += calamity_risk;
        barangayAgg[barangay].count += 1;
      });
    });
    barangays = Object.entries(barangayAgg)
      .map(([name, { sum, count }]) => ({ name, avg: count > 0 ? sum / count : 0 }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, FIRST_N_BARANGAYS)
      .map((b) => b.name);
  }

  const chartData = allYears.map((year) => {
    const row: Record<string, number | string> = { year };
    const bar = combined[year] || {};
    barangays.forEach((b) => {
      row[b] = bar[b]?.calamity_risk ?? 0;
    });
    return row;
  });

  return { chartData, barangays };
}

export function CalamityRiskBarangayChart({
  chartId,
  year: referenceYear,
}: {
  chartId?: string;
  year?: number;
}) {
  const [rawData, setRawData] = useState<{ formula: CalamityData; forecast: CalamityData | null } | null>(null);
  const [chartData, setChartData] = useState<Record<string, number | string>[]>([]);
  const [barangays, setBarangays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${API}/calamity-risk/`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API}/calamity-risk/forecast/`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([formula, forecast]) => {
        if (cancelled) return;
        const formulaTyped = formula as CalamityData | null;
        const forecastTyped = forecast as CalamityData | null;
        if (formulaTyped && Object.keys(formulaTyped).length > 0) {
          setRawData({ formula: formulaTyped, forecast: forecastTyped });
        } else {
          setRawData(null);
          setChartData([]);
          setBarangays([]);
        }
      })
      .catch((e) => { if (!cancelled) setError(e.message || "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!rawData) return;
    const { chartData: data, barangays: brgys } = calamityToBarangaySeries(
      rawData.formula,
      rawData.forecast,
      referenceYear,
    );
    setChartData(data);
    setBarangays(brgys);
  }, [rawData, referenceYear]);

  if (loading) return <div className="analytics-chart analytics-chart--loading"><span>Loading calamity risk data…</span></div>;
  if (error) return <div className="analytics-chart analytics-chart--error"><span>{error}</span></div>;
  if (chartData.length === 0) return <div className="analytics-chart analytics-chart--empty"><span>No calamity risk data. Run the pipeline.</span></div>;

  const caption =
    referenceYear != null && referenceYear >= 2020 && referenceYear <= 2030
      ? `Top 5 barangays by CRL in ${referenceYear} (highest to lowest). Full series: historical + LSTM (2026–2030).`
      : "Calamity risk likelihood — Top 5 barangays (highest to lowest), historical + LSTM (2026–2030).";

  return (
    <div
      className="analytics-chart analytics-chart--risk"
      id={chartId}
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#555" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#555" width={28} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number | undefined) => [v != null ? `${v.toFixed(1)}%` : "0%", ""]} labelFormatter={(l: string) => `Year ${l}`} />
          <ReferenceLine x="2025.5" stroke="#c62828" strokeDasharray="4 4" />
          <Legend
            wrapperStyle={{ fontSize: 10 }}
            content={() => (
              <div className="recharts-legend-wrapper" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 16px", marginTop: 8 }}>
                {barangays.map((b, i) => (
                  <span key={b} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 12, height: 2, background: BARANGAY_COLORS[i % BARANGAY_COLORS.length] }} />
                    <span>{b}</span>
                  </span>
                ))}
              </div>
            )}
          />
          {barangays.map((b, i) => (
            <Line key={b} type="monotone" dataKey={b} name={b} stroke={BARANGAY_COLORS[i % BARANGAY_COLORS.length]} strokeWidth={1.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="analytics-chart-caption">
        {caption}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Earthquake Frequency (from datasets/hazards) — line graph; null if no data
// ---------------------------------------------------------------------------

type EarthquakeRow = { date: string; max_magnitude: number; quake_count: number };

export function EarthquakeFrequencyChart({
  onDataLoaded,
  chartId,
}: {
  onDataLoaded?: (hasData: boolean) => void;
  chartId?: string;
}) {
  const [data, setData] = useState<EarthquakeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API}/datasets/earthquake-freq/`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((body: { data?: EarthquakeRow[] } | null) => {
        if (cancelled) return;
        const list = body?.data ?? [];
        setData(Array.isArray(list) ? list : []);
        const ok = Array.isArray(list) && list.length > 0;
        setHasData(ok);
        onDataLoaded?.(ok);
      })
      .catch(() => { if (!cancelled) { setHasData(false); onDataLoaded?.(false); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [onDataLoaded]);

  if (loading) return <div className="analytics-chart analytics-chart--loading"><span>Loading…</span></div>;
  if (!hasData || data.length === 0) return null;

  const yearRange = { min: 2020, max: 2025 };
  const byYear: Record<string, { quake_count: number; max_magnitude: number }> = {};
  for (let y = yearRange.min; y <= yearRange.max; y++) byYear[String(y)] = { quake_count: 0, max_magnitude: 0 };
  data.forEach((d) => {
    const year = d.date.slice(0, 4);
    if (year in byYear) {
      byYear[year].quake_count += d.quake_count ?? 0;
      byYear[year].max_magnitude = Math.max(byYear[year].max_magnitude, d.max_magnitude ?? 0);
    }
  });
  const displayData = Object.keys(byYear).sort().map((year) => ({ year, ...byYear[year] }));

  return (
    <div
      className="analytics-chart analytics-chart--earthquake"
      id={chartId}
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={displayData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#555" />
          <YAxis tick={{ fontSize: 10 }} stroke="#555" />
          <Tooltip contentStyle={{ fontSize: 11 }} labelFormatter={(l: string) => `Year ${l}`} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="quake_count" name="Earthquake count" stroke="#5d4037" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="max_magnitude" name="Max magnitude" stroke="#ff7043" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="analytics-chart-caption">Earthquake frequency and max magnitude by year (2020–2025) — Cabuyao region.</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Typhoon Frequency (from datasets/hazards) — line graph; null if no data
// ---------------------------------------------------------------------------

type TyphoonRow = { date: string; typhoon_count: number; max_severity: number };

export function TyphoonFrequencyChart({
  onDataLoaded,
  chartId,
}: {
  onDataLoaded?: (hasData: boolean) => void;
  chartId?: string;
}) {
  const [data, setData] = useState<TyphoonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API}/datasets/typhoon-freq/`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((body: { data?: TyphoonRow[] } | null) => {
        if (cancelled) return;
        const list = body?.data ?? [];
        setData(Array.isArray(list) ? list : []);
        const ok = Array.isArray(list) && list.length > 0;
        setHasData(ok);
        onDataLoaded?.(ok);
      })
      .catch(() => { if (!cancelled) { setHasData(false); onDataLoaded?.(false); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [onDataLoaded]);

  if (loading) return <div className="analytics-chart analytics-chart--loading"><span>Loading…</span></div>;
  if (!hasData || data.length === 0) return null;

  const yearRange = { min: 2020, max: 2025 };
  const byYear: Record<string, { typhoon_count: number; max_severity: number }> = {};
  for (let y = yearRange.min; y <= yearRange.max; y++) byYear[String(y)] = { typhoon_count: 0, max_severity: 0 };
  data.forEach((d) => {
    const year = d.date.slice(0, 4);
    if (year in byYear) {
      byYear[year].typhoon_count += d.typhoon_count ?? 0;
      byYear[year].max_severity = Math.max(byYear[year].max_severity, d.max_severity ?? 0);
    }
  });
  const displayData = Object.keys(byYear).sort().map((year) => ({ year, ...byYear[year] }));

  return (
    <div
      className="analytics-chart analytics-chart--typhoon"
      id={chartId}
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={displayData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#555" />
          <YAxis tick={{ fontSize: 10 }} stroke="#555" />
          <Tooltip contentStyle={{ fontSize: 11 }} labelFormatter={(l: string) => `Year ${l}`} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="typhoon_count" name="Typhoon count" stroke="#0d47a1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="max_severity" name="Max severity" stroke="#1565c0" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="analytics-chart-caption">Typhoon frequency and max severity by year (2020–2025) — Cabuyao region.</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hazard Index by Barangay (bar chart for a specific year)
// ---------------------------------------------------------------------------

const getHazardBarColor = (hi: number): string => {
  if (hi >= 80) return '#b71c1c';
  if (hi >= 60) return '#e53935';
  if (hi >= 40) return '#ff9800';
  if (hi >= 20) return '#fdd835';
  return '#66bb6a';
};

export function HazardIndexBarangayChart({
  year = 2025,
  chartId,
}: {
  year?: number;
  chartId?: string;
}) {
  const [chartData, setChartData] = useState<{ barangay: string; hazard_index: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API}/hazard-index/?year=${year}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return;
        const rawData = json?.data ?? json;
        if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
          setChartData([]);
          return;
        }
        const entries = Object.entries(rawData as Record<string, { hazard_index: number }>)
          // Sort by hazard index descending so we show highest-risk first
          .sort(([, aData], [, bData]) => (bData.hazard_index ?? 0) - (aData.hazard_index ?? 0))
          .slice(0, FIRST_N_BARANGAYS)
          .map(([name, data]) => ({
            barangay: name,
            hazard_index: Math.round((data.hazard_index ?? 0) * 10) / 10,
          }));
        setChartData(entries);
      })
      .catch((e) => { if (!cancelled) setError(e.message || "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year]);

  if (loading) return <div className="analytics-chart analytics-chart--loading"><span>Loading hazard data…</span></div>;
  if (error) return <div className="analytics-chart analytics-chart--error"><span>{error}</span></div>;
  if (chartData.length === 0) return <div className="analytics-chart analytics-chart--empty"><span>No hazard data available.</span></div>;

  return (
    <div
      className="analytics-chart analytics-chart--hazard"
      id={chartId}
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="barangay"
            tick={{ fontSize: 9 }}
            stroke="#555"
            angle={-25}
            textAnchor="end"
            interval={0}
          />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#555" />
          <Tooltip
            contentStyle={{ fontSize: 11 }}
            formatter={(v: number | undefined) => [`${v != null ? v.toFixed(1) : 0}`, "Hazard Index"]}
            labelFormatter={(l: string) => `Brgy. ${l}`}
          />
          <Bar dataKey="hazard_index" name="Hazard Index" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={getHazardBarColor(entry.hazard_index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="analytics-chart-caption">
        Hazard index by barangay ({year}) — Top 5 barangays (highest to lowest). Color indicates severity.
      </div>
    </div>
  );
}
