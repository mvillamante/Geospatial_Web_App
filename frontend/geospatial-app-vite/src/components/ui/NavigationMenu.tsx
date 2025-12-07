// NavigationMenu
//import { useUserRole, ROLES } from '../UserRoleContext';
import "./NavigationMenu.css";
{/*import HazspotLogo from '../../assets/?.png';*/}
import { NavLink } from 'react-router-dom';
import type { IconType } from "react-icons";
import { FaUser } from "react-icons/fa";
import { } from "react-icons/fa6";

interface NavItem {
  label: string;
  path: string;
  icon?: IconType;
}

const NavigationMenu: React.FC = () => {
    //const { userRole } = userRole();

    const userRole = "Citizen"; // !!! manual user role for testing muna
    console.log("Navigation:", userRole);

    const navigationList = {
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
            { label: 'Dashboard & Map', path: 'officer/dashboard-map', icon: "" },
            { label: 'Report Verification', path: 'officer/report-verify', icon: "" },
            { label: 'Evacuation Centers', path: 'officer/evac-center', icon: "" },
        ],
        // User Role: Researcher
        Researcher: [
            { label: 'Dashboard & Map', path: 'researcher/dashboard-map', icon: "" },
        ],
        // User Role: Citizen
        Citizen: [
            { label: 'Current Alerts & Map', path: 'citizen/alerts-map', icon: "" },
            { label: 'Report Hazard', path: 'citizen/report-hazard', icon: "" },
            { label: 'Evacuation Centers', path: 'citizen/evac-center', icon: "" },
            { label: 'Preparedness Guide', path: 'citizen/prep-guide', icon: "" },
            { label: 'My Profile', path: 'citizen/profile', icon: FaUser },
        ],
        // User Role: Guest
        Guest: [
            { label: 'Current Alerts & Map', path: 'guest/alerts-map', icon: "" },
            { label: 'Evacuation Centers', path: 'guest/evac-center', icon: "" },
            { label: 'Preparedness Guide', path: 'guest/prep-guide', icon: "" },
        ],
    };

    const navItems: NavItem[] = navigationList[userRole] || [];

    return (
        <div className="navigation">
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
                <div className="nav-item" key={index}>
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
        </div>
    );

};
export default NavigationMenu;