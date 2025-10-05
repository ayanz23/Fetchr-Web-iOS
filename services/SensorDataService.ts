import { ref, onValue } from 'firebase/database';
import { realtimeDb } from './firebase';
import { DogHealthData, ActivityStatus } from '../types/SensorData';

export interface PetSensorData {
  petId: string;
  timestamp: number;
  heartRate: number;
  bodyTemperature: number;
  activityStatus: ActivityStatus;
  ambientTemperature: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  respiratoryRate: number;
  oxygenSaturation: number;
  dangerMode: boolean;
  highActivity: boolean;
  crashDetected: boolean;
  suddenMovement: boolean;
  latitude: number;
  longitude: number;
}

class SensorDataService {
  private static instance: SensorDataService;
  private listeners: { [key: string]: any } = {};

  static getInstance(): SensorDataService {
    if (!SensorDataService.instance) {
      SensorDataService.instance = new SensorDataService();
    }
    return SensorDataService.instance;
  }

  /**
   * Subscribe to live sensor data for a specific pet
   * @param petId The pet ID to get sensor data for
   * @param callback Function to call when sensor data updates
   * @param interval Optional interval in milliseconds (default: 3000ms = 3 seconds)
   */
  subscribeToPetSensorData(
    petId: string,
    callback: (data: PetSensorData | null) => void,
    interval: number = 3000
  ): () => void {
    const sensorDataRef = ref(realtimeDb, `sensorData/${petId}`);
    let intervalId: NodeJS.Timeout;

    const fetchData = () => {
      onValue(sensorDataRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const sensorData: PetSensorData = {
            petId,
            timestamp: data.timestamp || Date.now(),
            heartRate: data.heartRate || 0,
            bodyTemperature: data.bodyTemperature || 0,
            activityStatus: data.activityStatus || ActivityStatus.RESTING,
            ambientTemperature: data.ambientTemperature || 0,
            bloodPressure: data.bloodPressure || { systolic: 0, diastolic: 0 },
            respiratoryRate: data.respiratoryRate || 0,
            oxygenSaturation: data.oxygenSaturation || 0,
            dangerMode: data.dangerMode || false,
            highActivity: data.highActivity || false,
            crashDetected: data.crashDetected || false,
            suddenMovement: data.suddenMovement || false,
            latitude: data.latitude || 0,
            longitude: data.longitude || 0
          };
          callback(sensorData);
        } else {
          callback(null);
        }
      }, { onlyOnce: true });
    };

    // Initial fetch
    fetchData();

    // Set up interval polling
    intervalId = setInterval(fetchData, interval);

    // Store for cleanup
    const listenerId = `sensorData_${petId}_${Date.now()}`;
    this.listeners[listenerId] = () => {
      clearInterval(intervalId);
    };

    // Return cleanup function
    return () => {
      if (this.listeners[listenerId]) {
        this.listeners[listenerId]();
        delete this.listeners[listenerId];
      }
    };
  }

  /**
   * Get current sensor data for a specific pet (one-time fetch)
   * @param petId The pet ID to get sensor data for
   */
  async getCurrentPetSensorData(petId: string): Promise<PetSensorData | null> {
    return new Promise((resolve, reject) => {
      const sensorDataRef = ref(realtimeDb, `sensorData/${petId}`);
      
      onValue(sensorDataRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const sensorData: PetSensorData = {
            petId,
            timestamp: data.timestamp || Date.now(),
            heartRate: data.heartRate || 0,
            bodyTemperature: data.bodyTemperature || 0,
            activityStatus: data.activityStatus || ActivityStatus.RESTING,
            ambientTemperature: data.ambientTemperature || 0,
            bloodPressure: data.bloodPressure || { systolic: 0, diastolic: 0 },
            respiratoryRate: data.respiratoryRate || 0,
            oxygenSaturation: data.oxygenSaturation || 0,
            dangerMode: data.dangerMode || false,
            highActivity: data.highActivity || false,
            crashDetected: data.crashDetected || false,
            suddenMovement: data.suddenMovement || false,
            latitude: data.latitude || 0,
            longitude: data.longitude || 0
          };
          resolve(sensorData);
        } else {
          resolve(null);
        }
      }, (error: Error) => {
        reject(error);
      }, { onlyOnce: true });
    });
  }

  /**
   * Subscribe to basic dog health data (legacy method for backward compatibility)
   * @param callback Function to call when dog health data updates
   * @param interval Optional interval in milliseconds (default: 3000ms = 3 seconds)
   */
  subscribeToDogHealth(
    callback: (data: DogHealthData) => void,
    interval: number = 3000
  ): () => void {
    const dogHealthRef = ref(realtimeDb, 'dogHealth');
    let intervalId: NodeJS.Timeout;

    const fetchData = () => {
      onValue(dogHealthRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const liveData: DogHealthData = {
            heartRate: data.heartRate || 0,
            dangerMode: data.dangerMode || false,
            highActivity: data.highActivity || false,
            timestamp: Date.now()
          };
          callback(liveData);
        }
      }, { onlyOnce: true });
    };

    // Initial fetch
    fetchData();

    // Set up interval polling
    intervalId = setInterval(fetchData, interval);

    // Store for cleanup
    const listenerId = `dogHealth_${Date.now()}`;
    this.listeners[listenerId] = () => {
      clearInterval(intervalId);
    };

    // Return cleanup function
    return () => {
      if (this.listeners[listenerId]) {
        this.listeners[listenerId]();
        delete this.listeners[listenerId];
      }
    };
  }

  /**
   * Get historical sensor data for a pet (if needed for charts/analytics)
   * @param petId The pet ID
   * @param startTime Start timestamp (optional)
   * @param endTime End timestamp (optional)
   */
  async getHistoricalSensorData(
    petId: string, 
    startTime?: number, 
    endTime?: number
  ): Promise<PetSensorData[]> {
    // This would typically query a Firestore collection for historical data
    // For now, return empty array as we're focusing on real-time data
    return [];
  }

  /**
   * Clean up all listeners
   */
  cleanup(): void {
    Object.values(this.listeners).forEach(cleanup => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    });
    this.listeners = {};
  }
}

export default SensorDataService.getInstance();
