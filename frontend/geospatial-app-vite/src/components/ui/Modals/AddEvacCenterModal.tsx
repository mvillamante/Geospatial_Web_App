import "./AddEvacCenterModal.css";
import React, { useState, useEffect } from "react";
import MapPickerModal from "./MapPickerModal";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL;

// Type for an evacuation center
export interface EvacuationCenter {
  id: number;
  name: string;
  type: string;
  barangay: string;
  address: string;
  capacity: number;
  contact: string;
  coordinates: string;
  facilities: string[];
}

// Props for the modal
interface AddEvacCenterModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (newCenter: EvacuationCenter) => void;
  barangays: readonly string[];
}

const AddEvacCenterModal: React.FC<AddEvacCenterModalProps> = (
  { open, onClose, onAdd, barangays }) => {

  // Fully typed state
  const [formState, setFormState] = useState<EvacuationCenter & { typeSelected?: boolean }>({
    id: 0,
    name: "",
    type: "",
    barangay: "",
    address: "",
    capacity: 0,
    contact: "",
    coordinates: "",
    facilities: [],
    typeSelected: false,
  });

  const [mapOpen, setMapOpen] = useState(false);
  const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lon: number } | null>(null);

  if (!open) return null;
  async function reverseGeocodeAndSetAddress(lat: number, lon: number) {
    try {
      const res = await fetch(
        `${API_URL}/api/geocoding/reverse/?lat=${lat}&lon=${lon}`
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Reverse geocoding failed");

      const address =
        data?.street && data?.barangay && data?.city
          ? `${data.street}, Barangay ${data.barangay}, ${data.city}`
          : data?.location || "Location not available";

      const detectedBarangay = data?.barangay;
      const barangayExists = barangays.includes(detectedBarangay);

      setFormState(prev => ({
        ...prev,
        address,
        barangay: barangays.includes(detectedBarangay)
          ? detectedBarangay
          : prev.barangay,
        coordinates: `${lat.toFixed(6)}, ${lon.toFixed(6)}`
      }));

      if (!barangayExists) {
        toast.warning(
          "Barangay could not be detected automatically. Please select it manually."
        );
      }

    } catch (err) {
      console.error(err);

      setFormState(prev => ({
        ...prev,
        coordinates: `${lat.toFixed(6)}, ${lon.toFixed(6)}`
      }));
    }
  }

  // Handle input/select changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormState(prev => ({
      ...prev,
      [name]: name === "capacity" ? Number(value) : value,
    }));
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const newCenter = { ...formState, id: Date.now() };

      onAdd(newCenter);

      toast.success(`Evacuation Center "${newCenter.name}" added successfully`);

      setPinnedCoords(null);

      // Reset form
      setFormState({
        id: 0,
        name: "",
        type: "",
        barangay: "",
        address: "",
        capacity: 0,
        contact: "",
        coordinates: "",
        facilities: [],
        typeSelected: false,
      });

      onClose();

    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to add evacuation center");
    }
  };

  return (
    <>
      <div className="add-evac-modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>Add Evacuation Center</h3>
          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div className="form-group small">
              <label>Name<span className="required">*</span></label>
              <input name="name" value={formState.name} onChange={handleChange} required />
            </div>

            {/* Contact and Coordinates */}
            <div className="form-row two">
              <div className="form-group ">
                <label>Contact<span className="required">*</span></label>
                <input name="contact" value={formState.contact} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label>Coordinates <span className="required">*</span></label>
                <div className="coord-row">
                  <input name="coordinates" disabled value={formState.coordinates} placeholder="Lat, Long" required />
                  <button type="button" className="pick-map-btn" onClick={() => setMapOpen(true)}>Pick on Map</button>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="form-group">
              <label>Address<span className="required">*</span></label>
              <input
                name="address"
                value={formState.address}
                placeholder="Pick location from map"
                readOnly
                required
              />
            </div>

            {/* Barangay, Type, Capacity */}
            <div className="form-row two">
              <div className="form-group small">
                <label>Barangay<span className="required">*</span></label>
                <select name="barangay" value={formState.barangay} onChange={handleChange} required>
                  <option value="">Select Barangay</option>
                  {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="form-group small">
                <label>Type<span className="required">*</span></label>
                <select
                  value={formState.type === "" && !formState.typeSelected ? "" : formState.typeSelected ? "others" : formState.type}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "others") {
                      setFormState(prev => ({
                        ...prev,
                        type: "",
                        typeSelected: true, // mark that user selected Others
                      }));
                    } else {
                      setFormState(prev => ({
                        ...prev,
                        type: value,
                        typeSelected: false,
                      }));
                    }
                  }}
                  required
                >
                  <option value="">Select Type</option>
                  <option value="school">School</option>
                  <option value="gymnasium">Gymnasium</option>
                  <option value="court">Covered Court</option>
                  <option value="hall">Multi-Purpose Hall</option>
                  <option value="others">Others</option>
                </select>
              </div>

              {/*<div className="form-group small">
                <label>Capacity</label>
                <input name="capacity" type="number" value={formState.capacity} onChange={handleChange} required />
              </div>*/}
            </div>

            {formState.typeSelected && (
              <div className="form-group small">
                <label>Other Type<span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="Enter type"
                  value={formState.type}
                  onChange={(e) =>
                    setFormState(prev => ({
                      ...prev,
                      type: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            )}

            {/* Facilities */}
            <div className="form-group">
              <label>Facilities (comma-separated)</label>
              <input
                name="facilities"
                value={formState.facilities.join(", ")}
                onChange={(e) =>
                  setFormState(prev => ({
                    ...prev,
                    facilities: e.target.value.split(",").map(f => f.trim()),
                  }))
                }
                placeholder="e.g., Water, Restrooms, Cots"
              />
            </div>

            {/* Form actions */}
            <div className="modal-actions">
              <button type="submit">Add Center</button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  console.log("Cancel clicked");
                  onClose();
                  setTimeout(() => console.log("After close"), 100);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Map Picker Modal */}
      <MapPickerModal
        open={mapOpen}
        initial={formState.coordinates ? (() => {
          const [lat, lng] = formState.coordinates.split(",").map(s => Number(s.trim()));
          return { lat, lng };
        })() : null}
        onClose={() => setMapOpen(false)}
        onConfirm={(picked) => {

          setPinnedCoords({
            lat: picked.lat,
            lon: picked.lng
          });

          reverseGeocodeAndSetAddress(picked.lat, picked.lng);

          setMapOpen(false);
        }}
      />
    </>
  );
};

export default AddEvacCenterModal;
