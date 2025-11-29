import { isOnline } from '@/services/sync';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const translateY = useState(new Animated.Value(-50))[0];

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
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline" size={18} color="#fff" />
        <Text style={styles.text}>
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
          <Ionicons name="sync" size={14} color="#0a7ea4" />
          <Text style={styles.syncText}>Syncing...</Text>
        </>
      ) : lastSyncTime ? (
        <>
          <Ionicons name="checkmark-circle" size={14} color="#27ae60" />
          <Text style={styles.syncText}>Synced {formatTime(lastSyncTime)}</Text>
        </>
      ) : (
        <>
          <Ionicons name="cloud-outline" size={14} color="#888" />
          <Text style={styles.syncText}>Not synced</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#e74c3c',
    zIndex: 1000,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncText: {
    fontSize: 12,
    color: '#888',
  },
});
