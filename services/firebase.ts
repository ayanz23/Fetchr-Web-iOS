import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth, GoogleAuthProvider, indexedDBLocalPersistence, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from 'firebase/database';
import { firebaseConfig } from '../config/firebase.config';


const app = initializeApp(firebaseConfig);

// Analytics is not supported in native apps, only in web
if (typeof window !== 'undefined' && window.location.protocol !== 'capacitor:') {
  try {
    getAnalytics(app);
  } catch (error) {
  }
} else {
}

// Use initializeAuth for better Capacitor compatibility
let auth: Auth;
try {
  // Try to initialize auth with proper persistence for native apps
  if (typeof window !== 'undefined' && window.location.protocol === 'capacitor:') {
    // For iOS, we need to handle the case where auth might already be initialized
    try {
      auth = initializeAuth(app, {
        persistence: indexedDBLocalPersistence
      });
    } catch (initError: any) {
      if (initError.code === 'auth/already-initialized') {
        auth = getAuth(app);
      } else {
        throw initError;
      }
    }
  } else {
    auth = getAuth(app);
  }
} catch (error) {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);

export const storage = getStorage(app);

export const realtimeDb = getDatabase(app);

export const googleProvider = new GoogleAuthProvider();


export default app;
