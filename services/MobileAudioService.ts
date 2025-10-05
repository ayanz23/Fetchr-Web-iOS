// MobileAudioService.ts - Handles mobile-specific audio initialization and permissions

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface MobileAudioConfig {
  isMobile: boolean;
  isCapacitor: boolean;
  isIOS: boolean;
  isAndroid: boolean;
}

class MobileAudioService {
  private static instance: MobileAudioService;
  private config: MobileAudioConfig;
  private audioInitialized = false;
  private initializationPromise: Promise<boolean> | null = null;

  private constructor() {
    this.config = {
      isMobile: Capacitor.isNativePlatform(),
      isCapacitor: Capacitor.isNativePlatform(),
      isIOS: Capacitor.getPlatform() === 'ios',
      isAndroid: Capacitor.getPlatform() === 'android'
    };
  }

  public static getInstance(): MobileAudioService {
    if (!MobileAudioService.instance) {
      MobileAudioService.instance = new MobileAudioService();
    }
    return MobileAudioService.instance;
  }

  public getConfig(): MobileAudioConfig {
    return { ...this.config };
  }

  public isMobile(): boolean {
    return this.config.isMobile;
  }

  public isCapacitor(): boolean {
    return this.config.isCapacitor;
  }

  public isIOS(): boolean {
    return this.config.isIOS;
  }

  public isAndroid(): boolean {
    return this.config.isAndroid;
  }

  /**
   * Initialize audio system for mobile devices
   * This must be called after user interaction (button click, etc.)
   */
  public async initializeAudio(): Promise<boolean> {
    if (this.audioInitialized) {
      return true;
    }

    // If there's already an initialization in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitializeAudio();
    const result = await this.initializationPromise;
    this.initializationPromise = null;
    
    return result;
  }

  private async _doInitializeAudio(): Promise<boolean> {
    try {
      if (!this.config.isMobile) {
        // For web, audio should work without special initialization
        this.audioInitialized = true;
        return true;
      }

      // For mobile devices, we need to request permissions and initialize audio context
      if (this.config.isCapacitor) {
        // Request notification permissions for alerts
        try {
          const permission = await LocalNotifications.requestPermissions();
          // Notification permissions granted
        } catch (error) {
          // Failed to request notification permissions
        }
      }

      // Audio context will be initialized by ElevenLabsService when needed
      // This service just ensures we have the right permissions
      this.audioInitialized = true;
      return true;

    } catch (error) {
      // Failed to initialize mobile audio
      this.audioInitialized = false;
      return false;
    }
  }

  /**
   * Check if audio is ready for playback
   */
  public isAudioReady(): boolean {
    return this.audioInitialized;
  }

  /**
   * Show a mobile-friendly alert
   */
  public async showMobileAlert(title: string, message: string, type: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
    if (this.config.isCapacitor) {
      try {
        // Use Capacitor's local notifications for mobile alerts
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body: message,
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 1000) },
              sound: type === 'error' ? 'default' : undefined,
              actionTypeId: 'ALERT_ACTION',
              extra: {
                type
              }
            }
          ]
        });
      } catch (error) {
        // Silently handle mobile alert errors
      }
    } else {
      // For web, silently handle alerts
    }
  }

  /**
   * Initialize audio on user interaction
   * Call this when user clicks a button or interacts with the app
   */
  public async onUserInteraction(): Promise<boolean> {
    if (!this.audioInitialized) {
      return await this.initializeAudio();
    }
    return true;
  }

  /**
   * Reset audio initialization (useful for testing or error recovery)
   */
  public reset(): void {
    this.audioInitialized = false;
    this.initializationPromise = null;
  }
}

export default MobileAudioService;
