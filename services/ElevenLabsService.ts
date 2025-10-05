// ElevenLabsService.ts - Text-to-Speech service using ElevenLabs API

import { ELEVENLABS_CONFIG } from '../config/elevenlabs.config';

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  modelId: string;
}

export interface TTSOptions {
  voiceId?: string;
  modelId?: string;
  voiceSettings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  showAlert?: boolean; // Whether to show an in-app alert when voice plays
  alertTitle?: string; // Custom title for the alert
}

// Event types for voice playback
export interface VoicePlaybackEvent {
  type: 'voice_start' | 'voice_end' | 'voice_error';
  text: string;
  timestamp: number;
  alertTitle?: string;
}

type VoiceEventListener = (event: VoicePlaybackEvent) => void;

class ElevenLabsService {
  private static instance: ElevenLabsService;
  private config: ElevenLabsConfig;
  private audioContext: AudioContext | null = null;
  private isPlaying = false;
  private eventListeners: Set<VoiceEventListener> = new Set();
  private isIOS = false;
  private isCapacitor = false;

  private constructor() {
    // Use configuration from config file
    this.config = {
      apiKey: process.env.REACT_APP_ELEVENLABS_API_KEY || ELEVENLABS_CONFIG.API_KEY || 'YOUR_ELEVENLABS_API_KEY_HERE',
      voiceId: ELEVENLABS_CONFIG.VOICE_ID,
      modelId: ELEVENLABS_CONFIG.MODEL_ID
    };
    
    // Detect iOS and Capacitor environment
    this.detectEnvironment();
  }

  private detectEnvironment(): void {
    if (typeof window !== 'undefined') {
      this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      this.isCapacitor = window.location.protocol === 'capacitor:';
    }
  }

  private logError(message: string, error?: any): void {
    console.error(`[ElevenLabsService] ${message}`, error || '');
  }

  private logInfo(message: string, data?: any): void {
    console.log(`[ElevenLabsService] ${message}`, data || '');
  }

  public static getInstance(): ElevenLabsService {
    if (!ElevenLabsService.instance) {
      ElevenLabsService.instance = new ElevenLabsService();
    }
    return ElevenLabsService.instance;
  }

  public setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  public setVoiceId(voiceId: string): void {
    this.config.voiceId = voiceId;
  }

  public setModelId(modelId: string): void {
    this.config.modelId = modelId;
  }

  public getConfig(): ElevenLabsConfig {
    return { ...this.config };
  }

  public isConfigured(): boolean {
    const isConfigured = this.config.apiKey.length > 0 && this.config.apiKey !== 'YOUR_ELEVENLABS_API_KEY_HERE';
    this.logInfo(`ElevenLabs configured: ${isConfigured}`, { 
      apiKeyLength: this.config.apiKey.length,
      hasValidKey: this.config.apiKey !== 'YOUR_ELEVENLABS_API_KEY_HERE'
    });
    return isConfigured;
  }

  /**
   * Initialize audio context with user interaction (required for iOS)
   * Call this method on user interaction (button click, etc.)
   */
  public async initializeAudioContext(): Promise<boolean> {
    try {
      if (!this.audioContext) {
        // Create audio context with proper settings for mobile
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass({
          sampleRate: 44100,
          latencyHint: 'interactive'
        });
      }

      // For iOS and mobile devices, ensure audio context is resumed
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Additional mobile-specific setup
      if (this.isIOS || this.isCapacitor) {
        // Set up audio session for mobile
        try {
          // Ensure we can play audio even when device is in silent mode
          if (this.audioContext.state === 'running') {
            // Audio context initialized successfully for mobile
          }
        } catch (mobileError) {
          this.logError('Mobile audio setup failed', mobileError);
        }
      }

      return true;
    } catch (error) {
      this.logError('Failed to initialize audio context', error);
      return false;
    }
  }

  /**
   * Check if audio context is ready for playback
   */
  public isAudioContextReady(): boolean {
    return this.audioContext !== null && this.audioContext.state === 'running';
  }

  /**
   * Check if audio context exists but is suspended
   */
  public isAudioContextSuspended(): boolean {
    return this.audioContext !== null && this.audioContext.state === 'suspended';
  }

