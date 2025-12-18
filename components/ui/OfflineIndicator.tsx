import { useColorScheme } from '@/hooks/use-color-scheme';
import { isOnline } from '@/services/sync';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getThemeColors, styles } from './OfflineIndicator.styles';

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const translateY = useState(new Animated.Value(-50))[0];
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

  useEffect(() => {
    const checkConnection = async () => {
      const connected = await isOnline();
      setOnline(connected);
      setVisible(!connected);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : -50,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [visible, translateY]);

  if (online && !visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          transform: [{ translateY }],
          paddingTop: insets.top > 0 ? insets.top : 8,
          backgroundColor: colors.offlineBg,
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline" size={18} color={colors.offlineText} />
        <Text style={[styles.text, { color: colors.offlineText }]}>
          You're offline. Changes will sync when connected.
        </Text>
      </View>
    </Animated.View>
  );
}

interface SyncStatusProps {
  syncing: boolean;
  lastSyncTime?: number;
}

export function SyncStatus({ syncing, lastSyncTime }: SyncStatusProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <View style={styles.syncStatus}>
      {syncing ? (
        <>
          <Ionicons name="sync" size={14} color={colors.syncIcon} />
          <Text style={[styles.syncText, { color: colors.syncText }]}>Syncing...</Text>
        </>
      ) : lastSyncTime ? (
        <>
          <Ionicons name="checkmark-circle" size={14} color={colors.syncedIcon} />
          <Text style={[styles.syncText, { color: colors.syncText }]}>Synced {formatTime(lastSyncTime)}</Text>
        </>
      ) : (
        <>
          <Ionicons name="cloud-outline" size={14} color={colors.notSyncedIcon} />
          <Text style={[styles.syncText, { color: colors.syncText }]}>Not synced</Text>
        </>
      )}
    </View>
  );
}
