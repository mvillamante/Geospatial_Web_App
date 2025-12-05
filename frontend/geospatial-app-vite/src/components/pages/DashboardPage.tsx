// Main Dashboard shareable by all users after login
import React from "react";
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

  return (
    <>
      <div className="dashboard-container">
        {/* Map Component */}
        <div className="dashboard-map">
          <LeafletMap />
        </div>

        {/* Alerts Panel */}
        <aside className="dashboard-alerts">
          <h3>Current Alerts</h3>
          <ul>
            {alerts.map((alert) => (
              <li key={alert.id}>{alert.message}</li>
            ))}
          </ul>
        </aside>
      </div>

      {/* CSS just convert to Tailwind later */}
      <style>{`
        .dashboard-container {
          display: flex;
          gap: 16px;
          padding: 16px;
        }
        .dashboard-map {
          width: 65%;
          height: 100%;
        }
        .dashboard-alerts {
          flex: 1;
          width: 33%;
          background-color: #f3f4f6;
          padding: 16px;
          border-radius: 8px;
          overflow-y: auto;
        }
        .dashboard-alerts h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .dashboard-alerts ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .dashboard-alerts li {
          padding: 8px;
          background-color: #fee2e2;
          color: #b91c1c;
          border-radius: 4px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          margin-bottom: 8px;
        }
      `}</style>
    </>
  );
};

export default DashboardPage;
