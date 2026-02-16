import React, { useEffect, useMemo, useState } from "react";
import "./DashboardMapPage.css";
import LeafletMap, { type HazardBarangayData, type GreenIndexBarangayData, type CalamityRiskBarangayData } from "../../components/ui/LeafletMap";
import {
  RiskLikelihoodChart,
  GreenIndexProjectionChart,
  HazardIndexTrendChart,
  GreenIndexScoresChart,
  CalamityRiskBarangayChart,
  EarthquakeFrequencyChart,
  TyphoonFrequencyChart,
  HazardIndexBarangayChart,
} from "../../components/ui/AnalyticsCharts";
import { getUserRoleAndDisplayName } from "../../libr/auth";
import { FaCheck, FaChartLine, FaArrowUp, FaExclamationTriangle, FaLeaf, FaMountain } from "react-icons/fa";
import { FiDownload } from "react-icons/fi";
import { HiOutlineDocumentReport, HiOutlineChartBar } from "react-icons/hi";
import { PiWarningBold } from "react-icons/pi";
import floodZoneIcon from "../../assets/icons/floodzone.png";
import landslideIcon from "../../assets/icons/landslide.png";

type DatasetsItem = [string, string, string]
type ReportItem = [string, string];
type ChartItem = string;
type DownloadItem = { name: string; type: "report" | "chart" };

type ExportItem = ReportItem | ChartItem | DownloadItem;

type StatItem = {
  label: string;
  value: number;
  change: number;
};

type HealthItem = {
  label: string;
  value: string;
  status: "good" | "warning";
};

