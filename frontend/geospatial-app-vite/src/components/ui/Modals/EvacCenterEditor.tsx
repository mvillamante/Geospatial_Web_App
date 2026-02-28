// import React from "react";
import { getCabuyaoBarangays } from "../../../constants";
import "./EvacCenterEditor.css";

export interface EvacuationCenter {
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

interface EvacCenterEditorProps {
  center: EvacuationCenter;
  onChange?: (center: EvacuationCenter) => void;
  onSave?: () => void;
  onCancel?: () => void;
  readOnly?: boolean; // Officer=false, Citizen=true
  showCoordinatesPicker?: boolean;
  onPickCoordinates?: () => void;
  isSaving?: boolean;
}

export default function EvacCenterEditor({
  center,
  onChange = () => { },
  onSave,
  onCancel,
  readOnly = false,
  showCoordinatesPicker = false,
  onPickCoordinates,
  isSaving = false,
}: EvacCenterEditorProps) {
  // const typeLabel = center.type
  //   ? center.type.charAt(0).toUpperCase() + center.type.slice(1)
  //   : "Unknown";

  return (
    <div className="editor-card-wrapper">
      <div className={`editor-card ${readOnly ? "view-only" : "edit-mode"}`}>
        {/* Header */}
        <div className={`editor-header ${readOnly ? "view-only" : "edit-mode"}`}>
          <span className="icon">🏫</span>
          <span className="label">{center.name}</span>
          {readOnly && <span className="role-badge">View Only</span>}
        </div>

        {readOnly ? (
          <>
            {/* VIEW-ONLY UI */}
            <div className="view-field-group">
              <div className="view-card">
                <span className="icon">🏫</span>
                <p className="label">Name</p>
                <span className="value">{center.name || "-"}</span>
              </div>
            </div>

            <div className="form-row three">
              <div className="view-card small">
                <span className="icon">📍</span>
                <span className="label">Barangay</span>
                <span className="value">{center.barangay || "-"}</span>
              </div>

              <div className="view-card small">
                <span className="icon">🏠</span>
                <span className="label">Type</span>
                <span className="value">{center.type || "-"}</span>
              </div>

              <div className="view-card small">
                <span className="icon">👥</span>
                <span className="label">Capacity</span>
                <span className="value">{center.capacity || 0} persons</span>
              </div>
            </div>

            <div className="view-card">
              <span className="icon">📫</span>
              <span className="value">{center.address || "-"}</span>
            </div>

            <div className="view-card small">
              <span className="icon">📞</span>
              <span className="label">Contact</span>
              <span className="value">{center.contact || "-"}</span>
            </div>

            {/* Facilities (always included) */}
            <div className="facilities-card">
              <p className="title">🏗️ Facilities:</p>
              {center.facilities && center.facilities.length > 0 ? (
                center.facilities.map((f) => (
                  <span key={f} className="facility-item">
                    {f}
                  </span>
                ))
              ) : (
                <p style={{ fontSize: "10px", color: "#6b7280" }}>No facilities</p>
              )}
            </div>
          </>
        ) : (
          <>
            {/* EDITABLE UI */}
            <div className="form-group">
              <label>Name</label>
              <input
                value={center.name || ""}
                onChange={(e) => onChange({ ...center, name: e.target.value })}
              />
            </div>

            <div className="form-row three">
              <div className="form-group small">
                <label>Barangay</label>
                <select
                  value={center.barangay || ""}
                  onChange={(e) =>
                    onChange({ ...center, barangay: e.target.value })
                  }
                >
                  {getCabuyaoBarangays().map((b) => (
                    <option key={b} value={b}>
                      Barangay {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group small">
                <label>Type</label>
                <select
                  value={center.type || ""}
                  onChange={(e) => onChange({ ...center, type: e.target.value })}
                >
                  <option value="school">School</option>
                  <option value="gymnasium">Gymnasium</option>
                  <option value="barangay hall">Barangay Hall</option>
                </select>
              </div>

              <div className="form-group small">
                <label>Capacity</label>
                <input
                  type="number"
                  value={center.capacity || 0}
                  onChange={(e) =>
                    onChange({ ...center, capacity: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                value={center.address || ""}
                onChange={(e) => onChange({ ...center, address: e.target.value })}
              />
            </div>

            <div className="form-row two">
              <div className="form-group">
                <label>Contact</label>
                <input
                  value={center.contact || ""}
                  onChange={(e) => onChange({ ...center, contact: e.target.value })}
                />
              </div>

              <div className="form-group small">
                <label>Coordinates</label>
                <div className="coord-row">
                  <input value={center.coordinates || ""} readOnly />
                  {showCoordinatesPicker && onPickCoordinates && (
                    <button className="pick-map-btn" onClick={onPickCoordinates}>
                      Pick on Map
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Facilities */}
            <div className="facilities-card">
              <p className="title">🏗️ Facilities:</p>

              {center.facilities && center.facilities.length > 0 ? (
                center.facilities.map((f, index) => (
                  <div key={index} className="facility-row">
                    <input
                      value={f}
                      onChange={(e) => {
                        const updatedFacilities = [...(center.facilities || [])];
                        updatedFacilities[index] = e.target.value;
                        onChange({ ...center, facilities: updatedFacilities });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updatedFacilities = [...(center.facilities || [])];
                        updatedFacilities.splice(index, 1);
                        onChange({ ...center, facilities: updatedFacilities });
                      }}
                    >
                      ❌
                    </button>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: "10px", color: "#6b7280" }}>No facilities</p>
              )}

              {/* Add new facility */}
              <button
                type="button"
                className="add-facility-btn"
                onClick={() => {
                  const updatedFacilities = [...(center.facilities || []), ""];
                  onChange({ ...center, facilities: updatedFacilities });
                }}
              >
                ➕ Add Facility
              </button>
            </div>
          </>
        )}

        {/* Bottom Banner */}
        {readOnly && (
          <div className="evac-banner">
            <span className="icon">🆘</span>
            <span className="text">Designated Evacuation Site</span>
          </div>
        )}

        {/* Save / Cancel buttons */}
        {!readOnly && onSave && onCancel && (
          <div className="modal-actions">
            <button className="btn-save" type="button" onClick={onSave}>
              Save
            </button>

            <button className="btn-cancel" type="button" onClick={onCancel}>
              Cancel
            </button>

          </div>
        )}

        {isSaving && (
          <div className="saving-overlay">
            <p>Saving...</p>
          </div>
        )}
      </div>
    </div>

  );
}
