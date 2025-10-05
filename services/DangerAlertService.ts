// DangerAlertService.ts - Handles voice alerts for danger conditions

import ElevenLabsService from './ElevenLabsService';
import MobileAudioService from './MobileAudioService';
import { PetSensorData } from './SensorDataService';
import { Pet } from '../types/Pet';
import { ELEVENLABS_CONFIG } from '../config/elevenlabs.config';

// Alert callback type for external alert systems
export type AlertCallback = (alert: {
  type: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actions?: { label: string; onClick: () => void }[];
}) => void;

export interface DangerCondition {
  type: 'danger_mode' | 'high_activity' | 'crash_detected' | 'temperature_danger' | 'heart_rate_danger';
  message: string;
  priority: 'high' | 'medium' | 'low';
}

class DangerAlertService {
  private static instance: DangerAlertService;
  private elevenLabsService: ElevenLabsService;
  private mobileAudioService: MobileAudioService;
  private lastAlertTime: Map<string, number> = new Map();
  private alertCooldown = 10000; // 10 seconds cooldown between same alerts
  private isPlaying = false;
  private alertCallback: AlertCallback | null = null;

  private constructor() {
    this.elevenLabsService = ElevenLabsService.getInstance();
    this.mobileAudioService = MobileAudioService.getInstance();
  }

  public static getInstance(): DangerAlertService {
    if (!DangerAlertService.instance) {
      DangerAlertService.instance = new DangerAlertService();
    }
    return DangerAlertService.instance;
  }

  public async checkAndAlert(sensorData: PetSensorData, pet: Pet): Promise<void> {
    if (!this.elevenLabsService.isConfigured()) {
      return;
    }

    const conditions = this.analyzeDangerConditions(sensorData, pet);
    
    for (const condition of conditions) {
      await this.playAlert(condition);
    }
  }

  private analyzeDangerConditions(sensorData: PetSensorData, pet: Pet): DangerCondition[] {
    const conditions: DangerCondition[] = [];

    // Danger mode (highest priority)
    if (sensorData.dangerMode) {
      conditions.push({
        type: 'danger_mode',
        message: `Alert! ${pet.name} is in danger mode. Heart rate is critically high or low. Immediate attention required.`,
        priority: 'high'
      });
    }

    // High activity / Crash detection
    if (sensorData.highActivity || sensorData.crashDetected) {
      conditions.push({
        type: 'high_activity',
        message: `Warning! ${pet.name} has detected sudden movement or possible crash. Please check on your pet immediately.`,
        priority: 'high'
      });
    }

    // Heart rate analysis
    if (sensorData.heartRate) {
      if (sensorData.heartRate > 150) {
        conditions.push({
          type: 'heart_rate_danger',
          message: `Alert! ${pet.name}'s heart rate is dangerously high at ${sensorData.heartRate} beats per minute.`,
          priority: 'high'
        });
      } else if (sensorData.heartRate < 40) {
        conditions.push({
          type: 'heart_rate_danger',
          message: `Alert! ${pet.name}'s heart rate is dangerously low at ${sensorData.heartRate} beats per minute.`,
          priority: 'high'
        });
      }
    }

    // Temperature analysis (using hardcoded 70°F for now)
    const temperature = 70; // This would come from sensorData.ambientTemperature when available
    if (temperature < 20) {
      conditions.push({
        type: 'temperature_danger',
        message: `Danger! Environment temperature is dangerously cold at ${temperature} degrees. ${pet.name} is at risk of hypothermia.`,
        priority: 'high'
      });
    } else if (temperature > 95) {
      conditions.push({
        type: 'temperature_danger',
        message: `Danger! Environment temperature is dangerously hot at ${temperature} degrees. ${pet.name} is at risk of heatstroke.`,
        priority: 'high'
      });
    } else if (temperature < 32) {
      conditions.push({
        type: 'temperature_danger',
        message: `Warning! Environment temperature is very cold at ${temperature} degrees. Monitor ${pet.name} for frostbite risk.`,
        priority: 'medium'
      });
    } else if (temperature > 85) {
      conditions.push({
        type: 'temperature_danger',
        message: `Warning! Environment temperature is hot at ${temperature} degrees. Monitor ${pet.name} for heat exhaustion.`,
        priority: 'medium'
      });
    }

    return conditions;
  }

  private async playAlert(condition: DangerCondition): Promise<void> {
    const alertKey = condition.type;
    const now = Date.now();
    const lastAlert = this.lastAlertTime.get(alertKey) || 0;

    // Check cooldown
    if (now - lastAlert < this.alertCooldown) {
      return;
    }

    // Skip if already playing
    if (this.isPlaying) {
      return;
    }

    try {
      this.isPlaying = true;
      this.lastAlertTime.set(alertKey, now);
      
      // Show in-app alert if callback is set
      if (this.alertCallback) {
        this.alertCallback({
          type: condition.priority === 'high' ? 'danger' : 'warning',
          title: this.getAlertTitle(condition.type),
          message: condition.message,
          priority: condition.priority,
          actions: [
            {
              label: 'OK',
              onClick: () => {}
            }
          ]
        });
      }
      
      // Add urgency to the voice based on priority
      const voiceSettings = condition.priority === 'high' 
        ? ELEVENLABS_CONFIG.VOICE_SETTINGS.alert 
        : ELEVENLABS_CONFIG.VOICE_SETTINGS.normal;

      // Try to play voice alert, but don't fail if AudioContext isn't initialized
      try {
        // For mobile devices, ensure audio is initialized
        if (this.mobileAudioService.isMobile()) {
          const audioReady = await this.mobileAudioService.onUserInteraction();
          if (!audioReady) {
            console.log('Mobile audio not ready for danger alert, skipping voice playback');
            return;
          }
        }

        // Check if AudioContext is ready, if not, skip voice
        if (!this.elevenLabsService.isAudioContextReady()) {
          console.log('AudioContext not ready for danger alert, skipping voice playback');
          return;
        }

        await this.elevenLabsService.playText(condition.message, {
          voiceSettings,
          showAlert: false, // We're handling alerts manually here
          alertTitle: this.getAlertTitle(condition.type)
        });
      } catch (audioError) {
        // Silently handle audio errors - visual alert is still shown
        console.log('Voice alert failed, visual alert still active:', audioError);
      }

    } catch (error) {
      // Silently handle alert errors
    } finally {
      this.isPlaying = false;
    }
  }

  public async playCustomAlert(message: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<void> {
    if (!this.elevenLabsService.isConfigured()) {
      return;
    }

    const condition: DangerCondition = {
      type: 'danger_mode', // Use a generic type for custom alerts
      message,
      priority
    };

    await this.playAlert(condition);
  }

  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  public setAlertCooldown(seconds: number): void {
    this.alertCooldown = seconds * 1000;
  }

  public clearAlertHistory(): void {
    this.lastAlertTime.clear();
  }

  // Set alert callback for in-app notifications
  public setAlertCallback(callback: AlertCallback | null): void {
    this.alertCallback = callback;
  }

  // Helper method to get alert titles
  private getAlertTitle(conditionType: string): string {
    switch (conditionType) {
      case 'danger_mode':
        return '🚨 Danger Mode';
      case 'high_activity':
        return '⚠️ High Activity';
      case 'crash_detected':
        return '💥 Crash Detected';
      case 'temperature_danger':
        return '🌡️ Temperature Alert';
      case 'heart_rate_danger':
        return '💓 Heart Rate Alert';
      default:
        return '⚠️ Pet Alert';
    }
  }
}

export default DangerAlertService;
