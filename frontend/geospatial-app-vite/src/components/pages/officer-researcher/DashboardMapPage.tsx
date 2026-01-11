import React, { useState } from "react";
import "./DashboardMapPage.css";
import LeafletMap from "../../ui/LeafletMap";
import { FiDownload } from "react-icons/fi";
import { HiOutlineDocumentReport, HiOutlineChartBar } from "react-icons/hi";
import floodZoneIcon from "../../../assets/icons/floodzone.png";
import landslideIcon from "../../../assets/icons/landslide.png";

type ReportItem = [string, string]; // [title, meta]
type ChartItem = string;
type DownloadItem = { name: string; type: "report" | "chart" };

type ExportItem = ReportItem | ChartItem | DownloadItem;


const DashboardMapPage: React.FC = () => {

  /*----------map layers----------*/
  const [mapView, setMapView] = useState<"interactive" | "choropleth">("interactive");
  const [mapType, setMapType] = useState<"basic" | "satellite" | "terrain">("basic");
  const [rightNav, setRightNav] = useState<"charts" | "analytics" | "export">("charts");

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

  /* -----Export Section---- */
  const [recentDownloads, setRecentDownloads] = useState<DownloadItem[]>([]);

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
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Green Index Scores</span>
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Calamity Risk Likelihood</span>
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Earthquake Frequency</span>
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Typhoon Frequency & Intensity</span>
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
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Green Index Projection</span>
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Calamity Risk Likelihood</span>
              </div>
              <div className="panel-card">
                <span className="panel-card-title">Key Insights</span>
                <div className="columnpanel-card">
                  <div className="panel-card">Flood Risk: Increased by 25% over 5-year period (2020-2025).</div>
                  <div className="panel-card">Green Index: Current trajectory shows 29% improvement trend toward 2030 targets.</div>
                  <div className="panel-card">Landslide: Western upland/foothill areas show higher susceptibility, especially during prolonged heavy rainfall.</div>
                </div>
              </div>

            </div>
          ) : ( rightNav === "export" ? (
            <div className="right-panel-content">
              <h4>Export Section</h4>
              <h5>Download LGU planning materials</h5>

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
                          {/* section icon */}
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

                          {/* download icon */}
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

        </aside>
      </div>
    </div>
  );
};

export default DashboardMapPage;

