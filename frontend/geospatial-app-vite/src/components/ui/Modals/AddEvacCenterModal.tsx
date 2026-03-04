import "./AddEvacCenterModal.css";
import React, { useState } from "react";
import MapPickerModal from "./MapPickerModal";

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

  if (!open) return null;

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
    onAdd({ ...formState, id: Date.now() }); // temporary id
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
  };

  return (
    <>
      <div className="add-evac-modal-overlay">
        <div className="modal">
          <h3>Add Evacuation Center</h3>
          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div className="form-group small">
              <label>Name</label>
              <input name="name" value={formState.name} onChange={handleChange} required />
            </div>

            {/* Barangay, Type, Capacity */}
            <div className="form-row">
              <div className="form-group small">
                <label>Barangay</label>
                <select name="barangay" value={formState.barangay} onChange={handleChange} required>
                  <option value="">Select Barangay</option>
                  {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="form-group small">
                <label>Type</label>
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

              <div className="form-group small">
                <label>Capacity</label>
                <input name="capacity" type="number" value={formState.capacity} onChange={handleChange} required />
              </div>
            </div>

            {formState.typeSelected && (
              <div className="form-group small">
                <label>Other Type</label>
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

            {/* Address */}
            <div className="form-group">
              <label>Address</label>
              <input name="address" value={formState.address} onChange={handleChange} required />
            </div>

            {/* Contact and Coordinates */}
            <div className="form-row two">
              <div className="form-group small">
                <label>Contact</label>
                <input name="contact" value={formState.contact} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label>Coordinates</label>
                <div className="coord-row">
                  <input name="coordinates" disabled value={formState.coordinates} placeholder="Lat, Long" required />
                  <button type="button" className="pick-map-btn" onClick={() => setMapOpen(true)}>Pick on Map</button>
                </div>
              </div>
            </div>

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
              <button type="button" onClick={onClose}>Cancel</button>
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
          setFormState(prev => ({
            ...prev,
            coordinates: `${picked.lat.toFixed(6)}, ${picked.lng.toFixed(6)}`
          }));
          setMapOpen(false);
        }}
      />
    </>
  );
};

export default AddEvacCenterModal;
