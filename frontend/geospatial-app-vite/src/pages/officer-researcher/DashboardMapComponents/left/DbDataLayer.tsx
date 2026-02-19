import React, { useState } from "react";
import "../../DashboardMapPage.css";

interface LayerOption {
  value: string;
  label: string;
}

interface MapControlsProps {
  selectedLayer: string;
  setSelectedLayer: (layer: string) => void;
  activeLayers: string[];
  toggleLayer?: (layer: string) => void; // optional if needed for Map Layers later
  year: number;
  setYear: (val: number) => void;
  minYear: number;
  maxYear: number;
  ndviOpacity: number;
  setNdviOpacity: (val: number) => void;
  ndviMonth: number;
  setNdviMonth: (val: number) => void;
  layerOptions: LayerOption[];
}

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const DbDataLayer: React.FC<MapControlsProps> = ({
  selectedLayer,
  setSelectedLayer,
  activeLayers,
  year,
  setYear,
  minYear,
  maxYear,
  ndviOpacity,
  setNdviOpacity,
  ndviMonth,
  setNdviMonth,
  layerOptions
}) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (value: string) => {
    setSelectedLayer(value);
    setOpen(false);
  };

  const layerTitles: Record<string, string> = {
    hazard: "Hazard History and Projection",
    green: "Green History and Projection",
    calamity: "Calamity Risk History and Projection",
  };

  const layerTitleColors: Record<string, string> = {
    hazard: "#c44003",    // orange
    green: "#144416",     // green
    calamity: "#a12422",  // red
  };

  const layerYearColors: Record<string, string> = {
    hazard: "#ff9800",    // orange
    green: "#2e7d32",     // green
    calamity: "#e53935",  // red
  };

  return (
    <div className="panel-card choropleth-data-layer">
      {/* Layer Selection — Custom Dropdown */}
      <div className="info-text choropleth-data-layer">
        <div className="field-header-with-help">
          <h5>Data Layer</h5>
          <div className="mapview-help-wrap">
            <button
              type="button"
              className="mapview-help-icon"
              aria-label="What does Data Layer do?"
            >
              ?
            </button>
            <div className="field-help-tooltip">
              Choose which index or risk layer to visualize in the choropleth map. This controls what the year slider and map colors represent.
            </div>
          </div>
        </div>
        <div
          className={`select-wrapper ${open ? "active" : ""}`}
          onClick={() => setOpen(!open)}
        >
          <button className="select-btn">
            {!selectedLayer || selectedLayer === "none"
              ? "Select a layer"
              : layerOptions.find((opt) => opt.value === selectedLayer)?.label || "Select a layer"}
            <span className="arrow">▼</span>
          </button>
        </div>

        <ul
          className="select-options"
          style={{ display: open ? "block" : "none" }}
          onClick={(e) => e.stopPropagation()}
        >
          {layerOptions.map((opt) => (
            <li
              key={opt.value}
              className={selectedLayer === opt.value ? "selected" : ""}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      </div>

      <hr className="section-divider" />

      {/* Year Slider */}
      <div className={`timeslider-wrapper ${!selectedLayer || selectedLayer === "none" ? "no-layer" : ""}`}>
        <div className="timeslider-container">
          <h4 style={{ color: selectedLayer ? layerTitleColors[selectedLayer] : "#000" }}>
            {selectedLayer ? layerTitles[selectedLayer] : "Select a Layer"}
          </h4>

          <div 
            className="year-display" 
            style={{ color: selectedLayer ? layerYearColors[selectedLayer] : "#000" }}
          >
            {year}
          </div>

          <div className="slider-wrapper">
            <input
              type="range"
              min={minYear}
              max={maxYear}
              value={year}
              className="year-slider"
              onChange={(e) => setYear(Number(e.target.value))}
              disabled={!selectedLayer || selectedLayer === "none"}
            />
          </div>

          <div className="year-labels">
            <span>{minYear}</span>
            <span>{maxYear}</span>
          </div>
        </div>

        {(!selectedLayer || selectedLayer === "none") && (
          <div className="timeslider-choose-layer-reminder">
            <span className="timeslider-reminder-text">Choose a layer first</span>
          </div>
        )}
      </div>

      {/* NDVI Controls */}
      {activeLayers.includes("NDVI") && (
        <div className="ndvi-controls">
          <label>Opacity: {Math.round(ndviOpacity * 100)}%</label>
          <input
            type="range"
            min={0.2}
            max={1}
            step={0.05}
            value={ndviOpacity}
            onChange={(e) => setNdviOpacity(Number(e.target.value))}
          />

          <label>Month: {monthNames[ndviMonth - 1]}</label>
          <input
            type="range"
            min={1}
            max={12}
            value={ndviMonth}
            onChange={(e) => setNdviMonth(Number(e.target.value))}
          />
        </div>
      )}
    </div>
  );
};

export default DbDataLayer;
