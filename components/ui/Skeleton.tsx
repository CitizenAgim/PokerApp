import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { getThemeColors, styles } from './Skeleton.styles';

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

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
        { width, height, borderRadius, opacity, backgroundColor: colors.skeletonBg },
        style,
      ]}
    />
  );
}

// Pre-built skeleton layouts
export function PlayerCardSkeleton() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.playerCard, { backgroundColor: colors.cardBg }]}>
      <Skeleton width={50} height={50} borderRadius={25} />
      <View style={styles.playerCardContent}>
        <Skeleton width={120} height={16} />
        <Skeleton width={80} height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function SessionCardSkeleton() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.sessionCard, { backgroundColor: colors.cardBg }]}>
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.friendCard, { backgroundColor: colors.cardBg }]}>
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.profile, { backgroundColor: colors.cardBg }]}>
      <Skeleton width={100} height={100} borderRadius={50} />
      <Skeleton width={150} height={24} style={{ marginTop: 16 }} />
      <Skeleton width={200} height={16} style={{ marginTop: 8 }} />
    </View>
  );
}
