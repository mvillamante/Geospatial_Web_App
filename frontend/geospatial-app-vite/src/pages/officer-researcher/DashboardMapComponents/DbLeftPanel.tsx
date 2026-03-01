import React, { useState, useRef } from "react";
import "../DashboardMapPage.css";

import DbDataLayer from "./left/DbDataLayer";
import DbMapLayers from "./left/DbMapLayers";
import DbRiskLegend from "./left/DbRiskLegend";
import PortalTooltip from "./left/PortalTooltip";

import { getEnvironmentalRecommendation } from "../../../utils/getEnvironmentalRecommendation";

interface LayerOption {
  value: string;
  label: string;
}

interface MapLayerItem {
  key: string;
  name: string;
}

interface DbLeftPanelProps {
  universalGreenAvg: number | null;
  universalHazardAvg: number | null;
  greenChangeFromLastYear: number | null;
  hazardChangeFromLastYear: number | null;
  universalCalamityAvg?: number | null;
  greenCityAverage?: number | null;
  hazardCityAverage?: number | null;
  calamityCityAverage?: number | null;

  // Color helpers
  getGreenIndexColor?: (val: number) => string;
  getHazardIndexColor?: (val: number) => string;
  getCalamityRiskColor?: (val: number) => string;

  insights: { label: string; description: string }[];

  // Map state
  mapView: "interactive" | "choropleth";
  setMapView: (view: "interactive" | "choropleth") => void;
  mapType: "basic" | "satellite" | "terrain";
  setMapType: (type: "basic" | "satellite" | "terrain") => void;

  // Layers Controls
  selectedLayer: string;
  setSelectedLayer: (layer: string) => void;
  activeLayers: string[];
  toggleLayer: (layer: string) => void;

  // NDVI Controls
  ndviOpacity: number;
  setNdviOpacity: (val: number) => void;

  // Year Controls
  ndviMonth: number;
  setNdviMonth: (val: number) => void;
  year: number;
  currentYear: number;
  /** Year shown for "Current Indices" in left panel; fixed to 2026 and unaffected by sliders */
  indicesYear?: number;
  setYear: (val: number) => void;
  minYear: number;
  maxYear: number;
  layerOptions: LayerOption[];

  visibleMapLayers: { group: string; items: MapLayerItem[] }[];
  layerDisplayNames: Record<string, string>;
  layerTooltips?: Record<string, string>;
}

