import React, { useState, useEffect, useRef } from 'react';
import { Pet, ActivityStatus, SafeZone, DogHealthData } from '../../types';
import PetMapView from './PetMapView';
import VitalSignCard from './VitalSignCard';
import SensorDataService, { PetSensorData } from '../../services/SensorDataService';
import PetService from '../../services/PetService';
import DangerAlertService from '../../services/DangerAlertService';
import ElevenLabsService from '../../services/ElevenLabsService';
import { useVoiceAlerts } from '../../hooks/useVoiceAlerts';
import { useDangerAlerts } from '../../hooks/useDangerAlerts';
import './DashboardView.css';

// Sample data matching the iOS app
const samplePet: Pet = {
  id: 'pet_1',
  name: 'Nola',
  breed: 'Labrador',
  birthdate: new Date(1600000000000),
  photoURL: undefined
};

const DashboardView: React.FC = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [liveSensorData, setLiveSensorData] = useState<PetSensorData | null>(null);
  const [safeZone, setSafeZone] = useState<SafeZone | null>(null);
  const [isLiveDataConnected, setIsLiveDataConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  
  const dangerAlertService = useRef(DangerAlertService.getInstance());
  const elevenLabsService = useRef(ElevenLabsService.getInstance());
  const lastAlertData = useRef<PetSensorData | null>(null);

  // Initialize alert hooks
  useVoiceAlerts();
  useDangerAlerts();

  const selectedPet = pets.find(pet => pet.id === selectedPetId) || pets[0];

  // Check for danger conditions and play alerts
  const checkDangerConditions = async (sensorData: PetSensorData, pet: Pet) => {
    // Only check if data has actually changed to avoid duplicate alerts
    if (lastAlertData.current && 
        lastAlertData.current.dangerMode === sensorData.dangerMode &&
        lastAlertData.current.highActivity === sensorData.highActivity &&
        lastAlertData.current.heartRate === sensorData.heartRate) {
      return;
    }

    lastAlertData.current = { ...sensorData };
    await dangerAlertService.current.checkAndAlert(sensorData, pet);
  };


  useEffect(() => {
    loadPets();
  }, []);


  useEffect(() => {
    if (pets.length > 0 && !selectedPetId) {
      setSelectedPetId(pets[0].id);
    }
  }, [pets, selectedPetId]);

  useEffect(() => {
    // Initialize safe zone with default values
    setSafeZone({
      centerLatitude: 40.502209,
      centerLongitude: -74.451950,
      radius: 50
    });
  }, []);

  // Subscribe to dog health data from Firebase Realtime Database
  useEffect(() => {
    // Subscribe to live dog health data from Firebase Realtime Database
    const unsubscribeDogHealth = SensorDataService.subscribeToDogHealth(
      (data: DogHealthData) => {
        setIsLiveDataConnected(true);
        
        // Create sensor data object with only the available data
        const sensorData: PetSensorData = {
          petId: selectedPetId || 'default',
          timestamp: data.timestamp || Date.now(),
          heartRate: data.heartRate,
          bodyTemperature: 70, // Hardcoded temperature as requested
          activityStatus: data.highActivity ? ActivityStatus.UNUSUAL : ActivityStatus.RESTING,
          ambientTemperature: 0, // Not available
          bloodPressure: { systolic: 0, diastolic: 0 }, // Not available
          respiratoryRate: 0, // Not available
          oxygenSaturation: 0, // Not available
          dangerMode: data.dangerMode,
          highActivity: data.highActivity,
          crashDetected: data.highActivity, // Map high activity to crash detection
          suddenMovement: data.highActivity, // Map high activity to sudden movement
          latitude: 0, // Not available
          longitude: 0 // Not available
        };
        
        setLiveSensorData(sensorData);
        
        // Check for danger conditions and play alerts
        if (alertsEnabled && selectedPet) {
          checkDangerConditions(sensorData, selectedPet);
        }
      },
      3000 // Update every 3 seconds
    );

    // Cleanup function
    return () => {
      unsubscribeDogHealth();
    };
  }, [selectedPetId, alertsEnabled, selectedPet]);

  const loadPets = async () => {
    try {
      setLoading(true);
      setError(null);
      const petsData = await PetService.getPets();
      setPets(petsData);
    } catch (error: any) {
      setError('Failed to load pets');
      // Fallback to sample pet if no pets are loaded
      setPets([samplePet]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (): string => {
    if (!liveSensorData) {
      return 'Awaiting Data';
    }
    
    // Simple status for the pet header
    switch (liveSensorData.activityStatus) {
      case ActivityStatus.RESTING: return 'Resting';
      case ActivityStatus.WALKING: return 'Walking';
      case ActivityStatus.PLAYING: return 'Playing';
      case ActivityStatus.UNUSUAL: return 'Active';
      default: return 'Awaiting Data';
    }
  };

  const getDetailedStatusText = (): string => {
    if (!liveSensorData) {
      return 'No Data Available';
    }
    
    // Priority order: show most important status first
    if (liveSensorData.dangerMode) {
      return '⚠️ Danger Mode';
    }
    if (liveSensorData.highActivity) {
      return '🚨 High Activity';
    }
    if (liveSensorData.crashDetected) {
      return '💥 Crash Detected';
    }
    
    // For normal states, provide more context
    switch (liveSensorData.activityStatus) {
      case ActivityStatus.RESTING: return 'Safe & Secure';
      case ActivityStatus.WALKING: return '🚶 On a Walk';
      case ActivityStatus.PLAYING: return '🎾 Playing';
      case ActivityStatus.UNUSUAL: return '⚡ Unusual Activity';
      default: return '❓ Unknown Status';
    }
  };

  const getStatusColor = (): string => {
    if (!liveSensorData) {
      return '#999999';
    }
    
    if (liveSensorData.dangerMode || liveSensorData.crashDetected) {
      return '#F44336'; // Red for danger
    }
    if (liveSensorData.highActivity) {
      return '#FF9800'; // Orange for high activity
    }
    switch (liveSensorData.activityStatus) {
      case ActivityStatus.RESTING: return 'var(--success-color)';
      case ActivityStatus.WALKING: return 'var(--warning-color)';
      case ActivityStatus.PLAYING: return '#6699CC';
      case ActivityStatus.UNUSUAL: return 'var(--danger-color)';
      default: return '#999999';
    }
  };

  const getHeartRateStatus = (): { text: string; color: string } => {
    if (!liveSensorData || !liveSensorData.heartRate) {
      return { text: 'No Data', color: '#999999' };
    }
    
    // Don't duplicate danger mode status here - let the danger mode card handle it
    if (liveSensorData.heartRate > 120) {
      return { text: 'Elevated', color: 'var(--warning-color)' };
    }
    
    if (liveSensorData.heartRate < 60) {
      return { text: 'Low', color: 'var(--warning-color)' };
    }
    
    return { text: 'Normal Range', color: 'var(--success-color)' };
  };

  const heartRateStatus = getHeartRateStatus();

  const getTemperatureMessage = (temp: number): string => {
    if (temp < 20) return 'Dangerous - Hypothermia Risk';
    if (temp < 32) return 'Too Cold - Frostbite Risk';
    if (temp < 45) return 'Cold - Some Dogs Uncomfortable';
    if (temp >= 45 && temp <= 75) return 'Perfect Weather';
    if (temp <= 85) return 'Warm - Monitor Activity';
    if (temp <= 95) return 'Hot - Heat Exhaustion Risk';
    return 'Dangerous - Heatstroke Risk';
  };

  const getTemperatureStatusColor = (temp: number): string => {
    if (temp < 20) return '#F44336'; // Red for dangerous cold
    if (temp < 32) return '#FF5722'; // Deep orange for frostbite risk
    if (temp < 45) return '#FF9800'; // Orange for cold
    if (temp >= 45 && temp <= 75) return '#4CAF50'; // Green for perfect
    if (temp <= 85) return '#FFC107'; // Yellow for warm
    if (temp <= 95) return '#FF9800'; // Orange for hot
    return '#F44336'; // Red for dangerous heat
  };

  const handleSafeZoneUpdate = (updatedSafeZone: SafeZone) => {
    setSafeZone(updatedSafeZone);
    // Here you could also save to backend
  };

  const handleAlertToggle = async () => {
    const newAlertsEnabled = !alertsEnabled;
    
    if (newAlertsEnabled) {
      // When enabling alerts, try to initialize AudioContext
      try {
        await elevenLabsService.current.initializeAudioContext();
      } catch (error) {
        // Continue anyway - visual alerts will still work
      }
    }
    
    setAlertsEnabled(newAlertsEnabled);
  };


  if (loading) {
    return (
      <div className="dashboard-view">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
        </div>
        <div className="loading-message">Loading pets...</div>
      </div>
    );
  }

  if (error && pets.length === 0) {
    return (
      <div className="dashboard-view">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!selectedPet) {
    return (
      <div className="dashboard-view">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
        </div>
        <div className="no-pets-message">
          <div className="no-pets-icon">🐾</div>
          <p>No pets found</p>
          <small>Add a pet in your profile to get started!</small>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-view">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="dashboard-controls">
          <button 
            className={`alert-toggle ${alertsEnabled ? 'enabled' : 'disabled'}`}
            onClick={handleAlertToggle}
            title={alertsEnabled ? 'Disable voice alerts' : 'Enable voice alerts'}
          >
            {alertsEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>
      
      <div className="dashboard-content">
        {/* Pet Selection */}
        {pets.length > 1 && (
          <div className="pet-selector">
            <label className="pet-selector-label">Select Pet:</label>
            <div className="pet-cards-container">
              {pets.map((pet) => (
                <div
                  key={pet.id}
                  className={`pet-card ${selectedPetId === pet.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPetId(pet.id)}
                >
                  <div className="pet-card-avatar">
                    {pet.photoURL ? (
                      <img src={pet.photoURL} alt={pet.name} />
                    ) : (
                      <div className="pet-card-icon">🐾</div>
                    )}
                  </div>
                  <div className="pet-card-info">
                    <div className="pet-card-name">{pet.name}</div>
                    <div className="pet-card-breed">{pet.breed}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pet-header">
          <div className="pet-info">
            <div className="pet-icon">🐾</div>
            <div className="pet-details">
              <h2 className="pet-name">{selectedPet.name}</h2>
              <p className="pet-breed">{selectedPet.breed}</p>
              <p className="pet-status">{getStatusText()}</p>
            </div>
          </div>
          <div className="status-badge" style={{ backgroundColor: getStatusColor() + '20', color: getStatusColor() }}>
            {getDetailedStatusText()}
          </div>
        </div>

        <div className="map-container">
          <PetMapView
            petImageURL={selectedPet.photoURL}
            petCoordinate={liveSensorData && liveSensorData.latitude && liveSensorData.longitude ? 
              { lat: liveSensorData.latitude, lng: liveSensorData.longitude } : null}
            safeZone={safeZone}
            onSafeZoneUpdate={handleSafeZoneUpdate}
          />
        </div>

        <div className="vitals-section">
          <div className="vitals-header">
            <h3>Live Vitals</h3>
            {isLiveDataConnected && (
              <div className="live-indicator">
                <div className="pulse-dot"></div>
                <span>Live</span>
              </div>
            )}
          </div>
          <div className="vitals-grid">
            <VitalSignCard
              icon="❤️"
              iconColor={liveSensorData?.dangerMode ? "#F44336" : "red"}
              title="Heart Rate"
              value={liveSensorData?.heartRate ? `${liveSensorData.heartRate} bpm` : 'No Data'}
              status={isLiveDataConnected ? `${heartRateStatus.text} • Live` : 'No Data'}
              statusColor={isLiveDataConnected ? heartRateStatus.color : '#999999'}
            />
            
            <VitalSignCard
              icon="🌡️"
              iconColor="orange"
              title="Environment Temperature"
              value="70°F"
              status={getTemperatureMessage(70)}
              statusColor={getTemperatureStatusColor(70)}
            />

            <VitalSignCard
              icon="⚠️"
              iconColor={liveSensorData?.dangerMode ? "#F44336" : "#4CAF50"}
              title="Health Status"
              value={liveSensorData ? (liveSensorData.dangerMode ? "⚠️ ALERT" : "Safe") : "No Data"}
              status={liveSensorData ? (liveSensorData.dangerMode ? "Critical Health Issue" : "All Vitals Normal") : "No Data"}
              statusColor={liveSensorData ? (liveSensorData.dangerMode ? "#F44336" : "#4CAF50") : "#999999"}
            />

            <VitalSignCard
              icon="💥"
              iconColor={liveSensorData?.highActivity ? "#F44336" : "#4CAF50"}
              title="Activity Monitor"
              value={liveSensorData ? (liveSensorData.highActivity ? "🚨 ALERT" : "Normal") : "No Data"}
              status={liveSensorData ? (liveSensorData.highActivity ? "Sudden Movement/Crash Detected" : "Normal Activity Levels") : "No Data"}
              statusColor={liveSensorData ? (liveSensorData.highActivity ? "#F44336" : "#4CAF50") : "#999999"}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
