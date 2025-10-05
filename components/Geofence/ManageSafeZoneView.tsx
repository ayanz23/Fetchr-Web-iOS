import React, { useState, useEffect } from 'react';
import { SafeZone } from '../../types';
import './ManageSafeZoneView.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to handle map clicks
const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  const map = useMap();

  useEffect(() => {
    const handleClick = (e: any) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onMapClick]);

  return null;
};

interface ManageSafeZoneViewProps {
  onBack: () => void;
}

const ManageSafeZoneView: React.FC<ManageSafeZoneViewProps> = ({ onBack }) => {
  // Pet's current location (hardcoded from DashboardView)
  const petLocation = {
    lat: 40.502209,
    lng: -74.451950
  };

  const [safeZone, setSafeZone] = useState<SafeZone>({
    centerLatitude: petLocation.lat,
    centerLongitude: petLocation.lng,
    radius: 150
  });

  // Create custom pet marker icon (matching dashboard approach)
  const createPetIcon = () => {
    return L.divIcon({
      html: '<div class="pet-marker">🐾</div>',
      className: 'custom-pet-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  const handleSave = () => {
    // Save to backend
    onBack();
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSafeZone({
      centerLatitude: lat,
      centerLongitude: lng,
      radius: safeZone.radius
    });
  };

  return (
    <div className="manage-safe-zone-view">
      <div className="safe-zone-header">
        <button className="back-button" onClick={onBack}>
          <span className="back-icon">←</span>
          <span>Back</span>
        </button>
        <h1>Safe Zone</h1>
        <button className="save-button" onClick={handleSave}>
          Save
        </button>
      </div>
      
      <div className="safe-zone-map-container">
        <MapContainer
          center={[petLocation.lat, petLocation.lng]}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapClickHandler onMapClick={handleMapClick} />
          
          {/* Pet's current location marker */}
          <Marker
            position={[petLocation.lat, petLocation.lng]}
            icon={createPetIcon()}
          >
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <strong>🐾 Nola's Current Location</strong><br />
                <small>Tap on the map to set safe zone center</small>
              </div>
            </Popup>
          </Marker>
          
          {/* Safe zone circle */}
          <Circle
            center={[safeZone.centerLatitude, safeZone.centerLongitude]}
            radius={safeZone.radius}
            pathOptions={{
              color: 'CC9966',
              fillColor: 'CC9966',
              fillOpacity: 0.15,
              weight: 2,
            }}
          />
          
          {/* Safe zone center marker */}
          <Marker
            position={[safeZone.centerLatitude, safeZone.centerLongitude]}
          >
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <strong>📍 Safe Zone Center</strong><br />
                <small>Radius: {safeZone.radius}m</small>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
      
      <div className="safe-zone-instructions">
        <p>🐾 <strong>Pet Location:</strong> Paw marker shows Nola's current position</p>
        <p>📍 <strong>Safe Zone:</strong> Click anywhere on the map to set the safe zone center</p>
        <p>⭕ <strong>Radius:</strong> Adjust the safe zone size using the slider below</p>
      </div>
      
      <div className="safe-zone-controls">
        <div className="control-group">
          <label>Radius (meters):</label>
          <input
            type="range"
            min="50"
            max="500"
            value={safeZone.radius}
            onChange={(e) => setSafeZone({
              ...safeZone,
              radius: parseInt(e.target.value)
            })}
          />
          <span className="radius-value">{safeZone.radius}m</span>
        </div>
      </div>
    </div>
  );
};

export default ManageSafeZoneView;
