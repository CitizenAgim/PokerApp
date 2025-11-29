import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// ============================================
// HAPTIC FEEDBACK UTILITIES
// ============================================

/**
 * Light impact - for subtle feedback like selection changes
 */
export async function lightImpact() {
  if (Platform.OS !== 'web') {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

/**
 * Medium impact - for confirmations and successful actions
 */
export async function mediumImpact() {
  if (Platform.OS !== 'web') {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

/**
 * Heavy impact - for significant actions like deletions
 */
export async function heavyImpact() {
  if (Platform.OS !== 'web') {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
}

/**
 * Success notification - for successful operations
 */
export async function successNotification() {
  if (Platform.OS !== 'web') {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

/**
 * Warning notification - for warnings or confirmations
 */
export async function warningNotification() {
  if (Platform.OS !== 'web') {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
}

/**
 * Error notification - for errors or destructive actions
 */
export async function errorNotification() {
  if (Platform.OS !== 'web') {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

/**
 * Selection changed - for UI selections
 */
export async function selectionChanged() {
  if (Platform.OS !== 'web') {
    await Haptics.selectionAsync();
  }
}

// Named exports for common patterns
export const haptics = {
  // Interaction feedback
  tap: lightImpact,
  press: mediumImpact,
  longPress: heavyImpact,
  lightTap: lightImpact,
  mediumTap: mediumImpact,
  heavyTap: heavyImpact,
  
  // State changes
  select: selectionChanged,
  toggle: lightImpact,
  slide: selectionChanged,
  selectionChanged: selectionChanged,
  
  // Results
  success: successNotification,
  warning: warningNotification,
  error: errorNotification,
  successFeedback: successNotification,
  warningFeedback: warningNotification,
  errorFeedback: errorNotification,
  
  // Actions
  delete: errorNotification,
  save: successNotification,
  send: mediumImpact,
  refresh: lightImpact,
};
