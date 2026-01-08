// NavigationMenu
import "./NavigationMenu.css";
import { useAuth } from "../../context/AuthContext";
{/*import HazspotLogo from '../../assets/?.png';*/ }
import { useNavigate, NavLink } from 'react-router-dom';
import { getUserRoleAndDisplayName, clearUserSession } from "../../lib/auth";


import type { IconType } from "react-icons";
import { FaUser, FaMapMarkedAlt, FaBullhorn, FaShieldAlt, FaMapMarked } from "react-icons/fa";
import { MdReport, MdPlace, MdLogout, MdOutlineDashboard, MdOutlineMonitorHeart } from "react-icons/md";
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
    const { user } = useAuth();

    // ===== Get user roles from localStorage =====
    const { userRole, displayName, profilePath } = getUserRoleAndDisplayName();

    console.log("Navigation Role (NavMenu):", userRole);
    console.log("Display Name (NavMenu):", displayName);

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
                                title={displayName}
                            >
                                {displayName.charAt(0).toUpperCase()}
                            </div>

                            <div className="profile-name">{user?.username || userRole}</div>
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
                            {user?.username?.charAt(0).toUpperCase() || userRole.charAt(0)}
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