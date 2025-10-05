// PetTranslatorService.ts - Service for pet mood analysis using Python ML models

export interface PetAnalysisResult {
  petType: string;
  mood: string;
  confidence: number;
  recommendation: string;
  annotatedImage?: string;
}

export interface PetTranslatorConfig {
  pythonScriptPath: string;
  modelPath: string;
  tempImagePath: string;
}

class PetTranslatorService {
  private static instance: PetTranslatorService;
  private config: PetTranslatorConfig;

  private constructor() {
    this.config = {
      pythonScriptPath: './scripts/pet_translator.py',
      modelPath: './models/',
      tempImagePath: './temp/'
    };
  }

  public static getInstance(): PetTranslatorService {
    if (!PetTranslatorService.instance) {
      PetTranslatorService.instance = new PetTranslatorService();
    }
    return PetTranslatorService.instance;
  }

  /**
   * Analyze a pet image using the Python ML script
   */
  public async analyzePetImage(imageFile: File): Promise<PetAnalysisResult> {
    try {
      // Convert file to base64 for transmission
      const base64Image = await this.fileToBase64(imageFile);
      
      // For now, we'll simulate the analysis since we can't directly run Python
      // In a real implementation, you would:
      // 1. Send the image to a backend API that runs the Python script
      // 2. Or use a serverless function (AWS Lambda, Vercel Functions, etc.)
      // 3. Or use a service like Google Cloud Vision API with custom models
      
      const result = await this.simulatePetAnalysis(base64Image, imageFile.name);
      return result;
      
    } catch (error) {
      console.error('Pet analysis error:', error);
      throw new Error('Failed to analyze pet image. Please try again.');
    }
  }

  /**
   * Convert File to base64 string
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/...;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Simulate pet analysis (replace with actual API call)
   * This is a mock implementation that simulates the Python script output
   */
  private async simulatePetAnalysis(base64Image: string, fileName: string): Promise<PetAnalysisResult> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Hardcoded happy dogs with varying confidence intervals
    const happyDogResults = [
      {
        petType: "dog",
        mood: "happy",
        confidence: 0.95,
        recommendation: "Your dog is absolutely thrilled! Take them for a long walk or play fetch in the park 🎾"
      },
      {
        petType: "dog",
        mood: "happy",
        confidence: 0.88,
        recommendation: "Your dog is beaming with joy! They'd love some belly rubs and a game of tug-of-war 🐕"
      },
      {
        petType: "dog",
        mood: "happy",
        confidence: 0.92,
        recommendation: "Your dog is wagging with happiness! Give them some treats and let them sniff around the yard 🐶"
      },
      {
        petType: "dog",
        mood: "happy",
        confidence: 0.89,
        recommendation: "Your dog is in great spirits! They'd enjoy some mental stimulation and exercise 🐕‍🦺"
      },
      {
        petType: "dog",
        mood: "happy",
        confidence: 0.94,
        recommendation: "Your dog is radiating happiness! Challenge them with some puzzle toys or agility exercises 🎯"
      },
      {
        petType: "dog",
        mood: "happy",
        confidence: 0.91,
        recommendation: "Your dog is absolutely delighted! They'd love some grooming time and a fun training session ✨"
      },
      {
        petType: "dog",
        mood: "happy",
        confidence: 0.87,
        recommendation: "Your dog is content and cheerful! Give them some gentle playtime and lots of love 🐾"
      },
      {
        petType: "dog",
        mood: "happy",
        confidence: 0.93,
        recommendation: "Your dog is full of joy! They'd love a long run or some outdoor play if available ❄️"
      },
      {
        petType: "dog",
        mood: "happy",
        confidence: 0.90,
        recommendation: "Your dog is beaming with happiness! They'd enjoy some interactive games or frisbee 🥏"
      },
      {
        petType: "dog",
        mood: "happy",
        confidence: 0.86,
        recommendation: "Your dog is absolutely joyful! They'd love some cuddle time and gentle play 🐕"
      }
    ];

    // Randomly select a happy dog result
    const randomResult = happyDogResults[Math.floor(Math.random() * happyDogResults.length)];
    
    // Create annotated image URL from base64
    const annotatedImage = `data:image/jpeg;base64,${base64Image}`;

    return {
      ...randomResult,
      annotatedImage
    };
  }

  /**
   * Call actual Python script via backend API
   * This is the method you would implement when you have a backend service
   */
  private async callPythonScript(base64Image: string): Promise<PetAnalysisResult> {
    const response = await fetch('/api/pet-translator/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image
      })
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Analysis failed');
    }

    return {
      petType: result.petType,
      mood: result.mood,
      confidence: result.confidence,
      recommendation: result.recommendation,
      annotatedImage: result.annotatedImage
    };
  }

  /**
   * Call Python script directly (for development/testing)
   * This requires a backend service that can execute Python scripts
   */
  private async callPythonScriptDirect(imagePath: string): Promise<PetAnalysisResult> {
    // This would typically call a backend endpoint that executes the Python script
    // For now, we'll return a mock result
    const response = await fetch('/api/execute-python-script', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scriptPath: this.config.pythonScriptPath,
        imagePath: imagePath
      })
    });

    if (!response.ok) {
      throw new Error(`Python script execution failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Python script execution failed');
    }

    return {
      petType: result.petType,
      mood: result.mood,
      confidence: result.confidence,
      recommendation: result.recommendation,
      annotatedImage: result.annotatedImage
    };
  }

  /**
   * Get recommendation based on pet type and mood
   */
  private getRecommendation(petType: string, mood: string): string {
    const rules: { [key: string]: string } = {
      "dog_happy": "Take your dog for a walk or play fetch 🎾",
      "dog_tired": "Let your dog rest and provide fresh water 💧",
      "dog_playful": "Engage with toys to burn energy 🐕",
      "dog_anxious": "Check if something is stressing your dog 😟",
      "cat_happy": "Give your cat some toys or treats 🐱✨",
      "cat_tired": "Let your cat nap in a quiet spot 💤",
      "cat_playful": "Play with a laser pointer or string toy 🎯",
      "cat_anxious": "Make sure the environment is calm 🐱😟"
    };

    const key = `${petType}_${mood}`;
    return rules[key] || "Keep monitoring your pet.";
  }

  /**
   * Validate image file
   */
  public validateImageFile(file: File): { isValid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (file.size > maxSize) {
      return { isValid: false, error: 'Image file is too large. Maximum size is 10MB.' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Invalid file type. Please upload a JPG, PNG, or WebP image.' };
    }

    return { isValid: true };
  }
}

export default PetTranslatorService;
