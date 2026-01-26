import '../../../pages/shared/EvacCenterPage.css';

import React, { useState } from "react";
import MapPickerModal from "./MapPickerModal";

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

interface AddEvacCenterModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (newCenter: EvacuationCenter) => void;
}

const AddEvacCenterModal: React.FC<AddEvacCenterModalProps> = ({ open, onClose, onAdd }) => {
  const [formState, setFormState] = useState({
    name: "",
    type: "",
    barangay: "",
    address: "",
    capacity: 0,
    contact: "",
    coordinates: "",
  });
  const [mapOpen, setMapOpen] = useState(false);

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: name === "capacity" ? Number(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ ...formState, id: Date.now() });
    setFormState({ name: "", type: "", barangay: "", address: "", capacity: 0, contact: "", coordinates: "" });
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal">
          <h3>Add Evacuation Center</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name</label>
              <input name="name" value={formState.name} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <div className="form-group small">
                <label>Barangay</label>
                <input name="barangay" value={formState.barangay} onChange={handleChange} required />
              </div>
              <div className="form-group small">
                <label>Type</label>
                <select name="type" value={formState.type} onChange={handleChange} required>
                  <option value="">Select Type</option>
                  <option value="school">School</option>
                  <option value="gymnasium">Gymnasium</option>
                  <option value="barangay hall">Barangay Hall</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Address</label>
              <input name="address" value={formState.address} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <div className="form-group small">
                <label>Contact</label>
                <input name="contact" value={formState.contact} onChange={handleChange} required />
              </div>

              <div className="form-group small">
                <label>Capacity</label>
                <input name="capacity" type="number" value={formState.capacity} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label>Coordinates</label>
              <div className="coord-row">
                <input name="coordinates" readOnly value={formState.coordinates} placeholder="Lat, Long" />
                <button className="pick-map-btn" type="button" onClick={() => setMapOpen(true)}>Pick on Map</button>
              </div>
            </div>

            <div className="modal-actions">
              <button type="submit">Add Center</button>
              <button type="button" onClick={onClose}>Cancel</button>
            </div>
          </form>
        </div>
      </div>

      <MapPickerModal
        open={mapOpen}
        initial={formState.coordinates ? (() => {
          const [lat, lng] = formState.coordinates.split(",").map(s => Number(s.trim()));
          return { lat, lng };
        })() : null}
        onClose={() => setMapOpen(false)}
        onConfirm={(picked) => {
          setFormState(prev => ({ ...prev, coordinates: `${picked.lat.toFixed(6)}, ${picked.lng.toFixed(6)}` }));
          setMapOpen(false);
        }}
      />
    </>
  );
};

export default AddEvacCenterModal;
