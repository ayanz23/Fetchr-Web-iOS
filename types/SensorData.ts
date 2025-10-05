export enum ActivityStatus {
  RESTING = "Resting",
  WALKING = "Walking", 
  PLAYING = "Playing",
  UNUSUAL = "Unusual Activity"
}

export interface DogHealthData {
  heartRate: number;
  dangerMode: boolean;
  highActivity: boolean;
  timestamp?: number;
}

export interface SensorData {
  timestamp: number;
  latitude: number;
  longitude: number;
  heartRate: number;
  bodyTemperature: number;
  activityStatus: ActivityStatus;
  ambientTemperature: number;
  // Additional vital signs
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  respiratoryRate?: number;
  oxygenSaturation?: number;
  // Danger and activity states
  dangerMode: boolean;
  highActivity: boolean;
  // Crash detection
  crashDetected?: boolean;
  suddenMovement?: boolean;
}
