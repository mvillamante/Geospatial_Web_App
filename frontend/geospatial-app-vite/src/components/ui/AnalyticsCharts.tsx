/**
 * Analytics charts for Dashboard — visualize geospatial model outputs.
 * Data aligned with green_index.ipynb and projection.ipynb (LSTM / formula-based).
 */

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
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

export function RiskLikelihoodChart() {
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
    <div className="analytics-chart analytics-chart--risk">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="#555" />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            stroke="#555"
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            formatter={(value: number | undefined) => [`${value != null ? value : 0}%`, "City avg"]}
            labelFormatter={(label) => `Year ${label}`}
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

export function GreenIndexProjectionChart() {
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
    <div className="analytics-chart analytics-chart--green">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="#555" />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            stroke="#555"
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            formatter={(value: number | undefined) => [value != null ? value : 0, "Green index"]}
            labelFormatter={(label) => `Year ${label}`}
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

export function HazardIndexTrendChart() {
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
    <div className="analytics-chart analytics-chart--hazard">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="#555" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#555" tickFormatter={(v) => `${v}`} />
          <Tooltip
            formatter={(value: number | undefined) => [value != null ? value : 0, "Hazard index"]}
            labelFormatter={(label) => `Year ${label}`}
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

function greenIndexToBarangaySeries(data: GreenData): { years: string[]; barangays: string[]; chartData: Record<string, number | string>[] } {
  const years = Object.keys(data).filter((y) => /^\d{4}$/.test(y)).sort();
  const allBarangays = years.length ? Object.keys(data[years[0]] || {}).sort() : [];
  const barangays = allBarangays.slice(0, FIRST_N_BARANGAYS);
  const chartData = years.map((year) => {
    const row: Record<string, number | string> = { year };
    const bar = data[year] || {};
    barangays.forEach((b) => { row[b] = bar[b]?.green_index ?? 0; });
    return row;
  });
  return { years, barangays, chartData };
}

export function GreenIndexScoresChart() {
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
    <div className="analytics-chart analytics-chart--green">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#555" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#555" width={28} />
          <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number | undefined) => [v != null ? v.toFixed(1) : 0, ""]} labelFormatter={(l) => `Year ${l}`} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {barangays.map((b, i) => (
            <Line key={b} type="monotone" dataKey={b} name={b} stroke={BARANGAY_COLORS[i % BARANGAY_COLORS.length]} strokeWidth={1.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="analytics-chart-caption">Green index (NDVI + GAR) — first 5 barangays (A–Z) 2020–2030.</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calamity Risk Likelihood by Barangay (line graph, formula + LSTM forecast)
// ---------------------------------------------------------------------------

function calamityToBarangaySeries(formula: CalamityData, forecast: CalamityData | null): { chartData: Record<string, number | string>[]; barangays: string[] } {
  const years = Object.keys(formula).filter((y) => /^\d{4}$/.test(y)).sort();
  const allBarangays = years.length ? Object.keys(formula[years[0]] || {}).sort() : [];
  const barangays = allBarangays.slice(0, FIRST_N_BARANGAYS);
  const combined: Record<string, CalamityYearData> = { ...formula };
  if (forecast) {
    Object.keys(forecast).filter((y) => /^\d{4}$/.test(y)).forEach((y) => { combined[y] = forecast[y]; });
  }
  const allYears = Object.keys(combined).filter((y) => /^\d{4}$/.test(y)).sort();
  const chartData = allYears.map((year) => {
    const row: Record<string, number | string> = { year };
    const bar = combined[year] || {};
    barangays.forEach((b) => { row[b] = bar[b]?.calamity_risk ?? 0; });
    return row;
  });
  return { chartData, barangays };
}

export function CalamityRiskBarangayChart() {
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
          const { chartData: data, barangays: brgys } = calamityToBarangaySeries(formulaTyped, forecastTyped);
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

  if (loading) return <div className="analytics-chart analytics-chart--loading"><span>Loading calamity risk data…</span></div>;
  if (error) return <div className="analytics-chart analytics-chart--error"><span>{error}</span></div>;
  if (chartData.length === 0) return <div className="analytics-chart analytics-chart--empty"><span>No calamity risk data. Run the pipeline.</span></div>;

  return (
    <div className="analytics-chart analytics-chart--risk">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#555" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#555" width={28} tickFormatter={(v) => `${v}%`} />
          <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number | undefined) => [v != null ? `${v.toFixed(1)}%` : "0%", ""]} labelFormatter={(l) => `Year ${l}`} />
          <ReferenceLine x="2025.5" stroke="#c62828" strokeDasharray="4 4" />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {barangays.map((b, i) => (
            <Line key={b} type="monotone" dataKey={b} name={b} stroke={BARANGAY_COLORS[i % BARANGAY_COLORS.length]} strokeWidth={1.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="analytics-chart-caption">Calamity risk likelihood — first 5 barangays (A–Z), historical + LSTM (2026–2030).</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Earthquake Frequency (from datasets/hazards) — line graph; null if no data
// ---------------------------------------------------------------------------

type EarthquakeRow = { date: string; max_magnitude: number; quake_count: number };

export function EarthquakeFrequencyChart({ onDataLoaded }: { onDataLoaded?: (hasData: boolean) => void }) {
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
    <div className="analytics-chart analytics-chart--earthquake">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={displayData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#555" />
          <YAxis tick={{ fontSize: 10 }} stroke="#555" />
          <Tooltip contentStyle={{ fontSize: 11 }} labelFormatter={(l) => `Year ${l}`} />
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

export function TyphoonFrequencyChart({ onDataLoaded }: { onDataLoaded?: (hasData: boolean) => void }) {
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
    <div className="analytics-chart analytics-chart--typhoon">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={displayData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#555" />
          <YAxis tick={{ fontSize: 10 }} stroke="#555" />
          <Tooltip contentStyle={{ fontSize: 11 }} labelFormatter={(l) => `Year ${l}`} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="typhoon_count" name="Typhoon count" stroke="#0d47a1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="max_severity" name="Max severity" stroke="#1565c0" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="analytics-chart-caption">Typhoon frequency and max severity by year (2020–2025) — Cabuyao region.</div>
    </div>
  );
}
