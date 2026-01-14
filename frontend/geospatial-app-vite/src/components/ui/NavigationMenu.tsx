import React, { useEffect, useState } from "react";
import "./NavigationMenu.css";
import { useAuth } from "../../context/AuthContext";
{/*import HazspotLogo from '../../assets/?.png';*/ }
import { useNavigate, NavLink, useLocation, Link } from 'react-router-dom';
import { getUserRoleAndDisplayName, clearUserSession } from "../../libr/auth";


import type { IconType } from "react-icons";
import { FaMapMarkedAlt, FaBullhorn, FaShieldAlt, FaMapMarked } from "react-icons/fa";
import { MdReport, MdPlace, MdLogout, MdOutlineDashboard, MdOutlineMonitorHeart, MdKeyboardArrowUp } from "react-icons/md";
import { PiUsersBold } from "react-icons/pi";
import { TbFileReport } from "react-icons/tb";
import { FiEdit } from "react-icons/fi";


interface NavItem {
    label: string;
    path: string;
    icon?: IconType;
}

interface StoredUserRoles {
  primaryRole: string;
  secondaryRoles: string[];
}

const NavigationMenu: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const hideNavOn = ["/", "/login", "/signup", "/main/citizen-pwa/login"];

    if (hideNavOn.includes(location.pathname)) {
        return null;
    }

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const { user } = useAuth();
    const userRole = user?.role || "Citizen"; // !!! manual na pagpalit nalang muna
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // ===== Get user roles from localStorage =====
    const { userRole, displayName, profilePath } = getUserRoleAndDisplayName();

    console.log("Navigation Role (NavMenu):", userRole);
    console.log("Display Name (NavMenu):", displayName);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (userRole === "Citizen" && isMobile) {
        return (
            <div className="pwa-bottom-nav">
                <NavLink to="/main/citizen/alerts-map" className="pwa-nav-item">
                    <FaBullhorn size={22} />
                    <span>Alerts</span>
                </NavLink>

                <NavLink to="/main/citizen/prep-guide" className="pwa-nav-item">
                    <FaShieldAlt size={22} />
                    <span>Guides</span>
                </NavLink>

                <NavLink to="/main/citizen/evac-center" className="pwa-nav-item">
                    <MdPlace size={22} />
                    <span>Centers</span>
                </NavLink>

                <NavLink to={profilePath} className="pwa-nav-item">
                    <FaUser size={22} />
                    <span>Profile</span>
                </NavLink>
            </div>
        );
    }

    const navigationList: Record<string, NavItem[]> = {
        // User Role: Admin
        Admin: [
            { label: 'Dashboard', path: 'admin/dashboard', icon: MdOutlineDashboard  },
            { label: 'User Management', path: 'admin/manage-user', icon: PiUsersBold },
            { label: 'Reports Management', path: 'admin/manage-reports', icon: TbFileReport },
            { label: 'System Monitoring', path: 'admin/system-monitoring', icon: MdOutlineMonitorHeart  },
            { label: 'Content Management System', path: 'admin/cms', icon: FiEdit },
        ],
        // User Role: LGU Officer
        Officer: [
            { label: 'Dashboard & Map', path: 'officer/dashboard-map', icon: FaMapMarkedAlt },
            { label: 'Report Verification', path: 'officer/report-verify', icon: MdReport },
            { label: 'Evacuation Center', path: 'officer/evac-center', icon: MdPlace },
        ],
        // User Role: Researcher
        Researcher: [
            { label: 'Dashboard & Map', path: 'researcher/dashboard-map', icon: FaMapMarked  },
        ],
        // User Role: Citizen
        Citizen: [
            { label: 'Current Alerts & Map', path: 'citizen/alerts-map', icon: FaBullhorn },
            { label: 'Evacuation Center', path: 'citizen/evac-center', icon: MdPlace },
            { label: 'Preparedness Guide', path: 'citizen/prep-guide', icon: FaShieldAlt },
        ],
        // User Role: Guest
        Guest: [
            { label: 'Current Alerts & Map', path: 'guest/alerts-map', icon: FaBullhorn },
            { label: 'Evacuation Centers', path: 'guest/evac-center', icon: MdPlace },
            { label: 'Preparedness Guide', path: 'guest/prep-guide', icon: FaShieldAlt },
        ],
    };

    const navItems: NavItem[] = navigationList[userRole] || [];

    const handleLogout = () => {
        console.log("Logging out...");
        clearUserSession();
        navigate("/");
    }

    return (
        <div className={`navigation ${userRole === "Admin" ? "admin-nav" : ""}`}>
            <div className="header-logo">
                {navItems.length > 0 && (
                    <a href={`/main/${navItems[0].path}`}>
                        {/* Papalit nalang po ng Logo */}
                        {/*<img src={HazspotLogo} alt="HazSpotLogo" />*/}
                    </a>
                )}
            </div>
            <nav>
                {navItems.map(({ label, path, icon: Icon }, index) => (
                    <div
                        className={`nav-item ${userRole === "Admin" ? "admin-layout" : ""}`}
                        key={index}
                    >
                        <NavLink
                            to={`/main/${path}`}
                            className={({ isActive }) => (isActive ? 'active' : '')}
                        >
                            {Icon && <Icon className="nav-icon" />}
                            <span className="nav-label">{label}</span>
                        </NavLink>
                    </div>
                ))}
            </nav>

            {/* Profile Section with Dropdown */}
            <div 
                className={`user-profile-section ${userRole === "Admin" ? "admin-profile" : "user-profile"}`}
                ref={dropdownRef}
            >
                {/* Profile Dropdown Trigger */}
                <div 
                    className="profile-dropdown-trigger"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                    <div className="profile-circle">
                        {user?.username?.charAt(0).toUpperCase() || displayName.charAt(0).toUpperCase()}
                    </div>
                    <MdKeyboardArrowUp className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} />
                </div>

                {/* Dropdown Menu */}
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
                                {user?.username?.charAt(0).toUpperCase() || displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="dropdown-user-details">
                                <span className="dropdown-username">{user?.username || displayName}</span>
                                <span className="dropdown-role">{userRole}</span>
                            </div>
                        </div>
                        <div className="dropdown-divider"></div>
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