import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  or,
  onSnapshot,
  Unsubscribe,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { FriendRequest, Friendship, FriendshipWithProfile } from '../types/Friendship';
import { UserProfile } from '../types/User';
import UserService from './UserService';

export class FriendshipService {
  private static readonly FRIEND_REQUESTS_COLLECTION = 'friendRequests';
  private static readonly FRIENDSHIPS_COLLECTION = 'friendships';

  // Send a friend request
  static async sendFriendRequest(fromUserId: string, toUserId: string): Promise<string> {
    try {
      // Check if users are already friends
      const existingFriendship = await this.getFriendship(fromUserId, toUserId);
      if (existingFriendship) {
        throw new Error('Users are already friends');
      }

      // Check if there's already a pending request
      const existingRequest = await this.getPendingFriendRequest(fromUserId, toUserId);
      if (existingRequest) {
        throw new Error('Friend request already sent');
      }

      // Check if there's a pending request from the other user
      const reverseRequest = await this.getPendingFriendRequest(toUserId, fromUserId);
      if (reverseRequest) {
        throw new Error('This user has already sent you a friend request');
      }

      // Create friend request
      const friendRequest: Omit<FriendRequest, 'id'> = {
        fromUserId,
        toUserId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, this.FRIEND_REQUESTS_COLLECTION), friendRequest);
      return docRef.id;
    } catch (error) {
      throw error;
    }
  }

  // Get pending friend request between two users
  static async getPendingFriendRequest(fromUserId: string, toUserId: string): Promise<FriendRequest | null> {
    try {
      const q = query(
        collection(db, this.FRIEND_REQUESTS_COLLECTION),
        where('fromUserId', '==', fromUserId),
        where('toUserId', '==', toUserId),
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as FriendRequest;
    } catch (error) {
      throw error;
    }
  }

  // Accept a friend request
  static async acceptFriendRequest(requestId: string): Promise<void> {
    try {
      const requestRef = doc(db, this.FRIEND_REQUESTS_COLLECTION, requestId);
      const requestDoc = await getDoc(requestRef);

      if (!requestDoc.exists()) {
        throw new Error('Friend request not found');
      }

      const requestData = requestDoc.data() as FriendRequest;
      
      if (requestData.status !== 'pending') {
        throw new Error('Friend request is not pending');
      }

      // Update request status
      await updateDoc(requestRef, {
        status: 'accepted',
        updatedAt: new Date().toISOString()
      });

      // Create friendship
      await this.createFriendship(requestData.fromUserId, requestData.toUserId);
    } catch (error) {
      throw error;
    }
  }

  // Decline a friend request
  static async declineFriendRequest(requestId: string): Promise<void> {
    try {
      const requestRef = doc(db, this.FRIEND_REQUESTS_COLLECTION, requestId);
      const requestDoc = await getDoc(requestRef);

      if (!requestDoc.exists()) {
        throw new Error('Friend request not found');
      }

      const requestData = requestDoc.data() as FriendRequest;
      
      if (requestData.status !== 'pending') {
        throw new Error('Friend request is not pending');
      }

      // Update request status
      await updateDoc(requestRef, {
        status: 'declined',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      throw error;
    }
  }

  // Create a friendship between two users
  static async createFriendship(userId1: string, userId2: string): Promise<string> {
    try {
      // Ensure consistent ordering of user IDs for friendship
      const [smallerId, largerId] = [userId1, userId2].sort();
      
      const friendship: Omit<Friendship, 'id'> = {
        userId1: smallerId,
        userId2: largerId,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, this.FRIENDSHIPS_COLLECTION), friendship);
      return docRef.id;
    } catch (error) {
      throw error;
    }
  }

  // Get friendship between two users
  static async getFriendship(userId1: string, userId2: string): Promise<Friendship | null> {
    try {
      const [smallerId, largerId] = [userId1, userId2].sort();
      
      const q = query(
        collection(db, this.FRIENDSHIPS_COLLECTION),
        where('userId1', '==', smallerId),
        where('userId2', '==', largerId)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Friendship;
    } catch (error) {
      throw error;
    }
  }

  // Remove a friendship
  static async removeFriendship(userId1: string, userId2: string): Promise<void> {
    try {
      const friendship = await this.getFriendship(userId1, userId2);
      if (!friendship) {
        throw new Error('Friendship not found');
      }

      await deleteDoc(doc(db, this.FRIENDSHIPS_COLLECTION, friendship.id));
    } catch (error) {
      throw error;
    }
  }

  // Get all friendships for a user
  static async getUserFriendships(userId: string): Promise<FriendshipWithProfile[]> {
    try {
      const q = query(
        collection(db, this.FRIENDSHIPS_COLLECTION),
        or(
          where('userId1', '==', userId),
          where('userId2', '==', userId)
        ),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const friendships: FriendshipWithProfile[] = [];

      for (const doc of querySnapshot.docs) {
        const friendshipData = doc.data() as Friendship;
        const friendId = friendshipData.userId1 === userId ? friendshipData.userId2 : friendshipData.userId1;
        
        try {
          const friendProfile = await UserService.getUserProfile(friendId);
          if (friendProfile) {
            friendships.push({
              id: doc.id,
              friend: {
                id: friendProfile.id,
                displayName: friendProfile.displayName,
                email: friendProfile.email,
                photoURL: friendProfile.photoURL,
                bio: friendProfile.bio,
                location: friendProfile.location,
                tags: friendProfile.tags,
                isOnline: friendProfile.isOnline,
                lastSeen: friendProfile.lastSeen
              },
              createdAt: friendshipData.createdAt
            });
          }
        } catch (profileError) {
          // Continue with other friendships even if one profile fails
        }
      }

      return friendships;
    } catch (error: any) {
console.error('Error getting user friendships:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'failed-precondition') {
        return [];
      } else if (error.code === 'permission-denied') {
        return [];
      } else if (error.code === 'unavailable') {
        return [];
      }
      
      throw error;
    }
  }

  // Get pending friend requests for a user (received)
  static async getPendingFriendRequests(userId: string): Promise<(FriendRequest & { fromUser: UserProfile })[]> {
    try {
      const q = query(
        collection(db, this.FRIEND_REQUESTS_COLLECTION),
        where('toUserId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const requests: (FriendRequest & { fromUser: UserProfile })[] = [];

      for (const doc of querySnapshot.docs) {
        const requestData = doc.data() as FriendRequest;
        try {
          const fromUser = await UserService.getUserProfile(requestData.fromUserId);
          
          if (fromUser) {
            requests.push({
              ...requestData,
              id: doc.id,
              fromUser
            });
          }
        } catch (profileError) {
          // Continue with other requests even if one profile fails
        }
      }

      return requests;
    } catch (error: any) {
console.error('Error getting pending friend requests:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'failed-precondition') {
        return [];
      } else if (error.code === 'permission-denied') {
        return [];
      } else if (error.code === 'unavailable') {
        return [];
      }
      
      throw error;
    }
  }

  // Get sent friend requests for a user
  static async getSentFriendRequests(userId: string): Promise<(FriendRequest & { toUser: UserProfile })[]> {
    try {
      const q = query(
        collection(db, this.FRIEND_REQUESTS_COLLECTION),
        where('fromUserId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const requests: (FriendRequest & { toUser: UserProfile })[] = [];

      for (const doc of querySnapshot.docs) {
        const requestData = doc.data() as FriendRequest;
        try {
          const toUser = await UserService.getUserProfile(requestData.toUserId);
          
          if (toUser) {
            requests.push({
              ...requestData,
              id: doc.id,
              toUser
            });
          }
        } catch (profileError) {
          // Continue with other requests even if one profile fails
        }
      }

      return requests;
    } catch (error: any) {
console.error('Error getting sent friend requests:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'failed-precondition') {
        return [];
      } else if (error.code === 'permission-denied') {
        return [];
      } else if (error.code === 'unavailable') {
        return [];
      }
      
      throw error;
    }
  }

  // Get recommended friends (excluding existing friends and pending requests)
  static async getRecommendedFriends(userId: string, limitCount: number = 3): Promise<UserProfile[]> {
    try {
      console.log('Starting getRecommendedFriends for user:', userId);
      
      // Get all users - try with orderBy first, fallback to basic query if it fails
      let querySnapshot;
      try {
        const usersQuery = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        querySnapshot = await getDocs(usersQuery);
        console.log('Successfully queried users with orderBy');
      } catch (orderByError: any) {
        // If orderBy fails (likely due to missing index), fallback to basic query
        console.warn('OrderBy query failed, using basic query:', orderByError);
        const basicQuery = query(
          collection(db, 'users'),
          limit(50)
        );
        querySnapshot = await getDocs(basicQuery);
        console.log('Successfully queried users with basic query');
      }
      
      const allUsers: UserProfile[] = [];
      
      querySnapshot.forEach((doc) => {
        const userData = { id: doc.id, ...doc.data() } as UserProfile;
        if (userData.id !== userId) {
          allUsers.push(userData);
        }
      });
      
      console.log('Found users in database:', allUsers.length);

      // Get user's friends
      const friendships = await this.getUserFriendships(userId);
      const friendIds = friendships.map(f => f.friend.id);

      // Get pending requests (both sent and received)
      const [pendingReceived, pendingSent] = await Promise.all([
        this.getPendingFriendRequests(userId),
        this.getSentFriendRequests(userId)
      ]);
      
      const pendingUserIds = [
        ...pendingReceived.map(r => r.fromUser.id),
        ...pendingSent.map(r => r.toUser.id)
      ];

      // Filter out friends and pending requests
      const recommendedUsers = allUsers.filter(user => 
        !friendIds.includes(user.id) && 
        !pendingUserIds.includes(user.id)
      );

      console.log('Recommended friends debug:', {
        totalUsers: allUsers.length,
        friendIds: friendIds.length,
        pendingUserIds: pendingUserIds.length,
        filteredUsers: recommendedUsers.length,
        finalRecommendations: recommendedUsers.slice(0, limitCount).length
      });

      const finalRecommendations = recommendedUsers.slice(0, limitCount);
      
      // If no recommendations found, log additional debug info
      if (finalRecommendations.length === 0) {
        console.warn('No recommended friends found. Possible reasons:');
        console.warn('- No users in database:', allUsers.length === 0);
        console.warn('- All users are already friends or have pending requests');
        console.warn('- User is trying to recommend themselves');
      }

      return finalRecommendations;
    } catch (error: any) {
console.error('Error getting recommended friends:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'failed-precondition') {
        return [];
      } else if (error.code === 'permission-denied') {
        return [];
      } else if (error.code === 'unavailable') {
        return [];
      }
      
      throw error;
    }
  }

  // Check if two users are friends
  static async areFriends(userId1: string, userId2: string): Promise<boolean> {
    try {
      const friendship = await this.getFriendship(userId1, userId2);
      return friendship !== null;
    } catch (error) {
      return false;
    }
  }

  // Check if there's a pending request between two users
  static async hasPendingRequest(userId1: string, userId2: string): Promise<boolean> {
    try {
      const [request1, request2] = await Promise.all([
        this.getPendingFriendRequest(userId1, userId2),
        this.getPendingFriendRequest(userId2, userId1)
      ]);
      return request1 !== null || request2 !== null;
    } catch (error) {
      return false;
    }
  }

  // Real-time listener for friend requests (received)
  static subscribeToFriendRequests(
    userId: string, 
    callback: (requests: (FriendRequest & { fromUser: UserProfile })[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, this.FRIEND_REQUESTS_COLLECTION),
      where('toUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, async (querySnapshot) => {
      const requests: (FriendRequest & { fromUser: UserProfile })[] = [];
      
      for (const doc of querySnapshot.docs) {
        const requestData = doc.data() as FriendRequest;
        try {
          const fromUser = await UserService.getUserProfile(requestData.fromUserId);
          
          if (fromUser) {
            requests.push({
              ...requestData,
              id: doc.id,
              fromUser
            });
          }
        } catch (profileError) {
        }
      }

      callback(requests);
    }, (error) => {
      callback([]);
    });
  }

  // Real-time listener for sent friend requests
  static subscribeToSentFriendRequests(
    userId: string, 
    callback: (requests: (FriendRequest & { toUser: UserProfile })[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, this.FRIEND_REQUESTS_COLLECTION),
      where('fromUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, async (querySnapshot) => {
      const requests: (FriendRequest & { toUser: UserProfile })[] = [];
      
      for (const doc of querySnapshot.docs) {
        const requestData = doc.data() as FriendRequest;
        try {
          const toUser = await UserService.getUserProfile(requestData.toUserId);
          
          if (toUser) {
            requests.push({
              ...requestData,
              id: doc.id,
              toUser
            });
          }
        } catch (profileError) {
        }
      }

      callback(requests);
    }, (error) => {
      callback([]);
    });
  }

  // Real-time listener for friendships
  static subscribeToFriendships(
    userId: string, 
    callback: (friendships: FriendshipWithProfile[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, this.FRIENDSHIPS_COLLECTION),
      or(
        where('userId1', '==', userId),
        where('userId2', '==', userId)
      ),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, async (querySnapshot) => {
      const friendships: FriendshipWithProfile[] = [];

      for (const doc of querySnapshot.docs) {
        const friendshipData = doc.data() as Friendship;
        const friendId = friendshipData.userId1 === userId ? friendshipData.userId2 : friendshipData.userId1;
        
        try {
          const friendProfile = await UserService.getUserProfile(friendId);
          if (friendProfile) {
            friendships.push({
              id: doc.id,
              friend: {
                id: friendProfile.id,
                displayName: friendProfile.displayName,
                email: friendProfile.email,
                photoURL: friendProfile.photoURL,
                bio: friendProfile.bio,
                location: friendProfile.location,
                tags: friendProfile.tags,
                isOnline: friendProfile.isOnline,
                lastSeen: friendProfile.lastSeen
              },
              createdAt: friendshipData.createdAt
            });
          }
        } catch (profileError) {
        }
      }

      callback(friendships);
    }, (error) => {
      callback([]);
    });
  }

  // Cancel a friend request (for the sender)
  static async cancelFriendRequest(requestId: string): Promise<void> {
    try {
      const requestRef = doc(db, this.FRIEND_REQUESTS_COLLECTION, requestId);
      const requestDoc = await getDoc(requestRef);

      if (!requestDoc.exists()) {
        throw new Error('Friend request not found');
      }

      const requestData = requestDoc.data() as FriendRequest;
      
      if (requestData.status !== 'pending') {
        throw new Error('Friend request is not pending');
      }

      await deleteDoc(requestRef);
    } catch (error) {
      throw error;
    }
  }

  // Bulk accept friend requests
  static async bulkAcceptFriendRequests(requestIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      for (const requestId of requestIds) {
        const requestRef = doc(db, this.FRIEND_REQUESTS_COLLECTION, requestId);
        const requestDoc = await getDoc(requestRef);

        if (requestDoc.exists()) {
          const requestData = requestDoc.data() as FriendRequest;
          
          if (requestData.status === 'pending') {
            // Update request status
            batch.update(requestRef, {
              status: 'accepted',
              updatedAt: new Date().toISOString()
            });

            // Create friendship
            const friendshipRef = doc(collection(db, this.FRIENDSHIPS_COLLECTION));
            const [smallerId, largerId] = [requestData.fromUserId, requestData.toUserId].sort();
            
            batch.set(friendshipRef, {
              userId1: smallerId,
              userId2: largerId,
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      await batch.commit();
    } catch (error) {
      throw error;
    }
  }

  // Get friendship statistics
  static async getFriendshipStats(userId: string): Promise<{
    friendsCount: number;
    pendingRequestsCount: number;
    sentRequestsCount: number;
  }> {
    try {
      const [friendships, pendingRequests, sentRequests] = await Promise.all([
        this.getUserFriendships(userId),
        this.getPendingFriendRequests(userId),
        this.getSentFriendRequests(userId)
      ]);

      return {
        friendsCount: friendships.length,
        pendingRequestsCount: pendingRequests.length,
        sentRequestsCount: sentRequests.length
      };
    } catch (error) {
      return {
        friendsCount: 0,
        pendingRequestsCount: 0,
        sentRequestsCount: 0
      };
    }
  }
}

export default FriendshipService;
