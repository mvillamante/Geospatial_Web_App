import "./NavigationMenu.css";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { getUserRoleAndDisplayName, clearUserSession } from "../../libr/auth";

import type { IconType } from "react-icons";
import { FaUser, FaMapMarkedAlt, FaBullhorn, FaShieldAlt, FaMapMarked } from "react-icons/fa";
import { MdReport, MdPlace, MdLogout, MdOutlineDashboard, MdOutlineMonitorHeart, MdKeyboardArrowUp } from "react-icons/md";
import { PiUsersBold } from "react-icons/pi";
import { TbFileReport } from "react-icons/tb";
import { FiEdit } from "react-icons/fi";

interface NavItem {
  label: string;
  path: string;
  icon?: IconType;
}

const NavigationMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  const { userRole, userRole2, displayName, profilePath } = getUserRoleAndDisplayName();

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

  const isCitizenRoute = location.pathname.startsWith("/main/citizen");
  if (userRole === "Citizen" && isMobile && isCitizenRoute) {
    return (
      <div className="pwa-bottom-nav">
        <NavLink
          to="/main/citizen/community-feed"
          className={({ isActive }) => `pwa-nav-item ${isActive ? "active" : ""}`}
        >
          <FaBullhorn size={22} />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/main/citizen/alerts-map"
          className={({ isActive }) => `pwa-nav-item ${isActive ? "active" : ""}`}
        >
          <FaMapMarkedAlt size={22} />
          <span>Map</span>
        </NavLink>

        <NavLink
          to="/main/citizen/evac-center"
          className={({ isActive }) => `pwa-nav-item ${isActive ? "active" : ""}`}
        >
          <MdPlace size={22} />
          <span>Centers</span>
        </NavLink>

        <NavLink
          to={profilePath}
          className={({ isActive }) => `pwa-nav-item ${isActive ? "active" : ""}`}
        >
          <FaUser size={22} />
          <span>Profile</span>
        </NavLink>
      </div>
    );
  }

  const navigationList: Record<string, NavItem[]> = {
    Admin: [
      { label: "Dashboard", path: "admin/dashboard", icon: MdOutlineDashboard },
      { label: "User Management", path: "admin/manage-user", icon: PiUsersBold },
      { label: "Reports Management", path: "admin/manage-reports", icon: TbFileReport },
      // { label: "System Monitoring", path: "admin/system-monitoring", icon: MdOutlineMonitorHeart },
      { label: "Content Management System", path: "admin/cms", icon: FiEdit },
    ],
    Officer: [
      { label: "Dashboard & Map", path: "officer/dashboard-map", icon: FaMapMarkedAlt },
      { label: "Report Verification", path: "officer/report-verify", icon: MdReport },
      { label: "Evacuation Center", path: "officer/evac-center", icon: MdPlace },
    ],
    Researcher: [{ label: "Dashboard & Map", path: "researcher/dashboard-map", icon: FaMapMarked }],
    Citizen: [
      { label: "Community Feed", path: "citizen/community-feed", icon: FaBullhorn },
      { label: "Reports & Map", path: "citizen/alerts-map", icon: FaMapMarkedAlt },
      { label: "Evacuation Center", path: "citizen/evac-center", icon: MdPlace },
    ],
    Guest: [
      { label: "Community Feed", path: "guest/community-feed", icon: FaBullhorn },
      { label: "Reports & Map", path: "guest/alerts-map", icon: FaMapMarkedAlt },
      { label: "Evacuation Center", path: "guest/evac-center", icon: MdPlace },
    ],
  };

  const effectiveRole = (userRole2.includes("Researcher") ? "Researcher" : "") || userRole;

  const navItems: NavItem[] = navigationList[effectiveRole] || [];

  const handleLogout = () => {
    clearUserSession();
    navigate("/");
  };

  return (
    <div className={`navigation ${effectiveRole === "Admin" ? "admin-nav" : ""}`}>
      {/* <div
        className={`nav-logo ${effectiveRole === "Admin" ? "admin-logo" : ""}`}
        onClick={() => navigate("/main/" + (effectiveRole === "Admin" ? "admin/dashboard" : "citizen/community-feed"))}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && navigate("/main/" + (effectiveRole === "Admin" ? "admin/dashboard" : "citizen/community-feed"))}
      >
        <img src="/test-hazspot.png" alt="HazSpot logo" className="nav-logo-img" /> 
        <span className="nav-logo-text">H<span>S</span></span>
      </div> */}

      <nav>
        {navItems.map(({ label, path, icon: Icon }, index) => (
          <div className={`nav-item ${effectiveRole === "Admin" ? "admin-layout" : ""}`} key={index}>
            <NavLink to={`/main/${path}`} className={({ isActive }) => (isActive ? "active" : "")}>
              {Icon && <Icon className="nav-icon" />}
              <span className="nav-label">{label}</span>
            </NavLink>
          </div>
        ))}
      </nav>

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
              onClick={() => {
                navigate(profilePath);
                setIsDropdownOpen(false);
              }}
            >
              <div className="dropdown-avatar">
                {(user?.username || displayName)?.charAt(0).toUpperCase()}
              </div>
              <div className="dropdown-user-details">
                <span className="dropdown-username">{user?.username || displayName}</span>
                <span className="dropdown-role">
                  {userRole}
                  {userRole2?.[0] ? ` & ${userRole2[0]}` : ""}
                </span>
              </div>
            </div>

            <div className="dropdown-divider" />
            <button className="dropdown-logout-btn" onClick={handleLogout}>
              <MdLogout className="dropdown-logout-icon" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavigationMenu;
