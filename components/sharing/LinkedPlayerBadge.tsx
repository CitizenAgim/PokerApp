/**
 * LinkedPlayerBadge
 * 
 * Visual indicator showing that a player is linked with friends.
 * Can show update availability status.
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getThemeColors } from '@/styles/sharing/index.styles';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface LinkedPlayerBadgeProps {
  /** Number of active links for this player */
  linkCount: number;
  /** Whether there are updates available from linked players */
  hasUpdates?: boolean;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Whether the badge is interactive */
  onPress?: () => void;
  /** Show only the icon without count */
  iconOnly?: boolean;
}

export function LinkedPlayerBadge({
  linkCount,
  hasUpdates = false,
  size = 'medium',
  onPress,
  iconOnly = false,
}: LinkedPlayerBadgeProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);

  if (linkCount === 0) {
    return null;
  }

  const sizeConfig = {
    small: {
      iconSize: 12,
      fontSize: 10,
      padding: 4,
      gap: 2,
      dotSize: 6,
    },
    medium: {
      iconSize: 14,
      fontSize: 12,
      padding: 6,
      gap: 4,
      dotSize: 8,
    },
    large: {
      iconSize: 18,
      fontSize: 14,
      padding: 8,
      gap: 6,
      dotSize: 10,
    },
  };

  const config = sizeConfig[size];
  
  const content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: hasUpdates 
            ? (isDark ? '#1a3a2a' : '#e8f5e9') 
            : (isDark ? '#2c2c2e' : '#f5f5f5'),
          borderColor: hasUpdates 
            ? themeColors.success 
            : themeColors.border,
          paddingHorizontal: config.padding,
          paddingVertical: config.padding - 2,
          gap: config.gap,
        },
      ]}
    >
      <Ionicons 
        name="link" 
        size={config.iconSize} 
        color={hasUpdates ? themeColors.success : themeColors.accent} 
      />
      
      {!iconOnly && (
        <Text
          style={[
            styles.text,
            {
              color: hasUpdates ? themeColors.success : themeColors.text,
              fontSize: config.fontSize,
            },
          ]}
        >
          {linkCount}
        </Text>
      )}

      {/* Update indicator dot */}
      {hasUpdates && (
        <View
          style={[
            styles.updateDot,
            {
              backgroundColor: themeColors.success,
              width: config.dotSize,
              height: config.dotSize,
              borderRadius: config.dotSize / 2,
            },
          ]}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

/**
 * Compact inline badge for list items
 */
interface LinkedPlayerInlineBadgeProps {
  linkCount?: number;
  hasUpdates?: boolean;
  // Alternative prop
  friendNames?: string[];
}

export function LinkedPlayerInlineBadge({
  linkCount,
  hasUpdates = false,
  friendNames = [],
}: LinkedPlayerInlineBadgeProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);

  const effectiveLinkCount = linkCount ?? friendNames.length;

  if (effectiveLinkCount === 0) {
    return null;
  }

  return (
    <View style={styles.inlineContainer}>
      <Ionicons 
        name="link" 
        size={12} 
        color={hasUpdates ? themeColors.success : themeColors.subText} 
      />
      {hasUpdates && (
        <View
          style={[
            styles.inlineUpdateDot,
            { backgroundColor: themeColors.success },
          ]}
        />
      )}
    </View>
  );
}

/**
 * Badge showing sync status with text
 */
interface LinkedPlayerStatusBadgeProps {
  linkCount?: number;
  hasUpdates?: boolean;
  lastSyncedAt?: number;
  // Alternative props for use with usePlayerLinkStatus
  status?: 'none' | 'pending' | 'linked' | 'has-updates';
  linkedFriendNames?: string[];
  onCheckUpdates?: () => void;
}

export function LinkedPlayerStatusBadge({
  linkCount,
  hasUpdates = false,
  lastSyncedAt,
  status,
  linkedFriendNames = [],
  onCheckUpdates,
}: LinkedPlayerStatusBadgeProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);

  // If using status-based props, derive linkCount and hasUpdates
  const effectiveLinkCount = linkCount ?? linkedFriendNames.length;
  const effectiveHasUpdates = hasUpdates || status === 'has-updates';

  if (effectiveLinkCount === 0 && status !== 'pending') {
    return null;
  }

  const formatLastSynced = (timestamp?: number): string => {
    if (!timestamp) return 'Never synced';
    
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Show pending status
  if (status === 'pending') {
    return (
      <View
        style={[
          styles.statusContainer,
          {
            backgroundColor: isDark ? '#3a3a1a' : '#fff8e1',
            borderColor: themeColors.warning,
          },
        ]}
      >
        <View style={styles.statusHeader}>
          <Ionicons name="time-outline" size={16} color={themeColors.warning} />
          <Text style={[styles.statusTitle, { color: themeColors.warning }]}>
            Link Pending
          </Text>
        </View>
      </View>
    );
  }

  const content = (
    <View
      style={[
        styles.statusContainer,
        {
          backgroundColor: effectiveHasUpdates 
            ? (isDark ? '#1a3a2a' : '#e8f5e9') 
            : (isDark ? '#2c2c2e' : '#f5f5f5'),
          borderColor: effectiveHasUpdates 
            ? themeColors.success 
            : themeColors.border,
        },
      ]}
    >
      <View style={styles.statusHeader}>
        <Ionicons 
          name="link" 
          size={16} 
          color={effectiveHasUpdates ? themeColors.success : themeColors.accent} 
        />
        <Text
          style={[
            styles.statusTitle,
            { color: effectiveHasUpdates ? themeColors.success : themeColors.text },
          ]}
        >
          {linkedFriendNames.length > 0 
            ? `Linked with ${linkedFriendNames.join(', ')}`
            : `${effectiveLinkCount} Link${effectiveLinkCount !== 1 ? 's' : ''}`}
        </Text>
        {effectiveHasUpdates && (
          <View style={[styles.statusUpdateBadge, { backgroundColor: themeColors.success }]}>
            <Text style={styles.statusUpdateText}>Updates</Text>
          </View>
        )}
      </View>
      
      {lastSyncedAt !== undefined && (
        <Text style={[styles.statusSubtext, { color: themeColors.subText }]}>
          Last synced: {formatLastSynced(lastSyncedAt)}
        </Text>
      )}
      
      {onCheckUpdates && (
        <Text style={[styles.statusSubtext, { color: themeColors.accent, marginTop: 4 }]}>
          Tap to check for updates
        </Text>
      )}
    </View>
  );

  if (onCheckUpdates) {
    return (
      <TouchableOpacity onPress={onCheckUpdates} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  text: {
    fontWeight: '600',
  },
  updateDot: {
    marginLeft: 2,
  },
  // Inline badge styles
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  inlineUpdateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 2,
  },
  // Status badge styles
  statusContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusUpdateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  statusUpdateText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  statusSubtext: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 24,
  },
});
