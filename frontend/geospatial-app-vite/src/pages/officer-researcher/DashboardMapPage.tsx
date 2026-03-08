import React, { useState, useEffect } from "react";
import "./DashboardMapPage.css";
import LeafletMap, { type HazardBarangayData, type GreenIndexBarangayData, type CalamityRiskBarangayData } from "../../components/ui/LeafletMap";
import type {
  ChartItem, DownloadItem, ExportItem,
  HealthItem, StatItem
} from "../../types/dashboard.types";


import { getUserRoleAndDisplayName } from "../../libr/auth";

import {
  DbLeftPanel,
  DbRightPanel,
  // DbEdaModal,
} from "./DashboardMapComponents";
import { exportChartImageByName, type ChartExportFormat } from "../../components/ui/AnalyticsCharts";
import { toast } from "sonner";

import MapLegends from "./DashboardMapComponents/left/DbMapLegends";
import ChoroplethOverlays from "./DashboardMapComponents/left/DbChoroplethOverlays";

import { useHazardData } from "../../hooks/useHazardData";
import { useGreenIndexData } from "../../hooks/useGreenIndexData";
import { useCalamityRiskData } from "../../hooks/useCalamityRiskData";
import { useUniversalIndexData } from "../../hooks/useUniversalIndexData";

import { FaChartLine, FaLeaf, FaMountain } from "react-icons/fa";

const getHazardIndexColor = (hi: number): string => {
  const v = Math.max(0, Math.min(hi, 100));
  if (v >= 80) return "#b71c1c";   // 80–100: Very High Risk
  if (v >= 60) return "#e53935";   // 60–79: High Risk
  if (v >= 40) return "#ff9800";   // 40–59: Moderate Risk
  if (v >= 20) return "#fdd835";   // 20–39: Low Risk
  return "#66bb6a";                // 0–19: Very Low Risk
};

const getGreenIndexColor = (gi: number): string => {
  gi = Math.max(0, Math.min(100, gi));
  let r: number, g: number, b: number;
  if (gi >= 70) {
    const t = (gi - 70) / 30;
    r = Math.round(60 - t * 60);
    g = Math.round(139 + t * (100 - 39));
    b = Math.round(60 - t * 60);
  } else if (gi >= 40) {
    const t = (gi - 40) / 30;
    r = Math.round(180 - t * 120);
    g = Math.round(180 - t * 41);
    b = Math.round(0 + t * 60);
  } else {
    const t = gi / 40;
    r = Math.round(92 + t * 88);
    g = Math.round(64 + t * 116);
    b = Math.round(51 - t * 51);
  }
  return `rgb(${r},${g},${b})`;
};

const getCalamityRiskColor = (cr: number): string => {
  const v = Math.max(0, Math.min(1, cr / 100));
  if (v >= 0.8) return '#b71c1c';
  if (v >= 0.6) return '#e53935';
  if (v >= 0.4) return '#ff7043';
  if (v >= 0.2) return '#ffab91';
  return '#fce4ec';
};

