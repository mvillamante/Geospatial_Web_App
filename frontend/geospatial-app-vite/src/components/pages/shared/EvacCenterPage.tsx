import { useState } from 'react';
import { Search, MapPin, Phone, Navigation, Users } from 'lucide-react';
import { GrLocationPin } from "react-icons/gr";
import { getUserRoleAndDisplayName } from "../../../libr/auth";
import './EvacCenterPage.css';

interface EvacuationCenter {
  id: number;
  name: string;
  barangay: string;
  address: string;
  capacity: number;
  contact: string;
  coordinates: string;
}

const evacuationCenters: EvacuationCenter[] = [
  {
    id: 1,
    name: 'Cabuyao Elementary School',
    barangay: 'Barangay I (Poblacion)',
    address: 'National Road, Cabuyao City',
    capacity: 500,
    contact: '(049) 531-1234',
    coordinates: '14.2752, 121.1245'
  },
  {
    id: 2,
    name: 'Banay-Banay Covered Court',
    barangay: 'Barangay Banay-Banay',
    address: 'Brgy. Banay-Banay, Cabuyao City',
    capacity: 300,
    contact: '(049) 531-2345',
    coordinates: '14.2891, 121.1356'
  },
  {
    id: 3,
    name: 'Mamatid Multi-Purpose Hall',
    barangay: 'Barangay Mamatid',
    address: 'Mamatid Road, Cabuyao City',
    capacity: 400,
    contact: '(049) 531-3456',
    coordinates: '14.2634, 121.1189'
  },
  {
    id: 4,
    name: 'Marinig Barangay Hall',
    barangay: 'Barangay Marinig',
    address: 'Brgy. Marinig, Cabuyao City',
    capacity: 250,
    contact: '(049) 531-4567',
    coordinates: '14.2812, 121.1423'
  },
  {
    id: 5,
    name: 'Pulo Gymnasium',
    barangay: 'Barangay Pulo',
    address: 'Brgy. Pulo, Cabuyao City',
    capacity: 600,
    contact: '(049) 531-5678',
    coordinates: '14.2698, 121.1267'
  }
];

function EvacCenterPage() {
  const [searchQuery, setSearchQuery] = useState<string>('');

  //get user role
  const { userRole, displayName, profilePath } = getUserRoleAndDisplayName();

  const handleGetDirections = (coordinates: string) => {
    const [lat, lng] = coordinates.split(', ');
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  // Filter evacuation centers based on search query
  const filteredCenters = evacuationCenters.filter(center => {
    const query = searchQuery.toLowerCase();
    return (
      center.name.toLowerCase().includes(query) ||
      center.barangay.toLowerCase().includes(query)
    );
  });

  return (
    <div className="evac-page">
      <div className="evac-header">
        <div className="evac-header-title">
          <MapPin className="evac-title-icon" />
          <h1>Evacuation Centers</h1>
        </div>
        
        <p className="evac-header-desc">
          {userRole === "Officer"
            ? "Manage evacuation center locations across Cabuyao"
            : userRole === "Researcher"
            ? "Find the nearest evacuation center in your barangay"
            : null}
        </p>
      </div>

      {userRole === "Officer" && (
        <div className="evac-grid">
          <div className="evac-card evac-stat-card">
            <div className="evac-stat-text">
              <h3>Total Centers</h3>
              <p className="evac-card-value">7</p>
            </div>
            <MapPin className="evac-card-icon" />
          </div>

          <div className="evac-card evac-stat-card">
            <div className="evac-stat-text">
              <h3>Barangays Covered</h3>
              <p className="evac-card-value">7</p>
              </div>
            <Users className="evac-card-icon" />
          </div>
        </div>
      )}  


      {/* Search Evacuation Container */}
      <div className="evac-search-wrapper">
        <input
          type="text"
          placeholder="Search by name or barangay..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="evac-search"
        />
        <Search className="evac-search-icon" />
      </div>

      <div className="evac-grid">
        {userRole === "Citizen" ? (
          filteredCenters.map(center => (
            <div key={center.id} className="evac-card">
              <h2 className="evac-card-name">
                {center.name}
                <span className="evac-capacity">
                  <Users className="evac-capacity-icon" />
                  {center.capacity}
                </span>
              </h2>

              <p className="evac-barangay">{center.barangay}</p>

              <div className="evac-info">
                <div className="evac-info-row">
                  <MapPin className="evac-info-icon" />
                  <span>{center.address}</span>
                </div>

                <div className="evac-info-row">
                  <Phone className="evac-info-icon" />
                  <span>{center.contact}</span>
                </div>
              </div>

              <button
                className="evac-btn"
                onClick={() => handleGetDirections(center.coordinates)}
              >
                <Navigation className="evac-btn-icon" />
                Get Directions
              </button>
            </div>
          ))
        ) : userRole === "Officer" ? (
          filteredCenters.map(center => (
            <div key={center.id} className="evac-card officer">
              <h2 className="evac-card-name">
                {center.name}
                <span className="evac-tag">Barangay Hall</span>
              </h2>

              <p className="evac-barangay">{center.barangay}</p>

              <div className="evac-info">
                <div className="evac-info-row">
                  <MapPin className="evac-info-icon" />
                  <span>{center.address}</span>
                </div>
                <div className="evac-info-row">
                  <GrLocationPin className="evac-info-icon" />
                  <span>{center.coordinates}</span>
                </div>
              </div>
              <br />
              <hr />
              <div className="evac-actions">
                <button className="evac-edit-btn">
                  Edit
                </button>
                <button className="evac-delete-btn">
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : null}
      </div>

      <div className="evac-reminders">
        <h3 className="evac-reminders-title">
          <span>⚠️</span> Important Reminders
        </h3>
        <ul className="evac-reminders-list">
          <li>Bring essential items: water, food, medicines, and important documents</li>
          <li>Follow instructions from local authorities and evacuation center staff</li>
          <li>Register upon arrival at the evacuation center</li>
          <li>Keep your mobile phone charged for emergency communications</li>
        </ul>
      </div>
    </div>
  );
}


export default EvacCenterPage;