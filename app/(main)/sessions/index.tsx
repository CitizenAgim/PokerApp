import { SessionCardSkeleton } from '@/components/ui';
import { useSessions, useSettings } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getThemeColors, styles } from '@/styles/sessions/index.styles';
import { Session } from '@/types/poker';
import { haptics } from '@/utils/haptics';
import { formatDate } from '@/utils/text';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SessionsScreen() {
  const router = useRouter();
  const { sessions, loading, error, refresh, deleteSession } = useSessions();
  const { dateFormat } = useSettings();
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Theme colors
  const themeColors = getThemeColors(isDark);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleLongPress = (session: Session) => {
    haptics.lightTap();
    Alert.alert(
      session.name,
      'Choose an action',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit',
          onPress: () => {
             router.push(`/(main)/sessions/${session.id}`);
          }
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Session',
              'Are you sure you want to delete this session? This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteSession(session.id);
                      haptics.successFeedback();
                    } catch (error) {
                      haptics.errorFeedback();
                      Alert.alert('Error', 'Failed to delete session');
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const formatDuration = (start: number, end?: number): string => {
    const endTime = end || Date.now();
    const durationMs = endTime - start;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const renderSession = ({ item }: { item: Session }) => {
    const profit = (item.cashOut || 0) - (item.buyIn || 0);
    const isProfit = profit >= 0;

    // Check if name is a default name (Date - GameType) and reformat if needed
    let displayName = item.name;
    const defaultNameUS = formatDate(item.startTime, 'MM/DD/YYYY') + ' - ' + item.gameType;
    const defaultNameEU = formatDate(item.startTime, 'DD/MM/YYYY') + ' - ' + item.gameType;
    const defaultNameISO = formatDate(item.startTime, 'YYYY-MM-DD') + ' - ' + item.gameType;
    
    // Also check against system locale default which might have been used previously
    const systemDefault = new Date(item.startTime).toLocaleDateString() + ' - ' + item.gameType;

    if (item.name === defaultNameUS || item.name === defaultNameEU || item.name === defaultNameISO || item.name === systemDefault) {
       displayName = formatDate(item.startTime, dateFormat) + ' - ' + item.gameType;
    }

    return (
    <TouchableOpacity
      style={[styles.sessionCard, { backgroundColor: themeColors.card }, item.isActive && styles.sessionCardActive]}
      onPress={() => {
        haptics.lightTap();
        router.push(`/(main)/sessions/${item.id}`);
      }}
      onLongPress={() => handleLongPress(item)}
      delayLongPress={500}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionInfo}>
          <Text style={[styles.sessionName, { color: themeColors.text }]}>{displayName}</Text>
          <Text style={[styles.sessionDetails, { color: themeColors.subText }]}>
            {item.stakes && `${item.stakes} • `}
            {item.location || 'No location'}
          </Text>
        </View>
        {item.isActive ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        ) : (
          <Text style={[styles.resultText, isProfit ? styles.profitText : styles.lossText]}>
            {isProfit ? '+' : ''}{profit}
          </Text>
        )}
      </View>
      
      <View style={styles.sessionMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={14} color={themeColors.icon} />
          <Text style={[styles.metaText, { color: themeColors.subText }]}>{formatDate(item.startTime, dateFormat)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color={themeColors.icon} />
          <Text style={[styles.metaText, { color: themeColors.subText }]}>
            {formatDuration(item.startTime, item.endTime)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="game-controller-outline" size={64} color={themeColors.icon} />
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Sessions Yet</Text>
      <Text style={[styles.emptyText, { color: themeColors.subText }]}>
        Start a session to track players at your table
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          haptics.lightTap();
          router.push('/(main)/sessions/new');
        }}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.addButtonText}>New Session</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.listContent}>
          {[1, 2, 3, 4].map((i) => (
            <SessionCardSkeleton key={i} />
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: themeColors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
        <Text style={[styles.errorText, { color: themeColors.subText }]}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Split sessions into active and past
  const activeSessions = sessions.filter(s => s.isActive);
  const pastSessions = sessions.filter(s => !s.isActive);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <FlatList
        data={[...activeSessions, ...pastSessions]}
        renderItem={renderSession}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#0a7ea4']}
            tintColor={themeColors.text}
          />
        }
        ListHeaderComponent={
          activeSessions.length > 0 ? (
            <Text style={[styles.sectionHeader, { color: themeColors.sectionHeader }]}>Active Sessions</Text>
          ) : null
        }
      />

      {/* FAB Group */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, activeSessions.length > 0 && styles.fabDisabled]}
          onPress={() => {
            if (activeSessions.length > 0) {
              haptics.errorFeedback();
              Alert.alert('Active Session', 'You already have an active session. Please end it before starting a new one.');
              return;
            }
            haptics.lightTap();
            router.push('/(main)/sessions/new');
          }}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
