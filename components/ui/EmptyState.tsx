import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

const getThemeColors = (isDark: boolean) => ({
  title: isDark ? '#FFFFFF' : '#333',
  message: isDark ? '#AAAAAA' : '#888',
  actionButton: '#0a7ea4',
  actionText: '#fff',
  defaultIcon: isDark ? '#555555' : '#ccc',
});

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

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 300,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  actionButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EmptyState;
