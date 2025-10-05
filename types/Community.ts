export interface CommunityPost {
  id: string;
  userID: string;
  authorName: string;
  postText: string;
  imageURL?: string;
  timestamp: string; // ISO string from server
  likes?: string[]; // array of user IDs who liked
  tag?: string; // post flair/tag
}

export interface CreatePostPayload {
  postText: string;
  imageFile?: File | null;
  tag?: string;
}

export interface LikeResponse {
  success: boolean;
  likes: string[];
}


