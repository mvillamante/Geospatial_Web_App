import "./NavigationMenu.css";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { getUserRoleAndDisplayName, clearUserSession } from "../../../libr/auth";
import { MdArrowBack } from "react-icons/md";
import type { IconType } from "react-icons";
import { FaHome, FaCog, FaUser, FaMapMarkedAlt, FaBullhorn, FaMapMarked, FaBell } from "react-icons/fa";
import { FaHouseUser } from "react-icons/fa6";
import { MdReport, MdLogout, MdOutlineDashboard, MdKeyboardArrowUp } from "react-icons/md";
import { PiUsersBold } from "react-icons/pi";
import { TbFileReport } from "react-icons/tb";
import { FiEdit } from "react-icons/fi";


const API_URL = import.meta.env.VITE_API_URL;

interface NavItem {
  label: string;
  path: string;
  icon?: IconType;
}

const NavigationMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [notificationCount, setNotificationCount] = useState(0);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  const { userRole, displayName, profilePath, settingsPath } = getUserRoleAndDisplayName();

  const effectiveRole = (userRole.includes("Researcher") ? "Researcher" : "") || userRole;



  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hideNavOn = ["/", "/login", "/signup", "/main/citizen-pwa/login"];
  if (hideNavOn.includes(location.pathname)) return null;

  const isGuestRoute = location.pathname.startsWith("/main/guest");
  if (!userRole && !isGuestRoute) return null;

  const isPublicRoute =
    location.pathname.startsWith("/main/citizen") ||
    location.pathname.startsWith("/main/guest");

  const isPublicUser = ["Citizen", "Guest"].includes(effectiveRole);

  const basePath = effectiveRole === "Guest" ? "guest" : "citizen";

  useEffect(() => {
    if (effectiveRole !== "Citizen") return;

    const fetchUnreadCount = async () => {
      try {
        const res = await fetch(`${API_URL}/api/notifications/unread-count/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });

        if (!res.ok) return;

        const data = await res.json();
        setNotificationCount(data.unread_count ?? 0);

      } catch (err) {
        console.error("Unread count error:", err);
      }
    };

    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 15000);

    const handler = () => fetchUnreadCount();
    window.addEventListener("notificationsUpdated", handler);

    return () => {
      clearInterval(interval);
      window.removeEventListener("notificationsUpdated", handler);
    };

  }, [effectiveRole]);

  if (isPublicUser && isMobile && isPublicRoute) {
    return (
      <div className="pwa-bottom-nav">
        <NavLink
          to={`/main/${basePath}/community-feed`}
          className={({ isActive }) => `pwa-nav-item ${isActive ? "active" : ""}`}
        >
          <FaBullhorn size={22} />
          <span>Home</span>
        </NavLink>

        <NavLink
          to={`/main/${basePath}/alerts-map`}
          className={({ isActive }) => `pwa-nav-item ${isActive ? "active" : ""}`}
        >
          <FaMapMarkedAlt size={22} />
          <span>Map</span>
        </NavLink>

        {effectiveRole === "Citizen" && (
          <NavLink
            to={`/main/${basePath}/notifications`}
            className={({ isActive }) => `pwa-nav-item ${isActive ? "active" : ""}`}
          >
            <span className="pwa-icon-wrap">
              <FaBell size={22} />
              {notificationCount > 0 && (
                <span className="pwa-badge">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </span>
            <span>Alerts</span>
          </NavLink>
        )}

        <NavLink
          to={`/main/${basePath}/evac-center`}
          className={({ isActive }) => `pwa-nav-item ${isActive ? "active" : ""}`}
        >
          <FaHouseUser size={22} />
          <span>Centers</span>
        </NavLink>

        {effectiveRole === "Citizen" && (
          <NavLink
            to={profilePath}
            className={({ isActive }) => `pwa-nav-item ${isActive ? "active" : ""}`}
          >
            <FaUser size={22} />
            <span>Profile</span>
          </NavLink>
        )}
      </div>
    );
  }

  const navigationList: Record<string, NavItem[]> = {
    Admin: [
      { label: "Dashboard", path: "admin/dashboard", icon: MdOutlineDashboard },
      { label: "User Management", path: "admin/manage-user", icon: PiUsersBold },
      { label: "Reports Management", path: "admin/manage-reports", icon: TbFileReport },
      { label: "Content Management System", path: "admin/cms", icon: FiEdit },
    ],
    Officer: [
      { label: "Home", path: "officer/home", icon: FaHome },
      { label: "Dashboard & Map", path: "officer/dashboard-map", icon: FaMapMarkedAlt },
      { label: "Report Verification", path: "officer/report-verify", icon: MdReport },
      { label: "Evacuation Center", path: "officer/evac-center", icon: FaHouseUser },
    ],
    Researcher: [
      { label: "Home", path: "researcher/home", icon: FaHome },
      { label: "Dashboard & Map", path: "researcher/dashboard-map", icon: FaMapMarked }],
    Citizen: [
      { label: "Community Feed", path: "citizen/community-feed", icon: FaBullhorn },
      { label: "Reports & Map", path: "citizen/alerts-map", icon: FaMapMarkedAlt },
      { label: "Notifications", path: "citizen/notifications", icon: FaBell },
      { label: "Evacuation Center", path: "citizen/evac-center", icon: FaHouseUser },
    ],
    Guest: [
      { label: "Community Feed", path: "guest/community-feed", icon: FaBullhorn },
      { label: "Reports & Map", path: "guest/alerts-map", icon: FaMapMarkedAlt },
      { label: "Evacuation Center", path: "guest/evac-center", icon: FaHouseUser },
    ],
  };

  const isGuest = effectiveRole === "Guest";

  const navItems: NavItem[] = navigationList[effectiveRole] || [];

  const handleLogout = () => {
    clearUserSession();
    navigate("/");
  };

  return (
    <div className={`navigation ${effectiveRole === "Admin" ? "admin-nav" : ""}`}>
      {/*<div
        className={`nav-logo ${effectiveRole === "Admin" ? "admin-logo" : ""}`}
        onClick={() => navigate("/main/" + (effectiveRole === "Admin" ? "admin/dashboard" : "citizen/community-feed"))}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && navigate("/main/" + (effectiveRole === "Admin" ? "admin/dashboard" : "citizen/community-feed"))}
      >
        <img src="/hazspot-logo(2).png" alt="HazSpot logo" className="nav-logo-img" />
      </div>*/}
      {isGuest && (
        <div className="nav-item">
          <div className="guest-back-btn" onClick={() => navigate('/')}>
            <MdArrowBack size={22} />
          </div>
        </div>
      )}
      <nav>
        {navItems.map(({ label, path, icon: Icon }, index) => (
          <div className={`nav-item ${effectiveRole === "Admin" ? "admin-layout" : ""}`} key={index}>
            <NavLink to={`/main/${path}`} className={({ isActive }) => (isActive ? "active" : "")}>
              <span className="nav-icon-wrap">
                {Icon && <Icon className="nav-icon" />}
                {label === "Notifications" && notificationCount > 0 && (
                  <span className="nav-badge">{notificationCount > 99 ? "99+" : notificationCount}</span>
                )}
              </span>

              <span className="nav-label">{label}</span>
            </NavLink>
          </div>
        ))}
      </nav>

      {!isGuest && (
        <div
          className={`user-profile-section ${effectiveRole === "Admin" ? "admin-profile" : "user-profile"}`}
          ref={dropdownRef}
        >
          <div className="profile-dropdown-trigger" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <div className="profile-circle">
              {(user?.username || displayName)?.charAt(0).toUpperCase()}
            </div>
            <MdKeyboardArrowUp className={`dropdown-arrow ${isDropdownOpen ? "open" : ""}`} />
          </div>

          {isDropdownOpen && (
            <div className="profile-dropdown-menu">
              <div
                className="dropdown-profile-info"
              >
                <div className="dropdown-avatar">
                  {(user?.username || displayName)?.charAt(0).toUpperCase()}
                </div>
                <div className="dropdown-user-details">
                  <span className="dropdown-username">{user?.username || displayName}</span>
                  <span className="dropdown-role">
                    {effectiveRole}
                  </span>
                </div>
              </div>

              <div className="dropdown-divider" />
              <button
                className="dropdown-menu-btn"
                onClick={() => {
                  navigate(profilePath);
                  setIsDropdownOpen(false);
                }}
              >
                <FaUser className="dropdown-menu-icon" />
                <span>My Profile</span>
              </button>

              <button
                className="dropdown-menu-btn"
                onClick={() => {
                  navigate((settingsPath));
                  setIsDropdownOpen(false);
                }}
              >
                <FaCog className="dropdown-menu-icon" />
                <span>Settings</span>
              </button>

              <button
                className="dropdown-logout-btn"
                onClick={() => {
                  setIsDropdownOpen(false);
                  setShowLogoutModal(true);
                }}
              >
                <MdLogout className="dropdown-logout-icon" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      )}
      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Logout</h3>
            <p>Are you sure you want to log out of your account?</p>

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>

              <button
                className="danger-confirm"
                onClick={() => {
                  setShowLogoutModal(false);
                  handleLogout();
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationMenu;
