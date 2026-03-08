import React from "react";
import floodZoneIcon from "../../../../assets/icons/floodzone.png";
import landslideIcon from "../../../../assets/icons/landslide.png";

//import "../../DashboardMapPage.css";
import "./DbMapLegends.css";

import { getIncidentCategories } from "../../../../constants"

interface MapLegendsProps {
  activeLayers: string[];
}

const MapLegends: React.FC<MapLegendsProps> = ({ activeLayers }) => {
  const [floodVisible, setFloodVisible] = React.useState(true);
  const [landslideVisible, setLandslideVisible] = React.useState(true);
  const [evacVisible, setEvacVisible] = React.useState(true);
  const [reportsVisible, setReportsVisible] = React.useState(true);
  
  return (
    <div className="map-legends-container">
      {/* Flood Zone Legend */}
      {activeLayers.includes("Flood Zones") && (
        <div className="flood-zone-legend">
          <div
            className="legend-header"
            onClick={(e) => {
              e.stopPropagation();
              setFloodVisible(prev => !prev);
            }}
          >
            <h4>
              <img src={floodZoneIcon} alt="Flood Zone" className="flood-legend-icon" /> 
              Flood Hazard Map (LiPAD)
            </h4>
          </div>
          {floodVisible && (
            <>
              <div className="flood-legend-subtitle">
                City of Cabuyao, Laguna · Source: LiPAD LiDAR Portal (UP DREAM)
              </div>
              <ul>
                <li className="municipal-boundary">
                  <span className="legend-color"></span>
                  <span className="legend-text">Municipal Boundary</span>
                </li>
                <li className="high">
                  <span className="legend-color"></span>
                  <span className="legend-text">High Flood Hazard</span>
                </li>
                <li className="moderate">
                  <span className="legend-color"></span>
                  <span className="legend-text">Medium Flood Hazard</span>
                </li>
                <li className="low">
                  <span className="legend-color"></span>
                  <span className="legend-text">Low Flood Hazard</span>
                </li>
                <li className="area-assessed">
                  <span className="legend-color"></span>
                  <span className="legend-text">Area Assessed</span>
                </li>
                <li className="area-not-assessed">
                  <span className="legend-color"></span>
                  <span className="legend-text">Area Not Assessed</span>
                </li>
              </ul>
            </>
          )}
        </div>
      )}

      {/* Landslide Risk Legend */}
      {activeLayers.includes("Landslide Risk") && (
        <div className="landslide-risk-legend">
          <div
            className="legend-header"
            onClick={(e) => {
              e.stopPropagation();
              setLandslideVisible(prev => !prev);
            }}
          >
            <h4>
              <img
              src={landslideIcon}
              alt="Landslide"
              className="landslide-legend-icon"
              />
              {" "}Earthquake‑Induced Landslide Hazard
            </h4>
          </div>

          {landslideVisible && (
            <>
              <div className="landslide-legend-subtitle">
                Cabuyao, Laguna · Official landslide hazard map
              </div>
              <ul>
                <li className="high">
                  <span className="legend-color"></span>
                  <span className="legend-text">High Susceptibility</span>
                </li>
                <li className="moderate">
                  <span className="legend-color"></span>
                  <span className="legend-text">Moderate Susceptibility</span>
                </li>
                <li className="low">
                  <span className="legend-color"></span>
                  <span className="legend-text">Low Susceptibility</span>
                </li>
              </ul>
              <div className="landslide-legend-note">
                <span>💡</span>
                <span>Click on zones for details</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Evacuation Centers Legend */}
      {activeLayers.includes("Evacuation Centers") && (
        <div className="evac-centers-legend">
          <div
            className="legend-header"
            onClick={(e) => {
              e.stopPropagation();
              setEvacVisible(prev => !prev);
            }}
          >
            <h4>🆘 Evacuation Centers</h4>
          </div>

          {evacVisible&& (
            <>
              <div className="evac-legend-subtitle">Cabuyao, Laguna</div>
              <ul>
                <li className="school"><span className="legend-icon">🏫</span><span className="legend-text">School</span></li>
                <li className="covered-court"><span className="legend-icon">🏀</span><span className="legend-text">Covered Court</span></li>
                <li className="multi-purpose hall"><span className="legend-icon">🏛️</span><span className="legend-text">Multi-Purpose Hall</span></li>
                <li className="gymnasium"><span className="legend-icon">🏟️</span><span className="legend-text">Gymnasium</span></li>
              </ul>
              <div className="evac-legend-stats">
                <div className="stat-item">
                  <span className="stat-number">18</span>
                  <span className="stat-label">Sites</span>
                </div>
                {/*<div className="stat-item">
                  <span className="stat-number">6.5K+</span>
                  <span className="stat-label">Total Capacity</span>
                </div>*/}
              </div>
              <div className="evac-legend-note">
                <span>💡</span>
                <span>Click markers for details</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Hazard Locations Legend */}
      {activeLayers.includes("Verified Reports") && (
        <div className="flood-zone-legend">
          <div
            className="legend-header"
            onClick={(e) => {
              e.stopPropagation();
              setReportsVisible(prev => !prev);
            }}
          >
            <h4>⚠️ Hazard Locations Legend</h4>
          </div>

          {reportsVisible && (
            <>
              <div className="flood-legend-subtitle">
                Reported hazard incidents across Cabuyao City
              </div>

              <ul>
                {getIncidentCategories().map(category => (
                  <li key={category.value}>
                    <span className="legend-icon">{category.icon}</span>
                    <span className="legend-text">{category.label}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Roads Legend */}
      {/*activeLayers.includes("Roads") && (
        <div className="roads-legend">
            <h4
              onClick={(e) => {
                e.stopPropagation();
                toggleLegend("roads");
              }}
              style={{ cursor: "pointer" }}
            >🛣️ Roads & Bridges</h4>
            {visibleLegends.roads && (
              <>
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
              </>
            )}
        </div>
      )*/}
    </div>
  );
};

export default React.memo(MapLegends);
