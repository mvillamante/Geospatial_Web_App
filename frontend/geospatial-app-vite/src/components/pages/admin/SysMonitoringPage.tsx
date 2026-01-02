import React from "react";
import { useState } from "react";
import './SysMonitoringPage.css';
import { IoMdCheckmarkCircleOutline, IoMdCloseCircleOutline } from "react-icons/io";
import { LuClock4, LuUsersRound } from "react-icons/lu";
import { FaChartLine } from "react-icons/fa";

interface SysStatus {
  id: number;
  component: string;
  status: string;
}

interface DataItem {
  item: string;
  lastTime: string;
}

const mockSysStat: SysStatus[] = [
  {
    id: 1, component: 'Weather API', status: 'Online'
  },
  {
    id: 2, component: 'Geospatial Maps', status: 'Offline'
  },
  {
    id: 3, component: 'Database', status: 'Online'
  },
  {
    id: 4, component: 'Notification Service', status: 'Offline'
  },
];

const mockDataItem: DataItem[] = [
  {
    item: 'Hazard Risk Data', lastTime: '2 hours ago'
  },
  {
    item: 'Sustainability Index', lastTime: '1 day ago'
  },
  {
    item: 'Forecast Model', lastTime: '3 days ago'
  },
];

const recentActivity = [
  {
    user: "Juan Cruz",
    action: "Reported flood hazard",
    location: "Banay-Banay",
    time: "10 mins ago",
  },
  {
    user: "Maria Santos",
    action: "Downloaded dataset",
    location: "System",
    time: "25 mins ago",
  },
  {
    user: "Pedro Reyes",
    action: "Requested researcher access",
    location: "Profile",
    time: "1 hour ago",
  },
  {
    user: "Ana Garcia",
    action: "Viewed evacuation centers",
    location: "Marinig",
    time: "2 hours ago",
  },
  {
    user: "Carlos Mendoza",
    action: "Reported landslide",
    location: "Pulong Sagingan",
    time: "3 hours ago",
  },
];


const SysMonitoringPage: React.FC = () => {
  const [sysStat, setSysStat] = useState(mockSysStat);
  const [dataItem, setDataItem] = useState(mockDataItem);

  return (
    <div className="sys-page"> 
      <h1>System Monitoring</h1>

      <div className="group-rowcard">
        {/* System Status Card */}
        <div className="card">
          <h3>System Status</h3>

          <table className="reports-table">
            <thead>
              <tr>
                <th>Component</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {sysStat.map(stat => (
                <tr key={stat.component}>
                  <td className="table-id">{stat.component}</td>
                  <td
                    className={`table-w-icon ${
                      stat.status === "Online" ? "clr-green" : "clr-red"
                    }`}
                  >
                    {stat.status === "Online" ? (
                      <IoMdCheckmarkCircleOutline />
                    ) : (
                      <IoMdCloseCircleOutline />
                    )}
                    {stat.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CPU Usage Card */}
        <div className="card">
          <h3>Data / Model Refresh</h3>

          <table className="reports-table">
            <thead>
              <tr>
                <th>Item</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {dataItem.map(item => (
                <tr key={item.item}>
                  <td className="table-id">{item.item}</td>
                  <td className="table-w-icon"><LuClock4 className="clr-gray" /> {item.lastTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Health Card */}
      <div className="card">
        <h3>System Health</h3>

        <div className="health-grid">
          <div className="health-item">
            <div className="health-icon green"><FaChartLine /></div>
            <div>
              <p className="health-label">Uptime</p>
              <h4>99+%</h4>
            </div>
          </div>

          <div className="health-item">
            <div className="health-icon blue"><IoMdCheckmarkCircleOutline /></div>
            <div>
              <p className="health-label">Status</p>
              <h4>No active errors</h4>
            </div>
          </div>

          <div className="health-item">
            <div className="health-icon purple"><LuClock4 /></div>
            <div>
              <p className="health-label">Next Refresh</p>
              <h4>Tonight 12:00 AM</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Card */}
      <div className="card activity-history">
        <h3>Recent User Activity</h3>

        <div className="activity-list">
          {recentActivity.map((act, index) => (
            <div key={index} className="activity-item">
              <div className="activity-avatar clr-blue"><LuUsersRound /></div>

              <div className="activity-text">
                <p>
                  <strong>{act.user}</strong>. {act.action}
                </p>
                <span>
                  {act.location} • {act.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SysMonitoringPage;

