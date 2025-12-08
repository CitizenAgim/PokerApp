import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Resizes and compresses an image to minimize file size.
 * Ideal for avatars and profile pictures.
 */
export async function resizeImage(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        { resize: { width: 400 } }, // Resize to max width 400px (height auto-scales)
      ],
      { 
        compress: 0.7, // Compress to 70% quality
        format: ImageManipulator.SaveFormat.JPEG 
      }
    );
    return result.uri;
  } catch (error) {
    console.warn('Image resizing failed, using original:', error);
    return uri;
  }
}
