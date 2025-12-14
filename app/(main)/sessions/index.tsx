import { SessionCardSkeleton } from '@/components/ui';
import { useSessions } from '@/hooks';
import { Session } from '@/types/poker';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SessionsScreen() {
  const router = useRouter();
  const { sessions, loading, error, refresh, deleteSession } = useSessions();
  const [refreshing, setRefreshing] = useState(false);

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
             // Placeholder for now
             Alert.alert('Info', 'Edit feature coming soon');
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

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

    return (
    <TouchableOpacity
      style={[styles.sessionCard, item.isActive && styles.sessionCardActive]}
      onPress={() => {
        haptics.lightTap();
        router.push(`/(main)/sessions/${item.id}`);
      }}
      onLongPress={() => handleLongPress(item)}
      delayLongPress={500}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionName}>{item.name}</Text>
          <Text style={styles.sessionDetails}>
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
          <Ionicons name="calendar-outline" size={14} color="#888" />
          <Text style={styles.metaText}>{formatDate(item.startTime)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color="#888" />
          <Text style={styles.metaText}>
            {formatDuration(item.startTime, item.endTime)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="game-controller-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Sessions Yet</Text>
      <Text style={styles.emptyText}>
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
      <View style={styles.container}>
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
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
        <Text style={styles.errorText}>{error.message}</Text>
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
    <View style={styles.container}>
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
          />
        }
        ListHeaderComponent={
          activeSessions.length > 0 ? (
            <Text style={styles.sectionHeader}>Active Sessions</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sessionCardActive: {
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sessionDetails: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#27ae60',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#27ae60',
  },
  resultText: {
    fontSize: 16,
    fontWeight: '700',
  },
  profitText: {
    color: '#27ae60',
  },
  lossText: {
    color: '#e74c3c',
  },
  sessionMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#888',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  tableButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0a7ea4',
    marginTop: 12,
  },
  tableButtonText: {
    color: '#0a7ea4',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'center',
    gap: 16,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabSecondary: {
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  fabDisabled: {
    backgroundColor: '#bdc3c7',
  },
});
