import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow
});

function ClickToPin({
    onPick,
}: {
    onPick: (lat: number, lon: number) => void;
}) {
    useMapEvents({
        click(e) {
            onPick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

function PinLocationPicker({
    initialLat,
    initialLon,
    onPick,
}: {
    initialLat: number;
    initialLon: number;
    onPick: (lat: number, lon: number) => void;
}) {
    const [marker, setMarker] = useState<{ lat: number; lon: number }>({
        lat: initialLat,
        lon: initialLon,
    });

    return (
        <div className="pin-map">
            <MapContainer
                center={[marker.lat, marker.lon]}
                zoom={16}
                style={{ height: 260, width: "100%", borderRadius: 10 }}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ClickToPin
                    onPick={(lat, lon) => {
                        setMarker({ lat, lon });
                        onPick(lat, lon);
                    }}
                />

                <Marker
                    position={[marker.lat, marker.lon]}
                    draggable={true}
                    eventHandlers={{
                        dragend: (e) => {
                            const marker = e.target;
                            const position = marker.getLatLng();
                            setMarker({ lat: position.lat, lon: position.lng });
                            onPick(position.lat, position.lng);
                        },
                    }}
                />

            </MapContainer>

            <small className="pin-hint">
                Tap/click on the map to move the pin.
            </small>
        </div>
    )
}

export default PinLocationPicker;