import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MdArrowBack } from "react-icons/md";
import "./NavHeader.css";

const NavHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isGuestRoute = location.pathname.startsWith("/main/guest");

  const pageHeaders: Record<string, { title: string; subtitle: string }> = {
    "/main/admin/dashboard": {
      title: "Admin Dashboard",
      subtitle: "System overview and analytics",
    },
    "/main/admin/manage-user": {
      title: "User Management",
      subtitle: "Manage and monitor system users",
    },
    "/main/admin/manage-reports": {
      title: "Reports Management",
      subtitle: "Review and moderate submitted reports",
    },
    "/main/admin/cms": {
      title: "Content Management",
      subtitle: "Manage announcements and content",
    },
    "/main/officer/home": {
      title: "Home",
      subtitle: "Overview of hazard conditions and environmental indicators",
    },
    "/main/officer/dashboard-map": {
      title: "Dashboard & Map",
      subtitle: "Geospatial analytics integration of multi-factor hazard and environmental data",
    },
    "/main/officer/report-verify": {
      title: "Report Verification",
      subtitle: "Review, validate, and update citizen hazard reports",
    },
    "/main/officer/evac-center": {
      title: "Evacuation Centers",
      subtitle: "Manage evacuation center locations across Cabuyao",
    },
    "/main/researcher/home": {
      title: "Home",
      subtitle: "Overview of hazard conditions and environmental indicators",
    },
    "/main/researcher/dashboard-map": {
      title: "Dashboard & Map",
      subtitle: "Geospatial analytics integration of multi-factor hazard and environmental data.",
    },
    "/main/citizen/community-feed": {
      title: "Community Feed",
      subtitle: "Latest advisories, announcements, and guides",
    },
    "/main/citizen/alerts-map": {
      title: "Reports & Map",
      subtitle: "Verified incident reports and hazard map",
    },
    "/main/citizen/notifications": {
      title: "Notifications",
      subtitle: "Updates from LGU, verified hazards, and your report status",
    },
    "/main/citizen/evac-center": {
      title: "Evacuation Centers",
      subtitle: "Nearby evacuation centers and directions",
    },
    "/main/guest/community-feed": {
      title: "Community Feed",
      subtitle: "Latest advisories, announcements, and guides",
    },
    "/main/guest/alerts-map": {
      title: "Reports & Map",
      subtitle: "Verified incident reports and hazard map",
    },
    "/main/guest/evac-center": {
      title: "Evacuation Centers",
      subtitle: "Nearby evacuation centers and directions",
    },
    "/main/admin/profile": {
      title: "Profile",
      subtitle: "Manage your account information",
    },
    "/main/admin/settings": {
      title: "Settings",
      subtitle: "Manage your account preferences, notifications, and privacy settings",
    },
    "/main/officer/profile": {
      title: "Profile",
      subtitle: "Manage your account information",
    },
    "/main/officer/settings": {
      title: "Settings",
      subtitle: "Manage your account preferences, notifications, and privacy settings",
    },
    "/main/researcher/profile": {
      title: "Profile",
      subtitle: "Manage your account information",
    },
    "/main/researcher/settings": {
      title: "Settings",
      subtitle: "Manage your account preferences, notifications, and privacy settings",
    },
    "/main/citizen/profile": {
      title: "Profile",
      subtitle: "View your report history and manage your personal information",
    },
    "/main/citizen/settings": {
      title: "Settings",
      subtitle: "Manage your account preferences, notifications, and privacy settings",
    }
  };

  const currentHeader = pageHeaders[location.pathname] || {
    title: "HazSpot",
    subtitle: "Disaster Monitoring and Reporting System",
  };

  return (
    <header className="nav-header">
      <div className="nav-header-content">

        {isGuestRoute && (
          <button
            className="pwa-guest-back-btn"
            onClick={() => navigate("/")}
          >
            <MdArrowBack size={22} />
          </button>
        )}

        <div className="nav-header-text">
          <h1 className="nav-header-title">{currentHeader.title}</h1>
          <p className="nav-header-subtitle">{currentHeader.subtitle}</p>
        </div>

      </div>
    </header >
  );
};

export default NavHeader;