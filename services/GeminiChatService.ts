// GeminiChatService.ts

import { Pet } from '../types/Pet';
import { PetSensorData } from './SensorDataService';
import NetworkConfigService from './NetworkConfig';

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

// Retaining this interface, although its use depends on whether 
// your UI is set up for chunked (streaming) responses.
export interface ChatResponseChunk {
  text?: string;
}

// --- PROXY ENDPOINT ---
// Use NetworkConfigService for proper environment detection
const networkConfig = NetworkConfigService.getInstance();
const PROXY_API_URL = networkConfig.getApiUrl('/api/generate-content');

export default class GeminiChatService {
  
  static async sendMessage(
    messages: ChatMessage[], 
    petData?: Pet | null, 
    sensorData?: PetSensorData | null
  ): Promise<string> {
    // Basic check, though the backend also validates this.
    if (!messages || messages.length === 0) {
      throw new Error('Message history cannot be empty.');
    }
    
    // 1. Prepare the request body with pet and sensor data.
    const body = JSON.stringify({ 
      messages,
      petData: petData || null,
      sensorData: sensorData || null
    });


    // 2. Make the fetch call to the local proxy server with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(PROXY_API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return await this.handleResponse(response);
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out - please check your internet connection');
      }
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed')) {
        if (networkConfig.getConfig().isNative) {
          const connectionInfo = await this.getConnectionInfo();
          throw new Error(`Unable to connect to Pet Assistant API.\n\nConnection Info:
- URL: ${connectionInfo.url}
- Platform: ${connectionInfo.isIOS ? 'iOS' : 'Android'}
- Connection Test: ${connectionInfo.testResult ? 'PASSED' : 'FAILED'}
${connectionInfo.error ? `- Error: ${connectionInfo.error}` : ''}

${networkConfig.getConnectionInstructions()}`);
        } else {
          throw new Error('Unable to connect to Pet Assistant API - please check your internet connection');
        }
      }
      
      throw error;
    }
  }

  // Helper method to test server connectivity
  static async testConnection(): Promise<boolean> {
    return await networkConfig.testConnection();
  }

  // Helper method to get connection instructions
  static getConnectionInstructions(): string {
    return networkConfig.getConnectionInstructions();
  }

  // Helper method to get detailed connection info for debugging
  static async getConnectionInfo(): Promise<{ 
    url: string; 
    isNative: boolean; 
    isIOS: boolean; 
    testResult: boolean;
    error?: string;
  }> {
    const config = networkConfig.getConfig();
    const url = networkConfig.getApiUrl('/api/health');
    
    try {
      const testResult = await networkConfig.testConnection();
      return {
        url,
        isNative: config.isNative,
        isIOS: config.isNative && typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent),
        testResult
      };
    } catch (error) {
      return {
        url,
        isNative: config.isNative,
        isIOS: config.isNative && typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent),
        testResult: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static async handleResponse(response: Response): Promise<string> {
    // 3. Handle errors from the proxy (e.g., Status 400, 500)
    if (!response.ok) {
      // Attempt to read the detailed error from the proxy
      let errorDetails = 'Check server console logs for details.';
      try {
        const errorData = await response.json();
        errorDetails = errorData.error || errorData.details || errorDetails;
      } catch (e) {
        // If it fails to parse JSON, it's a generic proxy error
        errorDetails = `Proxy returned non-JSON error (Status ${response.status}).`;
      }
      
      
      throw new Error(`Pet Assistant API failed (Status ${response.status}): ${errorDetails}`);
    }

    // 4. Parse the successful JSON response from the proxy.
    const data = await response.json();
    
    // 5. CRITICAL CHECK: Ensure the 'content' property is present and non-empty.
    if (!data || typeof data.content !== 'string' || data.content.trim() === '') {
        // This is the line that was throwing your original error.
        // It's still a catch-all for bad data structure.
        return 'No text content was returned by the Pet Assistant API.';
    }

    return data.content;
  }
}