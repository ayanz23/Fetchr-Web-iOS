import React, { useState, useRef } from 'react';
import ElevenLabsService from '../../services/ElevenLabsService';
import PetTranslatorService from '../../services/PetTranslatorService';
import './PetTranslator.css';

interface PetAnalysisResult {
  petType: string;
  mood: string;
  confidence: number;
  recommendation: string;
  annotatedImage?: string;
}

const PetTranslator: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PetAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const elevenLabsService = ElevenLabsService.getInstance();


  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      analyzePetImage(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      analyzePetImage(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const analyzePetImage = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const service = PetTranslatorService.getInstance();
      const result = await service.analyzePetImage(file);
      setResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze pet image');
    } finally {
      setIsLoading(false);
    }
  };

  const playVoiceResult = async () => {
    if (!result) return;

    setIsPlaying(true);
    try {
      // Ensure ElevenLabs AudioContext is initialized before playing
      if (!elevenLabsService.isAudioContextReady()) {
        const contextInitialized = await elevenLabsService.initializeAudioContext();
        if (!contextInitialized) {
          setError('Failed to initialize audio system. Please try again.');
          return;
        }
      }

      const textToSpeak = `I detected a ${result.petType} that appears to be ${result.mood} with ${Math.round(result.confidence * 100)}% confidence. ${result.recommendation}`;
      
      const success = await elevenLabsService.playText(textToSpeak, {
        voiceSettings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      });

      if (!success) {
        setError('Voice playback failed. Please try again.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Voice playback failed: ${errorMessage}`);
    } finally {
      setIsPlaying(false);
    }
  };


  const resetAnalysis = () => {
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="pet-translator">
      <div className="pet-translator-header">
        <h1>🐾 Pet Translator</h1>
        <p>Upload a photo of your pet to analyze their mood and get personalized recommendations</p>
        
      </div>

      <div className="pet-translator-content">
        {!result && !error && (
          <div 
            className="upload-area"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-content">
              <div className="upload-icon">📸</div>
              <h3>Upload Pet Photo</h3>
              <p>Drag and drop an image here or click to select</p>
              <p className="upload-hint">Supports JPG, PNG, and other image formats</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        )}

        {isLoading && (
          <div className="loading-container">
            <div className="loading-spinner">
              <div className="paw-icon">🐾</div>
            </div>
            <p>Analyzing your pet's mood...</p>
            <p className="loading-hint">This may take a few moments</p>
          </div>
        )}

        {error && (
          <div className="error-container">
            <div className="error-icon">❌</div>
            <h3>Analysis Failed</h3>
            <p>{error}</p>
            <button className="retry-button" onClick={resetAnalysis}>
              Try Again
            </button>
          </div>
        )}

        {result && (
          <div className="result-container">
            <div className="result-header">
              <h2>Analysis Complete! 🎉</h2>
              <button className="new-analysis-button" onClick={resetAnalysis}>
                Analyze Another Pet
              </button>
            </div>

            <div className="result-content">
              <div className="pet-info">
                <div className="info-card">
                  <div className="info-icon">🐕</div>
                  <div className="info-content">
                    <h3>Pet Type</h3>
                    <p className="info-value">{result.petType}</p>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">😊</div>
                  <div className="info-content">
                    <h3>Mood</h3>
                    <p className="info-value">{result.mood}</p>
                    <p className="confidence">Confidence: {Math.round(result.confidence * 100)}%</p>
                  </div>
                </div>
              </div>

              <div className="recommendation-card">
                <div className="recommendation-header">
                  <h3>💡 Recommendation</h3>
                  <button 
                    className="voice-button"
                    onClick={playVoiceResult}
                    disabled={isPlaying}
                  >
                    {isPlaying ? '🔊 Playing...' : '🔊 Play Voice'}
                  </button>
                </div>
                <p className="recommendation-text">{result.recommendation}</p>
              </div>

              {result.annotatedImage && (
                <div className="annotated-image">
                  <h3>Annotated Image</h3>
                  <img 
                    src={result.annotatedImage} 
                    alt="Pet analysis with annotations"
                    className="result-image"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PetTranslator;
