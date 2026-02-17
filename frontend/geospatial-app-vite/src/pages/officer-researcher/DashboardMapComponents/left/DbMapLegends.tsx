import React from "react";
import floodZoneIcon from "../../../../assets/icons/floodzone.png";
import landslideIcon from "../../../../assets/icons/landslide.png";

//import "../../DashboardMapPage.css";
import "./DbMapLegends.css";

interface MapLegendsProps {
  activeLayers: string[];
}

const MapLegends: React.FC<MapLegendsProps> = ({ activeLayers }) => {
  return (
    <div className="map-legends-container">
      {/* Flood Zone Legend */}
      {activeLayers.includes("Flood Zones") && (
        <div className="flood-zone-legend">
          <h4>
            <img src={floodZoneIcon} alt="Flood Zone" className="flood-legend-icon" /> 
            Flood Zone Legend
          </h4>
          <div className="flood-legend-subtitle">Cabuyao, Laguna</div>
          <ul>
            <li className="high"><span className="legend-color"></span><span className="legend-text">High Risk Zone</span></li>
            <li className="moderate"><span className="legend-color"></span><span className="legend-text">Moderate Risk Zone</span></li>
            <li className="low"><span className="legend-color"></span><span className="legend-text">Low Risk Zone</span></li>
          </ul>
          <div className="flood-legend-note"><span>💡</span><span>Click on zones for details</span></div>
        </div>
      )}

      {/* Landslide Risk Legend */}
      {activeLayers.includes("Landslide Risk") && (
        <div className="landslide-risk-legend">
          <h4><img src={landslideIcon} alt="Landslide" className="landslide-legend-icon" /> Landslide Risk Legend</h4>
          <div className="landslide-legend-subtitle">Cabuyao, Laguna</div>
          <ul>
            <li className="high"><span className="legend-color"></span><span className="legend-text">High Risk Zone</span></li>
            <li className="moderate"><span className="legend-color"></span><span className="legend-text">Moderate Risk Zone</span></li>
            <li className="low"><span className="legend-color"></span><span className="legend-text">Low Risk Zone</span></li>
          </ul>
          <div className="landslide-legend-note"><span>💡</span><span>Click on zones for details</span></div>
        </div>
      )}

      {/* Evacuation Centers Legend */}
      {activeLayers.includes("Evacuation Centers") && (
        <div className="evac-centers-legend">
          <h4>🆘 Evacuation Centers</h4>
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

      {/* Roads Legend */}
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
  );
};

export default MapLegends;
