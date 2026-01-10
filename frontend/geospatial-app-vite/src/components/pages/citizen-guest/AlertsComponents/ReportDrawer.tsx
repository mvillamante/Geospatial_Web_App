import { useEffect, useState } from 'react';

interface ReportDrawerProps {
  open: boolean;
  onClose: () => void;
}

type ReverseGeocodeResponse = {
  success?: boolean;
  location?: string;
  street?: string;
  district?: string;
  barangay?: string;
  city?: string;
  address?: Record<string, unknown>;
  error?: string;
};

function formatStreetBarangayCity(data: ReverseGeocodeResponse): string {
  const parts: string[] = [];

  if (typeof data.street === 'string' && data.street.trim()) {
    parts.push(data.street.trim());
  } else {
    const address = data.address as any;
    const road =
      address?.road || address?.street || address?.pedestrian || address?.path || address?.footway;
    const houseNumber = address?.house_number;
    if (typeof road === 'string' && road.trim()) {
      const street = (typeof houseNumber === 'string' && houseNumber.trim())
        ? `${houseNumber.trim()} ${road.trim()}`
        : road.trim();
      parts.push(street);
    }
  }

  const barangayRaw =
    (typeof data.barangay === 'string' && data.barangay.trim()) ? data.barangay.trim() : '';
  if (barangayRaw) {
    const barangayLower = barangayRaw.toLowerCase();
    parts.push(
      barangayLower.includes('barangay') || barangayLower.includes('brgy')
        ? barangayRaw
        : `Barangay ${barangayRaw}`
    );
  }

  const cityRaw = (typeof data.city === 'string' && data.city.trim()) ? data.city.trim() : '';
  if (cityRaw) parts.push(cityRaw);

  if (parts.length === 0 && typeof data.location === 'string' && data.location.trim()) {
    return data.location.trim();
  }

  return parts.join(', ');
}

export default function ReportDrawer({ open, onClose }: ReportDrawerProps) {
  const [, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<string>("Detecting location...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          setLocation("Getting location...");
          const response = await fetch(
            `/api/geocoding/reverse/?lat=${latitude}&lon=${longitude}`,
            { signal: controller.signal }
          );

          const data: ReverseGeocodeResponse = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to reverse geocode');
          }

          const formatted = formatStreetBarangayCity(data);
          if (cancelled) return;

          setLocation(formatted || 'Location not available');
          setError(formatted ? null : 'Unable to determine location');
        } catch (err: any) {
          if (cancelled) return;
          if (err?.name === 'AbortError') return;
          setLocation('Location not available');
          setError('Unable to determine location');
        }
      },
      () => {
        setError("Unable to access location. Please enable location access.");
        setLocation("Location not available");
      }
    );

    return () => {
      cancelled = true;
      controller.abort();
    };
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
