import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  serverTimestamp,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { CommunityPost, LikeResponse } from '../types';
import AuthService from './AuthService';
import StorageService from './StorageService';

export async function fetchPosts(): Promise<CommunityPost[]> {
  try {
    const postsRef = collection(db, 'communityPosts');
    
    // Try with orderBy first, fallback to simple query if index is missing
    let querySnapshot;
    try {
      const q = query(postsRef, orderBy('timestamp', 'desc'));
      querySnapshot = await getDocs(q);
    } catch (indexError) {
      // Fallback: fetch all posts and sort in JavaScript
      querySnapshot = await getDocs(postsRef);
    }
    
    const posts: CommunityPost[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        userID: data.userID || '',
        authorName: data.authorName || 'Unknown',
        postText: data.postText || '',
        imageURL: data.imageURL || undefined,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp || new Date().toISOString(),
        likes: data.likes || [],
        tag: data.tag || undefined
      });
    });
    
    // Sort by timestamp in descending order (newest first) if not already sorted by Firestore
    posts.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });
    return posts;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch posts: ${errorMessage}`);
  }
}

export async function likePost(postId: string): Promise<LikeResponse> {
  try {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to like posts');
    }

    const postRef = doc(db, 'communityPosts', postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      throw new Error('Post not found');
    }

    const postData = postDoc.data();
    const likedBy = postData.likes || [];
    const isLiked = likedBy.includes(currentUser.id);

    if (isLiked) {
      // Unlike the post
      await updateDoc(postRef, {
        likes: arrayRemove(currentUser.id)
      });
    } else {
      // Like the post
      await updateDoc(postRef, {
        likes: arrayUnion(currentUser.id)
      });
    }

    const updatedLikedBy = isLiked 
      ? likedBy.filter((id: string) => id !== currentUser.id)
      : [...likedBy, currentUser.id];

    return {
      success: true,
      likes: updatedLikedBy
    };
  } catch (error) {
    throw new Error('Failed to like post');
  }
}

export async function createPost(formData: FormData): Promise<CommunityPost> {
  try {
    const currentUser = await AuthService.getCurrentUser();
    
    if (!currentUser) {
      throw new Error('User must be authenticated to create posts');
    }

    const content = formData.get('postText') as string;
    const imageFile = formData.get('image') as File | null;
    const tag = formData.get('tag') as string | null;

    let imageUrl: string | undefined = undefined;
    
    // Handle image upload if present
    if (imageFile && imageFile.size > 0) {
      
      // Validate the image file
      const validation = StorageService.validateImageFile(imageFile);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid image file');
      }
      
      // Upload to Firebase Storage
      imageUrl = await StorageService.uploadPostImage(imageFile, currentUser.id);
    }

    const postData = {
      postText: content,
      authorName: currentUser.displayName,
      userID: currentUser.id,
      timestamp: serverTimestamp(),
      likes: [],
      imageURL: imageUrl,
      tag: tag || undefined
    };

    const docRef = await addDoc(collection(db, 'communityPosts'), postData);
    
    return {
      id: docRef.id,
      userID: currentUser.id,
      authorName: currentUser.displayName,
      postText: content,
      imageURL: imageUrl,
      timestamp: new Date().toISOString(),
      likes: [],
      tag: tag || undefined
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to create post: ${errorMessage}`);
  }
}

export async function deletePost(postId: string): Promise<void> {
  try {
    const currentUser = await AuthService.getCurrentUser();
    
    if (!currentUser) {
      throw new Error('User must be authenticated to delete posts');
    }

    const postRef = doc(db, 'communityPosts', postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      throw new Error('Post not found');
    }

    const postData = postDoc.data();
    
    // Check if the current user is the author of the post
    if (postData.userID !== currentUser.id) {
      throw new Error('You can only delete your own posts');
    }

    // Delete the post document
    await deleteDoc(postRef);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to delete post: ${errorMessage}`);
  }
}


