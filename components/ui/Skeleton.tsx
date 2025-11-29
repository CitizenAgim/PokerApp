import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function Skeleton({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  style 
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

// Pre-built skeleton layouts
export function PlayerCardSkeleton() {
  return (
    <View style={styles.playerCard}>
      <Skeleton width={50} height={50} borderRadius={25} />
      <View style={styles.playerCardContent}>
        <Skeleton width={120} height={16} />
        <Skeleton width={80} height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function SessionCardSkeleton() {
  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionCardHeader}>
        <Skeleton width={150} height={18} />
        <Skeleton width={60} height={24} borderRadius={12} />
      </View>
      <View style={styles.sessionCardDetails}>
        <Skeleton width={100} height={14} />
        <Skeleton width={80} height={14} />
      </View>
    </View>
  );
}

export function FriendCardSkeleton() {
  return (
    <View style={styles.friendCard}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={styles.friendCardContent}>
        <Skeleton width={100} height={16} />
        <Skeleton width={140} height={12} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={70} height={32} borderRadius={8} />
    </View>
  );
}

export function RangeGridSkeleton() {
  return (
    <View style={styles.rangeGrid}>
      {Array.from({ length: 13 }).map((_, row) => (
        <View key={row} style={styles.rangeRow}>
          {Array.from({ length: 13 }).map((_, col) => (
            <Skeleton
              key={col}
              width={22}
              height={22}
              borderRadius={3}
              style={{ margin: 1 }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={styles.profile}>
      <Skeleton width={100} height={100} borderRadius={50} />
      <Skeleton width={150} height={24} style={{ marginTop: 16 }} />
      <Skeleton width={200} height={16} style={{ marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e0e0e0',
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  playerCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  sessionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionCardDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  friendCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  rangeGrid: {
    alignItems: 'center',
    padding: 8,
  },
  rangeRow: {
    flexDirection: 'row',
  },
  profile: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
  },
});
