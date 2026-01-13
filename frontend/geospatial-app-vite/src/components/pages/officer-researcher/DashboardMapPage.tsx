import React, { useEffect, useState } from "react";
import "./DashboardMapPage.css";
import LeafletMap from "../../ui/LeafletMap";
import { getUserRoleAndDisplayName } from "../../../libr/auth";
import { FaCheck, FaChartLine, FaArrowUp, FaExclamationTriangle, FaLeaf, FaMountain } from "react-icons/fa";
import { FiDownload } from "react-icons/fi";
import { HiOutlineDocumentReport, HiOutlineChartBar } from "react-icons/hi";
import { PiWarningBold } from "react-icons/pi";
import floodZoneIcon from "../../../assets/icons/floodzone.png";
import landslideIcon from "../../../assets/icons/landslide.png";

type DatasetsItem = [string, string, string]
type ReportItem = [string, string]; // [title, meta]
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
  const { userRole, displayName, profilePath } = getUserRoleAndDisplayName();
  
  // Show Modal Popup
  const [showEdaModal, setShowEdaModal] = useState(false);

  /*----------map layers----------*/
  const [mapView, setMapView] = useState<"interactive" | "choropleth">("interactive");
  const [mapType, setMapType] = useState<"basic" | "satellite" | "terrain">("basic");
  const [rightNav, setRightNav] = useState<"charts" | "analytics" | "export">("charts");
  const [edaSect, setEdaSect] = useState<"edastats" | "modelperf">("edastats");

  /* data layer - custom select-option */
  const [selected, setSelected] = useState("hazard");
  const [open, setOpen] = useState(false);

  const options = [
    { value: "hazard", label: "Hazard Index" },
    { value: "green", label: "Green Index" },
    { value: "population", label: "Population Density" },
  ];

  const handleSelect = (value: string) => {
    setSelected(value);
    setOpen(false);
  };

  /*----------time slider----------*/
  const currentYear = new Date().getFullYear(); // today’s year
  const [year, setYear] = useState(currentYear);

  const minYear = currentYear - 20;
  const maxYear = currentYear + 20;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYear(Number(e.target.value));
  };

  /*----------toggle map layers----------*/
  const [activeLayers, setActiveLayers] = useState<string[]>([]);

  const mapLayers = [
    {
      group: "Green Coverage",
      items: ["Green Spaces"],
    },
    {
      group: "Hazard Zones",
      items: ["Fault Lines", "Flood Zones", "Landslide Risk",],
    },
    {
      group: "Infrastructure",
      items: ["Evacuation Centers", "Roads", "Traffic Conditions",],
    },
  ];

  const toggleLayer = (layer: string) => {
    setActiveLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]
    );
  };

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
  const colors = ["violet", "teal", "orange", "green"]
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
  const downloadDataset = (item: DatasetsItem) => {
    alert(`Downloading: ${item[0]} (${item[1]})`);
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
        ["Monthly Expense Report", "Nov 2025"],
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
          {mapView === "interactive" ? (
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
          ) : mapView === "choropleth" ? (
            <div className="info-text choropleth-data-layer">
              <h5>Data Layer</h5>
              <div
                className={`select-wrapper ${open ? "active" : ""}`}
                onClick={() => setOpen(!open)}
              >
                <button className="select-btn">
                  {options.find((opt) => opt.value === selected)?.label || "Select an option"}
                  <span className="arrow">▼</span>
                </button>
                <ul className="select-options">
                  {options.map((opt) => (
                    <li
                      key={opt.value}
                      className={selected === opt.value ? "selected" : ""}
                      onClick={() => handleSelect(opt.value)}
                    >
                      {opt.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null }
          </div>

          {/* Time Slider */}
          <div className="timeslider-container panel-card">
            <h4>Historical & Projection per Year</h4>

            <div className="year-display">{year}</div>

            <div className="slider-wrapper">
              <input
                type="range"
                min={minYear}
                max={maxYear}
                value={year}
                className="year-slider"
                onChange={handleChange}
              />
            </div>

            <div className="year-labels">
              <span>{minYear}</span>
              <span>{maxYear}</span>
            </div>
          </div>

          {/* Map Layer */}
          <div className="maplayer-container panel-card">
            <h4>Map Layers</h4>

            {mapLayers.map((section, index) => (
              <div key={section.group}>
                <p className="layer-group">{section.group}</p>

                {section.items.map((item) => (
                  <div className="layer-item" key={item}>
                    <span>{item}</span>
                    <button
                      className={`toggle-btn ${activeLayers.includes(item) ? "active" : ""}`}
                      onClick={() => toggleLayer(item)}
                    />
                  </div>
                ))}
                {index < mapLayers.length - 1 && <hr className="section-divider" />}  
              </div>
            ))}
          </div>

          {/* Risk Legend */}
          <div className="risklegend-container panel-card">
            <h4>Risk Index Legend</h4>
            <ul>
              <li className="low">Low Risk</li>
              <li className="moderate">Moderate Risk</li>
              <li className="high">High Risk</li>
              <li className="critical">Critical Risk</li>
            </ul>
          </div>
        </aside>

        
        {/* Map Component -------------------------------*/}
        {mapView === "interactive" ? (
          <div className="dashboardview-map">
            {/* Interactive Map Component */}
            <LeafletMap height="100vh" mapView="interactive" mapType={mapType} activeLayers={activeLayers} />

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
            { /* Choropleth Map Component */}

            {/* Header */}
            <div className="choropleth-header">
              <h3>Choropleth Map: {options.find((opt) => opt.value === selected)?.label || ""}</h3>
              <h5>Cabuyao, Laguna Barangays - {year}</h5>
            </div>

            {/* Map Visual*/}
            <LeafletMap height="75vh" mapView="choropleth" mapType={mapType} /> 

            {/* Legends */}
            <div className="choropleth-legend-box">
              <h4>Legend</h4>
              <ul>
                <li className="critical">Critical (≥8)</li>
                <li className="very-high">Very High (7-8)</li>
                <li className="high">High (6-7)</li>
                <li className="moderate">Moderate (5-6)</li>
                <li className="low">Low (4-5)</li>
                <li className="very-low">Very Low (&lt;4)</li>
              </ul>
            </div>

          </div>
        ) : null }


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
                <div className="panel-card">
                  <span className="panel-card-sub-title">Avg Risk Index</span>
                </div>
                <div className="panel-card">
                  <span className="panel-card-sub-title">Green Index</span>
                </div>
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Disaster Vulnerability Index</span>
                <div className="chart-placeholder">
                  Chart goes here
                </div>
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Green Index Scores</span>
                <div className="chart-placeholder">
                  Chart goes here
                </div>
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Calamity Risk Likelihood</span>
                <div className="chart-placeholder">
                  Chart goes here
                </div>
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Earthquake Frequency</span>
                <div className="chart-placeholder">
                  Chart goes here
                </div>
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Typhoon Frequency & Intensity</span>
                <div className="chart-placeholder">
                  Chart goes here
                </div>
              </div>
            </div>
          ) : ( rightNav === "analytics" ? (
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
                <span className="panel-card-title">Risk Likelihood ({currentYear}-{maxYear})</span>
                <div className="chart-placeholder">
                  Chart goes here
                </div>
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Green Index Projection</span>
                <div className="chart-placeholder">
                  Chart goes here
                </div>
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Key Insights</span>

                <div className="columnpanel-card">
                  {keyInsights.map((item, index) => (
                    <div className={`panel-card insight-card ${colors[index % colors.length]}`}>
                      <span className="insight-icon">{insightIcons[index % insightIcons.length]}</span>
                      <div className="insight-text">
                        <strong>{item.label}:</strong> {item.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>



              {userRole === "Researcher" && (
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
          ) : ( rightNav === "export" ? (
            <div className="right-panel-content">
              <h4>Export Section</h4>
              {userRole === "Officer" ? (
                <h5>Download LGU planning materials</h5>
              ) : userRole === "Researcher" ? (
                <h5>Export datasets and reports</h5>
              ) : null}

              {/* CONFIGURATION -------------------- */}
              {userRole === "Researcher" && (
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
              {userRole === "Researcher" && (
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
                            className={`export-left-icon ${
                              section.title === "Reports"
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

          ) : null ))}

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
                              className={`eda-badge ${
                                item.change >= 0 ? "red" : "green"
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
                ) : null }

                
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default DashboardMapPage;

