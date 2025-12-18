import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { getThemeColors, styles } from './EmptyState.styles';

// ============================================
// TYPES
// ============================================

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function EmptyState({
  icon,
  iconColor,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

  const handleAction = () => {
    if (onAction) {
      haptics.lightTap();
      onAction();
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color={iconColor || colors.defaultIcon} />
      <Text style={[styles.title, { color: colors.title }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.message }]}>{message}</Text>
      
      {actionLabel && onAction && (
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.actionButton }]} onPress={handleAction}>
          <Text style={[styles.actionText, { color: colors.actionText }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default EmptyState;
