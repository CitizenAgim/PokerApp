import { auth } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as playersFirebase from './firebase/players';
import * as localStorage from './localStorage';

// ============================================
// GUEST MODE CONSTANTS
// ============================================

export const GUEST_USER_ID = 'guest_local';
const GUEST_MODE_KEY = '@pokerapp/guestMode';

// ============================================
// GUEST MODE MANAGEMENT
// ============================================

/**
 * Check if the app is in guest mode
 */
export async function isGuestMode(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(GUEST_MODE_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Enable guest mode
 */
export async function enableGuestMode(): Promise<void> {
  try {
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
  } catch (error) {
    console.error('Error enabling guest mode:', error);
  }
}

/**
 * Disable guest mode (when user logs in)
 */
export async function disableGuestMode(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
  } catch (error) {
    console.error('Error disabling guest mode:', error);
  }
}

/**
 * Get the current user ID (Firebase UID or guest ID)
 */
export async function getCurrentUserId(): Promise<string> {
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
    return firebaseUser.uid;
  }
  
  // Check if we're in guest mode
  const guestMode = await isGuestMode();
  if (guestMode) {
    return GUEST_USER_ID;
  }
  
  // Not logged in and not in guest mode
  throw new Error('No user session active');
}

/**
 * Get the effective user ID (Firebase user ID or guest ID)
 */
export function getEffectiveUserId(firebaseUserId: string | undefined): string {
  return firebaseUserId || GUEST_USER_ID;
}

/**
 * Check if a player was created by a guest
 */
export function isGuestCreatedPlayer(createdBy: string): boolean {
  return createdBy === GUEST_USER_ID;
}

// ============================================
// GUEST DATA MIGRATION
// ============================================

/**
 * Check if there's any guest data that needs to be migrated
 */
export async function hasGuestData(): Promise<boolean> {
  try {
    const players = await localStorage.getPlayers();
    return players.some(player => player.createdBy === GUEST_USER_ID);
  } catch {
    return false;
  }
}

/**
 * Migrate all guest data to the logged-in user's account
 * This updates local data and syncs to Firebase
 */
export async function migrateGuestDataToUser(newUserId: string): Promise<void> {
  if (!newUserId || newUserId === GUEST_USER_ID) {
    throw new Error('Invalid user ID for migration');
  }

  try {
    // Get all local players created by guest
    const allPlayers = await localStorage.getPlayers();
    const guestPlayers = allPlayers.filter(p => p.createdBy === GUEST_USER_ID);

    // Update each guest player to belong to the new user
    for (const player of guestPlayers) {
      const updatedPlayer = {
        ...player,
        createdBy: newUserId,
        updatedAt: Date.now(),
      };

      // Save locally with new owner
      await localStorage.savePlayer(updatedPlayer);

      // Sync to Firebase
      try {
        await playersFirebase.createPlayer(newUserId, {
          name: updatedPlayer.name,
          notes: updatedPlayer.notes,
          createdBy: newUserId,
        }, updatedPlayer.id);
      } catch (error) {
        console.warn('Could not sync migrated player to cloud:', error);
        // Continue with other players even if one fails
      }
    }

    // Disable guest mode after successful migration
    await disableGuestMode();
  } catch (error) {
    console.error('Error migrating guest data:', error);
    throw error;
  }
}
