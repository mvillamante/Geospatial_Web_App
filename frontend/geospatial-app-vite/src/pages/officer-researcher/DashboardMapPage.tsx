import React, { useState } from "react";
import "./DashboardMapPage.css";
import LeafletMap, { type HazardBarangayData, type GreenIndexBarangayData, type CalamityRiskBarangayData } from "../../components/ui/LeafletMap";
import type {
  ReportItem, ChartItem, DownloadItem, ExportItem, DatasetsItem,
  HealthItem, StatItem
} from "../../types/dashboard.types";


import { getUserRoleAndDisplayName } from "../../libr/auth";

import {
  DbLeftPanel,
  DbRightPanel,
  DbEdaModal,
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

  /*---------- Time ----------*/
  const currentYear = new Date().getFullYear();
  const minYear = 2020;
  const maxYear = 2030;
  const greenMinYear = 2020;
  const greenMaxYear = 2030;
  const initialYear = Math.min(maxYear, Math.max(minYear, currentYear));
  const [year, setYear] = useState(initialYear);
  const [selected, setSelected] = useState("");
  const [ndviOpacity, setNdviOpacity] = useState(0.8);
  const [ndviMonth, setNdviMonth] = useState<number>(1);

  /*---------- Map View ----------*/
  const [mapView, setMapView] = useState<"interactive" | "choropleth">("interactive");
  const [mapType, setMapType] = useState<"basic" | "satellite" | "terrain">("basic");

  const [selectedLayer, setSelectedLayer] = useState<string>("none");
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // ---------- Data Hooks ----------
  const { data: hazardData, cityAverage: hazardAvg } =
    useHazardData(year, selectedLayer === "hazard");

  const { data: greenData, cityAverage: greenAvg } =
    useGreenIndexData(year, selectedLayer === "green");

  const { data: calamityData, cityAverage: calamityAvg } =
    useCalamityRiskData(year, selectedLayer === "calamity");

  const toggleRightPanel = () => setIsRightPanelOpen(prev => !prev);

  // ---------- Toggle Layer ----------
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const toggleLayer = (layer: string) => {
    console.log("test", layer)
    setActiveLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]
    );
  };

  /*---------- Layer Options----------*/
  const layerOptions: { value: string; label: string }[] = [
    { value: "none", label: "None" },
    { value: "green", label: "Green Index" },
    { value: "hazard", label: "Hazard Index" },
    { value: "calamity", label: "Calamity Risk Likelihood" },
  ];

  /*---------- Placeholder Map Layers (Left Panel) ----------*/
  const layerDisplayNames: Record<string, string> = {
    "NDVI": "Green Index",
  };

  const mapLayers = [
    {
      group: "Hazard Zones",
      items: [
        { key: "Fault Lines", name: "Fault Lines" },
        { key: "Flood Zones", name: "Flood Zones" },
        { key: "Landslide Risk", name: "Landslide Risk" },
        { key: "Verified Reports", name: "Hazard Location" },
      ],
    },
    {
      group: "Infrastructure and Road Networks",
      items: [
        { key: "Evacuation Centers", name: "Evacuation Centers" },
        { key: "Roads", name: "Roads" },
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
  const [hazardYearData, setHazardYearData] = useState<Record<string, HazardBarangayData> | null>(null);

  /*----------Green Index (choropleth) details----------*/
  const [selectedGreenBarangay, setSelectedGreenBarangay] = useState<{
    barangay: string;
    year: string;
    data: GreenIndexBarangayData;
  } | null>(null);
  const [greenYearData, setGreenYearData] = useState<Record<string, GreenIndexBarangayData> | null>(null);
  
  /*----------Calamity Risk (choropleth) details----------*/
  const [selectedCalamityBarangay, setSelectedCalamityBarangay] = useState<{
    barangay: string;
    year: string;
    data: CalamityRiskBarangayData;
  } | null>(null);
  const [calamityYearData, setCalamityYearData] = useState<Record<string, CalamityRiskBarangayData> | null>(null);
  
  /*---------- Get Universal Index Data ----------*/
  const {
    universalGreenAvg,
    universalHazardAvg,
    universalCalamityAvg,
    greenChangeFromLastYear,
    hazardChangeFromLastYear,
    greenData: universalGreenData,
    hazardData: universalHazardData,
    calamityData: universalCalamityData,
  } = useUniversalIndexData(year);

  /*---------- Right Panel ----------*/
  const [rightNav, setRightNav] = useState<"analytics" | "export">("analytics");

  /*---------- Placeholder Export Section (Right Panel)----------*/
  const modelArtifactItems: ChartItem[] = [
    "Green Index Model (ZIP)",
    "Hazard Index Model (ZIP)",
    "Calamity Risk Model (ZIP)",
    "LSTM Forecasting Bundle (ZIP)",
  ];

  const exportSections = [
    {
      title: "Reports",
      items: [
        ["Category Summary", "Q4 2025"],
        ["Yearly Overview", "2024"]
      ] as ReportItem[],
    },
    {
      title: "Charts",
      items: [
        "Calamity Risk Likelihood (City Average)",
        "Green Index Projection (City Average)",
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
    },
    {
      label: "Green Index Trajectory",
      description:
        "The green index (NDVI + GAR) shows a steady improvement from 2020 onward, with projections suggesting the city is on track to reach or slightly exceed its 2030 greening targets if current urban tree‑planting and open‑space protection programs are maintained.",
    },
    {
      label: "Multi‑Hazard Hotspots",
      description:
        "A small cluster of western and river‑adjacent barangays consistently records the highest multi‑hazard index scores, while several inland barangays remain below the city average. Prioritizing structural upgrades and early‑warning coverage in these hotspots would yield the greatest risk reduction.",
    },
    {
      label: "Extreme Events Pattern",
      description:
        "Earthquake and typhoon counts stay relatively stable year‑to‑year, but recent seasons include fewer events with higher intensity. These rare but strong events are responsible for sharp spikes in the hazard index, underscoring the need for preparedness even in years with lower event frequency.",
    },
  ];

  /*---------- Placeholder Recent Download Section (Right Panel)----------*/
  const [recentDownloads, setRecentDownloads] = useState<DownloadItem[]>([]);

  const downloadDatasets = [
    {
      title: "Datasets",
      items: [
        ["Hazard Index by Barangay", "2.4 MB", "18"],
        ["Green Index Scores", "1.8 MB", "18"],
        ["Earthquake Historical Data", "5.2 MB", "156"],
        ["Typhoon Tracking Data", "8.7 MB", "89"],
        ["Flood Zone Mapping", "12.3 MB", "45"],
        ["Landslide Risk Assessment", "6.1 MB", "32"],
      ] as DatasetsItem[],
    },
  ]

  const MODEL_ARTIFACT_ENDPOINTS: Record<string, string> = {
    "Green Index Model (ZIP)": "/api/hazard/models/green/artifacts.zip",
    "Hazard Index Model (ZIP)": "/api/hazard/models/hazard/artifacts.zip",
    "Calamity Risk Model (ZIP)": "/api/hazard/models/calamity_risk/artifacts.zip",
    "LSTM Forecasting Bundle (ZIP)": "/api/hazard/models/lstm/all_artifacts.zip",
  };

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
          setYear={setYear}
          minYear={minYear}
          maxYear={maxYear}
          layerOptions={layerOptions}
          visibleMapLayers={visibleMapLayers}
          layerDisplayNames={layerDisplayNames}
        />

        {/* Map */}
        {mapView === "interactive" ? (
          <div className="dashboardview-map">
            <LeafletMap
              height="100vh"
              mapView="interactive"
              mapType={mapType}
              activeLayers={activeLayers}
              ndviOpacity={ndviOpacity}
              ndviYear={year}
              ndviMonth={ndviMonth}
              dataLayer={selectedLayer !== "none" ? selectedLayer : undefined}
              hazardYear={year}
            />

            {/* Time Slider Floating Island */}
            <div className="timeslider-floating-tab">
              <span>Projection: {year}</span>
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
                  height="93vh"
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
                  height="100vh"
                  mapView="choropleth"
                />

                <div className="choroplethmap-overlay">
                  <span>No layer selected</span>
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
          handleDownload={handleDownload}      

          // Charts / Index props
          universalGreenAvg={universalGreenAvg}
          universalHazardAvg={universalHazardAvg}
          universalCalamityAvg={universalCalamityAvg}
          mapView={mapView}
          selected={selectedLayer}
          year={year}
          // Full per-barangay data for KPI summaries
          greenDataByBarangay={universalGreenData}
          hazardDataByBarangay={universalHazardData}
          calamityDataByBarangay={universalCalamityData}
          greenCityAverage={greenAvg}
          hazardCityAverage={hazardAvg}
          calamityCityAverage={calamityAvg}
          getHazardIndexColor={getHazardIndexColor}
          getGreenIndexColor={getGreenIndexColor}
          getCalamityRiskColor={getCalamityRiskColor}

          // Analytics props
          keyInsights={keyInsights}
          colors={colors}
          insightIcons={insightIcons}

          // User & EDA modal
          userRole={userRole}
          userRole2={userRole2}
          showEdaModal={showEdaModal}
          setShowEdaModal={setShowEdaModal}
          edaSect={edaSect}
          setEdaSect={setEdaSect}
          statisticalSummaryItems={statisticalSummaryItems}
          keyFindings={keyFindings}
          modelHealthItems={modelHealthItems}
        />
      </div>
    </div>
  );
};

export default DashboardMapPage;
