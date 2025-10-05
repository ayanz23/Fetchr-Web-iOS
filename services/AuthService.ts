import { 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';
import { AppUser } from '../types/User';
import UserService from './UserService';

class AuthService {
  private static instance: AuthService;
  private authStateListeners: ((user: AppUser | null) => void)[] = [];

  private constructor() {
    // Test connectivity
    this.testConnectivity();
    
    // Initialize auth state listener
    onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        const appUser = firebaseUser ? await this.convertFirebaseUser(firebaseUser) : null;
        this.authStateListeners.forEach(listener => listener(appUser));
      } catch (error) {
        // Still notify listeners with null to prevent infinite loading
        this.authStateListeners.forEach(listener => listener(null));
      }
    }, (error) => {
      // Notify listeners with null to prevent infinite loading
      this.authStateListeners.forEach(listener => listener(null));
    });
  }

  private async testConnectivity() {
    try {
      await fetch('https://www.google.com', { 
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
    } catch (error) {
      // Connectivity test failed
    }
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async signInWithGoogle(): Promise<AppUser> {
    try {
      // Check if we're in a native environment
      if (typeof window !== 'undefined' && window.location.protocol === 'capacitor:') {
        throw new Error('Google Sign-In is not supported in native apps. Please use email/password authentication.');
      }
      
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check if user document exists in Firestore, if not create it
      await this.ensureUserDocument(result.user);
      
      return await this.convertFirebaseUser(result.user);
    } catch (error) {
      throw error;
    }
  }

  async signInWithEmailAndPassword(email: string, password: string): Promise<AppUser> {
    try {
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Authentication timeout - please check your internet connection'));
        }, 15000); // 15 second timeout
      });
      
      const authPromise = signInWithEmailAndPassword(auth, email, password);
      const result = await Promise.race([authPromise, timeoutPromise]);
      
      
      // Ensure user document exists in Firestore
      await this.ensureUserDocument(result.user);
      
      const appUser = await this.convertFirebaseUser(result.user);
      return appUser;
    } catch (error: any) {
      throw error;
    }
  }

  async signUpWithEmailAndPassword(email: string, password: string, fullName: string): Promise<AppUser> {
    try {
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Sign up timeout - please check your internet connection'));
        }, 15000); // 15 second timeout
      });
      
      const authPromise = createUserWithEmailAndPassword(auth, email, password);
      const result = await Promise.race([authPromise, timeoutPromise]);
      
      
      // Update the user's display name
      await updateProfile(result.user, {
        displayName: fullName
      });
      
      // Create user profile using UserService
      const userData: AppUser = {
        id: result.user.uid,
        displayName: fullName,
        email: result.user.email || '',
        createdAt: new Date().toISOString()
      };
      
      await UserService.createOrUpdateUserProfile(userData);
      
      const appUser = await this.convertFirebaseUser(result.user);
      return appUser;
    } catch (error: any) {
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  }

  async getIdToken(): Promise<string | null> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;
      return await currentUser.getIdToken();
    } catch (error) {
      return null;
    }
  }

  async getCurrentUser(): Promise<AppUser | null> {
    const currentUser = auth.currentUser;
    return currentUser ? await this.convertFirebaseUser(currentUser) : null;
  }

  onAuthStateChange(callback: (user: AppUser | null) => void): () => void {
    this.authStateListeners.push(callback);
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  private async ensureUserDocument(firebaseUser: FirebaseUser): Promise<void> {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      // If user document doesn't exist, create it using UserService
      if (!userDoc.exists()) {
        const userData: AppUser = {
          id: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'Unknown User',
          email: firebaseUser.email || '',
          createdAt: new Date().toISOString()
        };
        
        await UserService.createOrUpdateUserProfile(userData);
      }
    } catch (error) {
      // Error ensuring user document
    }
  }

  private async convertFirebaseUser(firebaseUser: FirebaseUser): Promise<AppUser> {
    try {
      // Try to get full user profile from Firestore
      const userProfile = await UserService.getUserProfile(firebaseUser.uid);
      if (userProfile) {
        return userProfile;
      }
    } catch (error) {
      // Error fetching user profile from Firestore
    }
    
    // Fallback to basic user data from Firebase Auth
    return {
      id: firebaseUser.uid,
      displayName: firebaseUser.displayName || 'Unknown User',
      email: firebaseUser.email || ''
    };
  }
}

export default AuthService.getInstance();
