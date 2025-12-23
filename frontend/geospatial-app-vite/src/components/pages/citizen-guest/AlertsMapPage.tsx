// Current Alerts and Map Page (Citizen & Guest)
import React, { useState } from "react";
import "./AlertsMapPage.css";
import LeafletMap from "../../ui/LeafletMap";


interface Alert {
  id: number;
  message: string;
}

const AlertsMapPage: React.FC = () => {
    const alerts: Alert[] = [
        { id: 1, message: "Flash flood reported near residential area" },
        { id: 2, message: "Road blockage due to landslide" },
        { id: 3, message: "Small fire contained by local responders" },
    ];

    const [mapLayer, setMapLayer] = useState("default");

  return (
    <div className="main-layout-map">
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
        <div className="alerts-map">
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
              <li className="low">Low Risk</li>
              <li className="moderate">Moderate Risk</li>
              <li className="high">High Risk</li>
              <li className="critical">Critical Risk</li>
            </ul>
        </div>
      </div>
    </div>
  );
};

export default AlertsMapPage;
