import { useEffect, useState, useRef, useMemo } from 'react';
import { toast } from "sonner";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import LeafletMap from "../../components/ui/LeafletMap";
import { fetchEvacCenters, createEvacCenter, updateEvacCenter, deleteEvacCenter } from "../../libr/evacCentersApi";

import { Search, MapPin, Phone, Navigation, Users } from 'lucide-react';
import { GrLocationPin } from "react-icons/gr";
import { MdOutlineModeEdit, MdAdd, MdPlace } from "react-icons/md";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import { RiDeleteBinFill } from "react-icons/ri";
import { getUserRoleAndDisplayName } from "../../libr/auth";
import type { EvacuationCenterData } from "../../components/ui/mapLayers/evacuationCenters";
import './EvacCenterPage.css';

import AddEvacCenterModal from "../../components/ui/Modals/AddEvacCenterModal";
import MapPickerModal from '../../components/ui/Modals/MapPickerModal';
// import { getEvacuationPopupHTML } from "../../components/ui/mapLayers/evacuationCenters";
import EvacCenterEditor from '../../components/ui/Modals/EvacCenterEditor';

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { getCabuyaoBarangays } from "../../constants";

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
  facilities?: string[];
}

const mapApiToCenter = (api: any): EvacuationCenter => ({
  id: api.id,
  name: api.name,
  type: api.type,
  barangay: api.barangay,
  address: api.address || "",
  capacity: api.capacity || 0,
  contact: api.contact || "",
  coordinates: api.coordinates
    ? `${api.coordinates[0]}, ${api.coordinates[1]}`
    : "",
  facilities: api.facilities || [],
});


// interface EvacCenterEditorProps {
//   center: EvacuationCenter;
//   onChange: (center: EvacuationCenter) => void;
//   onSave: () => void;
//   onCancel: () => void;
//   readOnly?: boolean;
//   showCoordinatesPicker?: boolean;
//   onPickCoordinates?: () => void;
// }

