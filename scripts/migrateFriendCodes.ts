/**
 * Migration Script: Generate Friend Codes for Existing Users
 * 
 * Run this script once to assign friend codes to existing users.
 * 
 * Usage:
 * 1. Import this in a temporary screen or run from console
 * 2. Call runMigration() 
 * 3. Check the console output for results
 */

import { migrateUsersWithoutFriendCodes } from '@/services/firebase/friends';

export async function runFriendCodeMigration(): Promise<void> {
  console.log('=== Starting Friend Code Migration ===');
  console.log('');
  
  try {
    const result = await migrateUsersWithoutFriendCodes();
    
    console.log('=== Migration Complete ===');
    console.log('');
    console.log('Successfully migrated users:');
    result.migrated.forEach(msg => console.log(`  ✓ ${msg}`));
    
    if (result.errors.length > 0) {
      console.log('');
      console.log('Errors:');
      result.errors.forEach(msg => console.log(`  ✗ ${msg}`));
    }
    
    console.log('');
    console.log(`Total: ${result.migrated.length} migrated, ${result.errors.length} errors`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Export for direct use
export { migrateUsersWithoutFriendCodes };
