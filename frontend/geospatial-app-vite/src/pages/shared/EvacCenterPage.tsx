import React, { useEffect, useState, useRef  } from 'react';
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import LeafletMap from "../../components/ui/LeafletMap";

import { Search, MapPin, Phone, Navigation, Users } from 'lucide-react';
import { GrLocationPin } from "react-icons/gr";
import { MdOutlineModeEdit, MdAdd } from "react-icons/md";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import { RiDeleteBinFill } from "react-icons/ri";
import { getUserRoleAndDisplayName } from "../../libr/auth";
import './EvacCenterPage.css';

import AddEvacCenterModal from "../../components/ui/Modals/AddEvacCenterModal";
import MapPickerModal from '../../components/ui/Modals/MapPickerModal';

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";


delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface EvacuationCenter {
  id: number;
  name: string;
  type: string;
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
    type: 'school',
    barangay: 'Barangay I (Poblacion)',
    address: 'National Road, Cabuyao City',
    capacity: 500,
    contact: '(049) 531-1234',
    coordinates: '14.2752, 121.1245'
  },
  {
    id: 2,
    name: 'Banay-Banay Covered Court',
    type: 'gymnasium',
    barangay: 'Barangay Banay-Banay',
    address: 'Brgy. Banay-Banay, Cabuyao City',
    capacity: 300,
    contact: '(049) 531-2345',
    coordinates: '14.2891, 121.1356'
  },
  {
    id: 3,
    name: 'Mamatid Multi-Purpose Hall',
    type: 'barangay hall',
    barangay: 'Barangay Mamatid',
    address: 'Mamatid Road, Cabuyao City',
    capacity: 400,
    contact: '(049) 531-3456',
    coordinates: '14.2634, 121.1189'
  },
  {
    id: 4,
    name: 'Marinig Barangay Hall',
    type: 'barangay hall',
    barangay: 'Barangay Marinig',
    address: 'Brgy. Marinig, Cabuyao City',
    capacity: 250,
    contact: '(049) 531-4567',
    coordinates: '14.2812, 121.1423'
  },
  {
    id: 5,
    name: 'Pulo Gymnasium',
    type: 'gymnasium',
    barangay: 'Barangay Pulo',
    address: 'Brgy. Pulo, Cabuyao City',
    capacity: 600,
    contact: '(049) 531-5678',
    coordinates: '14.2698, 121.1267'
  }
];

function getCabuyaoBarangays(): string[] {
  return [
    "Baclaran", "Banaybanay", "Banlic", "Bigaa", "Butong",
    "Casile", "Diezmo", "Gulod", "Mamatid", "Marinig",
    "Niugan", "Pittland", "Pulo", "Sala", "San Isidro",
    "Uno (Poblacion 1)", "Dos (Poblacion 2)", "Tres (Poblacion 3)",
  ];
}

interface EvacCenterEditorProps {
  center: EvacuationCenter;
  onChange: (center: EvacuationCenter) => void;
  onSave: () => void;
  onCancel: () => void;
  readOnly?: boolean;
  showCoordinatesPicker?: boolean;
  onPickCoordinates?: () => void;
}

