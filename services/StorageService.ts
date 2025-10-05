import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

class StorageService {
  private static instance: StorageService;

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Upload an image file to Firebase Storage
   * @param file - The image file to upload
   * @param path - The storage path (e.g., 'posts/images/')
   * @returns Promise<string> - The download URL of the uploaded image
   */
  async uploadImage(file: File, path: string): Promise<string> {
    try {

      // Validate file before upload
      const validation = this.validateImageFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid file');
      }

      // Create a unique filename to avoid conflicts
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const fullPath = `${path}${fileName}`;
      
      // Create a reference to the file location
      const imageRef = ref(storage, fullPath);
      
      // Add timeout for upload operation
      const uploadPromise = uploadBytes(imageRef, file);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Upload timeout - please check your internet connection'));
        }, 60000); // 60 second timeout for uploads
      });

      const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
      
      // Get the download URL with timeout
      const urlPromise = getDownloadURL(snapshot.ref);
      const urlTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Failed to get download URL - please try again'));
        }, 15000); // 15 second timeout for URL generation
      });

      const downloadURL = await Promise.race([urlPromise, urlTimeoutPromise]);
      
      return downloadURL;
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as any)?.code || 'unknown';
      
      // Handle specific Firebase Storage errors
      if (errorCode === 'storage/unauthorized') {
        throw new Error('You do not have permission to upload files');
      } else if (errorCode === 'storage/canceled') {
        throw new Error('Upload was canceled');
      } else if (errorCode === 'storage/invalid-format') {
        throw new Error('Invalid file format');
      } else if (errorCode === 'storage/invalid-checksum') {
        throw new Error('File upload failed - please try again');
      }
      
      throw new Error(`Failed to upload image: ${errorMessage}`);
    }
  }

  /**
   * Upload a post image
   * @param file - The image file
   * @param userId - The user ID for organizing files
   * @returns Promise<string> - The download URL
   */
  async uploadPostImage(file: File, userId: string): Promise<string> {
    const path = `posts/${userId}/`;
    return this.uploadImage(file, path);
  }

  /**
   * Upload a pet profile image
   * @param file - The image file
   * @param userId - The user ID
   * @param petId - The pet ID
   * @returns Promise<string> - The download URL
   */
  async uploadPetImage(file: File, userId: string, petId: string): Promise<string> {
    const path = `pets/${userId}/${petId}/`;
    return this.uploadImage(file, path);
  }

  /**
   * Delete an image from Firebase Storage
   * @param imageUrl - The download URL of the image to delete
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      
      // Extract the path from the URL
      const url = new URL(imageUrl);
      const path = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);
      
      // Create a reference to the file
      const imageRef = ref(storage, path);
      
      // Delete the file
      await deleteObject(imageRef);
    } catch (error) {
      // Don't throw error for delete failures as the image might not exist
    }
  }

  /**
   * Validate image file
   * @param file - The file to validate
   * @returns boolean - Whether the file is valid
   */
  validateImageFile(file: File): { isValid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { isValid: false, error: 'File must be an image' };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { isValid: false, error: 'Image must be smaller than 10MB' };
    }

    // Check file size (min 1KB)
    const minSize = 1024; // 1KB
    if (file.size < minSize) {
      return { isValid: false, error: 'Image file is too small' };
    }

    return { isValid: true };
  }
}

export default StorageService.getInstance();
