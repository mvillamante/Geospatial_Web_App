
import React, { useState, useEffect, type JSX } from "react";
import { flushSync } from "react-dom";
import L from "leaflet";
import DbChartsSection from "./right/DbChartsSection";
import DbAnalyticsSection from "./right/DbAnalyticsSection";
import DbExportSection from "./right/DbExportSection";
import DbImportSection from "./right/DbImportSection";
import ChartExportPool from "./right/ChartExportPool";
import "../DashboardMapPage.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toPng } from "html-to-image";
import EnvironmentalReportTemplate, {
  type ReportVariant,
} from "../../../components/reports/EnvironmentalReportTemplate";
import { CHOROPLETH_LAYER_READY_EVENT } from "../../../components/ui/LeafletMap";
import { useGreenIndexData } from "../../../hooks/useGreenIndexData";
import { useHazardData } from "../../../hooks/useHazardData";
import { useCalamityRiskData } from "../../../hooks/useCalamityRiskData";

interface RightPanelProps {
  isOpen: boolean;
  toggle: () => void;
  rightNav: "analytics" | "export" | "import";
  setRightNav: (val: "analytics" | "export" | "import") => void;
  exportSections: any[];
  recentDownloads: any[];
  handleDownload: (item: any, section: string) => void;
  // Props for charts section
  universalGreenAvg?: number | null;
  universalHazardAvg?: number | null;
  universalCalamityAvg?: number | null;

  reportYear: number
  setReportYear: (y: number) => void

  reportType: "full" | "green" | "hazard" | "calamity"
  setReportType: (t: "full" | "green" | "hazard" | "calamity") => void

  reportFormat: "pdf" | "docx"
  setReportFormat: (f: "pdf" | "docx") => void

  setRecentDownloads: React.Dispatch<React.SetStateAction<any[]>>;

  mapView?: string;
  selected?: string;
  year?: number;
  greenCityAverage?: number | null;
  hazardCityAverage?: number | null;
  calamityCityAverage?: number | null;

  // Per-barangay data for KPI summaries
  greenDataByBarangay?: Record<string, any> | null;
  hazardDataByBarangay?: Record<string, any> | null;
  calamityDataByBarangay?: Record<string, any> | null;

  getHazardIndexColor?: (val: number) => string;
  getGreenIndexColor?: (val: number) => string;
  getCalamityRiskColor?: (val: number) => string;

  // Props for analytics
  keyInsights?: any[];
  colors?: string[];
  insightIcons?: JSX.Element[];
  userRole?: string;
  setShowEdaModal?: (val: boolean) => void;
  showEdaModal?: boolean;
  // Props for EDA modal
  edaSect?: "edastats" | "modelperf";
  setEdaSect?: React.Dispatch<
    React.SetStateAction<"edastats" | "modelperf">
  >;
  statisticalSummaryItems?: any[];
  keyFindings?: any[];
  modelHealthItems?: any[];
  onGeneratingChange?: (generating: boolean) => void;
  setYear?: (y: number) => void;
  setSelectedLayer?: (layer: string) => void;
}