  public async textToSpeech(
    text: string, 
    options: TTSOptions = {},
    retryCount = 0
  ): Promise<AudioBuffer | null> {
    if (!this.isConfigured()) {
      this.logError('ElevenLabs not configured');
      return null;
    }

    if (!text || text.trim().length === 0) {
      this.logError('Empty text provided');
      return null;
    }

    // Validate text length (ElevenLabs has character limits)
    const trimmedText = text.trim();
    if (trimmedText.length > 5000) {
      this.logError('Text too long for ElevenLabs API');
      throw new Error('Text is too long for ElevenLabs API. Maximum 5000 characters allowed.');
    }

    // Truncate text if it's getting close to the limit and add ellipsis
    const processedText = trimmedText.length > 4000 ? trimmedText.substring(0, 4000) + '...' : trimmedText;

    try {
      const voiceId = options.voiceId || this.config.voiceId;
      const modelId = options.modelId || this.config.modelId;
      
      const requestBody = {
        text: processedText,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          ...options.voiceSettings
        }
      };

      // Enhanced fetch configuration for iOS/Capacitor
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.config.apiKey,
          // Add additional headers for iOS compatibility
          'User-Agent': this.isIOS ? 'Fetchr-iOS/1.0' : 'Fetchr-Web/1.0',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify(requestBody),
        // Add timeout for iOS network requests
        signal: AbortSignal.timeout(30000) // 30 second timeout
      };

      // For iOS/Capacitor, add additional network configuration
      if (this.isIOS || this.isCapacitor) {
        // Ensure we're using HTTPS and handle potential network issues
        fetchOptions.cache = 'no-cache';
        fetchOptions.redirect = 'follow';
      }
      
