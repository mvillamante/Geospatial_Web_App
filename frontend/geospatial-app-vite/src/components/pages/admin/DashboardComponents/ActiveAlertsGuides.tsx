import { AlertTriangle, Book, BookOpen } from "lucide-react";
import './ActiveAlertsGuides.css';

interface Alert {
  id: string;
  title: string;
}

interface Guide {
  id: string;
  title: string;
  views: number;
}

const mockAlerts: Alert[] = [
  { id: "1", title: "Critical fire in Brgy Pulo. Change route if possible" },
  { id: "2", title: "Eto na nga may banggaan dyan yan sha" },
  { id: "3", title: "May lindol din dyan sa tabi" },
];

const mockGuides: Guide[] = [
  { id: "1", title: "Fire Safety Procedures", views: 1234 },
  { id: "2", title: "Flood Preparedness", views: 876 },
  { id: "3", title: "Emergency Evacuation", views: 2341 },
];

export function ActiveAlertsGuides() {
  return (
    <div className="alerts-card">
      <h2 className="alerts-title">Active Alerts & Guides</h2>
      <section className="alerts-section">
        <div className="section-header">
          <AlertTriangle className="section-icon" />
          <h3>Active Alerts ({mockAlerts.length})</h3>
        </div>

        <ul className="alerts-list">
          {mockAlerts.map((alert) => (
            <li key={alert.id} className="alert-item">
              {alert.title}
            </li>
          ))}
        </ul>
      </section>

      {/* Guides */}
      <section className="guides-section">
        <div className="section-header">
          <BookOpen className="section-icon" />
          <h3>Published Guides ({mockGuides.length})</h3>
        </div>

        <ul className="guides-list">
          {mockGuides.map((guide) => (
            <li key={guide.id} className="guide-item">
              <span>{guide.title}</span>
              <span className="guide-views">{guide.views} views</span>
            </li>
          ))}
        </ul>
      </section>
    </div>


  );
}