const DashboardMapPage: React.FC = () => {
  //get user role
  const { userRole, userRole2 } = getUserRoleAndDisplayName();

  // Show Modal Popup
  const [showEdaModal, setShowEdaModal] = useState(false);

  /*----------map layers----------*/
  const [mapView, setMapView] = useState<"interactive" | "choropleth">("interactive");
  const [mapType, setMapType] = useState<"basic" | "satellite" | "terrain">("basic");
  const [rightNav, setRightNav] = useState<"charts" | "analytics" | "export">("charts");
  const [edaSect, setEdaSect] = useState<"edastats" | "modelperf">("edastats");

  /* data layer - custom select-option */
  const [selected, setSelected] = useState("");
  const [open, setOpen] = useState(false);

  const options = [
    { value: "none", label: "None" },
    { value: "hazard", label: "Hazard Index" },
    { value: "green", label: "Green Index" },
    { value: "calamity", label: "Calamity Risk Likelihood" },
  ];

  const handleSelect = (value: string) => {
    setSelected(value);
    setOpen(false);
    if (value === "hazard" || value === "calamity") {
      setYear(minYear);
    }
    if (value === "green") {
      setYear(greenMinYear);
    }
  };

  /*----------time slider----------*/
  const currentYear = new Date().getFullYear(); // today’s year
  const minYear = 2020;
  const maxYear = 2030;
  const greenMinYear = 2020;
  const greenMaxYear = 2030;
  const initialYear = Math.min(maxYear, Math.max(minYear, currentYear));
  const [year, setYear] = useState(initialYear);
  const [ndviOpacity, setNdviOpacity] = useState(0.8);
  const [ndviMonth, setNdviMonth] = useState<number>(1);

  const activeMinYear = selected === "green" ? greenMinYear : minYear;
  const activeMaxYear = selected === "green" ? greenMaxYear : maxYear;

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

  /*----------Universal index data (always fetched for summary cards & left panel)----------*/
  const [allGreenData, setAllGreenData] = useState<Record<string, { green_index: number }> | null>(null);
  const [allHazardData, setAllHazardData] = useState<Record<string, { hazard_index: number }> | null>(null);
  const [allCalamityData, setAllCalamityData] = useState<Record<string, { calamity_risk: number }> | null>(null);
  const [prevGreenData, setPrevGreenData] = useState<Record<string, { green_index: number }> | null>(null);
  const [prevHazardData, setPrevHazardData] = useState<Record<string, { hazard_index: number }> | null>(null);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYear(Number(e.target.value));
  };

  const handleNdviOpacity = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNdviOpacity(Number(e.target.value));
  };

  const handleNdviMonth = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNdviMonth(Number(e.target.value));
  };

  // Fetch hazard index data for current year when viewing Hazard Index choropleth
  useEffect(() => {
    if (mapView !== "choropleth" || !selected || selected === "none") {
      setHazardYearData(null);
      setSelectedHazardBarangay(null);
      return;
    }
    if (selected !== "hazard") {
      setHazardYearData(null);
      setSelectedHazardBarangay(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/hazard/hazard-index/?year=${year}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: Record<string, HazardBarangayData> } | null) => {
        if (cancelled || !json) return;
        const data = json.data ?? null;
        if (data && typeof data === "object" && !Array.isArray(data)) setHazardYearData(data);
        else setHazardYearData(null);
      })
      .catch(() => setHazardYearData(null));
    return () => { cancelled = true; };
  }, [mapView, selected, year]);

  // Fetch green index data for current year when viewing Green Index choropleth
  useEffect(() => {
    if (mapView !== "choropleth" || selected !== "green") {
      setGreenYearData(null);
      setSelectedGreenBarangay(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/hazard/green-index/?year=${year}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: Record<string, GreenIndexBarangayData> } | null) => {
        if (cancelled || !json) return;
        const data = json.data ?? null;
        if (data && typeof data === "object" && !Array.isArray(data)) setGreenYearData(data);
        else setGreenYearData(null);
      })
      .catch(() => setGreenYearData(null));
    return () => { cancelled = true; };
  }, [mapView, selected, year]);

  // Fetch calamity risk data for current year when viewing Calamity Risk choropleth
  useEffect(() => {
    if (mapView !== "choropleth" || selected !== "calamity") {
      setCalamityYearData(null);
      setSelectedCalamityBarangay(null);
      return;
    }
    let cancelled = false;
    const fetchData = async () => {
      try {
        let res = await fetch(`/api/hazard/calamity-risk/forecast/?year=${year}`);
        if (!res.ok) {
          res = await fetch(`/api/hazard/calamity-risk/?year=${year}`);
        }
        if (!res.ok) { setCalamityYearData(null); return; }
        const json: { data?: Record<string, CalamityRiskBarangayData> } | null = await res.json();
        if (cancelled || !json) return;
        const data = json.data ?? null;
        if (data && typeof data === "object" && !Array.isArray(data)) setCalamityYearData(data);
        else setCalamityYearData(null);
      } catch { setCalamityYearData(null); }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [mapView, selected, year]);

  // Always fetch all 3 indices for current year (powers summary cards + left panel)
  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      try {
        const [greenRes, hazardRes] = await Promise.all([
          fetch(`/api/hazard/green-index/?year=${year}`),
          fetch(`/api/hazard/hazard-index/?year=${year}`),
        ]);
        let calamityRes = await fetch(`/api/hazard/calamity-risk/forecast/?year=${year}`);
        if (!calamityRes.ok) calamityRes = await fetch(`/api/hazard/calamity-risk/?year=${year}`);
        if (cancelled) return;
        const greenJson = greenRes.ok ? await greenRes.json() : null;
        const hazardJson = hazardRes.ok ? await hazardRes.json() : null;
        const calamityJson = calamityRes.ok ? await calamityRes.json() : null;
        if (cancelled) return;
        setAllGreenData(greenJson?.data ?? null);
        setAllHazardData(hazardJson?.data ?? null);
        setAllCalamityData(calamityJson?.data ?? null);
      } catch {
        if (!cancelled) { setAllGreenData(null); setAllHazardData(null); setAllCalamityData(null); }
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [year]);

  // Fetch previous year data for computing year-over-year change (left panel cards)
  useEffect(() => {
    const prevYear = year - 1;
    if (prevYear < 2000) { setPrevGreenData(null); setPrevHazardData(null); return; }
    let cancelled = false;
    Promise.all([
      fetch(`/api/hazard/green-index/?year=${prevYear}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/hazard/hazard-index/?year=${prevYear}`).then(r => r.ok ? r.json() : null),
    ]).then(([greenJson, hazardJson]) => {
      if (cancelled) return;
      setPrevGreenData(greenJson?.data ?? null);
      setPrevHazardData(hazardJson?.data ?? null);
    }).catch(() => {
      if (!cancelled) { setPrevGreenData(null); setPrevHazardData(null); }
    });
    return () => { cancelled = true; };
  }, [year]);

  const calamityCityAverage = useMemo(() => {
    if (!calamityYearData) return null;
    const entries = Object.values(calamityYearData);
    if (!entries.length) return null;
    const sum = entries.reduce((a, b) => a + (b.calamity_risk ?? 0), 0);
    return sum / entries.length;
  }, [calamityYearData]);

  // Helper: calamity risk color (warm red tones matching the choropleth)
  const getCalamityRiskColor = (cr: number): string => {
    const v = Math.max(0, Math.min(1, cr / 100));
    if (v >= 0.8) return '#b71c1c';
    if (v >= 0.6) return '#e53935';
    if (v >= 0.4) return '#ff7043';
    if (v >= 0.2) return '#ffab91';
    return '#fce4ec';
  };

  const greenCityAverage = useMemo(() => {
    if (!greenYearData) return null;
    const entries = Object.values(greenYearData);
    if (!entries.length) return null;
    const sum = entries.reduce((a, b) => a + (b.green_index ?? 0), 0);
    return sum / entries.length;
  }, [greenYearData]);

  // Helper: green index color (same as green_index_server.py interpolateColor)
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

  const hazardCityAverage = useMemo(() => {
    if (!hazardYearData) return null;
    const entries = Object.values(hazardYearData);
    if (!entries.length) return null;
    const sum = entries.reduce((a, b) => a + (b.hazard_index ?? 0), 0);
    return sum / entries.length;
  }, [hazardYearData]);

  // Universal averages (always available for all modes)
  const universalGreenAvg = useMemo(() => {
    if (!allGreenData) return null;
    const entries = Object.values(allGreenData);
    if (!entries.length) return null;
    return entries.reduce((a, b) => a + (b.green_index ?? 0), 0) / entries.length;
  }, [allGreenData]);

  const universalHazardAvg = useMemo(() => {
    if (!allHazardData) return null;
    const entries = Object.values(allHazardData);
    if (!entries.length) return null;
    return entries.reduce((a, b) => a + (b.hazard_index ?? 0), 0) / entries.length;
  }, [allHazardData]);

  const universalCalamityAvg = useMemo(() => {
    if (!allCalamityData) return null;
    const entries = Object.values(allCalamityData);
    if (!entries.length) return null;
    return entries.reduce((a, b) => a + (b.calamity_risk ?? 0), 0) / entries.length;
  }, [allCalamityData]);

  const prevGreenAvgValue = useMemo(() => {
    if (!prevGreenData) return null;
    const entries = Object.values(prevGreenData);
    if (!entries.length) return null;
    return entries.reduce((a, b) => a + (b.green_index ?? 0), 0) / entries.length;
  }, [prevGreenData]);

  const prevHazardAvgValue = useMemo(() => {
    if (!prevHazardData) return null;
    const entries = Object.values(prevHazardData);
    if (!entries.length) return null;
    return entries.reduce((a, b) => a + (b.hazard_index ?? 0), 0) / entries.length;
  }, [prevHazardData]);

  const greenChangeFromLastYear = universalGreenAvg != null && prevGreenAvgValue != null
    ? universalGreenAvg - prevGreenAvgValue : null;
  const hazardChangeFromLastYear = universalHazardAvg != null && prevHazardAvgValue != null
    ? universalHazardAvg - prevHazardAvgValue : null;

  /*----------toggle map layers----------*/
  const [activeLayers, setActiveLayers] = useState<string[]>([]);

  // Display name mapping for layer identifiers
  const layerDisplayNames: Record<string, string> = {
    "NDVI": "Green Index",
  };

  const mapLayers = [
    {
      group: "Hazard Zones",
      items: ["Fault Lines", "Flood Zones", "Landslide Risk", "Hazard Location"],
    },
    {
      group: "Infrastructure and Road Networks",
      items: ["Evacuation Centers", "Roads", "Traffic Conditions",],
    },
  ];

  const mapViewAllowedGroups = ["Population Density", "Hazard Zones", "Infrastructure and Road Networks"];
  const visibleMapLayers =
    mapView === "interactive"
      ? mapLayers.filter(layer => mapViewAllowedGroups.includes(layer.group))
      : mapLayers;

  // Remove NDVI layer when switching to interactive mode (NDVI is only available in choropleth)
  useEffect(() => {
    if (mapView === "interactive" && activeLayers.includes("NDVI")) {
      setActiveLayers((prev) => prev.filter((l) => l !== "NDVI"));
    }
  }, [mapView]);

  const toggleLayer = (layer: string) => {
    setActiveLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]
    );
  };

  /*----------Insights (in Left Panel)----------*/
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


  /*----------Right Panel----------*/
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  const toggleRightPanel = () => {
    setIsRightPanelOpen((prev) => !prev);
  };

  useEffect(() => { /*automatic closes*/
    const handleResize = () => {
      if (window.innerWidth <= 1056) {
        setIsRightPanelOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* Analytics Section */
  const colors = ["violet", "teal", "orange"]
  const colors2 = ["pink", "coral", "blue"]
  const keyInsights = [
    {
      label: "Flood Risk",
      description: "Increased by 25% over 5-year period (2020–2025).",
    },
    {
      label: "Green Index",
      description: "Current trajectory shows 29% improvement trend toward 2030 targets.",
    },
    {
      label: "Landslide Risk",
      description:
        "Western upland and foothill areas show higher susceptibility, especially during prolonged heavy rainfall.",
    },
  ];

  const insightIcons = [
    <FaChartLine />,
    <FaLeaf />,
    <FaMountain />,
  ];

  /* -----Export Section---- */
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

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const toggleSelection = (name: string) => {
    setSelectedItems(prev =>
      prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]
    );
  };
  const selectAllDataset = () => {
    const allNames = downloadDatasets[0].items.map(item => item[0]);
    setSelectedItems(allNames);
  };
  const handleExport = (items: string[]) => {
    if (items.length === 0) {
      alert("No datasets selected!");
      return;
    }
    alert(`Exporting: \n${items.join("\n")}`);
  };

  /* Reports, Charts, Recent Downloads */
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
        "Vulnerability Index Chart",
        "Green Index Trends",
        "Calamity Risk Projection"
      ] as ChartItem[],
    },
    {
      title: "Recent Downloads",
      items: [
        { name: "Lgu Planning Report.pdf", type: "report" },
        { name: "Risk Summary.pdf", type: "report" }
      ] as DownloadItem[],
    }
  ];


  const handleDownload = (item: ExportItem, sectionTitle: string) => {
    if (sectionTitle === "Recent Downloads") return;

    // Handle different item types
    let name: string;
    if (Array.isArray(item)) {
      // ReportItem: [title, meta]
      name = item[0];
    } else if (typeof item === "string") {
      // ChartItem: string
      name = item;
    } else {
      // DownloadItem: { name, type }
      name = item.name;
    }

    const downloadedItem: DownloadItem = {
      name,
      type: sectionTitle === "Reports" ? "report" : "chart",
    };

    setRecentDownloads((prev) => {
      const exists = prev.some(
        (d) => d.name === downloadedItem.name && d.type === downloadedItem.type
      );
      if (exists) return prev;

      return [downloadedItem, ...prev].slice(0, 5);
    });
  };

  /* EDA Modal Content */
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
        <aside className="dbmleft-panel">
          {/* Map View */}
          <div className="mapview-container panel-card">
            <h4>Map View</h4>

            <div className="segmented-control slide one">
              <span className={`slider ${mapView}`} />

              <button className={mapView === "interactive" ? "active" : ""} onClick={() => setMapView("interactive")}>
                Interactive
              </button>

              <button className={mapView === "choropleth" ? "active" : ""} onClick={() => setMapView("choropleth")}>
                Choropleth
              </button>
            </div>

            {/* Map Type - only show if Interactive is selected */}
            {mapView === "interactive" && (
              <div className="segmented-control small slide two">
                <span className={`slider ${mapType}`} />

                <button className={mapType === "basic" ? "active" : ""} onClick={() => setMapType("basic")}>
                  Basic
                </button>
                <button className={mapType === "satellite" ? "active" : ""} onClick={() => setMapType("satellite")}>
                  Satellite
                </button>

                <button className={mapType === "terrain" ? "active" : ""} onClick={() => setMapType("terrain")}>
                  Terrain
                </button>
              </div>
            )}
          </div>

          {mapView === "interactive" ? (
            <>
              <div className="rowpanel-card">
                {/* Current Green Index */}
                <div className="panel-card green">
                  <span className="panel-card-sub-title">Current Green Index</span>

                  <div className="panel-card-value">
                    {universalGreenAvg != null ? universalGreenAvg.toFixed(1) : "—"}<span className="unit">%</span>
                  </div>

                  <div className="panel-card-meta">
                    {greenChangeFromLastYear != null ? (
                      <>{greenChangeFromLastYear >= 0 ? "↑" : "↓"} {Math.abs(greenChangeFromLastYear).toFixed(1)}% from last year</>
                    ) : "—"}
                  </div>
                </div>

                {/* Current Hazard Index */}
                <div className="panel-card hazard">
                  <span className="panel-card-sub-title">Current Hazard Index</span>

                  <div className="panel-card-value">
                    {universalHazardAvg != null ? universalHazardAvg.toFixed(1) : "—"}<span className="unit">%</span>
                  </div>

                  <div className="panel-card-meta">
                    {hazardChangeFromLastYear != null ? (
                      <>{hazardChangeFromLastYear >= 0 ? "↑" : "↓"} {Math.abs(hazardChangeFromLastYear).toFixed(1)}% from last year</>
                    ) : "—"}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="panel-card">
              {/* Data Layer — options sit at bottom of this gray section */}
              <div className="info-text choropleth-data-layer">
                <h5>Data Layer</h5>
                <div
                  className={`select-wrapper ${open ? "active" : ""}`}
                  onClick={() => setOpen(!open)}
                >
                  <button className="select-btn">
                    {selected
                      ? options.find((opt) => opt.value === selected)?.label || "Select a layer"
                      : "Select a layer"}
                    <span className="arrow">▼</span>
                  </button>
                </div>
                <ul className="select-options" style={{ display: open ? "block" : "none" }}>
                  {options.map((opt) => (
                    <li
                      key={opt.value}
                      className={selected === opt.value ? "selected" : ""}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(opt.value);
                      }}
                    >
                      {opt.label}
                    </li>
                  ))}
                </ul>
              </div>

              <hr className="section-divider" />

              {/* Time Slider — blurred and disabled when no layer is selected */}
              <div className={`timeslider-wrapper ${!selected || selected === "none" ? "no-layer" : ""}`}>
                <div className="timeslider-container">
                  <h4>History and Projection</h4>

                  <div className="year-display">{year}</div>

                  <div className="slider-wrapper">
                    <input
                      type="range"
                      min={activeMinYear}
                      max={activeMaxYear}
                      value={year}
                      className="year-slider"
                      onChange={handleChange}
                      disabled={!selected || selected === "none"}
                    />
                  </div>

                  <div className="year-labels">
                    <span>{activeMinYear}</span>
                    <span>{activeMaxYear}</span>
                  </div>
                </div>

                {(!selected || selected === "none") && (
                  <div className="timeslider-choose-layer-reminder">
                    <span className="timeslider-reminder-text">Choose a layer first</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NDVI Controls - Only show in Choropleth mode */}
          {mapView === "choropleth" && activeLayers.includes("NDVI") && (
            <div className="ndvi-controls panel-card">
              <h4>Green Index</h4>

              {/* Opacity Slider */}
              <div className="ndvi-control-row">
                <span className="ndvi-label">Opacity</span>
                <span className="ndvi-value">{Math.round(ndviOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={1}
                step={0.05}
                value={ndviOpacity}
                className="ndvi-opacity-slider"
                onChange={handleNdviOpacity}
              />

              {/* Month Slider */}
              <div className="ndvi-control-row" style={{ marginTop: "12px" }}>
                <span className="ndvi-label">Month</span>
                <span className="ndvi-value">{monthNames[ndviMonth - 1]}</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                step={1}
                value={ndviMonth}
                className="ndvi-month-slider"
                onChange={handleNdviMonth}
              />
              <div className="ndvi-month-labels">
                <span>Jan</span>
                <span>Dec</span>
              </div>

              <div className="ndvi-date-range">
                Showing clearest image: {monthNames[ndviMonth - 1]} {year}
              </div>
              <div className="ndvi-cloud-note">
                <span>☁️</span>
                <span>Lowest cloud coverage selected</span>
              </div>
            </div>
          )}

          {/* Map Layer */}
          <div className="maplayer-container panel-card">
            <h4>Map Layers</h4>

            {visibleMapLayers.map((section, index) => (
              <div key={section.group}>
                <p className="layer-group">{section.group}</p>

                {section.items.map((item) => (
                  <div className="layer-item" key={item}>
                    <span>{layerDisplayNames[item] || item}</span>
                    <button
                      className={`toggle-btn ${activeLayers.includes(item) ? "active" : ""}`}
                      onClick={() => toggleLayer(item)}
                    />
                  </div>
                ))}
                {index < visibleMapLayers.length - 1 && <hr className="section-divider" />}
              </div>
            ))}
          </div>

          {/* Risk Legend */}
          {mapView === "choropleth" ? (
            selected === "hazard" ? (
              <div className="risklegend-container panel-card">
                <h4>Hazard Index Scale</h4>
                <p className="hazard-scale-map-note">Hazard Index Scale is displayed on the map</p>
              </div>
            ) : selected === "green" ? (
              <div className="risklegend-container panel-card">
                <h4>Green Index Scale</h4>
                <p className="hazard-scale-map-note">Green Index Scale is displayed on the map</p>
              </div>
            ) : selected === "calamity" ? (
              <div className="risklegend-container panel-card">
                <h4>Risk Likelihood Scale</h4>
                <p className="hazard-scale-map-note">Risk Likelihood Scale is displayed on the map</p>
              </div>
            ) : selected && selected !== "none" ? (
              <div className="risklegend-container panel-card">
                <h4>Index Legend</h4>
                <ul>
                  <li className="low">Low Risk</li>
                  <li className="moderate">Moderate Risk</li>
                  <li className="high">High Risk</li>
                  <li className="critical">Critical Risk</li>
                </ul>
              </div>
            ) : (
              <div className="risklegend-container panel-card index-legend-none">
                <h4>Index Legend</h4>
                <ul className="index-legend-three">
                  <li><span className="legend-swatch index-green" /> Green Index</li>
                  <li><span className="legend-swatch index-hazard" /> Hazard Index</li>
                  <li><span className="legend-swatch index-crl" /> Calamity Risk Likelihood</li>
                </ul>
              </div>
            )
          ) : (
            <div className="panel-card">
              <span className="panel-card-title">Insights</span>
              <div className="columnpanel-card">
                {leftInsights.map((item, index) => (
                  <div key={index} className={`panel-card left-insight-card ${colors2[index % colors.length]}`}>
                    {/*<span className="insight-icon">{insightIcons[index % insightIcons.length]}</span>*/}
                    <div className="insight-text">
                      <strong>{item.label}:</strong> {item.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>


        {/* Map Component -------------------------------*/}
        {mapView === "interactive" ? (
          <div className="dashboardview-map">
            {/* Interactive Map Component */}
            <LeafletMap
              height="100vh"
              mapView="interactive"
              mapType={mapType}
              activeLayers={activeLayers}
              ndviOpacity={ndviOpacity}
              ndviYear={year}
              ndviMonth={ndviMonth}
              dataLayer={selected && selected !== "none" ? selected : undefined}
              hazardYear={year}
            />

            {/* Time Slider Floating Island */}
            <div className="timeslider-floating-tab">
              <span>Projection: {year}</span>
            </div>

            {/* Flood Zone Legend - appears when Flood Zones layer is active */}
            {activeLayers.includes("Flood Zones") && (
              <div className="flood-zone-legend">
                <h4><img src={floodZoneIcon} alt="Flood Zone" className="flood-legend-icon" /> Flood Zone Legend</h4>
                <div className="flood-legend-subtitle">Cabuyao, Laguna</div>
                <ul>
                  <li className="high">
                    <span className="legend-color"></span>
                    <span className="legend-text">High Risk Zone</span>
                  </li>
                  <li className="moderate">
                    <span className="legend-color"></span>
                    <span className="legend-text">Moderate Risk Zone</span>
                  </li>
                  <li className="low">
                    <span className="legend-color"></span>
                    <span className="legend-text">Low Risk Zone</span>
                  </li>
                </ul>
                <div className="flood-legend-note">
                  <span>💡</span>
                  <span>Click on zones for details</span>
                </div>
              </div>
            )}

            {/* Landslide Risk Legend - appears when Landslide Risk layer is active */}
            {activeLayers.includes("Landslide Risk") && (
              <div className="landslide-risk-legend">
                <h4><img src={landslideIcon} alt="Landslide" className="landslide-legend-icon" /> Landslide Risk Legend</h4>
                <div className="landslide-legend-subtitle">Cabuyao, Laguna</div>
                <ul>
                  <li className="high">
                    <span className="legend-color"></span>
                    <span className="legend-text">High Risk Zone</span>
                  </li>
                  <li className="moderate">
                    <span className="legend-color"></span>
                    <span className="legend-text">Moderate Risk Zone</span>
                  </li>
                  <li className="low">
                    <span className="legend-color"></span>
                    <span className="legend-text">Low Risk Zone</span>
                  </li>
                </ul>
                <div className="landslide-legend-info">
                  <div className="legend-info-item">
                    <span>📐</span>
                    <span>Slope gradient analysis</span>
                  </div>
                  <div className="legend-info-item">
                    <span>🌧️</span>
                    <span>Rainfall triggered susceptibility</span>
                  </div>
                </div>
                <div className="landslide-legend-note">
                  <span>💡</span>
                  <span>Click on zones for details</span>
                </div>
              </div>
            )}

            {/* Evacuation Centers Legend - appears when Evacuation Centers layer is active */}
            {activeLayers.includes("Evacuation Centers") && (
              <div className="evac-centers-legend">
                <h4>🆘 Evacuation Centers</h4>
                <div className="evac-legend-subtitle">Cabuyao, Laguna</div>
                <ul>
                  <li className="school">
                    <span className="legend-icon">🏫</span>
                    <span className="legend-text">School</span>
                  </li>
                  <li className="covered-court">
                    <span className="legend-icon">🏀</span>
                    <span className="legend-text">Covered Court</span>
                  </li>
                  <li className="multi-purpose">
                    <span className="legend-icon">🏛️</span>
                    <span className="legend-text">Multi-Purpose Hall</span>
                  </li>
                  <li className="gymnasium">
                    <span className="legend-icon">🏟️</span>
                    <span className="legend-text">Gymnasium</span>
                  </li>
                </ul>
                <div className="evac-legend-stats">
                  <div className="stat-item">
                    <span className="stat-number">18</span>
                    <span className="stat-label">Sites</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">6.5K+</span>
                    <span className="stat-label">Total Capacity</span>
                  </div>
                </div>
                <div className="evac-legend-note">
                  <span>💡</span>
                  <span>Click markers for details</span>
                </div>
              </div>
            )}

            {/* Roads Legend - appears when Roads layer is active */}
            {activeLayers.includes("Roads") && (
              <div className="roads-legend">
                <h4>🛣️ Roads & Bridges</h4>
                <div className="roads-legend-subtitle">Cabuyao, Laguna</div>

                <div className="roads-legend-section">
                  <span className="section-title">Road Types</span>
                  <ul>
                    <li className="major-road">
                      <span className="legend-line"></span>
                      <span className="legend-text">Major Road</span>
                    </li>
                    <li className="secondary-road">
                      <span className="legend-line"></span>
                      <span className="legend-text">Secondary Road</span>
                    </li>
                  </ul>
                </div>

                <div className="roads-legend-section">
                  <span className="section-title">Infrastructure</span>
                  <ul>
                    <li className="bridge">
                      <span className="legend-icon">🌉</span>
                      <span className="legend-text">Bridge</span>
                    </li>
                  </ul>
                </div>

                <div className="roads-legend-section status-section">
                  <span className="section-title">Status</span>
                  <ul>
                    <li className="open-status">
                      <span className="status-badge open">✓ OPEN</span>
                      <span className="legend-text">Passable</span>
                    </li>
                    <li className="closed-status">
                      <span className="status-badge closed">⛔ CLOSED</span>
                      <span className="legend-text">Not Passable</span>
                    </li>
                  </ul>
                </div>

                <div className="roads-legend-alert">
                  <span className="alert-icon">🚧</span>
                  <div className="alert-content">
                    <span className="alert-title">Road Closures</span>
                    <span className="alert-count">2 roads currently closed</span>
                  </div>
                </div>

                <div className="roads-legend-note">
                  <span>💡</span>
                  <span>Click on roads for details</span>
                </div>
              </div>
            )}

          </div>
        ) : mapView === "choropleth" ? (
          <div className="choroplethview-map">
            {/* Header - for all choropleth layers */}
            {selected && selected !== "none" && (
              <div className="choropleth-header">
                <h3>Choropleth Map: {options.find((opt) => opt.value === selected)?.label || ""}</h3>
                <h5>Cabuyao, Laguna - {year}</h5>
              </div>
            )}

            {/* Map Visual */}
            <LeafletMap
              height="92vh"
              mapView="choropleth"
              mapType={mapType}
              activeLayers={activeLayers}
              ndviOpacity={ndviOpacity}
              ndviYear={year}
              ndviMonth={ndviMonth}
              dataLayer={selected && selected !== "none" ? selected : undefined}
              hazardYear={year}
              onHazardBarangaySelect={(barangay, yearStr, data) =>
                setSelectedHazardBarangay({ barangay, year: yearStr, data })
              }
              onGreenIndexBarangaySelect={(barangay, yearStr, data) =>
                setSelectedGreenBarangay({ barangay, year: yearStr, data })
              }
              onCalamityRiskBarangaySelect={(barangay, yearStr, data) =>
                setSelectedCalamityBarangay({ barangay, year: yearStr, data })
              }
            />

            {/* Hazard Index floating overlays inside the map */}
            {selected === "hazard" && (
              <>
                {/* Barangay Details panel (top-right) */}
                <div className="hazard-map-barangay-details">
                  <div className="hazard-map-details-title">Barangay Details</div>
                  {selectedHazardBarangay ? (
                    <div className="hazard-map-details-content">
                      <div className="hazard-map-details-row">
                        <span className="hazard-map-details-label">Barangay</span>
                        <strong>{selectedHazardBarangay.barangay}</strong>
                      </div>
                      <div className="hazard-map-details-row hazard-map-details-pill-row">
                        <span className="hazard-map-details-label">Hazard Index</span>
                        <span
                          className="hazard-map-details-pill"
                          style={{
                            background: (() => {
                              const hi = selectedHazardBarangay.data.hazard_index;
                              if (hi >= 80) return "#b71c1c";
                              if (hi >= 60) return "#e53935";
                              if (hi >= 40) return "#ff9800";
                              if (hi >= 20) return "#fdd835";
                              return "#66bb6a";
                            })(),
                          }}
                        >
                          {selectedHazardBarangay.data.hazard_index.toFixed(1)}
                        </span>
                      </div>
                      <div className="hazard-map-details-row">
                        <span className="hazard-map-details-label">Classification</span>
                        <strong>{selectedHazardBarangay.data.hazard_class}</strong>
                      </div>
                      <HazardBreakdown data={selectedHazardBarangay.data} />
                    </div>
                  ) : (
                    <div className="hazard-map-details-placeholder">
                      Hover over a barangay on the map to view details.
                    </div>
                  )}
                </div>

                {/* Hazard Index Scale (bottom-right) */}
                <div className="hazard-map-risk-scale">
                  <div className="hazard-map-risk-scale-title">Hazard Index Scale</div>
                  <ul className="hazard-map-risk-scale-list">
                    <li className="very-high"><span className="hazard-map-legend-color" /> 80–100: Very High Risk</li>
                    <li className="high"><span className="hazard-map-legend-color" /> 60–79: High Risk</li>
                    <li className="moderate"><span className="hazard-map-legend-color" /> 40–59: Moderate Risk</li>
                    <li className="low"><span className="hazard-map-legend-color" /> 20–39: Low Risk</li>
                    <li className="very-low"><span className="hazard-map-legend-color" /> 0–19: Very Low Risk</li>
                  </ul>
                </div>
              </>
            )}

            {/* Green Index floating overlays inside the map */}
            {selected === "green" && (
              <>
                {/* Barangay Details panel (top-right) */}
                <div className="green-map-barangay-details">
                  <div className="green-map-details-title">Barangay Details</div>
                  {selectedGreenBarangay ? (
                    <div className="green-map-details-content">
                      <div className="green-map-details-row">
                        <span className="green-map-details-label">Barangay</span>
                        <strong>{selectedGreenBarangay.barangay}</strong>
                      </div>
                      <div className="green-map-details-row green-map-details-pill-row">
                        <span className="green-map-details-label">Green Index</span>
                        <span
                          className="green-map-details-pill"
                          style={{ background: getGreenIndexColor(selectedGreenBarangay.data.green_index) }}
                        >
                          {selectedGreenBarangay.data.green_index.toFixed(1)}
                        </span>
                      </div>
                      <div className="green-map-details-row">
                        <span className="green-map-details-label">Mean NDVI</span>
                        <strong>{selectedGreenBarangay.data.mean_ndvi.toFixed(4)}</strong>
                      </div>
                      <div className="green-map-details-row">
                        <span className="green-map-details-label">Green Area Ratio</span>
                        <strong>{(selectedGreenBarangay.data.gar * 100).toFixed(1)}%</strong>
                      </div>
                      <div className="green-map-details-row">
                        <span className="green-map-details-label">Classification</span>
                        <strong>{selectedGreenBarangay.data.veg_class}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="green-map-details-placeholder">
                      Hover over a barangay on the map to view details.
                    </div>
                  )}
                </div>

                {/* Green Index Scale (bottom-right) */}
                <div className="green-map-legend">
                  <div className="green-map-legend-title">GREEN INDEX SCALE</div>
                  <div className="green-map-legend-item">
                    <span className="green-map-legend-color" style={{ background: "#006400" }} />
                    <span>90&ndash;100: Dense Forest / Parks</span>
                  </div>
                  <div className="green-map-legend-item">
                    <span className="green-map-legend-color" style={{ background: "#228B22" }} />
                    <span>70&ndash;89: Healthy Vegetation</span>
                  </div>
                  <div className="green-map-legend-item">
                    <span className="green-map-legend-color" style={{ background: "#7CCD7C" }} />
                    <span>50&ndash;69: Moderate Greenery</span>
                  </div>
                  <div className="green-map-legend-item">
                    <span className="green-map-legend-color" style={{ background: "#CDCD00" }} />
                    <span>30&ndash;49: Sparse Vegetation</span>
                  </div>
                  <div className="green-map-legend-item">
                    <span className="green-map-legend-color" style={{ background: "#8B6914" }} />
                    <span>0&ndash;29: Urbanized / Built-up</span>
                  </div>
                </div>
              </>
            )}

            {/* Calamity Risk floating overlays inside the map */}
            {selected === "calamity" && (
              <>
                {/* Barangay Details panel (top-right) */}
                <div className="calamity-map-barangay-details">
                  <div className="calamity-map-details-title">Barangay Details</div>
                  {selectedCalamityBarangay ? (
                    <div className="calamity-map-details-content">
                      <div className="calamity-map-details-row">
                        <span className="calamity-map-details-label">Barangay</span>
                        <strong>{selectedCalamityBarangay.barangay}</strong>
                      </div>
                      <div className="calamity-map-details-row calamity-map-details-pill-row">
                        <span className="calamity-map-details-label">Calamity Risk Likelihood</span>
                        <span
                          className="calamity-map-details-pill"
                          style={{
                            background: getCalamityRiskColor(selectedCalamityBarangay.data.calamity_risk),
                          }}
                        >
                          {selectedCalamityBarangay.data.calamity_risk.toFixed(1)}%
                        </span>
                      </div>
                      <div className="calamity-map-details-row">
                        <span className="calamity-map-details-label">Classification</span>
                        <strong className="calamity-map-classification">
                          {selectedCalamityBarangay.data.risk_class}
                        </strong>
                      </div>
                      <CalamityRiskBreakdown data={selectedCalamityBarangay.data} />
                    </div>
                  ) : (
                    <div className="calamity-map-details-placeholder">
                      Hover over a barangay on the map to view details.
                    </div>
                  )}
                </div>

                {/* Calamity Risk Scale (bottom-right) */}
                <div className="calamity-map-risk-scale">
                  <div className="calamity-map-risk-scale-title">Risk Likelihood Scale</div>
                  <ul className="calamity-map-risk-scale-list">
                    <li className="very-high"><span className="calamity-map-legend-color" /> 80–100%: Very High</li>
                    <li className="high"><span className="calamity-map-legend-color" /> 60–79%: High</li>
                    <li className="moderate"><span className="calamity-map-legend-color" /> 40–59%: Moderate</li>
                    <li className="low"><span className="calamity-map-legend-color" /> 20–39%: Low</li>
                    <li className="very-low"><span className="calamity-map-legend-color" /> 0–19%: Very Low</li>
                  </ul>
                </div>
              </>
            )}

            {/* NDVI Legend - appears when NDVI layer is active in Choropleth mode */}
            {/* {activeLayers.includes("NDVI") && (
              <div className="ndvi-legend">
                <h4>NDVI Green Index</h4>
                <div className="ndvi-legend-subtitle">Cabuyao, Laguna</div>
                <div className="ndvi-gradient"></div>
                <div className="ndvi-legend-labels">
                  <span>Low</span>
                  <span>High</span>
                </div>
                <div className="ndvi-legend-note">
                  <span>💡</span>
                  <span>Higher values indicate healthier vegetation</span>
                </div>
              </div>
            )} */}

          </div>
        ) : null}


        {/* Right Panel */}
        <aside className={`dbmright-panel ${isRightPanelOpen ? "open" : "closed"}`}>
          <div className="right-panel-header">
            <button className="toggle-panel-btn" onClick={toggleRightPanel}>
              {isRightPanelOpen ? "→" : "←"}
            </button>

            <div className="segmented-control small slide three">
              <span className={`slider ${rightNav}`} />

              <button className={rightNav === "charts" ? "active" : ""} onClick={() => setRightNav("charts")}>
                Charts
              </button>
              <button className={rightNav === "analytics" ? "active" : ""} onClick={() => setRightNav("analytics")}>
                Analytics
              </button>

              <button className={rightNav === "export" ? "active" : ""} onClick={() => setRightNav("export")}>
                Export
              </button>
            </div>
          </div>

          {rightNav === "charts" ? (
            <div className="right-panel-content">
              {/* Charts Section---------------------------- */}
              <h4>Data Visualization</h4>
              <div className="rowpanel-card">
                {/* Avg Risk Index */}
                <div className={`panel-card idx-summary-card ${universalCalamityAvg != null ? "idx-active calamity-active" : ""}`}>
                  <span className="panel-card-sub-title">Avg Risk{"\n"}Index</span>
                  <span className="panel-card-value idx-value calamity-idx-value">
                    {universalCalamityAvg != null
                      ? universalCalamityAvg.toFixed(1) + "%"
                      : "—"}
                  </span>
                </div>

                {/* Green Index */}
                <div className={`panel-card idx-summary-card ${universalGreenAvg != null ? "idx-active green-active" : ""}`}>
                  <span className="panel-card-sub-title">Green Index</span>
                  <span className="panel-card-value idx-value green-idx-value">
                    {universalGreenAvg != null
                      ? universalGreenAvg.toFixed(1)
                      : "—"}
                  </span>
                </div>

                {/* Hazard Index */}
                <div className={`panel-card idx-summary-card ${universalHazardAvg != null ? "idx-active hazard-active" : ""}`}>
                  <span className="panel-card-sub-title">Hazard Index</span>
                  <span className="panel-card-value idx-value hazard-idx-value">
                    {universalHazardAvg != null
                      ? universalHazardAvg.toFixed(1)
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Hazard Index detail block (choropleth + Hazard Index layer) */}
              {mapView === "choropleth" && selected === "hazard" && (
                <>
                  <div className="panel-card hazard-city-avg-card">
                    <div className="hazard-city-avg-label">City Average Hazard Index</div>
                    <div className="hazard-city-avg-value">
                      {hazardCityAverage != null ? hazardCityAverage.toFixed(1) : "—"}
                    </div>
                    <div className="hazard-city-avg-subtitle">
                      LSTM Hazard Assessment (2020–2030)
                    </div>
                  </div>
                  <div className="panel-card hazard-timeline-card">
                    <div className="hazard-timeline-year">{year}</div>
                    <div className="hazard-timeline-hint">Use the year slider in the left panel to change year.</div>
                  </div>
                </>
              )}

              {/* Green Index detail block (choropleth + Green Index layer) */}
              {mapView === "choropleth" && selected === "green" && (
                <>
                  <div className="panel-card green-city-avg-card">
                    <div className="green-city-avg-label">City Average Green Index</div>
                    <div
                      className="green-city-avg-value"
                      style={{ color: greenCityAverage != null ? getGreenIndexColor(greenCityAverage) : "#27ae60" }}
                    >
                      {greenCityAverage != null ? greenCityAverage.toFixed(1) : "—"}
                    </div>
                    <div className="green-city-avg-subtitle">
                      NDVI Vegetation Assessment (2020–2030)
                    </div>
                  </div>
                  <div className="panel-card green-timeline-card">
                    <div className="green-timeline-year" style={{ color: year > 2025 ? "#e67e22" : "#27ae60" }}>
                      {year}
                    </div>
                    {year > 2025 && (
                      <div className="green-timeline-projected">Projected Value</div>
                    )}
                    <div className="green-timeline-hint">Use the year slider in the left panel to change year.</div>
                  </div>
                </>
              )}

              {/* Calamity Risk detail block (choropleth + Calamity Risk layer) */}
              {mapView === "choropleth" && selected === "calamity" && (
                <>
                  <div className="panel-card calamity-city-avg-card">
                    <div className="calamity-city-avg-label">City Average Calamity Risk Likelihood</div>
                    <div
                      className="calamity-city-avg-value"
                      style={{ color: getCalamityRiskColor(calamityCityAverage ?? 0) }}
                    >
                      {calamityCityAverage != null ? calamityCityAverage.toFixed(1) + "%" : "—"}
                    </div>
                    <div className="calamity-city-avg-subtitle">
                      Multi-Source Geospatial Analytics | Hazard, Exposure and Green Index (2020–2030)
                    </div>
                  </div>
                  <div className="panel-card calamity-timeline-card">
                    <div className="calamity-timeline-label">Risk Timeline</div>
                    <div
                      className="calamity-timeline-year"
                      style={{ color: year > 2025 ? "#b71c1c" : "#e53935" }}
                    >
                      {year}
                    </div>
                    {year > 2025 && (
                      <div className="calamity-timeline-projected">LSTM-Based Projection</div>
                    )}
                    <div className="calamity-timeline-hint">Use the year slider in the left panel to change year.</div>
                  </div>
                </>
              )}

              <div className="panel-card">
                <span className="panel-card-title">Green Index Scores</span>
                <GreenIndexScoresChart />
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Hazard Index by Barangay</span>
                <HazardIndexBarangayChart year={year} />
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Calamity Risk Likelihood</span>
                <CalamityRiskBarangayChart />
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Earthquake Frequency</span>
                <EarthquakeFrequencyChart />
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Typhoon Frequency & Intensity</span>
                <TyphoonFrequencyChart />
              </div>
            </div>
          ) : (rightNav === "analytics" ? (
            <div className="right-panel-content">
              {/* Analytics Section--------------------------- */}
              <h4>Analytics Section</h4>
              <h5>Forecasting and Trends</h5>

              <div className="rowpanel-card">
                <div className="panel-card">
                  <span className="panel-card-sub-title">Risk Trend</span>
                  <span className="panel-card-sub-title">5yr increase</span>
                </div>
                <div className="panel-card">
                  <span className="panel-card-sub-title">Green Trend</span>
                  <span className="panel-card-sub-title">Improving</span>
                </div>
                <div className="panel-card">
                  <span className="panel-card-sub-title">Accuracy</span>
                  <span className="panel-card-sub-title">Model</span>
                </div>
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Risk Likelihood (2020–2030)</span>
                <RiskLikelihoodChart />
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Green Index Projection (2020–2030)</span>
                <GreenIndexProjectionChart />
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Hazard Index Trend (2020–2030)</span>
                <HazardIndexTrendChart />
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Key Insights</span>

                <div className="columnpanel-card">
                  {keyInsights.map((item, index) => (
                    <div key={index} className={`panel-card insight-card ${colors[index % colors.length]}`}>
                      <span className="insight-icon">{insightIcons[index % insightIcons.length]}</span>
                      <div className="insight-text">
                        <strong>{item.label}:</strong> {item.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>



              {userRole2[0] === "Researcher" && (
                <div
                  className="panel-card researcher"
                  onClick={() => setShowEdaModal(true)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="panel-card-eda">
                    View EDA & Model Performance
                  </span>
                </div>
              )}
            </div>
          ) : (rightNav === "export" ? (
            <div className="right-panel-content">
              <h4>Export Section</h4>
              {userRole === "Officer" ? (
                <h5>Download LGU planning materials</h5>
              ) : userRole2[0] === "Researcher" ? (
                <h5>Export datasets and reports</h5>
              ) : null}

              {/* CONFIGURATION -------------------- */}
              {userRole2[0] === "Researcher" && (
                <div className="panel-card">
                  <div className="panel-card-header">
                    <span className="rightpanel-title">Configuration</span>
                  </div>

                  <div className="panel-card-body">
                    {/* Format Dropdown */}
                    <div className="config-row">
                      <label htmlFor="format-select">Format</label>
                      <select id="format-select">
                        <option value="csv">CSV</option>
                        <option value="json">JSON</option>
                        <option value="xlsx">XLSX</option>
                        <option value="geojson">GeoJSON</option>
                      </select>
                    </div>

                    {/* Date Range Dropdown */}
                    <div className="config-row">
                      <label htmlFor="date-range-select">Date Range</label>
                      <select id="date-range-select">
                        <option value="all-time">All Time</option>
                        <option value="ytd">Year to Date</option>
                        <option value="last-year">Last Year</option>
                        <option value="last-5-years">Last 5 Years</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* DATASETS -------------------- */}
              {userRole2[0] === "Researcher" && (
                <div className="panel-card datasets-ul">
                  <div className="panel-card-header">
                    <span className="rightpanel-title">Datasets</span>
                    <span className="selected-count">{selectedItems.length} selected</span>
                  </div>
                  <ul>
                    {downloadDatasets[0].items.map((item, i) => {
                      const isSelected = selectedItems.includes(item[0]);
                      return (
                        <li
                          key={i}
                          className={`export-content ${isSelected ? "selected" : ""}`}
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(item[0])}
                          />

                          {/* Dataset Text */}
                          <div
                            className="export-text"
                            onClick={() => toggleSelection(item[0])}
                            style={{ cursor: "pointer" }}
                          >
                            <span className="export-title">{item[0]}</span>
                            <span className="export-meta">{item[1]} • {item[2]} records</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="dataset-controls">
                    <button onClick={selectAllDataset}>Select All</button>
                    <button onClick={() => setSelectedItems([])}>Clear</button>
                    <button
                      className="datasets-export"
                      disabled={selectedItems.length === 0}
                      onClick={() => handleExport(selectedItems)}
                    >
                      <FiDownload /> Export ({selectedItems.length})
                    </button>
                  </div>
                </div>
              )}

              {/* REPORTS, CHARTS, RECENT DLS -------------------- */}
              {exportSections.map((section, index) => {
                const itemsToRender: ExportItem[] =
                  section.title === "Recent Downloads"
                    ? recentDownloads
                    : section.items;

                return (
                  <div className="panel-card" key={index}>
                    <span className="rightpanel-title">{section.title}</span>
                    <ul>
                      {itemsToRender.map((item, i) => (
                        <li className="export-content" key={i}>
                          {/* Export Icon */}
                          <span
                            className={`export-left-icon ${section.title === "Reports"
                                ? "report"
                                : section.title === "Charts"
                                  ? "chart"
                                  : (item as DownloadItem).type === "report"
                                    ? "download-report"
                                    : "download-chart"
                              }`}
                          >
                            {section.title === "Reports" || (section.title === "Recent Downloads" && (item as DownloadItem).type === "report") ? (
                              <HiOutlineDocumentReport />
                            ) : (
                              <HiOutlineChartBar />
                            )}
                          </span>


                          {/* Export Text */}
                          <div className="export-text">
                            {section.title === "Recent Downloads" ? (
                              <span className="export-title">{(item as DownloadItem).name}</span>
                            ) : Array.isArray(item) ? (
                              <>
                                <span className="export-title">{(item as ReportItem)[0]}</span>
                                <span className="export-meta">{(item as ReportItem)[1]}</span>
                              </>
                            ) : (
                              <span className="export-title">{item as string}</span>
                            )}
                          </div>

                          {/* Download Icon */}
                          {section.title !== "Recent Downloads" && (
                            <FiDownload
                              className="export-download-icon"
                              onClick={() => handleDownload(item, section.title)}
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

          ) : null))}

          {showEdaModal && (
            <div className="eda-modal-overlay" onClick={() => setShowEdaModal(false)}>
              <div className="eda-modal" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="eda-modal-header">
                  <h2>Exploratory Data Analysis & Model Performance</h2>
                  <button
                    className="eda-modal-close"
                    onClick={() => setShowEdaModal(false)}
                  >
                    ✕
                  </button>
                </div>

                {/* Tabs */}
                <div className="segmented-control slide four">
                  <span className={`slider ${edaSect}`} />

                  <button className={edaSect === "edastats" ? "active" : ""} onClick={() => setEdaSect("edastats")}>
                    EDA & Statistics
                  </button>

                  <button className={edaSect === "modelperf" ? "active" : ""} onClick={() => setEdaSect("modelperf")}>
                    Model Performance
                  </button>
                </div>

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
                            {item.value.toFixed(2)}
                            <span
                              className={`eda-badge ${item.change >= 0 ? "red" : "green"
                                }`}
                            >
                              {item.change > 0 ? "+" : ""}
                              {item.change}%
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Correlation with Risk Indices Section (placeholder) */}
                    <div className="eda-card">
                      <h4>Correlation with Risk Indices</h4>
                      <div className="chart-placeholder">
                        Chart goes here
                      </div>
                    </div>

                    {/* Index Distribution Section (placeholder) */}
                    <div className="eda-card">
                      <h4>Index Distribution</h4>
                      <div className="chart-placeholder">
                        Chart goes here
                      </div>
                    </div>

                    {/* Outlier Detection (Hazard vs Green) Section (placeholder) */}
                    <div className="eda-card">
                      <h4>Outlier Detection (Hazard vs Green)</h4>
                      <div className="chart-placeholder">
                        Chart goes here
                      </div>
                    </div>

                    {/* Key Statistical Findings Section (placeholder) */}
                    <div className="eda-card">
                      <h4>Key Statistical Findings</h4>

                      <div className="eda-findings">
                        {keyFindings.map((item, index) => (
                          <div key={index} className={`eda-finding ${item.type}`}>
                            <span className="eda-finding-icon">
                              {item.type === "correlation" && <FaChartLine />}
                              {item.type === "positive" && <FaArrowUp />}
                              {item.type === "warning" && <FaExclamationTriangle />}
                            </span>
                            <div className="eda-finding-text">
                              <strong>{item.label}:</strong> {item.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ) : edaSect === "modelperf" ? (
                  <div className="eda-modal-content">
                    <h3>Model Performance Monitoring</h3>
                    <p className="eda-modal-subtitle">
                      ML model metrics and validation
                    </p>
                    {/* Accuracy and F1 Score (placeholder)*/}
                    <div className="eda-card-row">
                      <div className="eda-card">
                        <h4>Accuracy</h4>
                      </div>
                      <div className="eda-card">
                        <h4>F1 Score</h4>
                      </div>
                    </div>

                    {/* Performance Metrics Trend (placeholder)*/}
                    <div className="eda-card">
                      <h4>Performance Metrics Trend</h4>
                      <div className="chart-placeholder">
                        Chart goes here
                      </div>
                    </div>

                    {/* Confusion Matrix Trend (placeholder)*/}
                    <div className="eda-card">
                      <h4>Confusion Matrix (Last 30 Days)</h4>
                      <div className="chart-placeholder">
                        Chart goes here
                      </div>
                    </div>

                    {/* Performance by Risk Class (placeholder)*/}
                    <div className="eda-card">
                      <h4>Confusion Matrix (Last 30 Days)</h4>
                      <div className="chart-placeholder">
                        Chart goes here
                      </div>
                    </div>

                    {/* Feature Importance (placeholder)*/}
                    <div className="eda-card">
                      <h4>Confusion Matrix (Last 30 Days)</h4>
                      <div className="chart-placeholder">
                        Chart goes here
                      </div>
                    </div>

                    {/* Model Drift Detection */}
                    <div className="eda-card">
                      <h4>Model Drift Detection</h4>
                      <div className="chart-placeholder">
                        Chart goes here
                      </div>

                      <div className="eda-warning">
                        <PiWarningBold /> <strong>Moderate Drift:</strong> Model drift increasing.
                        Consider retraining within 2 weeks.
                      </div>
                    </div>

                    {/* Model Health Status */}
                    <div className="eda-card">
                      <h4>Model Health Status</h4>

                      {modelHealthItems.map((item, index) => (
                        <div
                          key={index}
                          className={`eda-health-row ${item.status === "good" ? "good" : "warning"}`}
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
                            className={`eda-health-badge ${item.status === "good" ? "green" : "orange"}`}
                          >
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>

                  </div>
                ) : null}


              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default DashboardMapPage;

// Define a reusable component for rendering hazard breakdown details
const HazardBreakdown = ({ data }: { data: HazardBarangayData }) => {
  const components = [
    { label: "Flood", value: data.flood_risk },
    { label: "Landslide", value: data.landslide_risk },
    { label: "Earthquake", value: data.earthquake_risk },
    { label: "Typhoon", value: data.typhoon_risk },
    { label: "Rainfall", value: data.rainfall_risk },
  ];

  return (
    <div className="hazard-map-details-breakdown">
      <div className="hazard-map-details-breakdown-title">Risk Breakdown</div>
      {components.map((r) => (
        <div key={r.label} className="hazard-map-details-bar-item">
          <span className="hazard-map-details-bar-text">
            {r.label}: {r.value.toFixed(1)}%
          </span>
          <div className="hazard-map-details-bar-bg">
            <div
              className="hazard-map-details-bar-fill"
              style={{
                width: `${Math.min(100, r.value)}%`,
                background: r.value >= 60 ? "#d32f2f" : r.value >= 40 ? "#ff9800" : r.value >= 20 ? "#fdd835" : "#66bb6a",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// Define a reusable component for rendering calamity risk component breakdown
const CalamityRiskBreakdown = ({ data }: { data: CalamityRiskBarangayData }) => {
  const componentColor = (val: number): string => {
    const v = Math.max(0, Math.min(1, val));
    if (v >= 0.8) return '#b71c1c';
    if (v >= 0.6) return '#e53935';
    if (v >= 0.4) return '#fb8c00';
    if (v >= 0.2) return '#fdd835';
    return '#66bb6a';
  };

  const components = [
    { label: "Hazard (H)", value: data.hazard_index_raw },
    { label: "Exposure (E)", value: data.exposure_norm },
    { label: "1 - Green (1 - G)", value: 1 - data.green_index_raw },
  ];

  return (
    <div className="calamity-map-details-breakdown">
      <div className="calamity-map-details-breakdown-title">Component Breakdown (0–1)</div>
      {components.map((c) => (
        <div key={c.label} className="calamity-map-details-bar-item">
          <span className="calamity-map-details-bar-text">
            {c.label}: {(c.value * 100).toFixed(1)}%
          </span>
          <div className="calamity-map-details-bar-bg">
            <div
              className="calamity-map-details-bar-fill"
              style={{
                width: `${Math.min(100, c.value * 100)}%`,
                background: componentColor(c.value),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

