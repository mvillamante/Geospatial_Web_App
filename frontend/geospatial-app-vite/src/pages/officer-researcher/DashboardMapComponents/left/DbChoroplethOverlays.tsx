import React from "react";
import type { HazardBarangayData, GreenIndexBarangayData, CalamityRiskBarangayData } from "../../../../components/ui/LeafletMap";

type Props = {
  selectedLayer: string;
  selectedHazardBarangay: { barangay: string; year: string; data: HazardBarangayData } | null;
  selectedGreenBarangay: { barangay: string; year: string; data: GreenIndexBarangayData } | null;
  selectedCalamityBarangay: { barangay: string; year: string; data: CalamityRiskBarangayData } | null;
  activeLayers: string[];
  getHazardIndexColor: (val: number) => string;
  getGreenIndexColor: (val: number) => string;
  getCalamityRiskColor: (val: number) => string;
};

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


const DbChoroplethOverlays: React.FC<Props> = ({
  selectedLayer,
  selectedHazardBarangay,
  selectedGreenBarangay,
  selectedCalamityBarangay,
  activeLayers: _activeLayers,
  getHazardIndexColor,
  getGreenIndexColor,
  getCalamityRiskColor,
}) => {

    return (
        <>
        {/* Hazard Index overlays */}
        {selectedLayer === "hazard" && (
            <>
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
                            style={{ background: getHazardIndexColor(selectedHazardBarangay.data.hazard_index) }}
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
                        Click on a barangay on the map to view its details.
                    </div>
                )}
            </div>

              {/*<div className="hazard-map-risk-scale">
                  <div className="hazard-map-risk-scale-title">Hazard Index Scale</div>
                  <ul className="hazard-map-risk-scale-list">
                    <li className="very-high"><span className="hazard-map-legend-color" /> 80–100: Very High Risk</li>
                    <li className="high"><span className="hazard-map-legend-color" /> 60–79: High Risk</li>
                    <li className="moderate"><span className="hazard-map-legend-color" /> 40–59: Moderate Risk</li>
                    <li className="low"><span className="hazard-map-legend-color" /> 20–39: Low Risk</li>
                    <li className="very-low"><span className="hazard-map-legend-color" /> 0–19: Very Low Risk</li>
                  </ul>
              </div>*/}
            </>
        )}

        {/* Green Index overlays */}
        {selectedLayer === "green" && (
            <>
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
                    Click on a barangay on the map to view its details.
                </div>
                )}
            </div>

            {/*<div className="green-map-legend">
                <div className="green-map-legend-title">GREEN INDEX SCALE</div>
                <div className="green-map-legend-item"><span className="green-map-legend-color" style={{ background: "#006400" }} /> 90–100: Dense Forest / Parks</div>
                <div className="green-map-legend-item"><span className="green-map-legend-color" style={{ background: "#228B22" }} /> 70–89: Healthy Vegetation</div>
                <div className="green-map-legend-item"><span className="green-map-legend-color" style={{ background: "#7CCD7C" }} /> 50–69: Moderate Greenery</div>
                <div className="green-map-legend-item"><span className="green-map-legend-color" style={{ background: "#CDCD00" }} /> 30–49: Sparse Vegetation</div>
                <div className="green-map-legend-item"><span className="green-map-legend-color" style={{ background: "#8B6914" }} /> 0–29: Urbanized / Built-up</div>
            </div>*/}
            </>
        )}

        {/* Calamity Risk overlays */}
        {selectedLayer === "calamity" && (
            <>
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
                        style={{ background: getCalamityRiskColor(selectedCalamityBarangay.data.calamity_risk) }}
                    >
                        {selectedCalamityBarangay.data.calamity_risk.toFixed(1)}%
                    </span>
                    </div>
                    <div className="calamity-map-details-row">
                    <span className="calamity-map-details-label">Classification</span>
                    <strong className="calamity-map-classification">{selectedCalamityBarangay.data.risk_class}</strong>
                    </div>
                    <CalamityRiskBreakdown data={selectedCalamityBarangay.data} />
                </div>
                ) : (
                <div className="calamity-map-details-placeholder">
                    Click on a barangay on the map to view its details.
                </div>
                )}
            </div>

            {/*<div className="calamity-map-risk-scale">
                <div className="calamity-map-risk-scale-title">Risk Likelihood Scale</div>
                <ul className="calamity-map-risk-scale-list">
                  <li className="very-high"><span className="calamity-map-legend-color" /> 80–100%: Very High</li>
                  <li className="high"><span className="calamity-map-legend-color" /> 60–79%: High</li>
                  <li className="moderate"><span className="calamity-map-legend-color" /> 40–59%: Moderate</li>
                  <li className="low"><span className="calamity-map-legend-color" /> 20–39%: Low</li>
                  <li className="very-low"><span className="calamity-map-legend-color" /> 0–19%: Very Low</li>
                </ul>
            </div>*/}
            </>
        )}

        {/* NDVI Legend - uncommented */}
        {/*activeLayers.includes("NDVI") && (
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
        )*/}
        </>
    );
};

export default DbChoroplethOverlays;
