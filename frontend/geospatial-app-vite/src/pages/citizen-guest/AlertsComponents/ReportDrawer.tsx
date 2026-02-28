
import filipinoBadWords from "filipino-badwords-list";

import { useEffect, useRef, useState } from "react";
import PinLocationPicker from "./PinLocationPicker";
import { isWithinCabuyao } from '../../../../src/utils/validateCabuyao';

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

  // Street
  if (typeof data.street === "string" && data.street.trim()) {
    parts.push(data.street.trim());
  } else {
    const address = data.address as any;
    const road =
      address?.road ||
      address?.street ||
      address?.pedestrian ||
      address?.path ||
      address?.footway;
    const houseNumber = address?.house_number;

    if (typeof road === "string" && road.trim()) {
      const street =
        typeof houseNumber === "string" && houseNumber.trim()
          ? `${houseNumber.trim()} ${road.trim()}`
          : road.trim();
      parts.push(street);
    }
  }

  // Barangay
  const barangayRaw =
    typeof data.barangay === "string" && data.barangay.trim()
      ? data.barangay.trim()
      : "";
  if (barangayRaw) {
    const barangayLower = barangayRaw.toLowerCase();
    parts.push(
      barangayLower.includes("barangay") || barangayLower.includes("brgy")
        ? barangayRaw
        : `Barangay ${barangayRaw}`
    );
  }

  // City
  const cityRaw =
    typeof data.city === "string" && data.city.trim() ? data.city.trim() : "";
  if (cityRaw) parts.push(cityRaw);

  // Backward compatible fallback
  if (parts.length === 0 && typeof data.location === "string" && data.location.trim()) {
    return data.location.trim();
  }

  return parts.join(", ");
}

