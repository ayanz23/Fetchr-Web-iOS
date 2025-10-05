export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt: string;
}

export interface Friendship {
  id: string;
  userId1: string;
  userId2: string;
  createdAt: string;
}

export interface FriendshipWithProfile {
  id: string;
  friend: {
    id: string;
    displayName: string;
    email: string;
    photoURL?: string;
    bio?: string;
    location?: string;
    tags?: string[];
    isOnline?: boolean;
    lastSeen?: string;
  };
  createdAt: string;
}

export interface FriendRequestWithUser extends FriendRequest {
  fromUser?: {
    id: string;
    displayName: string;
    email: string;
    photoURL?: string;
    bio?: string;
    location?: string;
    tags?: string[];
    isOnline?: boolean;
    lastSeen?: string;
  };
  toUser?: {
    id: string;
    displayName: string;
    email: string;
    photoURL?: string;
    bio?: string;
    location?: string;
    tags?: string[];
    isOnline?: boolean;
    lastSeen?: string;
  };
}

export interface FriendshipStats {
  friendsCount: number;
  pendingRequestsCount: number;
  sentRequestsCount: number;
}

export interface FriendshipSubscription {
  unsubscribe: () => void;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';
