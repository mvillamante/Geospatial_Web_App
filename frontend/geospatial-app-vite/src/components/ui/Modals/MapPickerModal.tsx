import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { isWithinCabuyao } from '../../../../src/utils/validateCabuyao';

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import '../../../pages/shared/EvacCenterPage.css';

// Fix leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Type for coordinates
export type LatLng = { lat: number; lng: number };

// Click-to-pick component

function ClickToPick({ value, onChange }: { value: LatLng | null; onChange: (v: LatLng) => void }) {
  useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      if (isWithinCabuyao(lat, lng)) {
        onChange({ lat, lng });
      } else {
        alert("You must pick a location within Cabuyao.");
      }
    },
  });
  return value ? <Marker position={[value.lat, value.lng]} /> : null;
}

interface MapPickerModalProps {
  open: boolean;
  initial: LatLng | null;
  onClose: () => void;
  onConfirm: (picked: LatLng) => void;
}

const MapPickerModal: React.FC<MapPickerModalProps> = ({ open, initial, onClose, onConfirm }) => {
  const [picked, setPicked] = useState<LatLng | null>(initial);

  useEffect(() => {
    setPicked(initial);
  }, [initial, open]);

  if (!open) return null;

  const center: [number, number] = picked ? [picked.lat, picked.lng] : [14.2752, 121.1245];

  return (
    <div className="map-modal-overlay">
      <div className="map-modal">
        <div className="map-modal-header">
          <h3>Pick Location</h3>
          <button type="button" className='map-x' onClick={onClose}>✕</button>
        </div>

        <p className='map-hint'>Click on the map to set the coordinates.</p>

        <div className="map-wrap">
          <MapContainer center={center} zoom={13} className='leaflet-map'>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickToPick value={picked} onChange={setPicked} />
          </MapContainer>
        </div>

        <div className="map-picked">
          <strong>Selected:</strong>{" "}
          {picked ? `${picked.lat.toFixed(6)}, ${picked.lng.toFixed(6)}` : "None"}
        </div>

        <div className="map-modal-actions">
          <button type="button" className='btn-secondary' onClick={onClose}>Cancel</button>
          <button
            type="button"
            className='btn-primary'
            disabled={!picked}
            onClick={() => picked && onConfirm(picked)}
          >
            Use this location
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapPickerModal;