function EvacCenterEditor({
  center,
  onChange,
  onSave,
  onCancel,
  readOnly = false,
  showCoordinatesPicker = false,
  onPickCoordinates,
}: EvacCenterEditorProps) {
  return (
    <div className="evac-card editor-card">
      <div>
        <div className="form-group">
          <label>Name</label>
          <input
            value={center.name}
            onChange={(e) => onChange({ ...center, name: e.target.value })}
            readOnly={readOnly}
          />
        </div>

        <div className="form-row">
          <div className="form-group small">
            <label>Barangay</label>
            {readOnly ? (
              <input value={center.barangay} readOnly />
            ) : (
              <select
                value={center.barangay}
                onChange={(e) => onChange({ ...center, barangay: e.target.value })}
              >
                {getCabuyaoBarangays().map((barangay) => (
                  <option key={barangay} value={barangay}>
                    Barangay {barangay}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group small">
            <label>Type</label>
            {readOnly ? (
              <input value={center.type} readOnly />
            ) : (
              <select
                value={center.type}
                onChange={(e) => onChange({ ...center, type: e.target.value })}
              >
                <option value="school">School</option>
                <option value="gymnasium">Gymnasium</option>
                <option value="barangay hall">Barangay Hall</option>
              </select>
            )}
          </div>
        </div>
          
        <div className="form-row">
          <div className="form-group">
            <label>Address</label>
            <input
              value={center.address}
              onChange={(e) => onChange({ ...center, address: e.target.value })}
              readOnly={readOnly}
            />
          </div>

          <div className="form-group">
            <label>Contact</label>
            <input
              value={center.contact}
              onChange={(e) => onChange({ ...center, contact: e.target.value })}
              readOnly={readOnly}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group small">
            <label>Capacity</label>
            <input
              type="number"
              value={center.capacity}
              onChange={(e) =>
                onChange({ ...center, capacity: Number(e.target.value) })
              }
              readOnly={readOnly}
            />
          </div>

          <div className="form-group small">
            <label>Coordinates</label>
            <div className="coord-row">
              <input value={center.coordinates} readOnly />
              {showCoordinatesPicker && onPickCoordinates && (
                <button
                  type="button"
                  className="pick-map-btn"
                  onClick={onPickCoordinates}
                >
                  Pick on Map
                </button>
              )}
            </div>
          </div>

          {/* Pick Map */}
        </div>

        {!readOnly && (
          <div className="modal-actions">
            <button type="button" onClick={onSave}>
              Save
            </button>
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* EVAC CENTER PAGE ----------------------------------------------------- */
function EvacCenterPage() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [centers, setCenters] = useState<EvacuationCenter[]>(evacuationCenters);
  const [editingCenter, setEditingCenter] = useState<EvacuationCenter | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  //get user role
  const { userRole, displayName, profilePath } = getUserRoleAndDisplayName();

  const handleGetDirections = (coordinates: string) => {
    const [lat, lng] = coordinates.split(', ');
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  // Evac Center Tag Colors
  const centerColors = {
    school: { bg: "#E8F0FE", text: "#1E40AF" },
    gymnasium: { bg: "#ECFDF5", text: "#047857" },
    "barangay hall": { bg: "#FFF7ED", text: "#9A3412" },
    default: { bg: "#F3F4F6", text: "#4B5563" },
  } as const;


  type CenterColorKeys = keyof typeof centerColors;
  const getTagColors = (type: string) => {
    const key = type.toLowerCase() as CenterColorKeys;
    return centerColors[key] || centerColors.default;
  };

  const totalCenters = centers.length;
  const barangaysCovered = new Set(centers.map(c => c.barangay.trim().toLowerCase())).size;

  // Filter evacuation centers based on search query
  const filteredCenters = centers.filter(center => {
    const query = searchQuery.toLowerCase();
    return (
      center.name.toLowerCase().includes(query) ||
      center.barangay.toLowerCase().includes(query)
    );
  });

  // Manage Evacuation Center Cards ----------------------------------------
  const handleEditCenter = (center: EvacuationCenter) => {
    setClosingId(center.id);

    setTimeout(() => {
      setEditingCenter(center);
      setClosingId(null);
      setShowAddModal(false);
    }, 250);
  };
  const handleSaveEdit = (updatedCenter: EvacuationCenter) => {
    setCenters(prev =>
      prev.map(c => (c.id === updatedCenter.id ? updatedCenter : c))
    );
    setEditingCenter(null);
  };
  const handleDeleteCenter = (id: number) => {
    if (!confirm("Are you sure you want to delete this center?")) return;

    setClosingId(id);

    setTimeout(() => {
      setCenters(prev => prev.filter(c => c.id !== id));
      if (editingCenter?.id === id) setEditingCenter(null);
      setClosingId(null);
    }, 250); 
  };

  /* Evacuation Center Map */
  const [activeLayers] = useState<string[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  const [closingId, setClosingId] = useState<number | null>(null);

  const handleCloseEditor = () => {
    setIsClosing(true);
    setTimeout(() => {
      setEditingCenter(null);
      setIsClosing(false);
    }, 250);
  };

  /* Horizontal Scroll Function */
  const gridRef = useRef<HTMLDivElement | null>(null);

  const scrollGrid = (distance: number) => {
    if (gridRef.current) {
      gridRef.current.scrollBy({
        left: distance,
        behavior: "smooth",
      });
    }
  };

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
            : userRole === "Citizen"
              ? "Find the nearest evacuation center in your barangay"
              : null}
        </p>
      </div>

      <div className="evac-map-wrapper">
        {/* Interactive Map Component */}
        <LeafletMap
          height="47vh"
          width="50%"
          mapView="interactive"
          mapType="basic"
          activeLayers={["Evacuation Centers"]}
        />

        <div style={{ width: "350px", display: "flex", flex: "1", flexDirection: "column"}}>
          {userRole === "Officer" && (
            <div className="evac-stat-container">
              <div className="evac-stat-card evac-stat-primary">
                <div className="evac-stat-text">
                  <h3>Total Centers</h3>
                  <p className="evac-card-value">{totalCenters}</p>
                </div>
                <MapPin className="evac-card-icon" />
              </div>

              <div className="evac-stat-card evac-stat-secondary">
                <div className="evac-stat-text">
                  <h3>Barangays Covered</h3>
                  <p className="evac-card-value">{barangaysCovered}</p>
                </div>
                <Users className="evac-card-icon" />
              </div>
            </div>
          )}

          { userRole === "Citizen" && (
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
          )}

          {userRole === "Officer" && (
            <div className="selected-evac-card">
              <h2>Selected Evacuation Center</h2>
              {editingCenter && (
                <div className={`small-editor animate-card ${isClosing ? "exit" : ""}`}>
                  <EvacCenterEditor
                    center={editingCenter}
                    onChange={setEditingCenter}
                    onSave={() => handleSaveEdit(editingCenter)}
                    onCancel={handleCloseEditor}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="evac-search-add-container">
          <div className="evac-search-wrapper officer">
            <input
              type="text"
              placeholder="Search by name or barangay..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="evac-search"
            />
            <Search className="evac-search-icon" />
          </div>
          {userRole === "Officer" && (
            <div className="evac-add-center">
              <button className="evac-add-btn" onClick={() => setShowAddModal(true)}>
                <MdAdd className="evac-add-icon" />
                Add Evacuation Center
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Evacuation Centers Legend - appears when Evacuation Centers layer is active */}
      {activeLayers.includes("Evacuation Centers") && (
        <div className="evac-centers-legend">
          <h4>🆘 Evacuation Centers</h4>
          <div className="evac-legend-subtitle">Cabuyao, Laguna</div>
          <ul>
            <li className="school">
              <span className="legend-icon">🏫</span>
              <span className="legend-text">School</span>
            </li>
            <li className="covered-court">
              <span className="legend-icon">🏀</span>
              <span className="legend-text">Covered Court</span>
            </li>
            <li className="multi-purpose">
              <span className="legend-icon">🏛️</span>
              <span className="legend-text">Multi-Purpose Hall</span>
            </li>
            <li className="gymnasium">
              <span className="legend-icon">🏟️</span>
              <span className="legend-text">Gymnasium</span>
            </li>
          </ul>
          <div className="evac-legend-stats">
            <div className="stat-item">
              <span className="stat-number">18</span>
              <span className="stat-label">Sites</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">6.5K+</span>
              <span className="stat-label">Total Capacity</span>
            </div>
          </div>
          <div className="evac-legend-note">
            <span>💡</span>
            <span>Click markers for details</span>
          </div>
        </div>
      )}

      <div className="evac-grid-wrapper">
        {/* Left Arrow */}
        <button className="scroll-btn left" onClick={() => scrollGrid(-300)}>
          <HiChevronLeft size={24} />
        </button>

        <div className="evac-grid officer" ref={gridRef} style={{ overflowX: "hidden" }}>
          {filteredCenters
          .filter(center => editingCenter?.id !== center.id)
          .map(center => {
            const isExiting = closingId === center.id;

            if (userRole === "Officer" && editingCenter?.id === center.id && !isExiting) {
              return (
                <div key={center.id} className="small-editor animate-card">
                  <EvacCenterEditor
                    center={editingCenter}
                    onChange={setEditingCenter}
                    onSave={() => handleSaveEdit(editingCenter)}
                    onCancel={handleCloseEditor}
                  />
                </div>
              );
            }

            return (
              <div
                key={center.id}
                className={`evac-card ${userRole === "Officer" ? "officer" : ""} animate-card ${
                  closingId === center.id ? "exit" : ""
                }`}
              >
                <h2 className="evac-card-name">
                  {center.name}
                  {userRole === "Officer" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        className="evac-tag"
                        style={{
                          background: getTagColors(center.type).bg,
                          color: getTagColors(center.type).text,
                        }}
                      >
                        {center.type.charAt(0).toUpperCase() + center.type.slice(1)}
                      </span>

                      <div className="evac-capacity">
                        <Users className="evac-capacity-icon" />
                        {center.capacity}
                      </div>
                    </div>
                  )}
                  {userRole === "Citizen" && (
                    <span className="evac-capacity">
                      <Users className="evac-capacity-icon" />
                      {center.capacity}
                    </span>
                  )}
                </h2>

                <p className="evac-barangay">{center.barangay}</p>

                <div className="evac-info">
                  {userRole === "Officer" ? (
                    <>
                      <div className="evac-info-row">
                        <GrLocationPin className="evac-info-icon location-pin" />
                        {center.coordinates}
                      </div>
                      <div className="evac-info-row">
                        <Phone className="evac-info-icon" />
                        {center.contact}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="evac-info-row">
                        <MapPin className="evac-info-icon" />
                        <span>{center.address}</span>
                      </div>
                      <div className="evac-info-row">
                        <Phone className="evac-info-icon" />
                        <span>{center.contact}</span>
                      </div>
                    </>
                  )}
                </div>

                {userRole === "Officer" && (
                  <>
                    <hr className="evac-hr-divider" />
                    <div className="evac-actions">
                      <button
                        className="evac-edit-btn"
                        onClick={() => handleEditCenter(center)}
                      >
                        <MdOutlineModeEdit /> Edit
                      </button>
                      <button
                        className="evac-delete-btn"
                        onClick={() => handleDeleteCenter(center.id)}
                      >
                        <RiDeleteBinFill />
                      </button>
                    </div>
                  </>
                )}

                {userRole === "Citizen" && (
                  <button
                    className="evac-btn"
                    onClick={() => handleGetDirections(center.coordinates)}
                  >
                    <Navigation className="evac-btn-icon" />
                    Get Directions
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Arrow */}
        <button className="scroll-btn right" onClick={() => scrollGrid(300)}>
          <HiChevronRight size={24} />
        </button>
      </div>


      {/* Officer Add/Edit Modal */}
      <AddEvacCenterModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(newCenter) => setCenters([...centers, newCenter])}
      />

      <MapPickerModal
        open={mapOpen}
        initial={
          editingCenter?.coordinates
            ? (() => {
                const [lat, lng] = editingCenter.coordinates.split(",").map(s => Number(s.trim()));
                return { lat, lng };
              })()
            : null
        }
        onClose={() => setMapOpen(false)}
        onConfirm={(picked) => {
          if (editingCenter) {
            setEditingCenter({ ...editingCenter, coordinates: `${picked.lat.toFixed(6)}, ${picked.lng.toFixed(6)}` });
          }
          setMapOpen(false);
        }}
      />
    </div>
  );
}


export default EvacCenterPage;