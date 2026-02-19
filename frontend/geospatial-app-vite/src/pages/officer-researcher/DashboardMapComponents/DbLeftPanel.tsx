import React, { useState } from "react";
import DbInsightsPanel from "./left/DbInsightsPanel";
import "../DashboardMapPage.css";

import DbDataLayer from "./left/DbDataLayer";
import DbMapLayers from "./left/DbMapLayers";
import DbRiskLegend from "./left/DbRiskLegend";

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
  setYear: (val: number) => void;
  minYear: number;
  maxYear: number;
  layerOptions: LayerOption[];

  visibleMapLayers: { group: string; items: MapLayerItem[] }[];
  layerDisplayNames: Record<string, string>;
}

const DbLeftPanel: React.FC<DbLeftPanelProps> = ({
  universalGreenAvg,
  universalHazardAvg,
  greenChangeFromLastYear,
  hazardChangeFromLastYear,
  universalCalamityAvg,
  greenCityAverage,
  hazardCityAverage,
  calamityCityAverage,
  getGreenIndexColor,
  getHazardIndexColor,
  getCalamityRiskColor,
  insights,
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
  setYear,
  minYear,
  maxYear,
  layerOptions,
  visibleMapLayers,
  layerDisplayNames
}) => {
    const [showMapViewHelp, setShowMapViewHelp] = useState(false);

    // Derived state for choropleth index summary behavior
    const isChoropleth = mapView === "choropleth";
    const isNoLayerSelected = !selectedLayer || selectedLayer === "none";

    let greenIdxValue: number | null = null;
    let hazardIdxValue: number | null = null;
    let calamityIdxValue: number | null = null;

    if (isChoropleth && !isNoLayerSelected) {
      if (selectedLayer === "green") {
        // Only Green Index highlighted; others blank
        greenIdxValue = greenCityAverage ?? universalGreenAvg ?? null;
      } else if (selectedLayer === "hazard") {
        // Only Hazard Index highlighted; others blank
        hazardIdxValue = hazardCityAverage ?? universalHazardAvg ?? null;
      } else if (selectedLayer === "calamity") {
        // When viewing Calamity Risk, show all three averages together
        greenIdxValue = greenCityAverage ?? universalGreenAvg ?? null;
        hazardIdxValue = hazardCityAverage ?? universalHazardAvg ?? null;
        calamityIdxValue = calamityCityAverage ?? universalCalamityAvg ?? null;
      }
    }

    const hasGreenIdx = greenIdxValue != null;
    const hasHazardIdx = hazardIdxValue != null;
    const hasCalamityIdx = calamityIdxValue != null;

    return (
        <aside className="dbmleft-panel">
            {/* Map View Toggle */}
            <div className="panel-card mapview-container">
            <div className="mapview-header-with-help">
              <h4>Map View</h4>
              <div
                className="mapview-help-wrap"
                onMouseEnter={() => setShowMapViewHelp(true)}
                onMouseLeave={() => setShowMapViewHelp(false)}
              >
                <button
                  type="button"
                  className="mapview-help-icon"
                  onClick={() => setShowMapViewHelp((prev) => !prev)}
                  aria-label="What does Map View do?"
                >
                  ?
                </button>
                {showMapViewHelp && (
                  <div className="mapview-help-tooltip">
                    Use this toggle to switch between <strong>Interactive</strong> (explore layers and overlays) and <strong>Choropleth</strong> (view citywide index maps like Green, Hazard, and Risk).
                  </div>
                )}
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
                <div className="rowpanel-card">
                    {/* Green Index */}
                    <div className="panel-card green">
                        <span className="panel-card-sub-title">Current Green Index</span>

                        <div
                          className="panel-card-value"
                          style={
                            universalGreenAvg != null && getGreenIndexColor
                              ? { color: getGreenIndexColor(universalGreenAvg) }
                              : undefined
                          }
                        >
                        {universalGreenAvg != null ? universalGreenAvg.toFixed(1) : "—"}
                        <span className="unit">%</span>
                        </div>

                        <div className="panel-card-meta">
                        {greenChangeFromLastYear != null
                            ? <>
                                {greenChangeFromLastYear >= 0 ? "↑" : "↓"}{" "}
                                {Math.abs(greenChangeFromLastYear).toFixed(1)}% from last year
                            </>
                            : "—"}
                        </div>
                    </div>

                    {/* Hazard Index */}
                    <div className="panel-card hazard">
                        <span className="panel-card-sub-title">Current Hazard Index</span>

                        <div
                          className="panel-card-value"
                          style={
                            universalHazardAvg != null && getHazardIndexColor
                              ? { color: getHazardIndexColor(universalHazardAvg) }
                              : undefined
                          }
                        >
                        {universalHazardAvg != null ? universalHazardAvg.toFixed(1) : "—"}
                        <span className="unit">%</span>
                        </div>

                        <div className="panel-card-meta">
                        {hazardChangeFromLastYear != null
                            ? <>
                                {hazardChangeFromLastYear >= 0 ? "↑" : "↓"}{" "}
                                {Math.abs(hazardChangeFromLastYear).toFixed(1)}% from last year
                            </>
                            : "—"}
                        </div>
                    </div>
                </div>
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
                  <div className="rowpanel-card">
                    <div className={`panel-card idx-summary-card ${hasGreenIdx ? "idx-active green-active" : ""}`}>
                      <span className="panel-card-sub-title">Green Index</span>
                      <span className="panel-card-value idx-value green-idx-value">
                        {hasGreenIdx ? greenIdxValue!.toFixed(1) : "-"}
                      </span>
                    </div>

                    <div className={`panel-card idx-summary-card ${hasHazardIdx ? "idx-active hazard-active" : ""}`}>
                      <span className="panel-card-sub-title">Hazard Index</span>
                      <span className="panel-card-value idx-value hazard-idx-value">
                        {hasHazardIdx ? hazardIdxValue!.toFixed(1) : "-"}
                      </span>
                    </div>

                    <div className={`panel-card idx-summary-card ${hasCalamityIdx ? "idx-active calamity-active" : ""}`}>
                      <span className="panel-card-sub-title">Avg Risk Index</span>
                      <span
                        className="panel-card-value idx-value calamity-idx-value"
                        style={
                          hasCalamityIdx && getCalamityRiskColor
                            ? { color: getCalamityRiskColor(calamityIdxValue!) }
                            : undefined
                        }
                      >
                        {hasCalamityIdx ? `${calamityIdxValue!.toFixed(1)}%` : "-"}
                      </span>
                    </div>
                  </div>

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

            {/* Map Layers Control - only for interactive view */}
            {mapView === "interactive" && (
              <DbMapLayers
                visibleMapLayers={visibleMapLayers}
                layerDisplayNames={layerDisplayNames}
                activeLayers={activeLayers}
                toggleLayer={toggleLayer}
              />
            )}

            {/* Insights Panel && Risk Legendes */}
            {mapView === "interactive" ? (
                <DbInsightsPanel insights={insights} />
            ) : mapView === "choropleth" ? (
                <DbRiskLegend selectedLayer={selectedLayer} />
            ) : null}
        </aside>
    );
};

export default DbLeftPanel;
