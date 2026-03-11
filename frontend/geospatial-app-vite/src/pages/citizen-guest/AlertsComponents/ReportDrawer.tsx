
import filipinoBadWords from "filipino-badwords-list";

import { useEffect, useRef, useState, useMemo } from "react";
import PinLocationPicker from "./PinLocationPicker";
// import { isWithinCabuyao } from '../../../../src/utils/validateCabuyao';
import { getIncidentCategories } from "../../../constants"
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL;

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
  const address = data.address as any;

  // Street
  const road =
    data.street ||
    address?.road ||
    address?.street ||
    address?.pedestrian ||
    address?.path ||
    address?.footway;

  const houseNumber = address?.house_number;

  if (road) {
    parts.push(
      houseNumber ? `${houseNumber} ${road}` : road
    );
  }

  // Barangay
  const barangay =
    data.barangay ||
    address?.neighbourhood ||
    address?.quarter ||
    address?.residential ||
    address?.suburb ||
    address?.village ||
    address?.hamlet;

  if (barangay) {
    const lower = barangay.toLowerCase();
    parts.push(
      lower.includes("barangay") || lower.includes("brgy")
        ? barangay
        : `Barangay ${barangay}`
    );
  }

  // City
  const city =
    data.city ||
    address?.city ||
    address?.town ||
    address?.municipality;

  if (city) parts.push(city);

  if (parts.length === 0 && data.location) {
    return data.location;
  }

  return parts.join(", ");
}

export default function ReportDrawer({ open, onClose }: ReportDrawerProps) {
  const token = localStorage.getItem("access_token");
  const profanityRegex = filipinoBadWords.regex;
  // const [badWords, setBadWords] = useState<string[]>([]);
  const [showProfanityWarning, setShowProfanityWarning] = useState(false);

  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Location mode
  const [locationMode, setLocationMode] = useState<"auto" | "pin">("auto");
  const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [pinLoadingAddress, setPinLoadingAddress] = useState(false);

  // Form fields
  const [category, setCategory] = useState("");
  const [otherCategory, setOtherCategory] = useState("");
  const [description, setDescription] = useState("");
  const [criticalLevel, setCriticalLevel] = useState("");

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

  const categories = useMemo(() => getIncidentCategories(), []);

  // Manual pin reverse-geocode
  async function reverseGeocodeAndSetDisplay(lat: number, lon: number) {
    if (pinAbortRef.current) pinAbortRef.current.abort();
    const controller = new AbortController();
    pinAbortRef.current = controller;

    setPinLoadingAddress(true);
    try {
      const response = await fetch(`${API_URL}/api/geocoding/reverse/?lat=${lat}&lon=${lon}`, {
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
    setCategory("");
    setOtherCategory("");
    setDescription("");
    setCriticalLevel("");
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
            `${API_URL}/api/geocoding/reverse/?lat=${latitude}&lon=${longitude}`,
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
            toast.error("Unable to determine location");
          }
        }
      },
      () => {
        if (locationMode !== "pin") {
          toast.error("Unable to access location. Please enable location access.");
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

  function validateReport(): boolean {
    if (!category) {
      toast.error("Please select a category.");
      return false;
    }

    if (!description.trim()) {
      toast.error("Please add a description.");
      return false;
    }

    if (!criticalLevel) {
      toast.error("Please select a critical level.");
      return false;
    }

    if (category === "others" && !otherCategory.trim()) {
      toast.error("Please specify the category.");
      return false;
    }

    if (!coords) {
      toast.error("Location is required.");
      return false;
    }

    if (!photoFile) {
      toast.error("Please upload a photo of the incident.");
      return false;
    }

    return true;
  }

  async function handleSubmit() {
    if (!token) {
      toast.error("Not logged in. Please sign in again");
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
      if (!coords) {
        toast.error("Location not available.");
        return;
      }

      const lat = coords.lat.toFixed(6);
      const lon = coords.lon.toFixed(6);

      form.append("latitude", lat);
      form.append("longitude", lon);
      form.append("location_source", locationMode);

      // Photo
      if (photoFile) form.append("photo", photoFile);

      if (!navigator.onLine) {
        const { dbPromise } = await import("../../../libr/offlineDB");
        const db = await dbPromise;

        const data: any = {
          category,
          description,
          suggested_critical_level: criticalLevel,
          location_display: location,
          latitude: lat,
          longitude: lon,
          location_source: locationMode,
        };

        if (category === "others") data.other_category = otherCategory.trim();

        await db.add("offlineReports", { data });

        toast.success("You are offline. Report saved and will be submitted later.");
        onClose();
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL;
      const res = await fetch(`${API_URL}/api/reports/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || "Failed to submit report");
      toast.success("Report submitted successfully");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  }

  function containsProfanity(text: string): boolean {
    return profanityRegex.test(text.toLowerCase());
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>Report an Incident</h3>
          <button className="drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="drawer-content">
          <label>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="" disabled>
              Select category
            </option>

            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
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
          <select
            value={criticalLevel}
            onChange={(e) => setCriticalLevel(e.target.value)}
          >
            <option value="" disabled>
              Select severity level
            </option>

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

          <label>Photo</label>
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
          <button
            className="submit-btn"
            onClick={() => {
              if (validateReport()) {
                setShowSubmitModal(true);
              }
            }}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
          <button className="close-btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
        </div>
      </div>
      {showSubmitModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Submit Report</h3>

            <p>
              Please confirm that the information you provided is accurate.
              Submitting false reports may result in account restrictions.
            </p>

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                className="save-btn"
                onClick={() => {
                  setShowSubmitModal(false);
                  handleSubmit();
                }}
                disabled={submitting}
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