/* EVAC CENTER PAGE ----------------------------------------------------- */
function EvacCenterPage() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [editingCenter, setEditingCenter] = useState<EvacuationCenter | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedEvacuationCenter, setSelectedEvacuationCenter] = useState<EvacuationCenter | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [locationFilter, setLocationFilter] = useState<"all" | "near_me">("all");
  const [loadingCenters, setLoadingCenters] = useState(true);

  const userBarangay = localStorage.getItem("user_barangay") || "";
  const normalizeBarangay = (text: string) =>
    text
      .toLowerCase()
      .replace(/barangay/g, "")
      .replace(/\s+/g, " ")
      .trim();

  //get user role
  const { userRole, isResidentVerified } = getUserRoleAndDisplayName();

  const handleGetDirections = (coordinates: string) => {
    const [lat, lng] = coordinates.split(', ');
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    const loadCenters = async () => {
      try {
        const data = await fetchEvacCenters();
        setCenters(data.map(mapApiToCenter));
      } catch (err) {
        toast.error("Failed to load evacuation centers");
      } finally {
        setLoadingCenters(false);
      }
    };

    loadCenters();
  }, []);

  // Evac Center Tag Colors
  const centerColors = {
    school: { bg: "#E8F0FE", text: "#1E40AF" },
    gymnasium: { bg: "#ECFDF5", text: "#047857" },
    hall: { bg: "#FFF7ED", text: "#9A3412" },
    court: { bg: "#F0F9FF", text: "#0369A1" },
    barangay_center: { bg: "#FAF5FF", text: "#6B21A8" },
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
    const query = searchQuery.trim().toLowerCase();

    const nameMatch =
      center.name?.toLowerCase().includes(query) ?? false;

    const barangayMatch =
      center.barangay?.toLowerCase().includes(query) ?? false;

    const matchesSearch = nameMatch || barangayMatch;

    const matchesBarangayFilter =
      locationFilter === "all" ||
      (locationFilter === "near_me" &&
        userBarangay &&
        center.barangay &&
        normalizeBarangay(center.barangay) === normalizeBarangay(userBarangay));

    return matchesSearch && matchesBarangayFilter;
  });

  // Manage Evacuation Center Cards ----------------------------------------
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const handleSelectCenter = (centerData: EvacuationCenterData) => {
    const center = mapApiToCenter(centerData);
    setSelectedEvacuationCenter(center);
    console.log("zibai", center)

    if (userRole === "Officer") {
      setEditingCenter(center);
    }
  };

  const handleEditCenter = (center: EvacuationCenter) => {
    setClosingId(center.id);

    setTimeout(() => {
      setSelectedEvacuationCenter(center);
      setEditingCenter(center);
      setClosingId(null);
      setShowAddModal(false);
    }, 250);
  };

  const handleSaveEdit = async (updatedCenter: EvacuationCenter | null) => {
    if (!updatedCenter || updatedCenter.id === undefined) {
      console.error("Cannot save: missing center or ID", updatedCenter);
      return;
    }

    setIsSaving(true);
    try {
      const [lat, lng] = updatedCenter.coordinates
        .split(",")
        .map((v) => Number(v.trim()));

      const payload = {
        id: updatedCenter.id,
        name: updatedCenter.name,
        type: updatedCenter.type,
        latitude: lat,
        longitude: lng,
        capacity: updatedCenter.capacity,
        address: updatedCenter.address,
        contact: updatedCenter.contact,
        barangay: updatedCenter.barangay,
        facilities: updatedCenter.facilities,
      };

      const saved = await updateEvacCenter(updatedCenter.id, payload);

      setCenters((prev) =>
        prev.map((c) =>
          c.id === saved.id ? mapApiToCenter(saved) : c
        )
      );
      setEditingCenter(null); // close editor
      setMapRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error("Error updating center:", err);
      toast.error("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCenter = (id: number) => {
    toast.warning("Delete this evacuation center?", {
      action: {
        label: "Confirm",
        onClick: async () => {
          setClosingId(id);

          try {
            await deleteEvacCenter(id);

            setCenters((prev) => prev.filter((c) => c.id !== id));

            toast.success("Evacuation center deleted");

            setMapRefreshKey(prev => prev + 1);
          } catch (err) {
            console.error(err);
            toast.error("Failed to delete evacuation center");
          } finally {
            setClosingId(null);
          }
        }
      },
      cancel: {
        label: "Cancel",
        onClick: () => { }
      }
    });
  };

  /* Evacuation Center Map */
  const activeLayers = useMemo(() => ["Evacuation Centers",], []); /* "Barangay Boundaries" */
  // const [isClosing, setIsClosing] = useState(false);
  const [closingId, setClosingId] = useState<number | null>(null);

  const handleCloseEditor = () => {
    // setIsClosing(true);
    setTimeout(() => {
      setEditingCenter(null);
      setSelectedEvacuationCenter(null);
      // setIsClosing(false);
    }, 250);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
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

  console.log("eto ang role", userRole, isResidentVerified);

  return (
    <div className="evac-page">
      <div className="evac-map-wrapper">
        <div className={`evac-side-content ${userRole === 'Officer' ? 'officer-view' : 'citizen-view'}`}>
          <div className="evac-side-content-filtermap">
            {/* Filter-Row */}
            { (userRole === "Citizen" && isResidentVerified) && (
              <div className="filters">
                <div className="select-wrapper">
                  <MdPlace className="select-icon" />
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value as "all" | "near_me")}
                    className="role-select"
                  >
                    <option value="all">All Centers</option>
                    <option value="near_me">
                      Near My Barangay
                    </option>
                  </select>
                </div>

                {locationFilter === "near_me" && userBarangay && (
                  <div className="filter-hint">
                    Showing centers near {" "}
                    <strong>{userBarangay}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Interactive Map Component */}
            <div className="evac-side-content-map">
              <LeafletMap
                key={mapRefreshKey}
                mapView="interactive"
                mapType="basic"
                activeLayers={activeLayers}
                showPopupOnMap={false}
                locationFilter={locationFilter}
                onSelectEvacuationCenter={handleSelectCenter}
              />
            </div>
          </div>

          {/* Selected Evacuation Center */}
          <div className="selected-evac-card">
            {userRole === "Officer" && editingCenter ? (
              <EvacCenterEditor
                center={editingCenter}
                onChange={setEditingCenter}
                onSave={() => handleSaveEdit(editingCenter)}
                onCancel={handleCloseEditor}
                readOnly={false}
                showCoordinatesPicker={true}
                onPickCoordinates={() => setMapOpen(true)}
                isSaving={isSaving}
              />
            ) : selectedEvacuationCenter ? (
              <EvacCenterEditor
                center={selectedEvacuationCenter}
                readOnly={true}
              />
            ) : (
              <div className="empty-evac-state">
                <span className="icon">🗺️</span>
                <p className="title">No Evacuation Center Selected</p>
                <p className="subtitle">
                  Click an evacuation center on the map to view details.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* STATUS CONTAINER */}
        {userRole === "Officer" ? (
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
        ) : (userRole === "Citizen" || userRole === "Guest") ? (
          <div className="evac-reminders">
            <h3 className="evac-reminders-title">
              <span>⚠️</span> Important Reminders
            </h3>
            <ul className="evac-reminders-list">
              <li>Bring essential items such as water, ready-to-eat food, medicines, and important documents (ID, birth certificate, medical records).</li>
              <li>Pack hygiene supplies including face masks, alcohol, toiletries, and sanitary items.</li>
              <li>Register immediately upon arrival at the evacuation center.</li>
              <li>Follow instructions from local authorities and evacuation center personnel at all times.</li>
              <li>Inform staff of any medical conditions, disabilities, or special needs.</li>
              <li>Keep your mobile phone charged for emergency updates and communication.</li>
              <li>Maintain cleanliness and respect shared spaces within the evacuation center.</li>
              <li>Keep personal belongings secure and do not leave valuables unattended.</li>
            </ul>
          </div>
        ) : null}
      </div>

      <hr className="evac-hr-divider" />

      <div className="evac-header-wrapper">
        <h2 className='evac-list'>List of Evacuation Centers</h2>

        <div className="evac-search-add-container">
          <div className="evac-search-wrapper officer">
            <Search className="evac-search-icon" />
            <input
              type="text"
              placeholder="Search by name or barangay..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="evac-search"
            />
            {searchQuery && (
              <button
                type="button"
                className="evac-search-clear"
                onClick={handleClearSearch}
              >
                ✕
              </button>
            )}
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

      <div className="evac-grid-wrapper">
        {/* Left Arrow */}
        <button className="scroll-btn left" onClick={() => scrollGrid(-300)}>
          <HiChevronLeft size={24} />
        </button>

        <div className="evac-grid officer" ref={gridRef} style={{ overflowX: "hidden" }}>
          {loadingCenters ? (
            <div className="evac-loading">
              Loading evacuation centers...
            </div>
          ) : filteredCenters.length === 0 ? (
            <div className="evac-empty-state">
              No evacuation centers found.
            </div>
          ) : (
            filteredCenters.map(center => {
              const isExiting = closingId === center.id;
              return (
                <div
                  key={center.id}
                  className={`evac-card ${userRole === "Officer" ? "officer" : ""} animate-card ${isExiting ? "exit" : ""
                    }`}
                >
                  <h2 className="evac-card-name">
                    <span
                      ref={(el) => {
                        if (!el) return;
                        el.title = el.scrollWidth > el.clientWidth ? center.name : "";
                      }}
                    >
                      {center.name}
                    </span>
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

                        {/*<div className="evac-capacity">
                          <Users className="evac-capacity-icon" />
                          {center.capacity}
                        </div>*/}
                      </div>
                    )}
                    {/*userRole === "Citizen" && (
                      <span className="evac-capacity">
                        <Users className="evac-capacity-icon" />
                        {center.capacity}
                      </span>
                    )*/}
                  </h2>

                  <p className={`evac-barangay ${!center.barangay ? "muted" : ""}`}>
                    {center.barangay || "Barangay not specified"}
                  </p>

                  <div className="evac-info">
                    <>
                      {userRole === "Officer" ? (
                        <div className="evac-info-row">
                          <GrLocationPin className="evac-info-icon location-pin" />
                          {center.coordinates}
                        </div>
                      ) : (
                        <div className="evac-info-row">
                          <MapPin className="evac-info-icon" />
                          <span>{center.address}</span>
                        </div>
                      )}

                      <div className="evac-info-row">
                        <Phone className="evac-info-icon" />
                        {center.contact ? (
                          <a
                            href={`tel:${center.contact.replace(/[^0-9+]/g, "")}`}
                            className="evac-contact-link"
                          >
                            {center.contact}
                          </a>
                        ) : (
                          <span className="evac-contact-muted">
                            No contact available
                          </span>
                        )}
                      </div>
                    </>
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

                  {userRole !== "Officer" && (
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
            })
          )}
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
        onAdd={async (newCenter) => {
          if (!newCenter.coordinates) return;

          setIsSaving(true);
          try {
            const [lat, lng] = newCenter.coordinates
              .split(",")
              .map(v => Number(v.trim()))

            const payload = {
              name: newCenter.name,
              type: newCenter.type,
              latitude: lat,
              longitude: lng,
              capacity: newCenter.capacity,
              address: newCenter.address,
              contact: newCenter.contact,
              barangay: newCenter.barangay,
              facilities: newCenter.facilities,
            };

            const saved = await createEvacCenter(payload);
            setCenters((prev) => [...prev, mapApiToCenter(saved)]);
            setShowAddModal(false);
          } catch (err) {
            console.error("Error creating center:", err);
            toast.error("Failed to save evacuation center.");
          } finally {
            setIsSaving(false);
          }
        }}
        barangays={getCabuyaoBarangays()}
      />

      <MapPickerModal
        open={mapOpen}
        initial={
          editingCenter?.coordinates
            ? (() => {
              const [lat, lng] = editingCenter.coordinates.split(",").map(v => Number(v.trim()));
              return { lat, lng };
            })()
            : null
        }
        onClose={() => setMapOpen(false)}
        onConfirm={(picked) => {
          if (editingCenter) {
            setEditingCenter({
              ...editingCenter,
              coordinates: `${picked.lat.toFixed(6)}, ${picked.lng.toFixed(6)}`
            });
          }
          setMapOpen(false);
        }}
      />
    </div>
  );
}


export default EvacCenterPage;