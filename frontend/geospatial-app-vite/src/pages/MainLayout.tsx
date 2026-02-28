// Main Layout for all Users (navigations, tabs, map...etc)
import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
// import { Bell } from "lucide-react";
import { NavigationMenu } from "../components";
// import { getUserRoleAndDisplayName } from "../libr/auth";
import "./MainLayout.css";

import NavHeader from "../components/ui/NavHeader";

type AppNotifType = "post" | "verified_incident" | "my_report" | "evac_center";

type AppNotif = {
  id: string | number;
  type: AppNotifType;
  title: string;
  message?: string;
  created_at: string;
  read: boolean;
};

const MainLayout: React.FC = () => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotif[]>([]);

  useEffect(() => {
    //Mock 
    setNotifs([
      {
        id: 1,
        type: "post",
        title: "New Advisory Posted",
        message: "Severe Thunderstorm Warning Issued",
        created_at: new Date().toISOString(),
        read: false,
      },
      {
        id: 2,
        type: "my_report",
        title: "Your report status changed",
        message: "Marked as In Progress",
        created_at: new Date(Date.now() - 40 * 60000).toISOString(),
        read: true,
      },
    ]);
  }, []);

  // const unreadCount = notifs.filter((n) => !n.read).length;

  // const { userRole, userRole2 } = getUserRoleAndDisplayName();

  return (
    <div className="main-layout">
      {/* Navigation */}
      <NavigationMenu />

      {/* App column */}
      <div className="main-layout-app"> 
        {/* Header */}
        <NavHeader />

        {/* Content */}
        <div className="main-content">
          <Outlet />
        </div>
      </div>

      {/* Notification Drawer */}
      {notifOpen && (
        <div className="notif-backdrop" onClick={() => setNotifOpen(false)}>
          <div className="notif-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="notif-drawer-head">
              <div className="notif-title">Notifications</div>
              <button className="notif-close" onClick={() => setNotifOpen(false)} type="button">
                ✕
              </button>
            </div>

            {notifs.length === 0 ? (
              <div className="notif-empty">No notifications yet.</div>
            ) : (
              <ul className="notif-list">
                {notifs.map((n) => (
                  <li key={n.id} className={`notif-item ${n.read ? "read" : "unread"}`}>
                    <div className="notif-item-title">{n.title}</div>
                    {n.message ? <div className="notif-item-msg">{n.message}</div> : null}
                    <div className="notif-item-time">
                      {new Date(n.created_at).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;