      this.logInfo(`Making ElevenLabs API request to: https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
      this.logInfo(`Request body: ${JSON.stringify(requestBody)}`);
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, fetchOptions);

      // ElevenLabs API Response received


      this.logInfo(`ElevenLabs API response status: ${response.status}`);
      this.logInfo(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

      if (!response.ok) {
        let errorData = {};
        try {
          const responseText = await response.text();
          this.logError(`Error response text: ${responseText}`);
          errorData = JSON.parse(responseText);
        } catch (parseError) {
          this.logError('Failed to parse error response', parseError);
        }
        
        let errorMessage = `ElevenLabs API error: ${response.status}`;
        if (response.status === 401) {
          errorMessage += ' - Unauthorized. Check your API key.';
        } else if (response.status === 429) {
          errorMessage += ' - Rate limit exceeded.';
        } else if (response.status === 0 || response.status === undefined) {
          // Network error - common on iOS with network restrictions
          errorMessage += ' - Network error. Check internet connection and firewall settings.';
        } else if (response.status >= 500) {
          errorMessage += ' - Server error. ElevenLabs API may be experiencing issues.';
        } else if (errorData && typeof errorData === 'object' && 'detail' in errorData) {
          errorMessage += ` - ${errorData.detail}`;
        } else {
          errorMessage += ' - Unknown error';
        }
        
        this.logError('ElevenLabs API error', { 
          status: response.status, 
          statusText: response.statusText,
          errorData,
          isIOS: this.isIOS,
          isCapacitor: this.isCapacitor
        });
        throw new Error(errorMessage);
      }
      
      // Check content type to ensure we're getting audio data
      const contentType = response.headers.get('content-type');
      
      if (!contentType || !contentType.includes('audio')) {
        this.logError('Unexpected content type', { contentType });
        throw new Error('ElevenLabs API returned non-audio content. Check your request parameters.');
      }

      const audioData = await response.arrayBuffer();
      
      
      // Check if we received empty audio data
      if (audioData.byteLength === 0) {
        this.logError('Received empty audio data from ElevenLabs API');
        
        // If this is a retry attempt, don't retry again
        if (retryCount > 0) {
          throw new Error('ElevenLabs API returned empty audio data after retry. This could be due to API quota exceeded, invalid voice ID, or text length issues.');
        }
        
        // Try once more with a shorter text if the original was long
        if (processedText.length > 1000) {
          const shorterText = processedText.substring(0, 500) + '...';
          return await this.textToSpeech(shorterText, options, retryCount + 1);
        }
        
        throw new Error('ElevenLabs API returned empty audio data. This could be due to API quota exceeded, invalid voice ID, or text length issues.');
      }
      
      // Audio context should be initialized by user interaction before calling this method
      if (!this.audioContext) {
        this.logError('AudioContext not initialized. Call initializeAudioContext() after user interaction first.');
        throw new Error('AudioContext not initialized. Please initialize audio system first.');
      }

      // For iOS, ensure audio context is in correct state
      if (this.isIOS && this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
        } catch (error) {
          this.logError('Failed to resume AudioContext', error);
          throw new Error('Failed to resume audio context. Please try again.');
        }
      }

      // Decode audio data
      try {
        const audioBuffer = await this.audioContext.decodeAudioData(audioData);
        return audioBuffer;
      } catch (decodeError) {
        this.logError('Failed to decode audio data', decodeError);
        throw new Error('Failed to decode audio data. The audio format may be unsupported.');
      }

    } catch (error) {
      this.logError('textToSpeech failed', error);
      throw error; // Re-throw the error instead of returning null
    }
  }

  public async playText(text: string, options: TTSOptions = {}): Promise<boolean> {
    if (this.isPlaying) {
      return false;
    }

    // Emit voice start event
    this.emitEvent({
      type: 'voice_start',
      text,
      timestamp: Date.now(),
      alertTitle: options.alertTitle
    });

    let audioBuffer: AudioBuffer | null;
    try {
      audioBuffer = await this.textToSpeech(text, options);
      if (!audioBuffer) {
        this.logError('Failed to get audio buffer from textToSpeech');
        this.emitEvent({
          type: 'voice_error',
          text,
          timestamp: Date.now(),
          alertTitle: options.alertTitle
        });
        return false;
      }
    } catch (error) {
      this.logError('textToSpeech failed', error);
      this.emitEvent({
        type: 'voice_error',
        text,
        timestamp: Date.now(),
        alertTitle: options.alertTitle
      });
      return false;
    }

    const success = await this.playAudioBuffer(audioBuffer!);
    
    // Emit voice end event
    this.emitEvent({
      type: 'voice_end',
      text,
      timestamp: Date.now(),
      alertTitle: options.alertTitle
    });

    return success;
  }

  public async playAudioBuffer(audioBuffer: AudioBuffer): Promise<boolean> {
    if (!this.audioContext) {
      this.logError('No AudioContext available');
      return false;
    }

    if (this.isPlaying) {
      return false;
    }

    try {
      this.isPlaying = true;
      
      // For iOS/Capacitor, ensure we have user interaction context
      if (this.isIOS || this.isCapacitor) {
        // Resume audio context if suspended (required for user interaction)
        if (this.audioContext.state === 'suspended') {
          try {
            await this.audioContext.resume();
          } catch (error) {
            this.logError('Failed to resume AudioContext', error);
            this.isPlaying = false;
            return false;
          }
        }
      }
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Create a gain node for volume control
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 1.0; // Full volume
      
      // Connect: source -> gain -> destination
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      return new Promise((resolve) => {
        source.onended = () => {
          this.isPlaying = false;
          resolve(true);
        };
        
        try {
          // For iOS, use currentTime to ensure proper scheduling
          const startTime = this.audioContext!.currentTime;
          source.start(startTime);
          
        } catch (error) {
          this.logError('Failed to start audio source', error);
          this.isPlaying = false;
          resolve(false);
        }
      });

    } catch (error) {
      this.logError('playAudioBuffer failed', error);
      this.isPlaying = false;
      return false;
    }
  }

  public stop(): void {
    this.isPlaying = false;
    // Note: We can't stop individual audio sources easily with this approach
    // For a more robust solution, we'd need to track active sources
  }


  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  // Event system methods
  public addEventListener(listener: VoiceEventListener): void {
    this.eventListeners.add(listener);
  }

  public removeEventListener(listener: VoiceEventListener): void {
    this.eventListeners.delete(listener);
  }

  private emitEvent(event: VoicePlaybackEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in voice event listener:', error);
      }
    });
  }

  // Helper method to get available voices (for future use)
  public async getVoices(): Promise<any[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      return [];
    }
  }

  // Helper method to check API quota and usage
  public async checkQuota(): Promise<{ remaining: number; total: number; resetDate?: string } | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: {
          'xi-api-key': this.config.apiKey
        }
      });

      if (!response.ok) {
        this.logError('Failed to fetch user info', { status: response.status });
        return null;
      }

      const data = await response.json();

      return {
        remaining: (data.character_limit || 0) - (data.character_count || 0),
        total: data.character_limit || 0,
        resetDate: data.subscription?.next_character_count_reset_unix
      };
    } catch (error) {
      this.logError('Failed to check quota', error);
      return null;
    }
  }
}

export default ElevenLabsService;
