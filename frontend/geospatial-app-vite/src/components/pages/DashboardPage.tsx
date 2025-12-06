// Main Dashboard shareable by all users after login
import React, { useState } from "react";
import "../styles/dashboardpage.css";
import { LeafletMap } from ".";

interface Alert {
  id: number;
  message: string;
}

const DashboardPage: React.FC = () => {
    const alerts: Alert[] = [
        { id: 1, message: "Flash flood reported near residential area" },
        { id: 2, message: "Road blockage due to landslide" },
        { id: 3, message: "Small fire contained by local responders" },
    ];

    const [mapLayer, setMapLayer] = useState("default");

  return (
    <>
      <div className="dashboard-container">
        {/* Alerts Panel */}
        <aside className="dashboard-alerts">
          <h3>Current Alerts</h3>
          <ul>
            {alerts.map((alert) => (
              <li key={alert.id}>{alert.message}</li>
            ))}
          </ul>
        </aside>
        {/* Map Component */}
        <div className="dashboard-map">
          <LeafletMap height="100vh" />
        </div>

        {/* Layer Selector */}
        <div className="map-layer-box">
            <label>Map Layer:</label>
            <select value={mapLayer} onChange={(e) => setMapLayer(e.target.value)}>
            <option value="default">Standard</option>
            <option value="satellite">Satellite</option>
            <option value="terrain">Terrain</option>
            </select>
        </div>
        
        {/* Legends Floating Tab */}
        <div className="map-legend-box">
            <h4>Severity Level</h4>
            <ul>
              <li>High Risk</li>
              <li>Medium Risk</li>
              <li>Low Risk</li>
            </ul>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
