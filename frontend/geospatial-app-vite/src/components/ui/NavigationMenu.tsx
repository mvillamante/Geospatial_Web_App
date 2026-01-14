import React, { useEffect, useState } from "react";
import "./NavigationMenu.css";
import { useAuth } from "../../utils/AuthContext";
{/*import HazspotLogo from '../../assets/?.png';*/ }
import { useNavigate, NavLink, useLocation, Link } from 'react-router-dom';
import type { IconType } from "react-icons";
import { FaUser, FaMapMarkedAlt, FaBullhorn, FaShieldAlt } from "react-icons/fa";
import { MdReport, MdPlace, MdLogout } from "react-icons/md";

interface NavItem {
    label: string;
    path: string;
    icon?: IconType;
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

    const profilePath = `/main/${userRole.toLowerCase()}/profile`;


    // For debugging
    console.log("Navigation Role (NavMenu):", userRole);

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
            { label: 'Dashboard', path: 'admin/dashboard', icon: "" },
            { label: 'User Management', path: 'admin/manage-user', icon: "" },
            { label: 'Reports Management', path: 'admin/manage-reports', icon: "" },
            { label: 'System Monitoring', path: 'admin/system-monitoring', icon: "" },
            { label: 'Content Management System', path: 'admin/cms', icon: "" },
        ],
        // User Role: LGU Officer
        Officer: [
            { label: 'Dashboard & Map', path: 'officer/dashboard-map', icon: FaMapMarkedAlt },
            { label: 'Report Verification', path: 'officer/report-verify', icon: MdReport },
            { label: 'Evacuation Center', path: 'officer/evac-center', icon: MdPlace },
        ],
        // User Role: Researcher
        Researcher: [
            { label: 'Dashboard & Map', path: 'researcher/dashboard-map', icon: "" },
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

            {/* Profile Section */}
            <div className={`user-profile-section ${userRole === "Admin" ? "admin-profile" : "user-profile"}`}>

                {userRole === "Admin" ? (
                    <>
                        {/* Admin: vertical stacked rows */}
                        <div className="profile-row">
                            <div
                                className="profile-circle"
                                onClick={() => navigate(profilePath)}
                                style={{ cursor: "pointer" }}
                                title="View Profile"
                            >
                                {user?.name?.charAt(0).toUpperCase() || userRole.charAt(0)}
                            </div>

                            <div className="profile-name">{user?.name || userRole}</div>
                        </div>
                        <div className="logout-row">
                            <button className="logout-btn" onClick={handleLogout}>
                                <MdLogout className="logout-icon" />
                            </button>
                            <span className="logout-label">Logout</span>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Default user: simple stacked */}
                        <div
                            className="profile-circle"
                            onClick={() => navigate(profilePath)}
                            style={{ cursor: "pointer" }}
                            title="View Profile"
                        >
                            {user?.name?.charAt(0).toUpperCase() || userRole.charAt(0)}
                        </div>
                        <button className="logout-btn" onClick={handleLogout}>
                            <MdLogout className="logout-icon" />
                        </button>
                    </>
                )}

            </div>

        </div>
    );

};
export default NavigationMenu;