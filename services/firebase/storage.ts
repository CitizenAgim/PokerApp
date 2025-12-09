import { storage } from '@/config/firebase';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

/**
 * Uploads a player photo to Firebase Storage.
 * Returns the download URL.
 */
export async function uploadPlayerPhoto(userId: string, playerId: string, uri: string): Promise<string> {
  try {
    // 1. Convert URI to Blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // 2. Create a reference
    // Path: players/{userId}/{playerId}.jpg
    // This ensures users only overwrite their own player photos
    const storageRef = ref(storage, `players/${userId}/${playerId}.jpg`);

    // 3. Upload
    await uploadBytes(storageRef, blob);

    // 4. Get download URL
    const downloadUrl = await getDownloadURL(storageRef);
    
    return downloadUrl;
  } catch (error) {
    console.error('Error uploading player photo:', error);
    throw error;
  }
}

/**
 * Deletes a player photo from Firebase Storage.
 */
export async function deletePlayerPhoto(userId: string, playerId: string): Promise<void> {
  try {
    const storageRef = ref(storage, `players/${userId}/${playerId}.jpg`);
    await deleteObject(storageRef);
  } catch (error: any) {
    // Ignore error if file doesn't exist
    if (error.code !== 'storage/object-not-found') {
      console.warn('Error deleting player photo:', error);
    }
  }
}
