export interface AppUser {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  tags?: string[];
  createdAt?: string;
}

export interface UserProfile extends AppUser {
  pets?: string[]; // Array of pet IDs
  location?: string;
  isOnline?: boolean;
  lastSeen?: string;
}
