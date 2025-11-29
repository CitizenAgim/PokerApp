import { useFriends } from '@/hooks';
import * as friendsFirebase from '@/services/firebase/friends';
import { FriendRequest, User } from '@/types/poker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabType = 'friends' | 'requests';

interface FriendCardProps {
  friend: User;
  onRemove: () => void;
}

function FriendCard({ friend, onRemove }: FriendCardProps) {
  const handleRemove = () => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.displayName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onRemove },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {friend.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{friend.displayName}</Text>
        <Text style={styles.cardEmail}>{friend.email}</Text>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
        <Ionicons name="person-remove" size={20} color="#e74c3c" />
      </TouchableOpacity>
    </View>
  );
}

interface RequestCardProps {
  request: FriendRequest;
  type: 'incoming' | 'outgoing';
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
}

function RequestCard({ request, type, onAccept, onReject, onCancel }: RequestCardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userId = type === 'incoming' ? request.fromUserId : request.toUserId;
        const userData = await friendsFirebase.getUser(userId);
        setUser(userData);
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [request, type]);

  if (loading) {
    return (
      <View style={[styles.card, styles.cardLoading]}>
        <ActivityIndicator size="small" color="#0a7ea4" />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={[styles.avatar, type === 'incoming' ? styles.avatarIncoming : styles.avatarOutgoing]}>
        <Text style={styles.avatarText}>
          {user.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{user.displayName}</Text>
        <Text style={styles.cardEmail}>
          {type === 'incoming' ? 'Wants to be your friend' : 'Request pending'}
        </Text>
      </View>
      {type === 'incoming' ? (
        <View style={styles.requestActions}>
          <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectButton} onPress={onReject}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function FriendsScreen() {
  const router = useRouter();
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    refresh,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    removeFriend,
  } = useFriends();

  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const pendingCount = incomingRequests.length;

  const renderFriendItem = ({ item }: { item: User }) => (
    <FriendCard
      friend={item}
      onRemove={() => removeFriend(item.id)}
    />
  );

  const renderRequestItem = ({ item }: { item: FriendRequest & { type: 'incoming' | 'outgoing' } }) => (
    <RequestCard
      request={item}
      type={item.type}
      onAccept={item.type === 'incoming' ? () => acceptRequest(item.id) : undefined}
      onReject={item.type === 'incoming' ? () => rejectRequest(item.id) : undefined}
      onCancel={item.type === 'outgoing' ? () => cancelRequest(item.id) : undefined}
    />
  );

  const allRequests = [
    ...incomingRequests.map(r => ({ ...r, type: 'incoming' as const })),
    ...outgoingRequests.map(r => ({ ...r, type: 'outgoing' as const })),
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(main)/friends/add')}
        >
          <Ionicons name="person-add" size={24} color="#0a7ea4" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
            Requests
          </Text>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      ) : activeTab === 'friends' ? (
        <FlatList
          data={friends}
          keyExtractor={item => item.id}
          renderItem={renderFriendItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No friends yet</Text>
              <Text style={styles.emptyText}>
                Add friends to share player information
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/(main)/friends/add')}
              >
                <Text style={styles.emptyButtonText}>Add Friend</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          data={allRequests}
          keyExtractor={item => item.id}
          renderItem={renderRequestItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="mail-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptyText}>
                Friend requests will appear here
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  addButton: {
    padding: 8,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#0a7ea4',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#0a7ea4',
  },
  badge: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
  cardLoading: {
    justifyContent: 'center',
    height: 72,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarIncoming: {
    backgroundColor: '#27ae60',
  },
  avatarOutgoing: {
    backgroundColor: '#f39c12',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cardEmail: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  cancelText: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
  emptyButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
