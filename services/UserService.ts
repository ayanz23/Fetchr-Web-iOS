import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, AppUser } from '../types/User';

export class UserService {
  private static readonly USERS_COLLECTION = 'users';

  // Get user profile by ID
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Add timeout for Firestore operations
      const getDocPromise = getDoc(doc(db, this.USERS_COLLECTION, userId));
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout - please check your internet connection'));
        }, 10000); // 10 second timeout
      });

      const userDoc = await Promise.race([getDocPromise, timeoutPromise]);
      
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as UserProfile;
      }
      
      return null;
    } catch (error: any) {
      const errorCode = (error as any)?.code || 'unknown';
      
      // Handle specific Firestore errors
      if (errorCode === 'permission-denied') {
        throw new Error('You do not have permission to access this user profile');
      } else if (errorCode === 'unavailable') {
        throw new Error('Service temporarily unavailable - please try again');
      }
      
      throw new Error('Failed to get user profile');
    }
  }

  // Get user profile by ID, creating it if it doesn't exist
  static async getOrCreateUserProfile(user: AppUser): Promise<UserProfile> {
    try {
      let userProfile = await this.getUserProfile(user.id);
      
      if (!userProfile) {
        // Create a new user profile
        const newProfile: UserProfile = {
          ...user,
          tags: user.tags || [],
          pets: [],
          isOnline: true,
          lastSeen: new Date().toISOString()
        };
        
        await this.createOrUpdateUserProfile(newProfile);
        userProfile = newProfile;
      }
      
      return userProfile;
    } catch (error) {
      throw new Error('Failed to get or create user profile');
    }
  }

  // Create or update user profile
  static async createOrUpdateUserProfile(user: AppUser): Promise<void> {
    try {
      const userRef = doc(db, this.USERS_COLLECTION, user.id);
      await setDoc(userRef, {
        ...user,
        createdAt: user.createdAt || new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      throw new Error('Failed to create/update user profile');
    }
  }

  // Note: Friendship-related methods have been moved to FriendshipService
  // This service now only handles basic user profile operations

  // Update user tags
  static async updateUserTags(userId: string, tags: string[]): Promise<void> {
    try {
      const userRef = doc(db, this.USERS_COLLECTION, userId);
      await updateDoc(userRef, { tags });
    } catch (error) {
      throw new Error('Failed to update user tags');
    }
  }

  // Update user online status
  static async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      const userRef = doc(db, this.USERS_COLLECTION, userId);
      await updateDoc(userRef, { 
        isOnline,
        lastSeen: new Date().toISOString()
      });
    } catch (error) {
      // Don't throw error for online status updates as it's not critical
    }
  }
}

export default UserService;