const DbLeftPanel: React.FC<DbLeftPanelProps> = ({
  universalGreenAvg,
  universalHazardAvg,
  greenChangeFromLastYear,
  hazardChangeFromLastYear,
  // universalCalamityAvg,
  greenCityAverage,
  hazardCityAverage,
  calamityCityAverage,
  getGreenIndexColor,
  getHazardIndexColor,
  getCalamityRiskColor,
  // insights,
  mapView,
  setMapView,
  mapType,
  setMapType,
  selectedLayer,
  setSelectedLayer,
  activeLayers,
  toggleLayer,
  ndviOpacity,
  setNdviOpacity,
  ndviMonth,
  setNdviMonth,
  year,
  currentYear,
  indicesYear = 2026,
  setYear,
  minYear,
  maxYear,
  layerOptions,
  visibleMapLayers,
  layerDisplayNames,
  layerTooltips = {},
}) => {
    const [showMapViewHelp, setShowMapViewHelp] = useState(false);
    const [showGreenHelp, setShowGreenHelp] = useState(false);
    const [showHazardHelp, setShowHazardHelp] = useState(false);
    // const [showResilienceHelp, setShowResilienceHelp] = useState(false);

    const mapViewHelpRef = useRef<HTMLButtonElement>(null);
    // const resilienceHelpRef = useRef<HTMLButtonElement>(null);
    const greenHelpRef = useRef<HTMLButtonElement>(null);
    const hazardHelpRef = useRef<HTMLButtonElement>(null);

    // Derived state for choropleth index summary behavior
    // const isChoropleth = mapView === "choropleth";
    // const isNoLayerSelected = !selectedLayer || selectedLayer === "none";

    // let greenIdxValue: number | null = null;
    // let hazardIdxValue: number | null = null;
    // let calamityIdxValue: number | null = null;

    // if (isChoropleth && !isNoLayerSelected) {
    //   if (selectedLayer === "green") {
    //     // Only Green Index highlighted; others blank
    //     greenIdxValue = greenCityAverage ?? universalGreenAvg ?? null;
    //   } else if (selectedLayer === "hazard") {
    //     // Only Hazard Index highlighted; others blank
    //     hazardIdxValue = hazardCityAverage ?? universalHazardAvg ?? null;
    //   } else if (selectedLayer === "calamity") {
    //     // When viewing Calamity Risk, show all three averages together
    //     greenIdxValue = greenCityAverage ?? universalGreenAvg ?? null;
    //     hazardIdxValue = hazardCityAverage ?? universalHazardAvg ?? null;
    //     calamityIdxValue = calamityCityAverage ?? universalCalamityAvg ?? null;
    //   }
    // }

    // const hasGreenIdx = greenIdxValue != null;
    // const hasHazardIdx = hazardIdxValue != null;
    // const hasCalamityIdx = calamityIdxValue != null;

    // const [insightStatus, setInsightStatus] = useState<"loading" | "success" | "error">("loading");
    const combinedRec = getEnvironmentalRecommendation(
      greenChangeFromLastYear,
      hazardChangeFromLastYear
    );
    // const insightLoading = combinedRec === null;
    // const insightFailed = combinedRec === null;

    // const compositeResilienceScore =
    //   universalGreenAvg != null && universalHazardAvg != null
    //     ? (0.6 * universalGreenAvg) +
    //       (0.4 * (100 - universalHazardAvg))
    //     : null;

    return (
        <aside className="dbmleft-panel">
            {/* Map View Toggle */}
            <div className="panel-card mapview-container">
            <div className="header-with-help">
              <h4>Map View</h4>
              <div
                className="help-wrap"
                onMouseEnter={() => setShowMapViewHelp(true)}
                onMouseLeave={() => setShowMapViewHelp(false)}
              >
                <button
                  ref={mapViewHelpRef}
                  type="button"
                  className="help-icon"
                  onClick={() => setShowMapViewHelp((prev) => !prev)}
                  aria-label="What does Map View do?"
                >
                  ?
                </button>
                <PortalTooltip
                  show={showMapViewHelp}
                  triggerRef={mapViewHelpRef}
                  content={
                    <>
                      Use this toggle to switch between <strong>Interactive</strong> (explore layers and overlays) and <strong>Choropleth</strong> (view citywide index maps like Green, Hazard, and Risk).
                    </>
                  }
                />
              </div>
            </div>
            <div className="segmented-control slide one">
                    <span className={`slider ${mapView}`} />
                    <button
                        className={mapView === "interactive" ? "active" : ""}
                        onClick={() => setMapView("interactive")}
                    >
                        Interactive
                    </button>
                    <button
                        className={mapView === "choropleth" ? "active" : ""}
                        onClick={() => setMapView("choropleth")}
                    >
                        Choropleth
                    </button>
                </div>

                {/* Map Type - only for interactive */}
                {mapView === "interactive" && (
                <div className="segmented-control small slide two">
                    <span className={`slider ${mapType}`} />
                    <button
                    className={mapType === "basic" ? "active" : ""}
                    onClick={() => setMapType("basic")}
                    >
                    Basic
                    </button>
                    <button
                    className={mapType === "satellite" ? "active" : ""}
                    onClick={() => setMapType("satellite")}
                    >
                    Satellite
                    </button>
                    <button
                    className={mapType === "terrain" ? "active" : ""}
                    onClick={() => setMapType("terrain")}
                    >
                    Terrain
                    </button>
                </div>
                )}
            </div>

            {/* Panel Cards && Data Layer */}
            {mapView === "interactive" ? (
                <>
                    <div className="panel-card indices-card">
                      <h4>Current Indices as of {indicesYear}</h4>

                      {/* Overall Resilience Score */}
                      {/* <div className="index-block resilience_score">
                        <div className="header-with-help index-header">
                          <div className="index-label">
                            Composite Resilience Score
                          </div>

                          <div className="help-wrap"
                            onMouseEnter={() => setShowResilienceHelp(true)}
                            onMouseLeave={() => setShowResilienceHelp(false)}
                          >
                            <button
                              ref={resilienceHelpRef}
                              type="button"
                              className="help-icon small"
                              onClick={() => setShowResilienceHelp(prev => !prev)}
                            >
                              ?
                            </button>
                            <PortalTooltip
                              show={showResilienceHelp}
                              triggerRef={resilienceHelpRef}
                              content={
                                <>
                                  <strong>Composite Resilience Score</strong> Formula:
                                  <br />
                                  (0.6 × Green Index) + (0.4 × (100 − Hazard Index))
                                </>
                              }
                            />
                          </div>
                        </div>

                        <div className="index-value">
                          {compositeResilienceScore != null
                            ? compositeResilienceScore.toFixed(1)
                            : "—"}
                          <span style={{ fontSize: "14px", marginLeft: 4 }}>%</span>
                        </div>
                      </div> */}

                      {/* Green and Hazard Indices */}
                      <div className="indices-content">
                        {/* Green Index Row */}
                        <div className="index-block green">
                          <div className="header-with-help index-header">
                            <div className="index-label">Green Index</div>

                              <div className="help-wrap"
                                onMouseEnter={() => setShowGreenHelp(true)}
                                onMouseLeave={() => setShowGreenHelp(false)}
                              >
                                <button
                                  ref={greenHelpRef}
                                  type="button"
                                  className="help-icon small"
                                  onClick={() => setShowGreenHelp(prev => !prev)}
                                >
                                  ?
                                </button>
                                <PortalTooltip
                                  show={showGreenHelp}
                                  triggerRef={greenHelpRef}
                                  content={
                                    <>
                                      <strong>Green Index</strong> includes:
                                      <br />• Normalized Difference Vegetation Index (NDVI)
                                      <br />• Green Area Ratio (GAR)
                                    </>
                                  }
                                />
                              </div>
                            </div>

                          <div className="index-value">
                            {universalGreenAvg != null ? universalGreenAvg.toFixed(1) : "—"}
                            <span className="unit">%</span>
                          </div>

                          <div className="index-divider-line" />

                          <div className="index-meta">
                            {greenChangeFromLastYear != null ? (
                              <span className={greenChangeFromLastYear >= 0 ? "up" : "down"}>
                                {greenChangeFromLastYear >= 0 ? "↑" : "↓"}{" "}
                                {Math.abs(greenChangeFromLastYear).toFixed(1)}%
                              </span>
                            ) : "—"}
                          </div>
                      
                      </div>

                      <div className="index-divider" />

                      {/* Hazard Index Row */}
                      <div className="index-block hazard">
                        <div className="header-with-help index-header">
                          <div className="index-label">Hazard Index</div>

                          <div className="help-wrap"
                              onMouseEnter={() => setShowHazardHelp(true)}
                              onMouseLeave={() => setShowHazardHelp(false)}
                            >
                              <button
                                ref={hazardHelpRef}
                                type="button"
                                className="help-icon small"
                                onClick={() => setShowHazardHelp(prev => !prev)}
                              >
                                ?
                              </button>
                              <PortalTooltip
                                show={showHazardHelp}
                                triggerRef={hazardHelpRef}
                                content={
                                  <>
                                    <strong>Hazard Index</strong> includes:
                                    <br />• Earthquake Frequency
                                    <br />• Flood Susceptibility
                                    <br />• Typhoon Frequency
                                    <br />• Landslide Susceptibility
                                    <br />• Infrastructure
                                    <br />• Population
                                    <br />• Weather Data
                                  </>
                                }
                              />
                            </div>
                          </div>

                          <div className="index-value">
                            {universalHazardAvg != null ? universalHazardAvg.toFixed(1) : "—"}
                            <span className="unit">%</span>
                          </div>

                          <div className="index-divider-line" />

                          <div className="index-meta">
                            {hazardChangeFromLastYear != null ? (
                              <span className={hazardChangeFromLastYear >= 0 ? "up" : "down"}>
                                {hazardChangeFromLastYear >= 0 ? "↑" : "↓"}{" "}
                                {Math.abs(hazardChangeFromLastYear).toFixed(1)}%
                              </span>
                            ) : "—"}
                          </div>
                        </div>
                      </div>

                      {/* Combined Recommendations */}
                      {combinedRec === null ? (
                        <div className="recommendation-card loading">
                          <div className="recommendation-title">Loading Recommendations...</div>
                          <div className="recommendation-text">Analyzing index changes to provide insights.</div>
                        </div>                        
                      ) : combinedRec ? (
                        <div className={`recommendation-card ${combinedRec.tone}`}>
                          {/* Successfully Loaded */}
                          <div className="recommendation-title">GENERATED INSIGHTS</div>
                          <div className="index-divider-line" />
                          <div className="recommendation-sub-title">{combinedRec.title}</div>
                          <div className="recommendation-text">{combinedRec.text}</div>
                          <div className="recommendation-note">
                            * Automatically generated — please have an expert review for final assessment.
                          </div>
                        </div>
                      ) : (
                        <div className="recommendation-card error">
                          <div className="recommendation-title">Error Generating Recommendations</div>
                          <div className="recommendation-text">An error occurred while analyzing the data. Please try again later.</div>
                        </div>
                      )}
                    </div>
                </>
            ) : mapView === "choropleth" ? (
                <>
                  <DbDataLayer
                      selectedLayer={selectedLayer}
                      setSelectedLayer={setSelectedLayer}
                      activeLayers={activeLayers}
                      year={year}
                      setYear={setYear}
                      minYear={minYear}
                      maxYear={maxYear}
                      ndviOpacity={ndviOpacity}
                      setNdviOpacity={setNdviOpacity}
                      ndviMonth={ndviMonth}
                      setNdviMonth={setNdviMonth}
                      layerOptions={layerOptions}
                  />

                  {/* Global indices summary for choropleth view */}
                  {selectedLayer === "green" && (
                    <div className="panel-card green-city-avg-card">
                      <div className="green-city-avg-label">City Average Green Index</div>
                      <div
                        className="green-city-avg-value"
                        style={
                          greenCityAverage != null && getGreenIndexColor
                            ? { color: getGreenIndexColor(greenCityAverage) }
                            : undefined
                        }
                      >
                        {greenCityAverage != null ? greenCityAverage.toFixed(1) : "—"}
                      </div>
                      <div className="green-city-avg-subtitle">NDVI Vegetation Assessment (2020–2030)</div>
                    </div>
                  )}

                  {selectedLayer === "hazard" && (
                    <div className="panel-card hazard-city-avg-card">
                      <div className="hazard-city-avg-label">City Average Hazard Index</div>
                      <div
                        className="hazard-city-avg-value"
                        style={
                          hazardCityAverage != null && getHazardIndexColor
                            ? { color: getHazardIndexColor(hazardCityAverage) }
                            : undefined
                        }
                      >
                        {hazardCityAverage != null ? hazardCityAverage.toFixed(1) : "—"}
                      </div>
                      <div className="hazard-city-avg-subtitle">LSTM Hazard Assessment (2020–2030)</div>
                    </div>
                  )}

                  {selectedLayer === "calamity" && (
                    <div className="panel-card calamity-city-avg-card">
                      <div className="calamity-city-avg-label">City Average Calamity Risk Likelihood</div>
                      <div
                        className="calamity-city-avg-value"
                        style={
                          calamityCityAverage != null && getCalamityRiskColor
                            ? { color: getCalamityRiskColor(calamityCityAverage) }
                            : undefined
                        }
                      >
                        {calamityCityAverage != null ? `${calamityCityAverage.toFixed(1)}%` : "—"}
                      </div>
                      <div className="calamity-city-avg-subtitle">
                        Multi-Source Geospatial Analytics | Hazard, Exposure, Green Index (2020–2030)
                      </div>
                    </div>
                  )}
                </>
            ) : null}

            {/* Map Layers Control && Risk Legendes */}
            {mapView === "interactive" ? (
                <>
                  <DbMapLayers
                    visibleMapLayers={visibleMapLayers}
                    layerDisplayNames={layerDisplayNames}
                    layerTooltips={layerTooltips}
                    activeLayers={activeLayers}
                    toggleLayer={toggleLayer}
                  />
                </>
            ) : mapView === "choropleth" ? (
                <DbRiskLegend selectedLayer={selectedLayer} />
            ) : null}
        </aside>
    );
};

export default DbLeftPanel;
