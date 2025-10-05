import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import { SafeZone } from '../../types';
import './PetMapView.css';

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface PetMapViewProps {
  petImageURL?: string;
  petCoordinate?: { lat: number; lng: number } | null;
  safeZone?: SafeZone | null;
  onSafeZoneUpdate?: (safeZone: SafeZone) => void;
}

// Custom component to update map view when props change
const MapUpdater: React.FC<{ petCoordinate?: { lat: number; lng: number } | null; safeZone?: SafeZone | null }> = ({ 
  petCoordinate, 
  safeZone 
}) => {
  const map = useMap();

  useEffect(() => {
    if (petCoordinate) {
      map.setView([petCoordinate.lat, petCoordinate.lng], 16);
    } else if (safeZone) {
      map.setView([safeZone.centerLatitude, safeZone.centerLongitude], 16);
    }
  }, [map, petCoordinate, safeZone]);

  return null;
};

// Component to handle map clicks for safe zone management
const MapClickHandler: React.FC<{ 
  onMapClick: (lat: number, lng: number) => void;
  isEditing: boolean;
}> = ({ onMapClick, isEditing }) => {
  const map = useMap();

  useEffect(() => {
    if (!isEditing) return;

    const handleClick = (e: any) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onMapClick, isEditing]);

  return null;
};

const PetMapView: React.FC<PetMapViewProps> = ({ petImageURL, petCoordinate, safeZone, onSafeZoneUpdate }) => {
  const defaultCenter = { lat: 40.741, lng: -74.175 }; // Default location (New York area)
  const [isEditing, setIsEditing] = useState(false);
  const [editingSafeZone, setEditingSafeZone] = useState<SafeZone | null>(null);
  
  // Create custom pet icon
  const createPetIcon = () => {
    return L.divIcon({
      html: '<div class="pet-marker">🐾</div>',
      className: 'custom-pet-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  // Initialize editing safe zone when entering edit mode
  useEffect(() => {
    if (isEditing && safeZone) {
      setEditingSafeZone({ ...safeZone });
    }
  }, [isEditing, safeZone]);

  const handleMapClick = (lat: number, lng: number) => {
    if (isEditing && editingSafeZone) {
      setEditingSafeZone({
        ...editingSafeZone,
        centerLatitude: lat,
        centerLongitude: lng
      });
    }
  };

  const handleSave = () => {
    if (editingSafeZone && onSafeZoneUpdate) {
      onSafeZoneUpdate(editingSafeZone);
    }
    setIsEditing(false);
    setEditingSafeZone(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingSafeZone(null);
  };

  const handleRadiusChange = (radius: number) => {
    if (editingSafeZone) {
      setEditingSafeZone({
        ...editingSafeZone,
        radius
      });
    }
  };

  // Use editing safe zone if in edit mode, otherwise use the prop
  const currentSafeZone = isEditing ? editingSafeZone : safeZone;

  return (
    <div className="pet-map-view">
      {/* Safe Zone Management Controls */}
      <div className="safe-zone-controls">
        {!isEditing ? (
          <button 
            className="edit-safe-zone-btn"
            onClick={() => setIsEditing(true)}
            title="Edit Safe Zone"
          >
            <span className="edit-icon">📍</span>
            <span>Edit Safe Zone</span>
          </button>
        ) : (
          <div className="safe-zone-edit-controls">
            <div className="radius-control">
              <label>Radius: {editingSafeZone?.radius || 0}m</label>
              <input
                type="range"
                min="50"
                max="500"
                value={editingSafeZone?.radius || 150}
                onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                className="radius-slider"
              />
            </div>
            <div className="edit-buttons">
              <button className="save-btn" onClick={handleSave}>
                Save
              </button>
              <button className="cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <MapContainer
        center={petCoordinate || { lat: currentSafeZone?.centerLatitude || defaultCenter.lat, lng: currentSafeZone?.centerLongitude || defaultCenter.lng }}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater petCoordinate={petCoordinate} safeZone={currentSafeZone} />
        <MapClickHandler onMapClick={handleMapClick} isEditing={isEditing} />
        
        {/* Safe Zone Circle */}
        {currentSafeZone && (
          <Circle
            center={[currentSafeZone.centerLatitude, currentSafeZone.centerLongitude]}
            radius={currentSafeZone.radius}
            pathOptions={{
              color: isEditing ? '#CC9966' : 'var(--accent-color)',
              fillColor: isEditing ? '#CC9966' : 'var(--accent-color)',
              fillOpacity: 0.15,
              weight: 2,
            }}
          />
        )}
        
        {/* Pet Location Marker */}
        {petCoordinate && (
          <Marker
            position={[petCoordinate.lat, petCoordinate.lng]}
            icon={createPetIcon()}
          >
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <strong>🐾 {petCoordinate ? 'Pet Location' : 'Nola\'s Current Location'}</strong><br />
                {isEditing && <small>Tap on the map to set safe zone center</small>}
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Safe Zone Center Marker (only when editing) */}
        {isEditing && editingSafeZone && (
          <Marker
            position={[editingSafeZone.centerLatitude, editingSafeZone.centerLongitude]}
          >
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <strong>📍 Safe Zone Center</strong><br />
                <small>Radius: {editingSafeZone.radius}m</small>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default PetMapView;
