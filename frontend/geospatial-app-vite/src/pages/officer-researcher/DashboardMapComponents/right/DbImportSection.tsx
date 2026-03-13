import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
import { FaUpload, FaFileCsv } from "react-icons/fa";
import { toast } from "sonner";
import "../../DashboardMapPage.css";
import PortalTooltip from "../left/PortalTooltip";

const VALID_YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027];

interface ParsedGreenRow {
  year: number;
  barangay: string;
  green_index: number;
  mean_ndvi?: number;
  gar?: number;
  predicted?: boolean;
}

interface ParsedHazardRow {
  year: number;
  barangay: string;
  hazard_index: number;
  predicted?: boolean;
}

interface ParsedCalamityRow {
  year: number;
  barangay: string;
  calamity_risk: number;
  predicted?: boolean;
}

interface DbImportSectionProps {
  getGreenIndexColor?: (val: number) => string;
  getHazardIndexColor?: (val: number) => string;
  getCalamityRiskColor?: (val: number) => string;
}

function parseGreenIndexCsv(text: string): ParsedGreenRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const yearIdx = header.indexOf("year");
  const barangayIdx = header.indexOf("barangay");
  const greenIdx = header.indexOf("green_index");

  if (yearIdx < 0 || barangayIdx < 0 || greenIdx < 0) {
    throw new Error(
      "CSV must have columns: year, barangay, green_index"
    );
  }

  const rows: ParsedGreenRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.trim());
    const year = parseInt(parts[yearIdx], 10);
    const barangay = parts[barangayIdx];
    const green_index = parseFloat(parts[greenIdx]);

    if (isNaN(year) || !barangay || isNaN(green_index)) continue;
    if (!VALID_YEARS.includes(year)) continue;

    rows.push({
      year,
      barangay,
      green_index,
      mean_ndvi: header.includes("mean_ndvi")
        ? parseFloat(parts[header.indexOf("mean_ndvi")]) || undefined
        : undefined,
      gar: header.includes("gar")
        ? parseFloat(parts[header.indexOf("gar")]) || undefined
        : undefined,
      predicted:
        header.includes("predicted") &&
        (parts[header.indexOf("predicted")]?.toLowerCase() === "true" ||
          parts[header.indexOf("predicted")] === "1")
          ? true
          : undefined,
    });
  }
  return rows;
}

function parseHazardIndexCsv(text: string): ParsedHazardRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const yearIdx = header.indexOf("year");
  const barangayIdx = header.indexOf("barangay");
  const hazardIdx = header.indexOf("hazard_index");

  if (yearIdx < 0 || barangayIdx < 0 || hazardIdx < 0) {
    throw new Error(
      "CSV must have columns: year, barangay, hazard_index"
    );
  }

  const rows: ParsedHazardRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.trim());
    const year = parseInt(parts[yearIdx], 10);
    const barangay = parts[barangayIdx];
    const hazard_index = parseFloat(parts[hazardIdx]);

    if (isNaN(year) || !barangay || isNaN(hazard_index)) continue;
    if (!VALID_YEARS.includes(year)) continue;

    rows.push({
      year,
      barangay,
      hazard_index,
      predicted:
        header.includes("predicted") &&
        (parts[header.indexOf("predicted")]?.toLowerCase() === "true" ||
          parts[header.indexOf("predicted")] === "1")
          ? true
          : undefined,
    });
  }
  return rows;
}

function parseCalamityIndexCsv(text: string): ParsedCalamityRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const yearIdx = header.indexOf("year");
  const barangayIdx = header.indexOf("barangay");
  const calamityIdx = header.indexOf("calamity_risk");

  if (yearIdx < 0 || barangayIdx < 0 || calamityIdx < 0) {
    throw new Error(
      "CSV must have columns: year, barangay, calamity_risk"
    );
  }

  const rows: ParsedCalamityRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.trim());
    const year = parseInt(parts[yearIdx], 10);
    const barangay = parts[barangayIdx];
    const calamity_risk = parseFloat(parts[calamityIdx]);

    if (isNaN(year) || !barangay || isNaN(calamity_risk)) continue;
    if (!VALID_YEARS.includes(year)) continue;

    rows.push({
      year,
      barangay,
      calamity_risk,
      predicted:
        header.includes("predicted") &&
        (parts[header.indexOf("predicted")]?.toLowerCase() === "true" ||
          parts[header.indexOf("predicted")] === "1")
          ? true
          : undefined,
    });
  }
  return rows;
}

function computeCityAverageByYear(
  rows: ParsedGreenRow[],
  projectionStartYear = 2026
): { year: string; value: number; isProjection: boolean }[] {
  const byYear: Record<number, number[]> = {};
  for (const r of rows) {
    if (!byYear[r.year]) byYear[r.year] = [];
    byYear[r.year].push(r.green_index);
  }
  return Object.keys(byYear)
    .map(Number)
    .sort((a, b) => a - b)
    .filter((y) => VALID_YEARS.includes(y))
    .map((year) => ({
      year: String(year),
      value: Math.round(
        (byYear[year].reduce((a, b) => a + b, 0) / byYear[year].length) * 10
      ) / 10,
      isProjection: year >= projectionStartYear,
    }));
}

function computeCityAverageByYearHazard(
  rows: ParsedHazardRow[],
  projectionStartYear = 2026
): { year: string; value: number; isProjection: boolean }[] {
  const byYear: Record<number, number[]> = {};
  for (const r of rows) {
    if (!byYear[r.year]) byYear[r.year] = [];
    byYear[r.year].push(r.hazard_index);
  }
  return Object.keys(byYear)
    .map(Number)
    .sort((a, b) => a - b)
    .filter((y) => VALID_YEARS.includes(y))
    .map((year) => ({
      year: String(year),
      value: Math.round(
        (byYear[year].reduce((a, b) => a + b, 0) / byYear[year].length) * 10
      ) / 10,
      isProjection: year >= projectionStartYear,
    }));
}

function computeCityAverageByYearCalamity(
  rows: ParsedCalamityRow[],
  projectionStartYear = 2026
): { year: string; value: number; isProjection: boolean }[] {
  const byYear: Record<number, number[]> = {};
  for (const r of rows) {
    if (!byYear[r.year]) byYear[r.year] = [];
    byYear[r.year].push(r.calamity_risk);
  }
  return Object.keys(byYear)
    .map(Number)
    .sort((a, b) => a - b)
    .filter((y) => VALID_YEARS.includes(y))
    .map((year) => ({
      year: String(year),
      value: Math.round(
        (byYear[year].reduce((a, b) => a + b, 0) / byYear[year].length) * 10
      ) / 10,
      isProjection: year >= projectionStartYear,
    }));
}

