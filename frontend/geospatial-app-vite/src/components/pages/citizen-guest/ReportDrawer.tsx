import { useEffect, useState } from 'react';

interface ReportDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function ReportDrawer({ open, onClose }: ReportDrawerProps) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<string>("Detecting location...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation(`Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`);
        setError(null);
      },
      () => {
        setError("Unable to access location. Please enable location access.");
        setLocation("Location not available");
      }
    );
  }, [open]);

  if (!open) return null;

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  return (
    <div className="drawer-overlay">
      <div className="drawer">

        <div className="drawer-header">
          <h3>Report an Incident</h3>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-content">
          <label>Category</label>
          <select>
            <option value="fire">Fire</option>
            <option value="flood">Flood</option>
            <option value="landslide">Landslide</option>
            <option value="accident">Accident</option>
            <option value="others">Others</option>
          </select>

          <label>Description</label>
          <textarea
            placeholder="Describe what you see (smoke, injuries, blocked roads, etc.)"
            rows={4}
          />

          <label>Location</label>
          <div className="location-box">
            <input value={location} disabled />
            {error && <span className="location-error">{error}</span>}
          </div>

          <label>Photo (Optional)</label>

          <div className="photo-upload">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              id="photoInput"
              hidden
            />

            {!photoPreview ? (
              <label htmlFor="photoInput" className="photo-placeholder">
                <span>Take or Upload Photo</span>
                <small>Helps responders verify the incident</small>
              </label>
            ) : (
              <div className="photo-preview">
                <img src={photoPreview} alt="Incident preview" />
                <button
                  type="button"
                  className='remove-photo'
                  onClick={() => {
                    setPhoto(null);
                    setPhotoPreview(null);
                  }}
                >
                  ✕ Remove
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="drawer-actions">
          <button className="submit-btn">Submit Report</button>
          <button className="close-btn" onClick={onClose}>Cancel</button>
        </div>

      </div>
    </div>
  );
}
