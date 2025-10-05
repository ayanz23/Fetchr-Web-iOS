import React, { useMemo, useRef, useState, useEffect } from 'react';
import GeminiChatService, { ChatMessage } from '../../services/GeminiChatService';
import PetService from '../../services/PetService';
import SensorDataService, { PetSensorData } from '../../services/SensorDataService';
import ElevenLabsService from '../../services/ElevenLabsService';
import MobileAudioService from '../../services/MobileAudioService';
import { Pet } from '../../types/Pet';
import { ActivityStatus } from '../../types/SensorData';
import { useVoiceAlerts } from '../../hooks/useVoiceAlerts';
import './Chatbot.css';

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  // FIXED: Start with empty messages array
  // The greeting will be displayed separately
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [sensorData, setSensorData] = useState<PetSensorData | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const elevenLabsService = useRef(ElevenLabsService.getInstance());
  const mobileAudioService = useRef(MobileAudioService.getInstance());

  // Initialize audio system when chatbot opens
  const initializeAudioSystem = async () => {
    if (audioInitialized) return;
    
    console.log('[Chatbot] Initializing audio system...');
    try {
      // Initialize mobile audio service first
      if (mobileAudioService.current.isMobile()) {
        const mobileInit = await mobileAudioService.current.onUserInteraction();
        if (mobileInit) {
          console.log('[Chatbot] Mobile audio initialized successfully');
        }
      }
      
      // Initialize ElevenLabs audio context
      const elevenLabsInit = await elevenLabsService.current.initializeAudioContext();
      if (elevenLabsInit) {
        console.log('[Chatbot] ElevenLabs audio context initialized successfully');
      }
      
      setAudioInitialized(true);
      console.log('[Chatbot] Audio system fully initialized');
    } catch (error) {
      console.error('[Chatbot] Failed to initialize audio system:', error);
    }
  };

  // Initialize voice alerts
  useVoiceAlerts();


  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  // Helper function to speak text
  const speakText = async (text: string) => {
    if (!ttsEnabled) {
      console.log('[Chatbot] TTS disabled');
      return;
    }

    if (!elevenLabsService.current.isConfigured()) {
      console.warn('[Chatbot] ElevenLabs not configured - check API key');
      return;
    }

    try {
      console.log('[Chatbot] Starting TTS for text:', text.substring(0, 50) + '...');
      
      // Audio system should already be initialized when chatbot opens
      if (!audioInitialized) {
        console.warn('[Chatbot] Audio system not initialized - this should not happen');
        return;
      }

      console.log('[Chatbot] Playing text with ElevenLabs...');
      const success = await elevenLabsService.current.playText(text);
      console.log('[Chatbot] TTS result:', success ? 'SUCCESS' : 'FAILED');
    } catch (error) {
      console.error('[Chatbot] TTS error:', error);
    }
  };


  // Load pets when component mounts
  useEffect(() => {
    const loadPets = async () => {
      try {
        const petsData = await PetService.getPets();
        setPets(petsData);
        if (petsData.length > 0) {
          setSelectedPet(petsData[0]); // Select first pet by default
        }
      } catch (error) {
      }
    };

    loadPets();
  }, []);


  // Subscribe to sensor data for the selected pet
  useEffect(() => {
    if (!selectedPet) return;

    const unsubscribe = SensorDataService.subscribeToDogHealth(
      (data) => {
        const petSensorData: PetSensorData = {
          petId: selectedPet.id,
          timestamp: data.timestamp || Date.now(),
          heartRate: data.heartRate,
          bodyTemperature: 0, // Not used - using ambientTemperature instead
          activityStatus: data.highActivity ? ActivityStatus.UNUSUAL : ActivityStatus.RESTING,
          ambientTemperature: 70, // Hardcoded environment temperature
          bloodPressure: { systolic: 0, diastolic: 0 },
          respiratoryRate: 0,
          oxygenSaturation: 0,
          dangerMode: data.dangerMode,
          highActivity: data.highActivity,
          crashDetected: data.highActivity,
          suddenMovement: data.highActivity,
          latitude: 0,
          longitude: 0
        };
        setSensorData(petSensorData);
      },
      5000 // Update every 5 seconds
    );

    return () => unsubscribe();
  }, [selectedPet]);


  const sendMessage = async () => {
    if (!canSend) return;
    
    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);
    
    
    try {
      const reply = await GeminiChatService.sendMessage(
        [...messages, userMessage], 
        selectedPet, 
        sensorData
      );
      const assistantMessage = { role: 'assistant' as const, content: reply };
      setMessages((prev) => [...prev, assistantMessage]);
      
      // Speak the assistant's response
      await speakText(reply);
    } catch (e: any) {
      const errorMessage = `Sorry, I ran into an error: ${e.message || 'Unknown error'}. Please try again.`;
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: errorMessage
      }]);
      
      // Speak the error message too
      await speakText(errorMessage);
    } finally {
      setIsSending(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
    }
  };

  return (
    <>
      <button 
        className="chatbot-fab" 
        onClick={async () => {
          // Initialize audio system when opening chatbot
          await initializeAudioSystem();
          setIsOpen(true);
        }} 
        aria-label="Open chatbot"
      >
        💬
      </button>
      {isOpen && (
        <>
          <div className="chatbot-modal-backdrop" onClick={() => setIsOpen(false)} />
          <div className="chatbot-modal" role="dialog" aria-modal="true" aria-label="AI Chatbot">
            <div className="chatbot-header">
              <div className="chatbot-title">
                {selectedPet ? `🐾 ${selectedPet.name}'s Assistant` : '🐾 Pet Assistant'}
              </div>
              <div className="chatbot-controls">
                <button 
                  className={`tts-toggle ${ttsEnabled ? 'enabled' : 'disabled'}`}
                  onClick={() => setTtsEnabled(!ttsEnabled)}
                  title={ttsEnabled ? 'Disable voice' : 'Enable voice'}
                >
                  {ttsEnabled ? '🔊' : '🔇'}
                </button>
                <button className="chatbot-close" onClick={() => setIsOpen(false)} aria-label="Close">×</button>
              </div>
            </div>
            
            {/* Pet selector if multiple pets */}
            {pets.length > 1 && (
              <div className="chatbot-pet-selector">
                <label>Select Pet:</label>
                <select 
                  value={selectedPet?.id || ''} 
                  onChange={(e) => {
                    const pet = pets.find(p => p.id === e.target.value);
                    setSelectedPet(pet || null);
                    setMessages([]); // Clear conversation when switching pets
                  }}
                >
                  {pets.map(pet => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name} ({pet.breed})
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="chatbot-messages">
              {/* Display initial greeting if no messages yet */}
              {messages.length === 0 && (
                <div className="chat-msg assistant">
                  {selectedPet ? (
                    <>
                      Hi! I'm Fetchr, {selectedPet.name}'s personal care assistant! 🐾<br/>
                      I'm here to help you take the best care of your {selectedPet.breed}. 
                      {sensorData && sensorData.dangerMode && (
                        <><br/><br/>⚠️ I notice {selectedPet.name} is in danger mode - let's address this right away!</>
                      )}
                      <br/><br/>How can I help you today?
                    </>
                  ) : (
                    <>
                      Hi! I'm Fetchr, your pet care assistant! 🐾<br/>
                      I'm here to help you take the best care of your furry friend.<br/><br/>
                      How can I help you today?
                    </>
                  )}
                </div>
              )}
              
              {messages.map((m, idx) => (
                <div key={idx} className={`chat-msg ${m.role}`}>{m.content}</div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="chatbot-input">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedPet ? `Ask about ${selectedPet.name}...` : "Ask about your pet..."}
                onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
              />
              <button onClick={sendMessage} disabled={!canSend}>{isSending ? 'Sending...' : 'Send'}</button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Chatbot;