function findHighLow<T extends { barangay: string }>(
  rows: T[],
  key: keyof T
): { highest: { barangay: string; value: number } | null; lowest: { barangay: string; value: number } | null } {
  if (rows.length === 0) return { highest: null, lowest: null };
  let highest = { barangay: rows[0].barangay, value: Number(rows[0][key]) };
  let lowest = { barangay: rows[0].barangay, value: Number(rows[0][key]) };
  for (const r of rows) {
    const v = Number(r[key]);
    if (v > highest.value) highest = { barangay: r.barangay, value: v };
    if (v < lowest.value) lowest = { barangay: r.barangay, value: v };
  }
  return { highest, lowest };
}

const DbImportSection: React.FC<DbImportSectionProps> = ({
  getGreenIndexColor,
  getHazardIndexColor,
  getCalamityRiskColor,
}) => {
  const [importIndex, setImportIndex] = useState<"green" | "hazard" | "calamity">("green");

  // Green Index state
  const [historicalRows, setHistoricalRows] = useState<ParsedGreenRow[]>([]);
  const [projectionRows, setProjectionRows] = useState<ParsedGreenRow[]>([]);
  const [actual2026Rows, setActual2026Rows] = useState<ParsedGreenRow[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [parseError, setParseError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiInsightAvg, setAiInsightAvg] = useState<string | null>(null);
  const [aiInsight2026, setAiInsight2026] = useState<string | null>(null);
  const [aiInsightLoading, setAiInsightLoading] = useState(false);
  const [aiInsightError, setAiInsightError] = useState<string | null>(null);
  const [historicalFileName, setHistoricalFileName] = useState<string | null>(null);
  const [actual2026FileName, setActual2026FileName] = useState<string | null>(null);

  // Hazard Index state
  const [historicalHazardRows, setHistoricalHazardRows] = useState<ParsedHazardRow[]>([]);
  const [projectionHazardRows, setProjectionHazardRows] = useState<ParsedHazardRow[]>([]);
  const [actual2026HazardRows, setActual2026HazardRows] = useState<ParsedHazardRow[]>([]);
  const [parseErrorHazard, setParseErrorHazard] = useState<string | null>(null);
  const [aiInsightHazardAvg, setAiInsightHazardAvg] = useState<string | null>(null);
  const [aiInsightHazard2026, setAiInsightHazard2026] = useState<string | null>(null);
  const [aiInsightHazardLoading, setAiInsightHazardLoading] = useState(false);
  const [aiInsightHazardError, setAiInsightHazardError] = useState<string | null>(null);
  const [historicalHazardFileName, setHistoricalHazardFileName] = useState<string | null>(null);
  const [actual2026HazardFileName, setActual2026HazardFileName] = useState<string | null>(null);

  // Calamity Risk state
  const [historicalCalamityRows, setHistoricalCalamityRows] = useState<ParsedCalamityRow[]>([]);
  const [projectionCalamityRows, setProjectionCalamityRows] = useState<ParsedCalamityRow[]>([]);
  const [actual2026CalamityRows, setActual2026CalamityRows] = useState<ParsedCalamityRow[]>([]);
  const [parseErrorCalamity, setParseErrorCalamity] = useState<string | null>(null);
  const [aiInsightCalamityAvg, setAiInsightCalamityAvg] = useState<string | null>(null);
  const [aiInsightCalamity2026, setAiInsightCalamity2026] = useState<string | null>(null);
  const [aiInsightCalamityLoading, setAiInsightCalamityLoading] = useState(false);
  const [aiInsightCalamityError, setAiInsightCalamityError] = useState<string | null>(null);
  const [historicalCalamityFileName, setHistoricalCalamityFileName] = useState<string | null>(null);
  const [actual2026CalamityFileName, setActual2026CalamityFileName] = useState<string | null>(null);

  const [uploadTooltip, setUploadTooltip] = useState<"historical" | "actual2026" | null>(null);
  const uploadTooltipTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Determine if actual 2026 data is present for each index
  const hasActual2026Green = actual2026Rows.length > 0;
  const hasActual2026Hazard = actual2026HazardRows.length > 0;
  const hasActual2026Calamity = actual2026CalamityRows.length > 0;

  const allRows = useMemo(() => {
    if (hasActual2026Green) {
      return [...historicalRows, ...actual2026Rows, ...projectionRows];
    }
    return [...historicalRows, ...projectionRows];
  }, [historicalRows, projectionRows, actual2026Rows, hasActual2026Green]);

  const allHazardRows = useMemo(() => {
    if (hasActual2026Hazard) {
      return [...historicalHazardRows, ...actual2026HazardRows, ...projectionHazardRows];
    }
    return [...historicalHazardRows, ...projectionHazardRows];
  }, [historicalHazardRows, projectionHazardRows, actual2026HazardRows, hasActual2026Hazard]);

  const allCalamityRows = useMemo(() => {
    if (hasActual2026Calamity) {
      return [...historicalCalamityRows, ...actual2026CalamityRows, ...projectionCalamityRows];
    }
    return [...historicalCalamityRows, ...projectionCalamityRows];
  }, [historicalCalamityRows, projectionCalamityRows, actual2026CalamityRows, hasActual2026Calamity]);

  // Chart data: shift projection start to 2027 when actual 2026 data exists
  const chartData = computeCityAverageByYear(allRows, hasActual2026Green ? 2027 : 2026);
  const chartDataHazard = computeCityAverageByYearHazard(allHazardRows, hasActual2026Hazard ? 2027 : 2026);
  const chartDataCalamity = computeCityAverageByYearCalamity(allCalamityRows, hasActual2026Calamity ? 2027 : 2026);

  const has2026 = chartData.some((d) => d.year === "2026");
  const has2026Hazard = chartDataHazard.some((d) => d.year === "2026");
  const has2026Calamity = chartDataCalamity.some((d) => d.year === "2026");
  const has2027 = chartData.some((d) => d.year === "2027");
  const has2027Hazard = chartDataHazard.some((d) => d.year === "2027");
  const has2027Calamity = chartDataCalamity.some((d) => d.year === "2027");

  // Highest / lowest barangay for actual 2026
  const greenHighLow = useMemo(() => findHighLow(actual2026Rows, "green_index"), [actual2026Rows]);
  const hazardHighLow = useMemo(() => findHighLow(actual2026HazardRows, "hazard_index"), [actual2026HazardRows]);
  const calamityHighLow = useMemo(() => findHighLow(actual2026CalamityRows, "calamity_risk"), [actual2026CalamityRows]);

  // --- Upload handlers ---

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, target: "historical" | "actual2026") => {
      const file = e.target.files?.[0];
      if (!file) return;
      setParseError(null);

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result);
          const rows = parseGreenIndexCsv(text);
          if (rows.length === 0) {
            setParseError("No valid rows found. Ensure years are 2020–2027.");
            if (target === "historical") setHistoricalFileName(null);
            else setActual2026FileName(null);
            return;
          }
          if (target === "historical") {
            setHistoricalRows(rows.filter((r) => r.year <= 2025));
            setHistoricalFileName(file.name);
          } else {
            const actual = rows.filter((r) => r.year === 2026);
            if (actual.length === 0) {
              setParseError("No 2026 rows found in file. Ensure the CSV contains year=2026 data.");
              setActual2026FileName(null);
              return;
            }
            setActual2026Rows(actual);
            setActual2026FileName(file.name);
            setProjectionRows(
              actual.map((r) => ({ ...r, year: 2027, predicted: true }))
            );
          }
          toast.success(`Loaded ${rows.length} rows from ${file.name}`);
        } catch (err: any) {
          setParseError(err?.message || "Failed to parse CSV");
          toast.error("Invalid CSV format");
          if (target === "historical") setHistoricalFileName(null);
          else setActual2026FileName(null);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    []
  );

  const handleHazardFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, target: "historical" | "actual2026") => {
      const file = e.target.files?.[0];
      if (!file) return;
      setParseErrorHazard(null);

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result);
          const rows = parseHazardIndexCsv(text);
          if (rows.length === 0) {
            setParseErrorHazard("No valid rows found. Ensure years are 2020–2027.");
            if (target === "historical") setHistoricalHazardFileName(null);
            else setActual2026HazardFileName(null);
            return;
          }
          if (target === "historical") {
            setHistoricalHazardRows(rows.filter((r) => r.year <= 2025));
            setHistoricalHazardFileName(file.name);
          } else {
            const actual = rows.filter((r) => r.year === 2026);
            if (actual.length === 0) {
              setParseErrorHazard("No 2026 rows found in file. Ensure the CSV contains year=2026 data.");
              setActual2026HazardFileName(null);
              return;
            }
            setActual2026HazardRows(actual);
            setActual2026HazardFileName(file.name);
            setProjectionHazardRows(
              actual.map((r) => ({ ...r, year: 2027, predicted: true }))
            );
          }
          toast.success(`Loaded ${rows.length} rows from ${file.name}`);
        } catch (err: any) {
          setParseErrorHazard(err?.message || "Failed to parse CSV");
          toast.error("Invalid CSV format");
          if (target === "historical") setHistoricalHazardFileName(null);
          else setActual2026HazardFileName(null);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    []
  );

  const handleCalamityFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, target: "historical" | "actual2026") => {
      const file = e.target.files?.[0];
      if (!file) return;
      setParseErrorCalamity(null);

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result);
          const rows = parseCalamityIndexCsv(text);
          if (rows.length === 0) {
            setParseErrorCalamity("No valid rows found. Ensure years are 2020–2027.");
            if (target === "historical") setHistoricalCalamityFileName(null);
            else setActual2026CalamityFileName(null);
            return;
          }
          if (target === "historical") {
            setHistoricalCalamityRows(rows.filter((r) => r.year <= 2025));
            setHistoricalCalamityFileName(file.name);
          } else {
            const actual = rows.filter((r) => r.year === 2026);
            if (actual.length === 0) {
              setParseErrorCalamity("No 2026 rows found in file. Ensure the CSV contains year=2026 data.");
              setActual2026CalamityFileName(null);
              return;
            }
            setActual2026CalamityRows(actual);
            setActual2026CalamityFileName(file.name);
            setProjectionCalamityRows(
              actual.map((r) => ({ ...r, year: 2027, predicted: true }))
            );
          }
          toast.success(`Loaded ${rows.length} rows from ${file.name}`);
        } catch (err: any) {
          setParseErrorCalamity(err?.message || "Failed to parse CSV");
          toast.error("Invalid CSV format");
          if (target === "historical") setHistoricalCalamityFileName(null);
          else setActual2026CalamityFileName(null);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    []
  );

  // --- AI Insights effects ---

  useEffect(() => {
    const hasDataOrError = chartData.length > 0 || !!parseError;
    if (!hasDataOrError) {
      setAiInsight(null);
      setAiInsightAvg(null);
      setAiInsight2026(null);
      setAiInsightError(null);
      return;
    }
    const yr = allRows.filter((r) => r.year === selectedYear);
    const yearAvgVal = yr.length ? Math.round((yr.reduce((a, b) => a + b.green_index, 0) / yr.length) * 10) / 10 : null;
    const projYear = hasActual2026Green ? "2027" : "2026";
    const valProj = chartData.find((d) => d.year === projYear)?.value ?? null;
    const val2026Actual = hasActual2026Green ? (chartData.find((d) => d.year === "2026")?.value ?? null) : null;

    const greenValues = allRows.map((r) => r.green_index);
    const minVal = greenValues.length ? Math.min(...greenValues) : null;
    const maxVal = greenValues.length ? Math.max(...greenValues) : null;
    const dataQuality = {
      minGreenIndex: minVal,
      maxGreenIndex: maxVal,
      hasNegative: minVal != null && minVal < 0,
      hasOver100: maxVal != null && maxVal > 100,
    };

    let cancelled = false;
    setAiInsightLoading(true);
    setAiInsightError(null);
    fetch("/api/hazard/green-index/import-ai-insight/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chartData,
        rowCount: allRows.length,
        hasError: !!parseError,
        parseError: parseError || null,
        selectedYear,
        yearAvg: yearAvgVal,
        val2026: hasActual2026Green ? val2026Actual : valProj,
        val2027: hasActual2026Green ? valProj : null,
        hasActual2026: hasActual2026Green,
        dataQuality,
      }),
    })
      .then((r) => {
        const ct = r.headers.get("Content-Type") || "";
        if (!r.ok || !ct.includes("application/json")) {
          return r.text().then(() => {
            throw new Error("AI insights unavailable. Ensure the backend is running and GROQ_API_KEY is set.");
          });
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data.error && !data.insight_avg && !data.insight) {
          setAiInsightError(data.error);
          setAiInsightAvg(null);
          setAiInsight2026(null);
          setAiInsight(null);
        } else {
          setAiInsight(data.insight || null);
          setAiInsightAvg(data.insight_avg || null);
          setAiInsight2026(data.insight_2026 || null);
          setAiInsightError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setAiInsightError(err?.message || "Failed to load AI insight");
      })
      .finally(() => {
        if (!cancelled) setAiInsightLoading(false);
      });
    return () => { cancelled = true; };
  }, [JSON.stringify(chartData), allRows.length, parseError, selectedYear, hasActual2026Green]);

  useEffect(() => {
    const hasDataOrError = chartDataHazard.length > 0 || !!parseErrorHazard;
    if (!hasDataOrError) {
      setAiInsightHazardAvg(null);
      setAiInsightHazard2026(null);
      setAiInsightHazardError(null);
      return;
    }
    const yr = allHazardRows.filter((r) => r.year === selectedYear);
    const yearAvgVal = yr.length ? Math.round((yr.reduce((a, b) => a + b.hazard_index, 0) / yr.length) * 10) / 10 : null;
    const projYear = hasActual2026Hazard ? "2027" : "2026";
    const valProj = chartDataHazard.find((d) => d.year === projYear)?.value ?? null;
    const val2026Actual = hasActual2026Hazard ? (chartDataHazard.find((d) => d.year === "2026")?.value ?? null) : null;

    const hazardValues = allHazardRows.map((r) => r.hazard_index);
    const minVal = hazardValues.length ? Math.min(...hazardValues) : null;
    const maxVal = hazardValues.length ? Math.max(...hazardValues) : null;
    const dataQuality = {
      minHazardIndex: minVal,
      maxHazardIndex: maxVal,
      hasNegative: minVal != null && minVal < 0,
      hasOver100: maxVal != null && maxVal > 100,
    };

    let cancelled = false;
    setAiInsightHazardLoading(true);
    setAiInsightHazardError(null);
    fetch("/api/hazard/hazard-index/import-ai-insight/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chartData: chartDataHazard,
        rowCount: allHazardRows.length,
        hasError: !!parseErrorHazard,
        parseError: parseErrorHazard || null,
        selectedYear,
        yearAvg: yearAvgVal,
        val2026: hasActual2026Hazard ? val2026Actual : valProj,
        val2027: hasActual2026Hazard ? valProj : null,
        hasActual2026: hasActual2026Hazard,
        dataQuality,
      }),
    })
      .then((r) => {
        const ct = r.headers.get("Content-Type") || "";
        if (!r.ok || !ct.includes("application/json")) {
          return r.text().then(() => {
            throw new Error("AI insights unavailable. Ensure the backend is running and GROQ_API_KEY is set.");
          });
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data.error && !data.insight_avg && !data.insight) {
          setAiInsightHazardError(data.error);
          setAiInsightHazardAvg(null);
          setAiInsightHazard2026(null);
        } else {
          setAiInsightHazardAvg(data.insight_avg || null);
          setAiInsightHazard2026(data.insight_2026 || null);
          setAiInsightHazardError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setAiInsightHazardError(err?.message || "Failed to load AI insight");
      })
      .finally(() => {
        if (!cancelled) setAiInsightHazardLoading(false);
      });
    return () => { cancelled = true; };
  }, [JSON.stringify(chartDataHazard), allHazardRows.length, parseErrorHazard, selectedYear, hasActual2026Hazard]);

  useEffect(() => {
    const hasDataOrError = chartDataCalamity.length > 0 || !!parseErrorCalamity;
    if (!hasDataOrError) {
      setAiInsightCalamityAvg(null);
      setAiInsightCalamity2026(null);
      setAiInsightCalamityError(null);
      return;
    }
    const yr = allCalamityRows.filter((r) => r.year === selectedYear);
    const yearAvgVal = yr.length ? Math.round((yr.reduce((a, b) => a + b.calamity_risk, 0) / yr.length) * 10) / 10 : null;
    const projYear = hasActual2026Calamity ? "2027" : "2026";
    const valProj = chartDataCalamity.find((d) => d.year === projYear)?.value ?? null;
    const val2026Actual = hasActual2026Calamity ? (chartDataCalamity.find((d) => d.year === "2026")?.value ?? null) : null;

    const calamityValues = allCalamityRows.map((r) => r.calamity_risk);
    const minVal = calamityValues.length ? Math.min(...calamityValues) : null;
    const maxVal = calamityValues.length ? Math.max(...calamityValues) : null;
    const dataQuality = {
      minCalamityRisk: minVal,
      maxCalamityRisk: maxVal,
      hasNegative: minVal != null && minVal < 0,
      hasOver100: maxVal != null && maxVal > 100,
    };

    let cancelled = false;
    setAiInsightCalamityLoading(true);
    setAiInsightCalamityError(null);
    fetch("/api/hazard/calamity-risk/import-ai-insight/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chartData: chartDataCalamity,
        rowCount: allCalamityRows.length,
        hasError: !!parseErrorCalamity,
        parseError: parseErrorCalamity || null,
        selectedYear,
        yearAvg: yearAvgVal,
        val2026: hasActual2026Calamity ? val2026Actual : valProj,
        val2027: hasActual2026Calamity ? valProj : null,
        hasActual2026: hasActual2026Calamity,
        dataQuality,
      }),
    })
      .then((r) => {
        const ct = r.headers.get("Content-Type") || "";
        if (!r.ok || !ct.includes("application/json")) {
          return r.text().then(() => {
            throw new Error("AI insights unavailable. Ensure the backend is running and GROQ_API_KEY is set.");
          });
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data.error && !data.insight_avg && !data.insight) {
          setAiInsightCalamityError(data.error);
          setAiInsightCalamityAvg(null);
          setAiInsightCalamity2026(null);
        } else {
          setAiInsightCalamityAvg(data.insight_avg || null);
          setAiInsightCalamity2026(data.insight_2026 || null);
          setAiInsightCalamityError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setAiInsightCalamityError(err?.message || "Failed to load AI insight");
      })
      .finally(() => {
        if (!cancelled) setAiInsightCalamityLoading(false);
      });
    return () => { cancelled = true; };
  }, [JSON.stringify(chartDataCalamity), allCalamityRows.length, parseErrorCalamity, selectedYear, hasActual2026Calamity]);

  // --- Computed averages ---

  const yearAvg =
    allRows.length > 0 && selectedYear
      ? (() => {
          const yr = allRows.filter((r) => r.year === selectedYear);
          if (yr.length === 0) return null;
          return Math.round((yr.reduce((a, b) => a + b.green_index, 0) / yr.length) * 10) / 10;
        })()
      : null;

  const yearAvgHazard =
    allHazardRows.length > 0 && selectedYear
      ? (() => {
          const yr = allHazardRows.filter((r) => r.year === selectedYear);
          if (yr.length === 0) return null;
          return Math.round((yr.reduce((a, b) => a + b.hazard_index, 0) / yr.length) * 10) / 10;
        })()
      : null;

  const yearAvgCalamity =
    allCalamityRows.length > 0 && selectedYear
      ? (() => {
          const yr = allCalamityRows.filter((r) => r.year === selectedYear);
          if (yr.length === 0) return null;
          return Math.round((yr.reduce((a, b) => a + b.calamity_risk, 0) / yr.length) * 10) / 10;
        })()
      : null;

  // Custom tick renderer for chart X-axis to show "(actual)" and "(predicted)" labels
  const renderXAxisTick = (hasActual: boolean, has2027Data: boolean, color: string) =>
    ({ x, y, payload }: any) => {
      const yr = payload.value;
      let label = yr;
      let sublabel = "";
      if (hasActual && yr === "2026") sublabel = "(actual)";
      else if (has2027Data && yr === "2027") sublabel = "(predicted)";
      else if (!hasActual && yr === "2026") sublabel = "(predicted)";
      return (
        <g transform={`translate(${x},${y})`}>
          <text x={0} y={0} dy={12} textAnchor="middle" fill="#555" fontSize={11}>
            {label}
          </text>
          {sublabel && (
            <text x={0} y={0} dy={23} textAnchor="middle" fill={color} fontSize={9} fontStyle="italic">
              {sublabel}
            </text>
          )}
        </g>
      );
    };

  // Helper to build upload section for each index
  const renderUploadTooltipContent = (indexType: "green" | "hazard" | "calamity") => {
    if (uploadTooltip === "historical") {
      if (indexType === "green") return "Past Green Index values by barangay (2020–2025). Use this for trends and charts.";
      if (indexType === "hazard") return "Past Hazard Index values by barangay (2020–2025). Higher values indicate higher risk.";
      return "Past Calamity Risk Likelihood values by barangay (2020–2025). Higher values indicate higher risk.";
    }
    if (uploadTooltip === "actual2026") {
      if (indexType === "green") return "Actual 2026 Green Index data. Upload to see actual values and generate a 2027 projection.";
      if (indexType === "hazard") return "Actual 2026 Hazard Index data. Upload to see actual values and generate a 2027 projection.";
      return "Actual 2026 Calamity Risk data. Upload to see actual values and generate a 2027 projection.";
    }
    return "";
  };

  return (
    <div className="right-panel-content import-section">
      <h4>Import Section</h4>
      <p className="import-subtitle">
        <strong>Collection → Processing → Analysis → Interpretation</strong>
      </p>

      <div className="import-index-tabs">
        <button
          className={importIndex === "green" ? "active" : ""}
          onClick={() => setImportIndex("green")}
        >
          Green Index
        </button>
        <button
          className={`${importIndex === "hazard" ? "active" : ""} hazard`}
          onClick={() => setImportIndex("hazard")}
        >
          Hazard Index
        </button>
        <button
          className={`${importIndex === "calamity" ? "active" : ""} calamity`}
          onClick={() => setImportIndex("calamity")}
        >
          Calamity Risk
        </button>
      </div>

      {/* ===================== GREEN INDEX ===================== */}
      {importIndex === "green" && (
        <div className="panel-card import-green-card">
          <span className="panel-card-title">Green Index Import</span>

          <p className="import-format-hint">
            Expected CSV format: <code>year,barangay,green_index,mean_ndvi,gar,predicted</code>
            {" "}
            <a href="/green_index_import_sample.csv" download className="import-download-link">
              Download sample (2020–2025)
            </a>
            {" · "}
            <a href="/green_index_2026_actual_sample.csv" download className="import-download-link">
              Download 2026 sample
            </a>
          </p>

          {/* Historical upload */}
          <div className="import-upload-group">
            <label className="import-upload-label">
              <FaUpload /> Historical data (2020–2025)
              <span className="help-wrap">
                <button
                  type="button"
                  className="help-icon small"
                  aria-label="Info about historical data"
                  onMouseEnter={(e) => { uploadTooltipTriggerRef.current = e.currentTarget; setUploadTooltip("historical"); }}
                  onMouseLeave={() => setUploadTooltip(null)}
                  onClick={(e) => { e.stopPropagation(); uploadTooltipTriggerRef.current = e.currentTarget; setUploadTooltip(uploadTooltip === "historical" ? null : "historical"); }}
                >?</button>
              </span>
            </label>
            <div className="import-file-row">
              <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, "historical")} className="import-file-input" id="import-historical-file" />
              {historicalFileName && <span className="import-file-name" title={historicalFileName}>{historicalFileName}</span>}
            </div>
          </div>

          {/* 2026 actual data upload */}
          <div className="import-upload-group import-actual-2026-group">
            <label className="import-upload-label">
              <FaFileCsv /> 2026 Actual Data
              <span className="help-wrap">
                <button
                  type="button"
                  className="help-icon small"
                  aria-label="Info about 2026 actual data"
                  onMouseEnter={(e) => { uploadTooltipTriggerRef.current = e.currentTarget; setUploadTooltip("actual2026"); }}
                  onMouseLeave={() => setUploadTooltip(null)}
                  onClick={(e) => { e.stopPropagation(); uploadTooltipTriggerRef.current = e.currentTarget; setUploadTooltip(uploadTooltip === "actual2026" ? null : "actual2026"); }}
                >?</button>
              </span>
            </label>
            <div className="import-file-row">
              <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, "actual2026")} className="import-file-input" id="import-actual2026-file" />
              {actual2026FileName && <span className="import-file-name" title={actual2026FileName}>{actual2026FileName}</span>}
            </div>
          </div>

          {uploadTooltip && importIndex === "green" && (
            <PortalTooltip show={!!uploadTooltip} content={renderUploadTooltipContent("green")} triggerRef={uploadTooltipTriggerRef} placement="bottom-left" />
          )}

          {parseError && <div className="import-error">{parseError}</div>}

          {/* Highest / Lowest barangay for actual 2026 */}
          {hasActual2026Green && greenHighLow.highest && greenHighLow.lowest && (
            <div className="import-actual-2026-stats">
              <div className="import-actual-stat-row">
                <div className="panel-card import-actual-stat import-actual-highest">
                  <span className="import-actual-stat-label">Highest GI Barangay</span>
                  <span className="import-actual-stat-value">{greenHighLow.highest.barangay}</span>
                  <span className="import-actual-stat-number">{greenHighLow.highest.value}%</span>
                </div>
                <div className="panel-card import-actual-stat import-actual-lowest">
                  <span className="import-actual-stat-label">Lowest GI Barangay</span>
                  <span className="import-actual-stat-value">{greenHighLow.lowest.barangay}</span>
                  <span className="import-actual-stat-number">{greenHighLow.lowest.value}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Year selector */}
          {historicalRows.length > 0 && (
            <div className="import-year-select">
              <label>View Green Index city avg. for year:</label>
              <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                {[2020, 2021, 2022, 2023, 2024, 2025].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {/* Summary cards */}
          {yearAvg != null && (
            <div className="panel-card import-projection-summary" style={getGreenIndexColor ? { borderLeftColor: getGreenIndexColor(yearAvg) } : undefined}>
              <span className="import-projection-label">Green Index city average — {selectedYear}</span>
              <span className="import-projection-value">{yearAvg}%</span>
            </div>
          )}

          {/* Actual 2026 city average */}
          {hasActual2026Green && has2026 && (
            <div className="panel-card import-projection-summary import-actual-2026-summary">
              <span className="import-projection-label">Actual 2026 City Average</span>
              <span className="import-projection-value">{chartData.find((d) => d.year === "2026")?.value ?? "—"}%</span>
            </div>
          )}

          {/* Projected 2027 (when actual 2026 exists) */}
          {hasActual2026Green && has2027 && (
            <div className="panel-card import-projection-summary import-2026">
              <span className="import-projection-label">Projected 2027 city average</span>
              <span className="import-projection-value">{chartData.find((d) => d.year === "2027")?.value ?? "—"}%</span>
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="panel-card import-chart-card">
              <span className="panel-card-title">Green Index trends and projection</span>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="year" tick={renderXAxisTick(hasActual2026Green, has2027, "#2e7d32")} stroke="#555" height={45} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#555" tickFormatter={(v: number) => `${v}`} />
                  <Tooltip
                    formatter={(value: number | undefined, _name: string, props: any) => {
                      const yr = props?.payload?.year;
                      let suffix = "";
                      if (hasActual2026Green && yr === "2026") suffix = " (actual)";
                      else if (yr === "2027" || (!hasActual2026Green && yr === "2026")) suffix = " (predicted)";
                      return [value != null ? value : 0, `Green index${suffix}`];
                    }}
                    labelFormatter={(label: string) => `Year ${label}`}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <ReferenceLine
                    x={hasActual2026Green ? "2026" : "2025"}
                    stroke="#2e7d32"
                    strokeDasharray="4 4"
                    label={{ value: "", position: "top" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="value" name="City avg" stroke="#2e7d32" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="analytics-chart-caption">
                Green index (NDVI + GAR) — imported data.
                {hasActual2026Green
                  ? " Vertical line: 2026 (actual). Dashed = projection boundary."
                  : " Vertical line: end of historical period."}
              </div>
            </div>
          )}

          {/* Key Insights - MOVED BELOW CHART */}
          {(chartData.length > 0 || parseError) && (
            <div className="import-key-insights">
              <span className="panel-card-title">
                Key Insights
                {aiInsightLoading && <span className="import-insight-loading"> — Loading…</span>}
              </span>
              {aiInsightLoading && !aiInsightAvg && !aiInsight ? (
                <p className="import-insight-text">Analyzing your data…</p>
              ) : aiInsightError ? (
                <p className="import-insight-text import-insight-error">{aiInsightError}</p>
              ) : (
                <>
                  {(aiInsightAvg || aiInsight) && (
                    <div className="panel-card import-key-insight">
                      <span className="import-insight-label">City average</span>
                      <p className="import-insight-text">{aiInsightAvg || aiInsight}</p>
                    </div>
                  )}
                  {aiInsight2026 && (
                    <div className="panel-card import-key-insight import-insight-2026">
                      <span className="import-insight-label">{hasActual2026Green ? "2027 projection" : "2026 projection"}</span>
                      <p className="import-insight-text">{aiInsight2026}</p>
                    </div>
                  )}
                </>
              )}
              <p className="import-insight-disclaimer">* Automatically generated — please have an expert review for final assessment.</p>
            </div>
          )}
        </div>
      )}

      {/* ===================== HAZARD INDEX ===================== */}
      {importIndex === "hazard" && (
        <div className="panel-card import-hazard-card">
          <span className="panel-card-title">Hazard Index Import</span>

          <p className="import-format-hint">
            Expected CSV format: <code>year,barangay,hazard_index,predicted</code>
            {" "}
            <a href="/hazard_index_import_sample.csv" download className="import-download-link hazard">
              Download sample (2020–2025)
            </a>
            {" · "}
            <a href="/hazard_index_2026_actual_sample.csv" download className="import-download-link hazard">
              Download 2026 sample
            </a>
          </p>

          <div className="import-upload-group">
            <label className="import-upload-label">
              <FaUpload /> Historical data (2020–2025)
              <span className="help-wrap">
                <button type="button" className="help-icon small" aria-label="Info about historical hazard data"
                  onMouseEnter={(e) => { uploadTooltipTriggerRef.current = e.currentTarget; setUploadTooltip("historical"); }}
                  onMouseLeave={() => setUploadTooltip(null)}
                  onClick={(e) => { e.stopPropagation(); uploadTooltipTriggerRef.current = e.currentTarget; setUploadTooltip(uploadTooltip === "historical" ? null : "historical"); }}
                >?</button>
              </span>
            </label>
            <div className="import-file-row">
              <input type="file" accept=".csv" onChange={(e) => handleHazardFileUpload(e, "historical")} className="import-file-input" id="import-hazard-historical-file" />
              {historicalHazardFileName && <span className="import-file-name import-file-name-hazard" title={historicalHazardFileName}>{historicalHazardFileName}</span>}
            </div>
          </div>

          {/* 2026 actual data */}
          <div className="import-upload-group import-actual-2026-group">
            <label className="import-upload-label">
              <FaFileCsv /> 2026 Actual Data
              <span className="help-wrap">
                <button type="button" className="help-icon small" aria-label="Info about 2026 actual hazard data"
                  onMouseEnter={(e) => { uploadTooltipTriggerRef.current = e.currentTarget; setUploadTooltip("actual2026"); }}
                  onMouseLeave={() => setUploadTooltip(null)}
                  onClick={(e) => { e.stopPropagation(); uploadTooltipTriggerRef.current = e.currentTarget; setUploadTooltip(uploadTooltip === "actual2026" ? null : "actual2026"); }}
                >?</button>
              </span>
            </label>
            <div className="import-file-row">
              <input type="file" accept=".csv" onChange={(e) => handleHazardFileUpload(e, "actual2026")} className="import-file-input" id="import-hazard-actual2026-file" />
              {actual2026HazardFileName && <span className="import-file-name import-file-name-hazard" title={actual2026HazardFileName}>{actual2026HazardFileName}</span>}
            </div>
          </div>

          {uploadTooltip && importIndex === "hazard" && (
            <PortalTooltip show={!!uploadTooltip} content={renderUploadTooltipContent("hazard")} triggerRef={uploadTooltipTriggerRef} placement="bottom-left" />
          )}

          {parseErrorHazard && <div className="import-error">{parseErrorHazard}</div>}

          {hasActual2026Hazard && hazardHighLow.highest && hazardHighLow.lowest && (
            <div className="import-actual-2026-stats">
              <div className="import-actual-stat-row">
                <div className="panel-card import-actual-stat import-actual-highest import-actual-stat-hazard">
                  <span className="import-actual-stat-label">Highest HI Barangay</span>
                  <span className="import-actual-stat-value">{hazardHighLow.highest.barangay}</span>
                  <span className="import-actual-stat-number">{hazardHighLow.highest.value}%</span>
                </div>
                <div className="panel-card import-actual-stat import-actual-lowest import-actual-stat-hazard">
                  <span className="import-actual-stat-label">Lowest HI Barangay</span>
                  <span className="import-actual-stat-value">{hazardHighLow.lowest.barangay}</span>
                  <span className="import-actual-stat-number">{hazardHighLow.lowest.value}%</span>
                </div>
              </div>
            </div>
          )}

          {historicalHazardRows.length > 0 && (
            <div className="import-year-select">
              <label>View Hazard Index city avg. for year:</label>
              <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                {[2020, 2021, 2022, 2023, 2024, 2025].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {yearAvgHazard != null && (
            <div className="panel-card import-projection-summary import-projection-hazard" style={getHazardIndexColor ? { borderLeftColor: getHazardIndexColor(yearAvgHazard) } : undefined}>
              <span className="import-projection-label">Hazard Index city average — {selectedYear}</span>
              <span className="import-projection-value">{yearAvgHazard}%</span>
            </div>
          )}

          {hasActual2026Hazard && has2026Hazard && (
            <div className="panel-card import-projection-summary import-actual-2026-summary import-projection-hazard">
              <span className="import-projection-label">Actual 2026 City Average</span>
              <span className="import-projection-value">{chartDataHazard.find((d) => d.year === "2026")?.value ?? "—"}%</span>
            </div>
          )}

          {hasActual2026Hazard && has2027Hazard && (
            <div className="panel-card import-projection-summary import-2026 import-projection-hazard">
              <span className="import-projection-label">Projected 2027 city average</span>
              <span className="import-projection-value">{chartDataHazard.find((d) => d.year === "2027")?.value ?? "—"}%</span>
            </div>
          )}

          {chartDataHazard.length > 0 && (
            <div className="panel-card import-chart-card import-chart-hazard">
              <span className="panel-card-title">Hazard Index trends and projection</span>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartDataHazard} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="year" tick={renderXAxisTick(hasActual2026Hazard, has2027Hazard, "#b45309")} stroke="#555" height={45} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#555" tickFormatter={(v: number) => `${v}`} />
                  <Tooltip
                    formatter={(value: number | undefined, _name: string, props: any) => {
                      const yr = props?.payload?.year;
                      let suffix = "";
                      if (hasActual2026Hazard && yr === "2026") suffix = " (actual)";
                      else if (yr === "2027" || (!hasActual2026Hazard && yr === "2026")) suffix = " (predicted)";
                      return [value != null ? value : 0, `Hazard index${suffix}`];
                    }}
                    labelFormatter={(label: string) => `Year ${label}`}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <ReferenceLine x={hasActual2026Hazard ? "2026" : "2025"} stroke="#b45309" strokeDasharray="4 4" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="value" name="City avg" stroke="#e65100" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="analytics-chart-caption">
                Hazard index (multi-hazard risk) — imported data.
                {hasActual2026Hazard
                  ? " Vertical line: 2026 (actual). Dashed = projection boundary."
                  : " Vertical line: end of historical period."}
              </div>
            </div>
          )}

          {/* Key Insights - BELOW CHART */}
          {(chartDataHazard.length > 0 || parseErrorHazard) && (
            <div className="import-key-insights">
              <span className="panel-card-title">
                Key Insights
                {aiInsightHazardLoading && <span className="import-insight-loading"> — Loading…</span>}
              </span>
              {aiInsightHazardLoading && !aiInsightHazardAvg ? (
                <p className="import-insight-text">Analyzing your hazard data…</p>
              ) : aiInsightHazardError ? (
                <p className="import-insight-text import-insight-error">{aiInsightHazardError}</p>
              ) : (
                <>
                  {aiInsightHazardAvg && (
                    <div className="panel-card import-key-insight import-insight-hazard">
                      <span className="import-insight-label">Hazard average</span>
                      <p className="import-insight-text">{aiInsightHazardAvg}</p>
                    </div>
                  )}
                  {aiInsightHazard2026 && (
                    <div className="panel-card import-key-insight import-insight-2026 import-insight-hazard">
                      <span className="import-insight-label">{hasActual2026Hazard ? "2027 hazard projection" : "2026 hazard projection"}</span>
                      <p className="import-insight-text">{aiInsightHazard2026}</p>
                    </div>
                  )}
                </>
              )}
              <p className="import-insight-disclaimer">* Automatically generated — please have an expert review for final assessment.</p>
            </div>
          )}
        </div>
      )}

      {/* ===================== CALAMITY RISK ===================== */}
      {importIndex === "calamity" && (
        <div className="panel-card import-calamity-card">
          <span className="panel-card-title">Calamity Risk Import</span>

          <p className="import-format-hint">
            Expected CSV format: <code>year,barangay,calamity_risk,predicted</code>
            {" "}
            <a href="/calamity_risk_import_sample.csv" download className="import-download-link calamity">
              Download sample (2020–2025)
            </a>
            {" · "}
            <a href="/calamity_risk_2026_actual_sample.csv" download className="import-download-link calamity">
              Download 2026 sample
            </a>
          </p>

          <div className="import-upload-group">
            <label className="import-upload-label">
              <FaUpload /> Historical data (2020–2025)
              <span className="help-wrap">
                <button type="button" className="help-icon small" aria-label="Info about historical calamity risk data"
                  onMouseEnter={(e) => { uploadTooltipTriggerRef.current = e.currentTarget; setUploadTooltip("historical"); }}
                  onMouseLeave={() => setUploadTooltip(null)}
                  onClick={(e) => { e.stopPropagation(); uploadTooltipTriggerRef.current = e.currentTarget; setUploadTooltip(uploadTooltip === "historical" ? null : "historical"); }}
                >?</button>
              </span>
            </label>
            <div className="import-file-row">
              <input type="file" accept=".csv" onChange={(e) => handleCalamityFileUpload(e, "historical")} className="import-file-input" id="import-calamity-historical-file" />
              {historicalCalamityFileName && <span className="import-file-name import-file-name-calamity" title={historicalCalamityFileName}>{historicalCalamityFileName}</span>}
            </div>
          </div>

          {/* 2026 actual data */}
          <div className="import-upload-group import-actual-2026-group">
            <label className="import-upload-label">
              <FaFileCsv /> 2026 Actual Data
              <span className="help-wrap">
                <button type="button" className="help-icon small" aria-label="Info about 2026 actual calamity risk data"
                  onMouseEnter={(e) => { uploadTooltipTriggerRef.current = e.currentTarget; setUploadTooltip("actual2026"); }}
                  onMouseLeave={() => setUploadTooltip(null)}
                  onClick={(e) => { e.stopPropagation(); uploadTooltipTriggerRef.current = e.currentTarget; setUploadTooltip(uploadTooltip === "actual2026" ? null : "actual2026"); }}
                >?</button>
              </span>
            </label>
            <div className="import-file-row">
              <input type="file" accept=".csv" onChange={(e) => handleCalamityFileUpload(e, "actual2026")} className="import-file-input" id="import-calamity-actual2026-file" />
              {actual2026CalamityFileName && <span className="import-file-name import-file-name-calamity" title={actual2026CalamityFileName}>{actual2026CalamityFileName}</span>}
            </div>
          </div>

          {uploadTooltip && importIndex === "calamity" && (
            <PortalTooltip show={!!uploadTooltip} content={renderUploadTooltipContent("calamity")} triggerRef={uploadTooltipTriggerRef} placement="bottom-left" />
          )}

          {parseErrorCalamity && <div className="import-error">{parseErrorCalamity}</div>}

          {hasActual2026Calamity && calamityHighLow.highest && calamityHighLow.lowest && (
            <div className="import-actual-2026-stats">
              <div className="import-actual-stat-row">
                <div className="panel-card import-actual-stat import-actual-highest import-actual-stat-calamity">
                  <span className="import-actual-stat-label">Highest CR Barangay</span>
                  <span className="import-actual-stat-value">{calamityHighLow.highest.barangay}</span>
                  <span className="import-actual-stat-number">{calamityHighLow.highest.value}%</span>
                </div>
                <div className="panel-card import-actual-stat import-actual-lowest import-actual-stat-calamity">
                  <span className="import-actual-stat-label">Lowest CR Barangay</span>
                  <span className="import-actual-stat-value">{calamityHighLow.lowest.barangay}</span>
                  <span className="import-actual-stat-number">{calamityHighLow.lowest.value}%</span>
                </div>
              </div>
            </div>
          )}

          {historicalCalamityRows.length > 0 && (
            <div className="import-year-select">
              <label>View Calamity Risk city avg. for year:</label>
              <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                {[2020, 2021, 2022, 2023, 2024, 2025].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {yearAvgCalamity != null && (
            <div className="panel-card import-projection-summary import-projection-calamity" style={getCalamityRiskColor ? { borderLeftColor: getCalamityRiskColor(yearAvgCalamity) } : undefined}>
              <span className="import-projection-label">Calamity Risk city average — {selectedYear}</span>
              <span className="import-projection-value">{yearAvgCalamity}%</span>
            </div>
          )}

          {hasActual2026Calamity && has2026Calamity && (
            <div className="panel-card import-projection-summary import-actual-2026-summary import-projection-calamity">
              <span className="import-projection-label">Actual 2026 City Average</span>
              <span className="import-projection-value">{chartDataCalamity.find((d) => d.year === "2026")?.value ?? "—"}%</span>
            </div>
          )}

          {hasActual2026Calamity && has2027Calamity && (
            <div className="panel-card import-projection-summary import-2026 import-projection-calamity">
              <span className="import-projection-label">Projected 2027 city average</span>
              <span className="import-projection-value">{chartDataCalamity.find((d) => d.year === "2027")?.value ?? "—"}%</span>
            </div>
          )}

          {chartDataCalamity.length > 0 && (
            <div className="panel-card import-chart-card import-chart-calamity">
              <span className="panel-card-title">Calamity Risk trends and projection</span>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartDataCalamity} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="year" tick={renderXAxisTick(hasActual2026Calamity, has2027Calamity, "#b91c1c")} stroke="#555" height={45} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#555" tickFormatter={(v: number) => `${v}`} />
                  <Tooltip
                    formatter={(value: number | undefined, _name: string, props: any) => {
                      const yr = props?.payload?.year;
                      let suffix = "";
                      if (hasActual2026Calamity && yr === "2026") suffix = " (actual)";
                      else if (yr === "2027" || (!hasActual2026Calamity && yr === "2026")) suffix = " (predicted)";
                      return [value != null ? value : 0, `Calamity risk${suffix}`];
                    }}
                    labelFormatter={(label: string) => `Year ${label}`}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <ReferenceLine x={hasActual2026Calamity ? "2026" : "2025"} stroke="#b91c1c" strokeDasharray="4 4" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="value" name="City avg" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="analytics-chart-caption">
                Calamity risk likelihood — imported data.
                {hasActual2026Calamity
                  ? " Vertical line: 2026 (actual). Dashed = projection boundary."
                  : " Vertical line: end of historical period."}
              </div>
            </div>
          )}

          {/* Key Insights - BELOW CHART */}
          {(chartDataCalamity.length > 0 || parseErrorCalamity) && (
            <div className="import-key-insights">
              <span className="panel-card-title">
                Key Insights
                {aiInsightCalamityLoading && <span className="import-insight-loading"> — Loading…</span>}
              </span>
              {aiInsightCalamityLoading && !aiInsightCalamityAvg ? (
                <p className="import-insight-text">Analyzing your calamity risk data…</p>
              ) : aiInsightCalamityError ? (
                <p className="import-insight-text import-insight-error">{aiInsightCalamityError}</p>
              ) : (
                <>
                  {aiInsightCalamityAvg && (
                    <div className="panel-card import-key-insight import-insight-calamity">
                      <span className="import-insight-label">Calamity risk average</span>
                      <p className="import-insight-text">{aiInsightCalamityAvg}</p>
                    </div>
                  )}
                  {aiInsightCalamity2026 && (
                    <div className="panel-card import-key-insight import-insight-2026 import-insight-calamity">
                      <span className="import-insight-label">{hasActual2026Calamity ? "2027 calamity risk projection" : "2026 calamity risk projection"}</span>
                      <p className="import-insight-text">{aiInsightCalamity2026}</p>
                    </div>
                  )}
                </>
              )}
              <p className="import-insight-disclaimer">* Automatically generated — please have an expert review for final assessment.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DbImportSection;
