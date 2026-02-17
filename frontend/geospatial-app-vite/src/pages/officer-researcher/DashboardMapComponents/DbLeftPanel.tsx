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

    const [open, setOpen] = useState(false);
    const handleSelect = (value: string) => {
        setSelectedLayer(value);
        setOpen(false);
    };

    return (
        <aside className="dbmleft-panel">
            {/* Map View Toggle */}
            <div className="panel-card mapview-container">
                <h4>Map View</h4>
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

                        <div className="panel-card-value">
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

                        <div className="panel-card-value">
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
            ) : null}

            {/* Map Layers Control */}
            <DbMapLayers
                visibleMapLayers={visibleMapLayers}
                layerDisplayNames={layerDisplayNames}
                activeLayers={activeLayers}
                toggleLayer={toggleLayer}
            />

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
