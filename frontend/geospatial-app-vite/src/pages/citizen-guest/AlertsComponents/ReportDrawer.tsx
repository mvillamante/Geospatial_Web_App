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

  // Backward compatible fallback if street/barangay/city weren't present
  if (parts.length === 0 && typeof data.location === 'string' && data.location.trim()) {
    return data.location.trim();
  }

  return parts.join(', ');
}

export default function ReportDrawer({ open, onClose }: ReportDrawerProps) {
  const token = localStorage.getItem("access_token");

  const [category, setCategory] = useState("fire");
  const [description, setDescription] = useState("");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [location, setLocation] = useState<string>("Detecting location...");
  const [coords, setCoords] = useState<{ lat: number; lon: number; accuracy?: number } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setCategory("fire");
    setDescription("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setCoords(null);


    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLocation("Location not available");
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    setLocation("Detecting location...");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        setCoords({ lat: latitude, lon: longitude, accuracy });

        try {
          setLocation("Getting location...");
          const response = await fetch(
            `/api/geocoding/reverse/?lat=${latitude}&lon=${longitude}`,
            { signal: controller.signal }
          );

          const data: ReverseGeocodeResponse = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to reverse geocode");
          }

          const formatted = formatStreetBarangayCity(data);
          if (cancelled) return;

          setLocation(formatted || "Location not available");
          setError(formatted ? null : "Unable to determine location");
        } catch (err: any) {
          if (cancelled) return;
          if (err?.name === "AbortError") return;
          setLocation("Location not available");
          setError("Unable to determine location");
        }
      },
      () => {
        setError("Unable to access location. Please enable location access.");
        setLocation("Location not available");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
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

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!token) {
      setError("Not logged in. Please sign in again");
      return;
    }
    if (!description.trim()) {
      setError("Please add a description.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("category", category);
      form.append("description", description.trim());
      form.append("location_display", location);

      if (coords) {
        const lat = coords.lat.toFixed(6);
        const lon = coords.lon.toFixed(6);

        console.log("LAT being sent:", lat, "length:", lat.replace(".", "").length);
        console.log("LON being sent:", lon, "length:", lon.replace(".", "").length);

        form.append("latitude", lat);
        form.append("longitude", lon);
        if (coords.accuracy != null) form.append("accuracy_m", String(coords.accuracy));
      }


      if (photoFile) form.append("photo", photoFile);

      const res = await fetch("http://localhost:8000/api/reports/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      console.log("status", res.status);
      const data = await res.json();
      console.log("data", data);

      if (!res.ok) throw new Error(data?.detail || data?.error || "Failed to submit report");

      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
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
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="fire">Fire</option>
            <option value="flood">Flood</option>
            <option value="landslide">Landslide</option>
            <option value="accident">Accident</option>
            <option value="others">Others</option>
          </select>

          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
                    setPhotoFile(null);
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
          <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
          <button className="close-btn" onClick={onClose} disabled={submitting}>Cancel</button>
        </div>

      </div>
    </div>
  );
}