const DbRightPanel: React.FC<RightPanelProps> = ({
  isOpen,
  toggle,
  rightNav,
  userRole,
  setRightNav,
  exportSections,
  recentDownloads,
  setRecentDownloads,
  handleDownload,

  reportYear,
  setReportYear,
  reportType,
  setReportType,
  reportFormat,
  setReportFormat,

  keyInsights,
  colors,
  insightIcons,

  showEdaModal,
  setShowEdaModal,
  edaSect,
  setEdaSect,
  statisticalSummaryItems,
  keyFindings,
  modelHealthItems,
  onGeneratingChange,
  setYear,
  setSelectedLayer,

  ...props
}) => {
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(
    props.mapView === "choropleth"
  );

  const [isGenerating, setIsGenerating] = useState(false);

  const { cityAverage: reportGreenAvg, data: reportGreenData } =
    useGreenIndexData(reportYear, true);

  const { cityAverage: reportHazardAvg, data: reportHazardData } =
    useHazardData(reportYear, true);

  const { cityAverage: reportCalamityAvg, data: reportCalamityData } =
    useCalamityRiskData(reportYear, true);

  const toggleRightPanel = () => {
    setIsRightPanelOpen((prev) => !prev);
  };

  const [chartImages, setChartImages] = useState({
    green: null as string | null,
    hazard: null as string | null,
    risk: null as string | null
  });

  const [choroMapImage, setChoroMapImage] = useState<string | null>(null);
  const [greenMapImage, setGreenMapImage] = useState<string | null>(null);
  const [calamityMapImage, setCalamityMapImage] = useState<string | null>(null);

  const [aiInsights, setAiInsights] = useState<{
    findings: string[];
    recommendations: string[];
    greenInsights: string[];
    hazardInsights: string[];
    calamityInsights: string[];
  }>({ findings: [], recommendations: [], greenInsights: [], hazardInsights: [], calamityInsights: [] });

  /** Drives which PDF layout is mounted before html2canvas runs. */
  const [pdfReportVariant, setPdfReportVariant] = useState<ReportVariant>("full");
  const [reportChoiceModalOpen, setReportChoiceModalOpen] = useState(false);
  const [modalVariant, setModalVariant] = useState<ReportVariant>("full");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (props.mapView === "choropleth") {
        setIsRightPanelOpen(true);
      } else if (props.mapView === "interactive") {
        setIsRightPanelOpen(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [props.mapView]);

  useEffect(() => { /* automatically closes */
    const handleResize = () => {
      if (window.innerWidth <= 1056) {
        setIsRightPanelOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!isOpen) return null;

  const shouldBlurAnalytics =
    rightNav === "analytics" &&
    props.mapView === "choropleth" &&
    (!props.selected || props.selected === "none");

  const captureChart = async (chartId: string) => {
    const chartElement = document.getElementById(chartId);

    if (!chartElement) return null;

    const canvas = await html2canvas(chartElement, {
      scale: 1.5,
      useCORS: true,
    });

    return canvas.toDataURL("image/jpeg", 0.85);
  };


  const fetchAllAiInsights = async (year: number): Promise<{
    findings: string[];
    recommendations: string[];
    greenInsights: string[];
    hazardInsights: string[];
    calamityInsights: string[];
  }> => {
    try {
      const [greenRes, hazardRes, calamityRes] = await Promise.allSettled([
        fetch(`/api/hazard/green-index/ai-insight/?year=${year}`).then(r => r.json()),
        fetch(`/api/hazard/hazard-index/ai-insight/?year=${year}`).then(r => r.json()),
        fetch(`/api/hazard/calamity-risk/ai-insight/?year=${year}`).then(r => r.json()),
      ]);

      const greenData = greenRes.status === "fulfilled" ? greenRes.value : null;
      const hazardData = hazardRes.status === "fulfilled" ? hazardRes.value : null;
      const calamityData = calamityRes.status === "fulfilled" ? calamityRes.value : null;

      const findings: string[] = [];
      if (greenData?.summary) findings.push(greenData.summary);
      if (greenData?.hotspots_insight) findings.push(greenData.hotspots_insight);
      if (hazardData?.summary) findings.push(hazardData.summary);
      if (hazardData?.hotspots_insight) findings.push(hazardData.hotspots_insight);
      if (calamityData?.summary) findings.push(calamityData.summary);

      const recs: string[] = [];
      if (greenData?.areas_for_greening_insight) recs.push(greenData.areas_for_greening_insight);
      if (hazardData?.lower_risk_insight) recs.push(hazardData.lower_risk_insight);
      if (hazardData?.earthquake_typhoon_insight) recs.push(hazardData.earthquake_typhoon_insight);
      if (calamityData?.risk_peak_insight) recs.push(calamityData.risk_peak_insight);
      if (calamityData?.adaptation_insight) recs.push(calamityData.adaptation_insight);

      // Per-section short insights for the index analysis sections
      const greenInsights: string[] = [];
      if (greenData?.summary) greenInsights.push(greenData.summary);
      if (greenData?.hotspots_insight) greenInsights.push(greenData.hotspots_insight);
      if (greenData?.areas_for_greening_insight) greenInsights.push(greenData.areas_for_greening_insight);

      const hazardInsights: string[] = [];
      if (hazardData?.summary) hazardInsights.push(hazardData.summary);
      if (hazardData?.hotspots_insight) hazardInsights.push(hazardData.hotspots_insight);
      if (hazardData?.lower_risk_insight) hazardInsights.push(hazardData.lower_risk_insight);
      if (hazardData?.earthquake_typhoon_insight) hazardInsights.push(hazardData.earthquake_typhoon_insight);

      const calamityInsights: string[] = [];
      if (calamityData?.summary) calamityInsights.push(calamityData.summary);
      if (calamityData?.risk_peak_insight) calamityInsights.push(calamityData.risk_peak_insight);
      if (calamityData?.adaptation_insight) calamityInsights.push(calamityData.adaptation_insight);

      return { findings, recommendations: recs, greenInsights, hazardInsights, calamityInsights };
    } catch (error) {
      console.error("Failed to fetch AI insights:", error);
      return { findings: [], recommendations: [], greenInsights: [], hazardInsights: [], calamityInsights: [] };
    }
  };

  const fetchAiInsightsForVariant = async (
    year: number,
    variant: ReportVariant
  ): Promise<{
    findings: string[];
    recommendations: string[];
    greenInsights: string[];
    hazardInsights: string[];
    calamityInsights: string[];
  }> => {
    if (variant === "full") return fetchAllAiInsights(year);
    const empty = {
      findings: [] as string[],
      recommendations: [] as string[],
      greenInsights: [] as string[],
      hazardInsights: [] as string[],
      calamityInsights: [] as string[],
    };
    try {
      if (variant === "green") {
        const res = await fetch(`/api/hazard/green-index/ai-insight/?year=${year}`);
        const d = await res.json();
        const findings: string[] = [];
        if (d?.summary) findings.push(d.summary);
        if (d?.hotspots_insight) findings.push(d.hotspots_insight);
        const recommendations: string[] = [];
        if (d?.areas_for_greening_insight) recommendations.push(d.areas_for_greening_insight);
        const greenInsights: string[] = [];
        if (d?.summary) greenInsights.push(d.summary);
        if (d?.hotspots_insight) greenInsights.push(d.hotspots_insight);
        if (d?.areas_for_greening_insight) greenInsights.push(d.areas_for_greening_insight);
        return { ...empty, findings, recommendations, greenInsights };
      }
      if (variant === "hazard") {
        const res = await fetch(`/api/hazard/hazard-index/ai-insight/?year=${year}`);
        const d = await res.json();
        const findings: string[] = [];
        if (d?.summary) findings.push(d.summary);
        if (d?.hotspots_insight) findings.push(d.hotspots_insight);
        const recommendations: string[] = [];
        if (d?.lower_risk_insight) recommendations.push(d.lower_risk_insight);
        if (d?.earthquake_typhoon_insight) recommendations.push(d.earthquake_typhoon_insight);
        const hazardInsights: string[] = [];
        if (d?.summary) hazardInsights.push(d.summary);
        if (d?.hotspots_insight) hazardInsights.push(d.hotspots_insight);
        if (d?.lower_risk_insight) hazardInsights.push(d.lower_risk_insight);
        if (d?.earthquake_typhoon_insight) hazardInsights.push(d.earthquake_typhoon_insight);
        return { ...empty, findings, recommendations, hazardInsights };
      }
      const res = await fetch(`/api/hazard/calamity-risk/ai-insight/?year=${year}`);
      const d = await res.json();
      const findings: string[] = [];
      if (d?.summary) findings.push(d.summary);
      if (d?.risk_peak_insight) findings.push(d.risk_peak_insight);
      const recommendations: string[] = [];
      if (d?.adaptation_insight) recommendations.push(d.adaptation_insight);
      if (d?.risk_peak_insight && !recommendations.includes(d.risk_peak_insight)) {
        recommendations.push(d.risk_peak_insight);
      }
      const calamityInsights: string[] = [];
      if (d?.summary) calamityInsights.push(d.summary);
      if (d?.risk_peak_insight) calamityInsights.push(d.risk_peak_insight);
      if (d?.adaptation_insight) calamityInsights.push(d.adaptation_insight);
      return { ...empty, findings, recommendations, calamityInsights };
    } catch (e) {
      console.error("fetchAiInsightsForVariant:", e);
      return empty;
    }
  };

  // Cabuyao, Laguna approximate bounds so snapshot captures entire city boundaries
  const CABUYAO_BOUNDS: L.LatLngBoundsLiteral = [
    [14.18, 121.06],
    [14.30, 121.20],
  ];

  type ChoroplethSnapshotLayer = "green" | "hazard" | "calamity";

  /** Resolves when LeafletMap finishes loading the choropleth GeoJSON + styles for this layer. */
  const waitForChoroplethLayerReady = (
    expectedLayer: ChoroplethSnapshotLayer,
    timeoutMs = 28000
  ): Promise<void> =>
    new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener(CHOROPLETH_LAYER_READY_EVENT, onReady);
        clearTimeout(timer);
        resolve();
      };
      const onReady = (e: Event) => {
        const ce = e as CustomEvent<{ layer: ChoroplethSnapshotLayer }>;
        if (ce.detail?.layer === expectedLayer) finish();
      };
      window.addEventListener(CHOROPLETH_LAYER_READY_EVENT, onReady);
      const timer = setTimeout(finish, timeoutMs);
    });

  /** After pan/zoom, wait until each tile layer has finished loading the current view. */
  const waitForTileLayersIdle = (leafletMap: L.Map): Promise<void> =>
    new Promise((resolve) => {
      const tileLayers: L.TileLayer[] = [];
      leafletMap.eachLayer((ly) => {
        if (ly instanceof L.TileLayer) tileLayers.push(ly);
      });
      if (tileLayers.length === 0) {
        setTimeout(resolve, 400);
        return;
      }
      const fallback = setTimeout(() => resolve(), 12000);
      let remaining = tileLayers.length;
      const step = () => {
        remaining--;
        if (remaining <= 0) {
          clearTimeout(fallback);
          setTimeout(resolve, 300);
        }
      };
      tileLayers.forEach((tl) => {
        const grid = tl as L.TileLayer & { isLoading?: () => boolean };
        if (typeof grid.isLoading === "function" && !grid.isLoading()) {
          step();
        } else {
          tl.once("load", step);
        }
      });
    });

  const captureChoroplethMap = async (): Promise<string | null> => {
    const mapContainer = document.querySelector(
      ".choroplethview-map .leaflet-container"
    ) as HTMLElement | null;
    if (!mapContainer) return null;

    const leafletMap: L.Map | null = (mapContainer as any)._leafletMapInstance ?? null;
    let prevCenter: L.LatLng | null = null;
    let prevZoom: number | null = null;

    try {
      if (leafletMap) {
        prevCenter = leafletMap.getCenter();
        prevZoom = leafletMap.getZoom();

        leafletMap.invalidateSize(false);

        let bounds: L.LatLngBounds | null = null;
        leafletMap.eachLayer((layer: L.Layer) => {
          const l = layer as L.Layer & { getBounds?: () => L.LatLngBounds };
          if (l.getBounds && typeof l.getBounds === "function") {
            const layerBounds: L.LatLngBounds = l.getBounds();
            if (layerBounds.isValid()) {
              bounds = bounds ? bounds.extend(layerBounds) : layerBounds;
            }
          }
        });

        const useBounds = bounds !== null && (bounds as L.LatLngBounds).isValid();
        if (useBounds && bounds) {
          leafletMap.fitBounds(bounds, { animate: false, padding: [24, 24] });
        } else {
          leafletMap.fitBounds(CABUYAO_BOUNDS, { animate: false, padding: [24, 24] });
        }

        await new Promise<void>((resolve) => {
          leafletMap!.once("moveend", () => resolve());
          setTimeout(() => resolve(), 3500);
        });

        await waitForTileLayersIdle(leafletMap);

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
      }

      const w = Math.max(1, Math.round(mapContainer.offsetWidth));
      const h = Math.max(1, Math.round(mapContainer.offsetHeight));

      const dataUrl = await toPng(mapContainer, {
        cacheBust: true,
        width: w,
        height: h,
        pixelRatio: 1.25,
        backgroundColor: "#f2f2f2",
        filter: (node: HTMLElement) => {
          if (node.classList && node.classList.contains("leaflet-control-container")) return false;
          return true;
        },
      });
      return dataUrl;
    } catch (err) {
      console.error("Map capture failed:", err);
      return null;
    } finally {
      if (leafletMap && prevCenter && prevZoom != null) {
        leafletMap.setView(prevCenter, prevZoom, { animate: false });
      }
    }
  };

  /**
   * Switch the choropleth layer, wait until GeoJSON + choropleth paints (custom event),
   * then capture the map at full Cabuyao extent with tiles settled.
   */
  const captureLayerSnapshot = async (
    layer: ChoroplethSnapshotLayer
  ): Promise<string | null> => {
    if (setYear) setYear(reportYear);

    /* Briefly clear the layer so React/Leaflet always rebuilds and emits
       choropleth-layer-ready (avoids stale state when the map was already on this layer). */
    if (setSelectedLayer) {
      setSelectedLayer("none");
      await new Promise((r) => setTimeout(r, 220));
      setSelectedLayer(layer);
    }

    await waitForChoroplethLayerReady(layer);

    await new Promise((r) => setTimeout(r, 160));

    return captureChoroplethMap();
  };

  const REPORT_FILE_LABEL: Record<ReportVariant, string> = {
    full: "Full",
    green: "GreenIndex",
    hazard: "HazardIndex",
    calamity: "CalamityRisk",
  };

  // Generate report (variant decides snapshots, charts, AI, and PDF template)
  const generateReport = async (reportYear: number, variant: ReportVariant) => {
    try {
      setIsGenerating(true);
      onGeneratingChange?.(true);
      setReportType(variant);

      let greenCapture: string | null = null;
      let hazardCapture: string | null = null;
      let calamityCapture: string | null = null;

      if (variant === "full" || variant === "green") {
        greenCapture = await captureLayerSnapshot("green");
      }
      if (variant === "full" || variant === "hazard") {
        hazardCapture = await captureLayerSnapshot("hazard");
      }
      if (variant === "full" || variant === "calamity") {
        calamityCapture = await captureLayerSnapshot("calamity");
      }

      const [[greenChart, hazardChart, riskChart], aiData] = await Promise.all([
        Promise.all([
          variant === "full" || variant === "green"
            ? captureChart("chart-green-index-projection")
            : Promise.resolve(null),
          variant === "full" || variant === "hazard"
            ? captureChart("chart-hazard-index-trend")
            : Promise.resolve(null),
          variant === "full" || variant === "calamity"
            ? captureChart("chart-risk-likelihood")
            : Promise.resolve(null),
        ]),
        fetchAiInsightsForVariant(reportYear, variant),
      ]);

      flushSync(() => {
        setChartImages({ green: greenChart, hazard: hazardChart, risk: riskChart });
        setGreenMapImage(greenCapture);
        setChoroMapImage(hazardCapture);
        setCalamityMapImage(calamityCapture);
        setAiInsights(aiData);
        setPdfReportVariant(variant);
      });

      await new Promise((r) => requestAnimationFrame(r));

      const element = document.getElementById("environmental-report");
      if (!element) {
        console.error("Report element not found");
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        windowWidth: 794,
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const marginX = 8;
      const marginTop = 14;
      const marginBottom = 10;
      const contentW = pdfWidth - marginX * 2;
      const contentH = pdfHeight - marginTop - marginBottom;

      const totalImgHeight = (canvas.height * contentW) / canvas.width;
      const mmToPx = canvas.width / contentW;

      const domToMm = totalImgHeight / element.offsetHeight;
      const elementRect = element.getBoundingClientRect();

      /** Safe horizontal slice positions (mm in raster space) — avoids cutting mid-paragraph when possible. */
      const sliceBreaksMm: number[] = [0, totalImgHeight];

      element.querySelectorAll(".pdf-slice-after").forEach((node) => {
        const r = (node as HTMLElement).getBoundingClientRect();
        const bottomMm = (r.bottom - elementRect.top) * domToMm;
        if (bottomMm > 0 && bottomMm < totalImgHeight) {
          sliceBreaksMm.push(bottomMm);
        }
      });

      const wrapper = element.querySelector(":scope > div") as HTMLElement | null;
      if (wrapper) {
        for (const child of Array.from(wrapper.children)) {
          const el = child as HTMLElement;
          if (el.style.pageBreakBefore === "always" || el.style.breakBefore === "page") {
            const b = (el.getBoundingClientRect().bottom - elementRect.top) * domToMm;
            if (b > 0 && b < totalImgHeight) sliceBreaksMm.push(b);
          }
        }
      }

      const sortedBreaks = [...new Set(sliceBreaksMm)].sort((a, b) => a - b);

      const buildPdfSegments = (
        totalH: number,
        pageContentH: number,
        breaks: number[]
      ): { start: number; end: number }[] => {
        const B = [...new Set(breaks.filter((x) => x >= 0 && x <= totalH))].sort((a, b) => a - b);
        const segs: { start: number; end: number }[] = [];
        let s = 0;
        const eps = 0.08;
        while (s < totalH - eps) {
          const limit = s + pageContentH;
          let e = s;
          for (const b of B) {
            if (b > s + eps && b <= limit + eps) e = Math.max(e, b);
          }
          if (e <= s + eps) {
            e = Math.min(limit, totalH);
          }
          if (e <= s + eps) break;
          segs.push({ start: s, end: e });
          s = e;
        }
        return segs;
      };

      let segments = buildPdfSegments(totalImgHeight, contentH, sortedBreaks);
      if (segments.length === 0) {
        segments = [{ start: 0, end: totalImgHeight }];
      }

      const pdf = new jsPDF("p", "mm", "a4");
      segments.forEach((seg, i) => {
        if (i > 0) pdf.addPage();
        const sliceH = seg.end - seg.start;
        const startPx = Math.round(seg.start * mmToPx);
        const heightPx = Math.round(sliceH * mmToPx);
        if (heightPx <= 0) return;
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = heightPx;
        const ctx = slice.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, startPx, canvas.width, heightPx, 0, 0, canvas.width, heightPx);
        const yPos = i === 0 ? marginTop / 2 : marginTop;
        pdf.addImage(slice.toDataURL("image/jpeg", 0.75), "JPEG", marginX, yPos, contentW, sliceH);
      });

      pdf.save(`Environmental_Report_${REPORT_FILE_LABEL[variant]}_${reportYear}.pdf`);

    } catch (error) {
      console.error("Report generation failed:", error);
    } finally {
      setIsGenerating(false);
      onGeneratingChange?.(false);
    }
  };

  // Convert barangay data into ranking arrays
  const greenRanking = Object.entries(reportGreenData ?? {})
    .map(([name, data]: any) => ({
      name,
      score: data.green_index ?? 0
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const hazardRanking = Object.entries(reportHazardData ?? {})
    .map(([name, data]: any) => ({
      name,
      score: data.hazard_index ?? 0
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const calamityRanking = Object.entries(reportCalamityData ?? {})
    .map(([name, data]: any) => ({
      name,
      score: data.calamity_risk ?? 0
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  return (
    <aside className={`dbmright-panel ${isRightPanelOpen ? "open" : "closed"}`}>
      {/* Tabs */}
      <div className="right-panel-header">
        <button className="toggle-panel-btn" onClick={toggleRightPanel}>
          {isRightPanelOpen ? "→" : "←"}
        </button>

        <div className="segmented-control small slide three">
          <span className={`slider ${rightNav}`} />

          {["analytics", "export", "import"].map((tab) => {
            return (
              <button
                key={tab}
                className={`${rightNav === tab ? "active" : ""}`}
                onClick={() => setRightNav(tab as "analytics" | "export" | "import")}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="right-panel-content">
        {rightNav === "analytics" && (
          <div>
            {shouldBlurAnalytics ? (
              <div className="right-panel-empty-state">
                <p className="right-panel-empty-title">
                  Choose a layer to view this section.
                </p>
              </div>
            ) : props.mapView === "interactive" ? (
              <div className="right-panel-empty-state">
                <p className="right-panel-empty-title">
                  Click the <strong>Choropleth</strong> map to view this section.
                </p>
              </div>
            ) : (
              <>
                <DbChartsSection {...props} />
                <DbAnalyticsSection
                  userRole={userRole}
                  keyInsights={keyInsights}
                  colors={colors}
                  insightIcons={insightIcons}
                  mapView={props.mapView}
                  selected={props.selected}
                  year={props.year}
                  showEdaModal={showEdaModal}
                  setShowEdaModal={setShowEdaModal}
                  edaSect={edaSect}
                  setEdaSect={setEdaSect}
                  statisticalSummaryItems={statisticalSummaryItems}
                  keyFindings={keyFindings}
                  modelHealthItems={modelHealthItems}
                />
              </>
            )}
          </div>
        )}

        {rightNav === "export" && (
          props.mapView !== "choropleth" ? (
            <div className="right-panel-empty-state">
              <div className="right-panel-empty-state">
                <p className="right-panel-empty-title">
                  Switch to the <strong>Choropleth</strong> map to generate a report.
                </p>
              </div>
            </div>
          ) : <>
            <h4>Export Section</h4>
            <div className="report-generator">

              <h3>Environmental Risk and Sustainability Reports</h3>

              <p className="report-description">
                Choose the report year, then open the generator to pick a <strong>full</strong>{" "}
                three-index summary or a <strong>focused</strong> report for one index only.
              </p>

              {/* Year */}
              <label>Report Year</label>
              <select
                value={reportYear}
                onChange={(e) => setReportYear(Number(e.target.value))}
              >
                {Array.from({ length: 11 }, (_, i) => 2020 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <button
                type="button"
                className="generate-report-btn"
                onClick={() => {
                  setModalVariant(reportType);
                  setReportChoiceModalOpen(true);
                }}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating report..." : "Generate report…"}
              </button>

            </div>

            {reportChoiceModalOpen && (
              <div
                className="report-type-modal-overlay"
                role="dialog"
                aria-modal="true"
                aria-labelledby="report-type-modal-title"
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 100002,
                  background: "rgba(15, 23, 42, 0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                }}
                onClick={() => !isGenerating && setReportChoiceModalOpen(false)}
              >
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 14,
                    maxWidth: 420,
                    width: "100%",
                    boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
                    padding: "22px 22px 18px",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3
                    id="report-type-modal-title"
                    style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: "#0f172a" }}
                  >
                    Report type
                  </h3>
                  <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                    Year <strong>{reportYear}</strong>. Pick one layout — each index uses its own cover and sections; full report summarizes all three.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(
                      [
                        { v: "full" as const, title: "Full assessment", sub: "Green + Hazard + Calamity — summary & all maps" },
                        { v: "green" as const, title: "Green Index only", sub: "Vegetation & NDVI / GAR focus" },
                        { v: "hazard" as const, title: "Hazard Index only", sub: "Exposure & environmental hazards" },
                        { v: "calamity" as const, title: "Calamity risk only", sub: "LSTM risk likelihood & hotspots" },
                      ] as const
                    ).map((opt) => (
                      <label
                        key={opt.v}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: modalVariant === opt.v ? "2px solid #94a3b8" : "1px solid #e2e8f0",
                          cursor: "pointer",
                          background: modalVariant === opt.v ? "#f1f5f9" : "#fafafa",
                        }}
                      >
                        <input
                          type="radio"
                          name="report-variant"
                          checked={modalVariant === opt.v}
                          onChange={() => setModalVariant(opt.v)}
                          style={{ marginTop: 3, accentColor: "#64748b" }}
                        />
                        <span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", display: "block" }}>
                            {opt.title}
                          </span>
                          <span style={{ fontSize: 12, color: "#64748b" }}>{opt.sub}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
                    <button
                      type="button"
                      className="generate-report-btn"
                      style={{ background: "#e2e8f0", color: "#334155", flex: "0 0 auto" }}
                      disabled={isGenerating}
                      onClick={() => setReportChoiceModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="generate-report-btn"
                      disabled={isGenerating}
                      onClick={async () => {
                        setReportChoiceModalOpen(false);
                        await generateReport(reportYear, modalVariant);
                      }}
                    >
                      Generate PDF
                    </button>
                  </div>
                </div>
              </div>
            )}

            <ChartExportPool visible={true} year={props.year} />

            <DbExportSection
              sections={exportSections}
              recentDownloads={recentDownloads}
              handleDownload={handleDownload}
            />
          </>
        )}

        {rightNav === "import" && (
          <DbImportSection
            getGreenIndexColor={props.getGreenIndexColor}
            getHazardIndexColor={props.getHazardIndexColor}
            getCalamityRiskColor={props.getCalamityRiskColor}
          />
        )}
      </div>
      {/* Hidden report container for PDF generation */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1
        }}
      >
        <div>
          <EnvironmentalReportTemplate
            reportVariant={pdfReportVariant}
            year={reportYear}
            greenIndexAvg={reportGreenAvg ?? 0}
            hazardIndexAvg={reportHazardAvg ?? 0}
            calamityRiskAvg={reportCalamityAvg ?? 0}

            greenBarangays={greenRanking}
            hazardBarangays={hazardRanking}
            calamityBarangays={calamityRanking}

            greenChart={chartImages.green}
            hazardChart={chartImages.hazard}
            riskChart={chartImages.risk}

            greenMapImageUrl={greenMapImage ?? undefined}
            hazardMapImageUrl={choroMapImage ?? undefined}
            calamityMapImageUrl={calamityMapImage ?? undefined}

            greenInsights={aiInsights.greenInsights.length > 0 ? aiInsights.greenInsights : undefined}
            hazardInsights={aiInsights.hazardInsights.length > 0 ? aiInsights.hazardInsights : undefined}
            calamityInsights={aiInsights.calamityInsights.length > 0 ? aiInsights.calamityInsights : undefined}

            keyFindings={aiInsights.findings.length > 0 ? aiInsights.findings : undefined}
            recommendations={aiInsights.recommendations.length > 0 ? aiInsights.recommendations : undefined}
          />
        </div>
      </div>
    </aside>
  );
};

export default DbRightPanel;