export default function ReportDrawer({ open, onClose }: ReportDrawerProps) {
  const token = localStorage.getItem("access_token");
  const profanityRegex = filipinoBadWords.regex;
  // const [badWords, setBadWords] = useState<string[]>([]);
  const [showProfanityWarning, setShowProfanityWarning] = useState(false);

  // Location mode
  const [locationMode, setLocationMode] = useState<"auto" | "pin">("auto");
  const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [pinLoadingAddress, setPinLoadingAddress] = useState(false);

  // Form fields
  const [category, setCategory] = useState("fire");
  const [otherCategory, setOtherCategory] = useState("");
  const [description, setDescription] = useState("");
  const [criticalLevel, setCriticalLevel] = useState("low");

  // Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Location display + coordinates used for submit
  const [location, setLocation] = useState<string>("Detecting location...");
  const [coords, setCoords] = useState<{ lat: number; lon: number; accuracy?: number } | null>(null);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Abort controller refs (avoid stale requests)
  const geoAbortRef = useRef<AbortController | null>(null);
  const pinAbortRef = useRef<AbortController | null>(null);

  // Manual pin reverse-geocode
  async function reverseGeocodeAndSetDisplay(lat: number, lon: number) {
    if (pinAbortRef.current) pinAbortRef.current.abort();
    const controller = new AbortController();
    pinAbortRef.current = controller;

    setPinLoadingAddress(true);
    try {
      const response = await fetch(`/api/geocoding/reverse/?lat=${lat}&lon=${lon}`, {
        signal: controller.signal,
      });
      const data: ReverseGeocodeResponse = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to reverse geocode");

      const formatted = formatStreetBarangayCity(data);
      setLocation(formatted || "Location not available");
      setError(formatted ? null : "Unable to determine location");
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setLocation("Location not available");
      setError("Unable to determine location");
    } finally {
      setPinLoadingAddress(false);
    }
  }

  // Reset + auto-detect when opened
  useEffect(() => {
    if (!open) return;

    // reset fields
    setCategory("fire");
    setOtherCategory("");
    setDescription("");
    setCriticalLevel("low");
    setPhotoFile(null);
    setPhotoPreview(null);

    setLocationMode("auto");
    setPinnedCoords(null);

    setError(null);
    setLocation("Detecting location...");
    setCoords(null);

    // cancel previous geocode
    if (geoAbortRef.current) geoAbortRef.current.abort();
    const controller = new AbortController();
    geoAbortRef.current = controller;

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLocation("Location not available");
      return;
    }

    let cancelled = false;

    /* Get Current Position */
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        if (cancelled) return;

        setCoords({ lat: latitude, lon: longitude, accuracy });

        try {
          setLocation("Getting location...");
          const response = await fetch(
            `/api/geocoding/reverse/?lat=${latitude}&lon=${longitude}`,
            { signal: controller.signal }
          );
          const data: ReverseGeocodeResponse = await response.json();
          if (!response.ok) throw new Error(data.error || "Failed to reverse geocode");

          const formatted = formatStreetBarangayCity(data);
          if (cancelled) return;

          setLocation((prev) => {
            if (locationMode === "pin") return prev;
            return formatted || "Location not available";
          });
          setError((prev) => {
            if (locationMode === "pin") return prev;
            return formatted ? null : "Unable to determine location";
          });
        } catch (err: any) {
          if (cancelled) return;
          if (err?.name === "AbortError") return;

          // avoid overriding user pin
          if (locationMode !== "pin") {
            setLocation("Location not available");
            setError("Unable to determine location");
          }
        }
      },
      () => {
        if (locationMode !== "pin") {
          setError("Unable to access location. Please enable location access.");
          setLocation("Location not available");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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

  function handleUseAutoLocation() {
    setLocationMode("auto");
    setPinnedCoords(null);

  }

  function handlePinOnMap() {
    setLocationMode("pin");

    const startLat = coords?.lat ?? 14.5995;
    const startLon = coords?.lon ?? 120.9842;

    setPinnedCoords({ lat: startLat, lon: startLon });
    setCoords({ lat: startLat, lon: startLon });
    reverseGeocodeAndSetDisplay(startLat, startLon);
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
    if (category === "others" && !otherCategory.trim()) {
      setError("Please specify the category.");
      return;
    }
    if (!coords) {
      setError("Location is required. Please enable location or pin on map.");
      return;
    }

    console.log(`test ${coords?.lat}, ${coords?.lon}`);
    if (!isWithinCabuyao(coords.lat, coords.lon)) {
      setError("You must be within Cabuyao to submit a report.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const form = new FormData();

      form.append("category", category);
      if (category === "others") form.append("other_category", otherCategory.trim());

      form.append("description", description.trim());
      form.append("suggested_critical_level", criticalLevel);
      form.append("location_display", location);

      // Coordinates
      const lat = coords.lat.toFixed(6);
      const lon = coords.lon.toFixed(6);
      form.append("latitude", lat);
      form.append("longitude", lon);
      form.append("location_source", locationMode);

      // Photo
      if (photoFile) form.append("photo", photoFile);
      
      const API_URL = import.meta.env.VITE_API_URL;
      const res = await fetch(`${API_URL}0/api/reports/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || "Failed to submit report");

      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  }

  function containsProfanity(text: string): boolean {
    return profanityRegex.test(text.toLowerCase());
  }

  return (
    <div className="drawer-overlay">
      <div className="drawer">
        <div className="drawer-header">
          <h3>Report an Incident</h3>
          <button className="drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="drawer-content">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="fire">Fire</option>
            <option value="flood">Flood</option>
            <option value="landslide">Landslide</option>
            <option value="typhoon">Typhoon / Severe Weather</option>
            <option value="earthquake">Earthquake</option>
            <option value="vehicular_accident">Vehicular Accident</option>
            <option value="chemical_gas_leak">Chemical / Gas Leak</option>
            <option value="fallen_tree">Fallen Tree</option>
            <option value="infrastructure_damage">Infrastructure Damage</option>
            <option value="others">Others</option>
          </select>


          {category === "others" && (
            <>
              <label>Please specify</label>
              <input
                type="text"
                placeholder="Enter category"
                value={otherCategory}
                onChange={(e) => setOtherCategory(e.target.value)}
              />
            </>
          )}

          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => {
              const value = e.target.value;
              setDescription(value);

              const hasProfanity = containsProfanity(value);
              setShowProfanityWarning(hasProfanity);
            }}
            placeholder="Describe what you see..."
            rows={4}
          />


          {showProfanityWarning && (
            <div className="profanity-warning">
              ⚠️ Please avoid inappropriate language. Your report will still be submitted, but it may be flagged for review.
            </div>
          )}

          <label>Suggested Critical Level</label>
          <select value={criticalLevel} onChange={(e) => setCriticalLevel(e.target.value)}>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <label>Location</label>

          <div className="location-mode">
            <button
              type="button"
              className={locationMode === "auto" ? "active" : ""}
              onClick={handleUseAutoLocation}
              disabled={submitting}
            >
              Use my current location
            </button>

            <button
              type="button"
              className={locationMode === "pin" ? "active" : ""}
              onClick={handlePinOnMap}
              disabled={submitting}
            >
              Pin on map
            </button>
          </div>

          <div className="location-box">
            <input value={pinLoadingAddress ? "Getting pinned location..." : location} disabled />
            {error && <span className="location-error">{error}</span>}
          </div>

          {locationMode === "pin" && pinnedCoords && (
            <PinLocationPicker
              initialLat={pinnedCoords.lat}
              initialLon={pinnedCoords.lon}
              onPick={(lat, lon) => {
                setPinnedCoords({ lat, lon });
                setCoords({ lat, lon }); // submit uses this
                reverseGeocodeAndSetDisplay(lat, lon);
              }}
            />
          )}

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
                  className="remove-photo"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  disabled={submitting}
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
          <button className="close-btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
