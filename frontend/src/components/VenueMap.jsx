import React, { useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import L from 'leaflet';

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapClickListener({ onLocationSelected }) {
  useMapEvents({
    click(e) {
      onLocationSelected(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to dynamically recenter map view when lat/lng props change
function RecenterMap({ lat, lng }) {
  const map = useMap();
  React.useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], 17, { animate: true });
    }
  }, [lat, lng, map]);
  return null;
}

export default function VenueMap({ lat, lng, radiusMeters, onLocationChange }) {
  const center = [lat || 23.0225, lng || 72.5714];
  const markerRef = useRef(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newLatLng = marker.getLatLng();
          onLocationChange(newLatLng.lat, newLatLng.lng);
        }
      },
    }),
    [onLocationChange]
  );

  return (
    <div className="w-full h-80 rounded-2xl overflow-hidden border border-[#EFE7DA] relative shadow-inner">
      <MapContainer
        center={center}
        zoom={17}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker
          draggable={true}
          eventHandlers={eventHandlers}
          position={center}
          ref={markerRef}
        />

        <Circle
          center={center}
          radius={radiusMeters || 150}
          pathOptions={{
            color: '#8B3A3A',
            fillColor: '#E8A33D',
            fillOpacity: 0.25,
            weight: 2,
            dashArray: '4, 4'
          }}
        />

        <RecenterMap lat={lat} lng={lng} />
        <MapClickListener onLocationSelected={(newLat, newLng) => onLocationChange(newLat, newLng)} />
      </MapContainer>

      <div className="absolute bottom-2 left-2 z-[1000] bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-[#EFE7DA] text-[11px] font-semibold text-[#8B3A3A] shadow-xs flex items-center gap-1.5">
        <span className="flex items-center justify-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-[#8B3A3A]" />
          Drag pin or click anywhere on map to fine-tune center
        </span>
      </div>
    </div>
  );
}
