import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, Phone, Navigation, Users } from 'lucide-react';
import { GrLocationPin } from "react-icons/gr";
import { MdOutlineModeEdit, MdAdd, MdCheck, MdClose } from "react-icons/md";
import { RiDeleteBinFill } from "react-icons/ri";
import { getUserRoleAndDisplayName } from "../../libr/auth";
import './EvacCenterPage.css';

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";


delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type LatLng = { lat: number; lng: number };

function ClickToPick({
  value,
  onChange,
}: {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return value ? <Marker position={[value.lat, value.lng]} /> : null;
}

function MapPickerModal({
  open,
  initial,
  onClose,
  onConfirm,
}: {
  open: boolean;
  initial: LatLng | null;
  onClose: () => void;
  onConfirm: (picked: LatLng) => void;
}) {
  const [picked, setPicked] = useState<LatLng | null>(initial);

  useEffect(() => {
    setPicked(initial);
  }, [initial, open]);

  if (!open) return null;

  const center: [number, number] = picked
    ? [picked.lat, picked.lng]
    : [14.2752, 121.1245];

  return (
    <div className="map-modal-overlay">
      <div className="map-modal">
        <div className="map-modal-header">
          <h3>Pick Location</h3>
          <button type="button" className='map-x' onClick={onClose}>
            ✕
          </button>
        </div>

        <p className='map-hint'>Click on the map to set the coordinates.</p>

        <div className="map-wrap">
          <MapContainer center={center} zoom={13} className='leaflet-map'>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickToPick value={picked} onChange={setPicked} />
          </MapContainer>
        </div>

        <div className="map-picked">
          <strong>Selected:</strong>{" "}
          {picked ? `${picked.lat.toFixed(6)}, ${picked.lng.toFixed(6)}` : "None"}
        </div>

        <div className="map-modal-actions">
          <button type="button" className='btn-secondary' onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className='btn-primary'
            disabled={!picked}
            onClick={() => picked && onConfirm(picked)}
          >
            Use this location
          </button>
        </div>
      </div>
    </div>
  )

}

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

function EvacCenterPage() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [centers, setCenters] = useState<EvacuationCenter[]>(evacuationCenters);
  const [editingCenter, setEditingCenter] = useState<EvacuationCenter | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapTarget, setMapTarget] = useState<"add" | "edit">("add");
  const [newCoords, setNewCoords] = useState("");

  //get user role
  const { userRole, displayName, profilePath } = getUserRoleAndDisplayName();

  const handleGetDirections = (coordinates: string) => {
    const [lat, lng] = coordinates.split(', ');
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  // Helper to open map picker
  const openMapPickerForAdd = () => {
    setMapTarget("add");
    setMapOpen(true);
  }

  const openMapPickerForEdit = () => {
    setMapTarget("edit");
    setMapOpen(true);
  }

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
  const handleAddCenterClick = () => {
    setEditingCenter(null);
    setNewCoords("");
    setShowAddModal(true);
  };
  const handleEditCenter = (center: EvacuationCenter) => {
    setEditingCenter(center);
    setShowAddModal(false);
  };
  const handleSaveEdit = (updatedCenter: EvacuationCenter) => {
    setCenters(centers.map(c => (c.id === updatedCenter.id ? updatedCenter : c)));
    setEditingCenter(null);
  };
  const handleAddCenter = (newCenter: EvacuationCenter) => {
    setCenters([...centers, { ...newCenter, id: Date.now() }]);
    setShowAddModal(false);
  };
  const handleDeleteCenter = (id: number) => {
    if (confirm("Are you sure you want to delete this center?")) {
      setCenters(centers.filter(c => c.id !== id));
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
            <button className="evac-add-btn" onClick={handleAddCenterClick}>
              <MdAdd className="evac-add-icon" />
              Add Evacuation Center
            </button>
          </div>
        )}
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
          filteredCenters.map((center) => {

            const isEditing = editingCenter?.id === center.id;
            const typeForColors = isEditing ? editingCenter!.type : center.type;

            return (
              <div
                key={center.id}
                className={`evac-card officer ${isEditing ? "editing" : ""}`}
              >
                <h2 className="evac-card-name">
                  {isEditing ? (
                    <input
                      className="inline-input name-input"
                      value={editingCenter!.name}
                      onChange={(e) =>
                        setEditingCenter({ ...editingCenter!, name: e.target.value })
                      }
                    />
                  ) : (
                    center.name
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* Type Tag */}
                    <span
                      className="evac-tag"
                      style={{
                        background: getTagColors(typeForColors).bg,
                        color: getTagColors(typeForColors).text,
                      }}
                    >
                      {isEditing ? (
                        <select
                          className="inline-input tag-input"
                          value={editingCenter!.type}
                          onChange={(e) =>
                            setEditingCenter({ ...editingCenter!, type: e.target.value })
                          }
                        >
                          <option value="school">School</option>
                          <option value="gymnasium">Gymnasium</option>
                          <option value="barangay hall">Barangay Hall</option>
                        </select>
                      ) : (
                        center.type.charAt(0).toUpperCase() + center.type.slice(1)
                      )}
                    </span>

                    {/* Capacity */}
                    <div className="evac-capacity">
                      <Users className="evac-capacity-icon" />
                      {isEditing ? (
                        <input
                          className="inline-input capacity-input"
                          type="number"
                          value={editingCenter!.capacity}
                          onChange={(e) =>
                            setEditingCenter({
                              ...editingCenter!,
                              capacity: Number(e.target.value),
                            })
                          }
                        />
                      ) : (
                        center.capacity
                      )}
                    </div>
                  </div>
                </h2>

                {/* Barangay */}
                <p className="evac-barangay">
                  {isEditing ? (
                    <input
                      className="inline-input"
                      value={editingCenter!.barangay}
                      onChange={(e) =>
                        setEditingCenter({ ...editingCenter!, barangay: e.target.value })
                      }
                    />
                  ) : (
                    center.barangay
                  )}
                </p>

                {/* Info */}
                <div className="evac-info">
                  <div className="evac-info-row">
                    <GrLocationPin className="evac-info-icon location-pin" />
                    {isEditing ? (
                      <div className="coord-row inline">
                        <input className="inline-input" readOnly value={editingCenter!.coordinates} />
                        <button
                          type="button"
                          className="pick-map-btn small"
                          onClick={() => {
                            setMapTarget("edit");
                            setMapOpen(true);
                          }}
                        >
                          Pick
                        </button>
                      </div>
                    ) : (
                      center.coordinates
                    )}
                  </div>


                  <div className="evac-info-row">
                    <Phone className="evac-info-icon" />
                    {isEditing ? (
                      <input
                        className="inline-input"
                        value={editingCenter!.contact}
                        onChange={(e) =>
                          setEditingCenter({ ...editingCenter!, contact: e.target.value })
                        }
                      />
                    ) : (
                      center.contact
                    )}
                  </div>
                </div>

                <hr className="evac-hr-divider" />

                {/* Actions */}
                <div className="evac-actions">
                  {isEditing ? (
                    <div className="inline-edit-actions">
                      <button
                        type="button"
                        className="inline-icon-btn save-btn"
                        onClick={() => handleSaveEdit(editingCenter!)}
                      >
                        <MdCheck />
                      </button>
                      <button
                        type="button"
                        className="inline-icon-btn cancel-btn"
                        onClick={() => setEditingCenter(null)}
                      >
                        <MdClose />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button className="evac-edit-btn" onClick={() => handleEditCenter(center)}>
                        <MdOutlineModeEdit /> Edit
                      </button>
                      <button className="evac-delete-btn" onClick={() => handleDeleteCenter(center.id)}>
                        <RiDeleteBinFill />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })

        ) : null}
      </div>

      {/* Officer Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add Evacuation Center</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newCenter: EvacuationCenter = {
                  id: 0,
                  name: formData.get("name") as string,
                  type: formData.get("type") as string,
                  barangay: formData.get("barangay") as string,
                  address: formData.get("address") as string,
                  capacity: Number(formData.get("capacity")),
                  contact: formData.get("contact") as string,
                  coordinates: formData.get("coordinates") as string,
                };
                handleAddCenter(newCenter);
                setShowAddModal(false);
              }}
            >
              {/* Name */}
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input name="name" id="name" placeholder="Enter center name" required />
              </div>

              {/* Barangay | Type */}
              <div className="form-row">
                <div className="form-group small">
                  <label htmlFor="barangay">Barangay</label>
                  <input name="barangay" id="barangay" placeholder="Enter barangay" required />
                </div>
                <div className="form-group small">
                  <label htmlFor="type">Type</label>
                  <select name="type" id="type" required>
                    <option value="">Select Type</option>
                    <option value="school">School</option>
                    <option value="gymnasium">Gymnasium</option>
                    <option value="barangay hall">Barangay Hall</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div className="form-group">
                <label htmlFor="address">Address</label>
                <input name="address" id="address" placeholder="Full address" required />
              </div>

              {/* Contact */}
              <div className="form-group">
                <label htmlFor="contact">Contact</label>
                <input name="contact" id="contact" placeholder="Phone or email" required />
              </div>

              {/* Capacity */}
              <div className="form-row">
                <div className="form-group small">
                  <label htmlFor="capacity">Capacity</label>
                  <input name="capacity" id="capacity" type="number" placeholder="People" required />
                </div>
                <div className="form-group small">
                  <label htmlFor="coordinates">Coordinates</label>
                  <div className="coord-row">
                    <input
                      name="coordinates"
                      id="coordinates"
                      placeholder="Lat, Long"
                      readOnly
                      value={newCoords}
                    />
                    <button
                      type="button"
                      className="pick-map-btn"
                      onClick={openMapPickerForAdd}
                    >
                      Pick on Map
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="modal-actions">
                <button type="submit">Add Center</button>
                <button type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MapPickerModal
        open={mapOpen}
        initial={
          mapTarget === "edit" && editingCenter?.coordinates
            ? (() => {
              const [lat, lng] = editingCenter.coordinates.split(",").map(s => Number(s.trim()));
              return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
            })()
            : mapTarget === "add" && newCoords
              ? (() => {
                const [lat, lng] = newCoords.split(",").map(s => Number(s.trim()));
                return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
              })()
              : null
        }
        onClose={() => setMapOpen(false)}
        onConfirm={(picked) => {
          const formatted = `${picked.lat.toFixed(6)}, ${picked.lng.toFixed(6)}`;

          if (mapTarget === "edit" && editingCenter) {
            setEditingCenter({ ...editingCenter, coordinates: formatted });
          } else {
            setNewCoords(formatted);
          }
          setMapOpen(false);
        }}
      />

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