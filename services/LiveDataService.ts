import { ref, onValue, off } from 'firebase/database';
import { realtimeDb } from './firebase';
import { DogHealthData } from '../types/SensorData';

export interface LiveMotionData {
  heartRate: number;
  pulseSignal: number;
  totalAcceleration: number;
  timestamp?: number;
}

class LiveDataService {
  private static instance: LiveDataService;
  private listeners: { [key: string]: any } = {};

  static getInstance(): LiveDataService {
    if (!LiveDataService.instance) {
      LiveDataService.instance = new LiveDataService();
    }
    return LiveDataService.instance;
  }

  /**
   * Subscribe to live dog health data from Firebase Realtime Database
   * @param callback Function to call when dog health data updates
   * @param interval Optional interval in milliseconds (default: 3000ms = 3 seconds)
   */
  subscribeToDogHealth(
    callback: (data: DogHealthData) => void,
    interval: number = 3000
  ): () => void {
    try {
      const dogHealthRef = ref(realtimeDb, 'dogHealth');
      
      // Set up real-time listener with error handling
      const unsubscribe = onValue(dogHealthRef, (snapshot) => {
        try {
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
        } catch (error) {
        }
      }, (error) => {
        // Provide fallback data on error
        const fallbackData: DogHealthData = {
          heartRate: 0,
          dangerMode: false,
          highActivity: false,
          timestamp: Date.now()
        };
        callback(fallbackData);
      });

      // Store the listener for cleanup
      const listenerId = `dogHealth_${Date.now()}`;
      this.listeners[listenerId] = unsubscribe;

      // Return cleanup function
      return () => {
        try {
          if (this.listeners[listenerId]) {
            off(dogHealthRef);
            delete this.listeners[listenerId];
          }
        } catch (error) {
        }
      };
    } catch (error) {
      // Return a no-op cleanup function
      return () => {};
    }
  }

  /**
   * Subscribe to live heart rate data from Firebase Realtime Database (legacy method)
   * @param callback Function to call when heart rate data updates
   * @param interval Optional interval in milliseconds (default: 3000ms = 3 seconds)
   */
  subscribeToHeartRate(
    callback: (data: LiveMotionData) => void,
    interval: number = 3000
  ): () => void {
    const motionDataRef = ref(realtimeDb, 'motionData');
    
    // Set up real-time listener
    const unsubscribe = onValue(motionDataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const liveData: LiveMotionData = {
          heartRate: data.heartRate || 0,
          pulseSignal: data.pulseSignal || 0,
          totalAcceleration: data.totalAcceleration || 0,
          timestamp: Date.now()
        };
        callback(liveData);
      }
    }, (error) => {
    });

    // Store the listener for cleanup
    const listenerId = `heartRate_${Date.now()}`;
    this.listeners[listenerId] = unsubscribe;

    // Return cleanup function
    return () => {
      if (this.listeners[listenerId]) {
        off(motionDataRef);
        delete this.listeners[listenerId];
      }
    };
  }

  /**
   * Subscribe to live dog health data with a polling interval
   * This method polls the database every specified interval
   * @param callback Function to call when dog health data updates
   * @param interval Interval in milliseconds (default: 3000ms = 3 seconds)
   */
  subscribeToDogHealthWithInterval(
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
      }, { onlyOnce: true }); // Only fetch once per call
    };

    // Initial fetch
    fetchData();

    // Set up interval polling
    intervalId = setInterval(fetchData, interval);

    // Store for cleanup
    const listenerId = `dogHealthInterval_${Date.now()}`;
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
   * Subscribe to live heart rate data with a polling interval (legacy method)
   * This method polls the database every specified interval
   * @param callback Function to call when heart rate data updates
   * @param interval Interval in milliseconds (default: 3000ms = 3 seconds)
   */
  subscribeToHeartRateWithInterval(
    callback: (data: LiveMotionData) => void,
    interval: number = 3000
  ): () => void {
    const motionDataRef = ref(realtimeDb, 'motionData');
    let intervalId: NodeJS.Timeout;

    const fetchData = () => {
      onValue(motionDataRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const liveData: LiveMotionData = {
            heartRate: data.heartRate || 0,
            pulseSignal: data.pulseSignal || 0,
            totalAcceleration: data.totalAcceleration || 0,
            timestamp: Date.now()
          };
          callback(liveData);
        }
      }, { onlyOnce: true }); // Only fetch once per call
    };

    // Initial fetch
    fetchData();

    // Set up interval polling
    intervalId = setInterval(fetchData, interval);

    // Store for cleanup
    const listenerId = `heartRateInterval_${Date.now()}`;
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
   * Get a one-time snapshot of current heart rate data
   */
  async getCurrentHeartRate(): Promise<LiveMotionData | null> {
    return new Promise((resolve, reject) => {
      const motionDataRef = ref(realtimeDb, 'motionData');
      
      onValue(motionDataRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const liveData: LiveMotionData = {
            heartRate: data.heartRate || 0,
            pulseSignal: data.pulseSignal || 0,
            totalAcceleration: data.totalAcceleration || 0,
            timestamp: Date.now()
          };
          resolve(liveData);
        } else {
          resolve(null);
        }
      }, (error: Error) => {
        reject(error);
      }, { onlyOnce: true });
    });
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

export default LiveDataService.getInstance();