const DashboardMapPage: React.FC = () => {
  const { userRole, userRole2 } = getUserRoleAndDisplayName();

  // Mark body so we can reserve scrollbar space and prevent layout shift on double-click
  useEffect(() => {
    document.body.classList.add("dashboard-mounted");
    return () => document.body.classList.remove("dashboard-mounted");
  }, []);

  /*---------- Time ----------*/
  const currentYear = new Date().getFullYear();
  const minYear = 2020;
  const maxYear = 2030;
  // const greenMinYear = 2020;
  // const greenMaxYear = 2030;
  const initialYear = Math.min(maxYear, Math.max(minYear, currentYear));
  const [year, setYear] = useState(initialYear);

  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportFormat, setReportFormat] = useState<"pdf" | "docx">("pdf");
  const [reportType, setReportType] = useState<"full" | "green" | "hazard" | "calamity">("full");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  // const [selected, setSelected] = useState("");
  const [ndviOpacity, setNdviOpacity] = useState(0.8);
  const [ndviMonth, setNdviMonth] = useState<number>(1);

  /*---------- Map View ----------*/
  const [mapView, setMapView] = useState<"interactive" | "choropleth">("interactive");
  const [mapType, setMapType] = useState<"basic" | "satellite" | "terrain">("basic");

  const [selectedLayer, setSelectedLayer] = useState<string>("none");
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // Lock outer scroll only when Choropleth view is active.
  // This hides the long right scrollbar, but keeps page scroll in Interactive view.
  // Also clear interactive map-layer sliders when entering choropleth view.
  useEffect(() => {
    if (mapView === "choropleth") {
      document.body.classList.add("no-dashboard-body-scroll");
      setActiveLayers([]);
    } else {
      document.body.classList.remove("no-dashboard-body-scroll");
    }
    return () => {
      document.body.classList.remove("no-dashboard-body-scroll");
    };
  }, [mapView]);

  // ---------- Data Hooks ----------
  const { cityAverage: hazardAvg } =
    useHazardData(year, true);

  const { cityAverage: greenAvg } =
    useGreenIndexData(year, true);

  const { cityAverage: calamityAvg } =
    useCalamityRiskData(year, true);

  const toggleRightPanel = () => setIsRightPanelOpen(prev => !prev);

  // ---------- Toggle Layer ----------
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const toggleLayer = (layer: string) => {
    setActiveLayers((prev) => {
      const isCurrentlyActive = prev.includes(layer);
      if (isCurrentlyActive) {
        return prev.filter((l) => l !== layer);
      }
      // Turning on: only one of Flood Zones or Landslide Risk can be on at a time
      if (layer === "Flood Zones") {
        return [...prev.filter((l) => l !== "Landslide Risk"), layer];
      }
      if (layer === "Landslide Risk") {
        return [...prev.filter((l) => l !== "Flood Zones"), layer];
      }
      return [...prev, layer];
    });
  };

  /*---------- Layer Options----------*/
  const layerOptions: { value: string; label: string }[] = [
    { value: "green", label: "Green Index" },
    { value: "hazard", label: "Hazard Index" },
    { value: "calamity", label: "Calamity Risk Likelihood" },
  ];

  /*---------- Placeholder Map Layers (Left Panel) ----------*/
  const layerDisplayNames: Record<string, string> = {
    "NDVI": "Green Index",
  };

  const layerTooltips: Record<string, string> = {
    "Fault Lines": "Shows active and potentially active fault lines from Carmona to Cabuyao. Toggle on to see fault segments and borders; click a line for details.",
    "Flood Zones": "Areas with higher flood susceptibility. Use this layer to assess flood risk.",
    "Landslide Risk": "Areas with elevated landslide susceptibility based on slope and soil data.",
    "Verified Reports": "Verified hazard reports (Hazard Location) from the field.",
    "Evacuation Centers": "Locations of evacuation centers for disaster response.",
    "Traffic Conditions": "Current or historical traffic conditions on road networks.",
  };

  const mapLayers = [
    {
      group: "Hazard Zones",
      items: [
        { key: "Fault Lines", name: "Fault" },
        { key: "Flood Zones", name: "Flood Zone" },
        { key: "Landslide Risk", name: "Landslide Risk" },
        { key: "Verified Reports", name: "Hazard Location" },
      ],
    },
    {
      group: "Infrastructure and Road Networks",
      items: [
        { key: "Evacuation Centers", name: "Evacuation Centers" },
        { key: "Traffic Conditions", name: "Traffic Conditions" },
      ],
    },
  ];

  const mapViewAllowedGroups = ["Population Density", "Hazard Zones", "Infrastructure and Road Networks"];
  const visibleMapLayers =
    mapView === "interactive"
      ? mapLayers.filter(layer => mapViewAllowedGroups.includes(layer.group))
      : mapLayers;

  /*---------- Placeholder Insights (Left Panel)----------*/
  const leftInsights = [
    {
      label: "Rainfall Trend",
      description: "Recent patterns show moderate increase in precipitation levels.",
    },
    {
      label: "Urban Green Space",
      description: "Current green coverage is steadily improving across the city.",
    },
    {
      label: "Slope Stability",
      description: "Steeper regions have a higher likelihood of erosion or landslides.",
    },
  ];

  /*----------Hazard Index (choropleth) right-panel details----------*/
  const [selectedHazardBarangay, setSelectedHazardBarangay] = useState<{
    barangay: string;
    year: string;
    data: HazardBarangayData;
  } | null>(null);
  // const [hazardYearData, setHazardYearData] = useState<Record<string, HazardBarangayData> | null>(null);

  /*----------Green Index (choropleth) details----------*/
  const [selectedGreenBarangay, setSelectedGreenBarangay] = useState<{
    barangay: string;
    year: string;
    data: GreenIndexBarangayData;
  } | null>(null);
  // const [greenYearData, setGreenYearData] = useState<Record<string, GreenIndexBarangayData> | null>(null);

  /*----------Calamity Risk (choropleth) details----------*/
  const [selectedCalamityBarangay, setSelectedCalamityBarangay] = useState<{
    barangay: string;
    year: string;
    data: CalamityRiskBarangayData;
  } | null>(null);
  // const [calamityYearData, setCalamityYearData] = useState<Record<string, CalamityRiskBarangayData> | null>(null);

  /*---------- Get Universal Index Data: left panel indices fixed to 2026 ----------*/
  const {
    universalGreenAvg,
    universalHazardAvg,
    universalCalamityAvg,
    greenChangeFromLastYear,
    hazardChangeFromLastYear,
    greenData: universalGreenData,
    hazardData: universalHazardData,
    calamityData: universalCalamityData,
  } = useUniversalIndexData(2026);

  /*---------- Right Panel ----------*/
  const [rightNav, setRightNav] = useState<"analytics" | "export" | "import">("analytics");

  /*---------- Placeholder Export Section (Right Panel)----------*/
  const modelArtifactItems: ChartItem[] = [
    "Green Index Model (ZIP)",
    "Hazard Index Model (ZIP)",
    "Calamity Risk Model (ZIP)",
    "LSTM Forecasting Bundle (ZIP)",
  ];

  const datasetItems: ChartItem[] = [
    "Hazard Index by Barangay",
    "Green Index Scores",
    "Green Index Complete",
    "Green Index by Barangay",
    "Earthquake Historical Data",
    "Typhoon Tracking Data",
    "Flood Zone Mapping",
    "Landslide Risk Assessment",
    "Population by Barangay",
    "Weather Data",
    "Infrastructure Data",
    "LSTM Training Data",
    "Evaluation Predictions",
  ];

  const exportSections = [
    // {
    //   title: "Reports",
    //   items: [
    //     ["Category Summary", "Q4 2025"],
    //     ["Yearly Overview", "2024"]
    //   ] as ReportItem[],
    // },
    {
      title: "Charts",
      items: [
        "Calamity Risk Likelihood (City Average)",
        "Green Index Trends and Projection (City Average)",
        "Hazard Index Trend (City Average)",
        "Green Index Scores by Barangay",
        "Calamity Risk Likelihood by Barangay",
        "Earthquake Frequency",
        "Typhoon Frequency",
        "Hazard Index by Barangay",
      ] as ChartItem[],
    },
    {
      title: "Model Artifacts",
      items: modelArtifactItems as ChartItem[],
    },
    {
      title: "Datasets",
      items: datasetItems as ChartItem[],
    },
    {
      title: "Recent Downloads",
      items: [
        { name: "Lgu Planning Report.pdf", type: "report", format: "pdf" },
        { name: "Risk Summary.pdf", type: "report", format: "pdf" },
      ] as DownloadItem[],
    },
  ];

  /*---------- Placeholder Analytics Section (Right Panel)----------*/
  const colors = ["violet", "teal", "orange"]
  const insightIcons = [
    <FaChartLine />,
    <FaLeaf />,
    <FaMountain />,
  ];
  const keyInsights = [
    {
      label: "Calamity Risk Trend",
      description:
        "Citywide calamity risk has trended upward since 2020, with 2024–2025 showing the steepest increase. Forecasts indicate that risk remains elevated through 2030 unless flood, landslide, and drainage mitigation are scaled up in high‑exposure barangays.",
      category: "calamity",
    },
    {
      label: "Green Index Trajectory",
      description:
        "The green index (NDVI + GAR) shows a steady improvement from 2020 onward, with projections suggesting the city is on track to reach or slightly exceed its 2030 greening targets if current urban tree‑planting and open‑space protection programs are maintained.",
      category: "green",
    },
    {
      label: "Multi‑Hazard Hotspots",
      description:
        "A small cluster of western and river‑adjacent barangays consistently records the highest multi‑hazard index scores, while several inland barangays remain below the city average. Prioritizing structural upgrades and early‑warning coverage in these hotspots would yield the greatest risk reduction.",
      category: "hazard",
    },
    {
      label: "Extreme Events Pattern",
      description:
        "Earthquake and typhoon counts stay relatively stable year‑to‑year, but recent seasons include fewer events with higher intensity. These rare but strong events are responsible for sharp spikes in the hazard index, underscoring the need for preparedness even in years with lower event frequency.",
      category: "hazard",
    },
  ];

  /*---------- Placeholder Recent Download Section (Right Panel)----------*/
  const [recentDownloads, setRecentDownloads] = useState<DownloadItem[]>([]);

  const MODEL_ARTIFACT_ENDPOINTS: Record<string, string> = {
    "Green Index Model (ZIP)": "/api/hazard/models/green/artifacts.zip",
    "Hazard Index Model (ZIP)": "/api/hazard/models/hazard/artifacts.zip",
    "Calamity Risk Model (ZIP)": "/api/hazard/models/calamity_risk/artifacts.zip",
    "LSTM Forecasting Bundle (ZIP)": "/api/hazard/models/lstm/all_artifacts.zip",
  };

  const DATASET_ENDPOINT = "/api/hazard/datasets/download";

  const handleDownload = async (
    item: ExportItem,
    sectionTitle: string,
  ) => {
    if (sectionTitle === "Recent Downloads") return;

    // Model artifacts: download ZIPs directly from backend
    if (sectionTitle === "Model Artifacts") {
      const label =
        typeof item === "string"
          ? item
          : Array.isArray(item)
            ? item[0]
            : item.name;

      const zipName = label.toLowerCase().endsWith(".zip")
        ? label
        : `${label}.zip`;

      const endpoint =
        MODEL_ARTIFACT_ENDPOINTS[label] ??
        `/api/hazard/models/download?name=${encodeURIComponent(label)}`;

      try {
        const a = document.createElement("a");
        a.href = endpoint;
        a.download = zipName;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        const downloadedItem: DownloadItem = {
          name: zipName,
          type: "report",
        };

        setRecentDownloads((prev) => {
          const exists = prev.some(
            (d) => d.name === downloadedItem.name && d.type === downloadedItem.type
          );
          if (exists) return prev;
          return [downloadedItem, ...prev].slice(0, 5);
        });
      } catch (err) {
        console.error("Failed to trigger model artifact download", err);
        toast.error("Unable to download model artifacts. Please try again.");
      }
      return;
    }

    // Datasets: download CSV files from backend
    if (sectionTitle === "Datasets") {
      const label =
        typeof item === "string"
          ? item
          : Array.isArray(item)
            ? item[0]
            : item.name;

      const csvName = label.toLowerCase().endsWith(".csv")
        ? label
        : `${label}.csv`;

      const endpoint = `${DATASET_ENDPOINT}?name=${encodeURIComponent(label)}`;

      try {
        // Use fetch to properly handle errors
        const response = await fetch(endpoint);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          toast.error(errorData.error || `Failed to download ${label}. File may not be available.`);
          return;
        }

        // Get the CSV content
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        // Trigger download
        const a = document.createElement("a");
        a.href = url;
        a.download = csvName;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Clean up the blob URL
        window.URL.revokeObjectURL(url);

        const downloadedItem: DownloadItem = {
          name: csvName,
          type: "report",
        };

        setRecentDownloads((prev) => {
          const exists = prev.some(
            (d) => d.name === downloadedItem.name && d.type === downloadedItem.type
          );
          if (exists) return prev;
          return [downloadedItem, ...prev].slice(0, 5);
        });

        toast.success(`Downloaded ${label}`);
      } catch (err) {
        console.error("Failed to trigger dataset download", err);
        toast.error(`Unable to download ${label}. Please try again.`);
      }
      return;
    }

    // Always use PNG format
    const format: ChartExportFormat = "png";

    // Handle different item types
    let name: string;
    if (Array.isArray(item)) {
      // ReportItem: [title, meta]
      name = item[0];
    } else if (typeof item === "string") {
      // ChartItem: string (chart export)
      name = item;
      const ok = await exportChartImageByName(name, format);
      if (!ok) {
        toast.error(
          "Chart could not be exported. It may still be loading—wait a few seconds and try again."
        );
        return;
      }
      toast.success(`Downloaded ${name}`);
    } else {
      // DownloadItem: { name, type }
      name = item.name;
    }

    const lower = name.toLowerCase();
    const hasExtension = lower.endsWith(".png");
    const finalName = hasExtension ? name : `${name}.png`;

    const downloadedItem: DownloadItem = {
      name: finalName,
      type: sectionTitle === "Reports" ? "report" : "chart",
      format: "png",
    };

    setRecentDownloads((prev) => {
      const exists = prev.some(
        (d) => d.name === downloadedItem.name && d.type === downloadedItem.type
      );
      if (exists) return prev;

      return [downloadedItem, ...prev].slice(0, 5);
    });
  };

  /*---------- Placeholder EDA Modal (Right Panel)----------*/
  const [showEdaModal, setShowEdaModal] = useState(false);
  const [edaSect, setEdaSect] = useState<"edastats" | "modelperf">("edastats");

  const statisticalSummaryItems: StatItem[] = [
    { label: "Mean Hazard Index", value: 7.23, change: 12.4 },
    { label: "Std Deviation", value: 1.84, change: 8.2 },
    { label: "Median Green Index", value: 3.95, change: -5.1 },
    { label: "Skewness (Hazard)", value: 0.42, change: 2.3 },
    { label: "Kurtosis (Green)", value: 0.18, change: -1.7 },
  ];

  const keyFindings = [
    {
      label: "Strong Correlation",
      description: "Population density shows 0.82 correlation with hazard risk.",
      type: "correlation",
    },
    {
      label: "Positive Skew",
      description: "Hazard index distribution is right-skewed, indicating more high-risk areas.",
      type: "positive",
    },
    {
      label: "Outliers Detected",
      description: "3 barangays identified as statistical outliers requiring attention.",
      type: "warning",
    },
  ];


  const modelHealthItems: HealthItem[] = [
    { label: "Data Quality", value: "Excellent", status: "good" },
    { label: "Prediction Latency", value: "32ms avg", status: "good" },
    { label: "Training Staleness", value: "45 days", status: "warning" },
    { label: "API Uptime", value: "99.8%", status: "good" },
  ];

  return (
    <div className="main-layout-dbmap">
      <div className="dashboardmap-container">
        {/* Left Panel */}
        <DbLeftPanel
          universalGreenAvg={universalGreenAvg}
          universalHazardAvg={universalHazardAvg}
          greenChangeFromLastYear={greenChangeFromLastYear}
          hazardChangeFromLastYear={hazardChangeFromLastYear}
          universalCalamityAvg={universalCalamityAvg}
          greenCityAverage={greenAvg}
          hazardCityAverage={hazardAvg}
          calamityCityAverage={calamityAvg}
          getGreenIndexColor={getGreenIndexColor}
          getHazardIndexColor={getHazardIndexColor}
          getCalamityRiskColor={getCalamityRiskColor}
          insights={leftInsights}
          mapView={mapView}
          setMapView={setMapView}
          mapType={mapType}
          setMapType={setMapType}
          selectedLayer={selectedLayer}
          setSelectedLayer={setSelectedLayer}
          activeLayers={activeLayers}
          toggleLayer={toggleLayer}
          ndviOpacity={ndviOpacity}
          setNdviOpacity={setNdviOpacity}
          ndviMonth={ndviMonth}
          setNdviMonth={setNdviMonth}
          year={year}
          currentYear={currentYear}
          indicesYear={2026}
          setYear={setYear}
          minYear={minYear}
          maxYear={maxYear}
          layerOptions={layerOptions}
          visibleMapLayers={visibleMapLayers}
          layerDisplayNames={layerDisplayNames}
          layerTooltips={layerTooltips}
        />

        {/* Map */}
        {mapView === "interactive" ? (
          <div className="dashboardview-map">
            <LeafletMap
              mapView="interactive"
              mapType={mapType}
              activeLayers={activeLayers}
              ndviOpacity={ndviOpacity}
              ndviYear={currentYear}
              ndviMonth={ndviMonth}
              dataLayer={selectedLayer !== "none" ? selectedLayer : undefined}
              hazardYear={currentYear}
            />

            {/* Time Slider Floating Island */}
            <div className="timeslider-floating-tab">
              <span>Projection: {currentYear}</span>
            </div>

            <MapLegends activeLayers={activeLayers} />
          </div>
        ) : (
          <div className="choroplethview-map">
            {selectedLayer !== "none" ? (
              <>
                <div className="choropleth-header">
                  <h3>Choropleth Map: {layerOptions.find((opt) => opt.value === selectedLayer)?.label || ""} </h3>
                  <h5>Cabuyao, Laguna - {year}</h5>
                </div>

                <LeafletMap
                  mapView="choropleth"
                  mapType={mapType}
                  activeLayers={activeLayers}
                  ndviOpacity={ndviOpacity}
                  ndviYear={year}
                  ndviMonth={ndviMonth}
                  dataLayer={selectedLayer !== "none" ? selectedLayer : undefined}
                  hazardYear={year}

                  onHazardBarangaySelect={(barangay, yearStr, data) => {
                    if (data) setSelectedHazardBarangay({ barangay, year: yearStr, data });
                  }}
                  onGreenIndexBarangaySelect={(barangay, yearStr, data) => {
                    if (data) setSelectedGreenBarangay({ barangay, year: yearStr, data });
                  }}
                  onCalamityRiskBarangaySelect={(barangay, yearStr, data) => {
                    if (data) setSelectedCalamityBarangay({ barangay, year: yearStr, data });
                  }}
                />

                <ChoroplethOverlays
                  selectedLayer={selectedLayer}
                  selectedHazardBarangay={selectedHazardBarangay}
                  selectedGreenBarangay={selectedGreenBarangay}
                  selectedCalamityBarangay={selectedCalamityBarangay}
                  activeLayers={activeLayers}
                  getHazardIndexColor={getHazardIndexColor}
                  getGreenIndexColor={getGreenIndexColor}
                  getCalamityRiskColor={getCalamityRiskColor}
                />

              </>
            ) : (
              <div className="map-disabled-wrapper">
                <LeafletMap
                  mapView="choropleth"
                  activeLayers={activeLayers}
                />

                <div className="choroplethmap-overlay">
                  <span>No layer selected</span>
                </div>
              </div>
            )}

            {isGeneratingReport && (
              <div className="report-generating-overlay">
                <div className="report-generating-card">
                  <div className="report-generating-spinner" />
                  <span>Generating Report...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right Panel */}
        <DbRightPanel
          isOpen={isRightPanelOpen}
          toggle={toggleRightPanel}
          rightNav={rightNav}
          setRightNav={setRightNav}
          exportSections={exportSections}
          recentDownloads={recentDownloads}
          setRecentDownloads={setRecentDownloads}
          reportType={reportType}
          setReportType={setReportType}
          handleDownload={handleDownload}

          reportYear={reportYear}
          setReportYear={setReportYear}
          reportFormat={reportFormat}
          setReportFormat={setReportFormat}

          universalGreenAvg={universalGreenAvg}
          universalHazardAvg={universalHazardAvg}
          universalCalamityAvg={universalCalamityAvg}
          mapView={mapView}
          selected={selectedLayer}
          year={year}

          greenDataByBarangay={universalGreenData}
          hazardDataByBarangay={universalHazardData}
          calamityDataByBarangay={universalCalamityData}
          greenCityAverage={greenAvg}
          hazardCityAverage={hazardAvg}
          calamityCityAverage={calamityAvg}

          getHazardIndexColor={getHazardIndexColor}
          getGreenIndexColor={getGreenIndexColor}
          getCalamityRiskColor={getCalamityRiskColor}

          keyInsights={keyInsights}
          colors={colors}
          insightIcons={insightIcons}

          userRole={userRole}
          userRole2={userRole2}
          showEdaModal={showEdaModal}
          setShowEdaModal={setShowEdaModal}
          edaSect={edaSect}
          setEdaSect={setEdaSect}
          statisticalSummaryItems={statisticalSummaryItems}
          keyFindings={keyFindings}
          modelHealthItems={modelHealthItems}
          onGeneratingChange={setIsGeneratingReport}
          setYear={setYear}
          setSelectedLayer={setSelectedLayer}
        />
      </div>
    </div>
  );
};

export default DashboardMapPage;
