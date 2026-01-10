import { AcceptLinkModal, PendingSharesModal } from '@/components/sharing';
import { auth } from '@/config/firebase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFriends, usePendingRangeSharesPerFriend } from '@/hooks/useFriends';
import { usePendingLinksCount, usePlayerLinks } from '@/hooks/usePlayerLinks';
import { getThemeColors, styles } from '@/styles/friends/index.styles';
import { Friend, FriendRequest } from '@/types/friends';
import { PlayerLinkView } from '@/types/sharing';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Clipboard,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FriendsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);
  
  const {
    friends,
    pendingRequests,
    sentRequests,
    friendCode,
    loading,
    refresh,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
  } = useFriends();
  
  const { countByFriend, sharesByFriend } = usePendingRangeSharesPerFriend();
  
  // Player links state
  const { pendingInvites, refresh: refreshLinks } = usePlayerLinks();
  const pendingLinksCount = usePendingLinksCount();
  
  const [refreshing, setRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedFriendForShares, setSelectedFriendForShares] = useState<Friend | null>(null);
  const [selectedLinkInvite, setSelectedLinkInvite] = useState<PlayerLinkView | null>(null);

  const user = auth.currentUser;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshLinks()]);
    setRefreshing(false);
  };

  const handleCopyCode = () => {
    if (friendCode) {
      Clipboard.setString(friendCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleShareCode = async () => {
    if (friendCode) {
      try {
        await Share.share({
          message: `Add me on Poker Files! My friend code is: ${friendCode}`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const handleAcceptRequest = async (request: FriendRequest) => {
    try {
      await acceptRequest(request.id);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to accept request');
    }
  };

  const handleDeclineRequest = async (request: FriendRequest) => {
    Alert.alert(
      'Decline Request',
      `Are you sure you want to decline the friend request from ${request.fromUserName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await declineRequest(request.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to decline request');
            }
          },
        },
      ]
    );
  };

  const handleCancelRequest = async (request: FriendRequest) => {
    Alert.alert(
      'Cancel Request',
      `Are you sure you want to cancel your friend request to ${request.toUserName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelRequest(request.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel request');
            }
          },
        },
      ]
    );
  };

  const handleRemoveFriend = async (friend: Friend) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.displayName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(friend.odUserId);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const handleFriendPress = (friend: Friend) => {
    const shareCount = countByFriend.get(friend.odUserId) || 0;
    if (shareCount > 0) {
      setSelectedFriendForShares(friend);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Not logged in state
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Friends</Text>
        </View>
        <View style={styles.notLoggedInContainer}>
          <Ionicons name="people" size={64} color={themeColors.subText} />
          <Text style={[styles.notLoggedInTitle, { color: themeColors.text }]}>Sign in Required</Text>
          <Text style={[styles.notLoggedInText, { color: themeColors.subText }]}>
            You need to sign in to add friends and share notes.
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Friends</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Friends</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(main)/friends/add')}
        >
          <Ionicons name="person-add" size={24} color={themeColors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Friend Code Section */}
        <View style={[styles.codeSection, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.codeLabel, { color: themeColors.subText }]}>Your Friend Code</Text>
          <View style={styles.codeContainer}>
            <Text style={[styles.codeText, { color: themeColors.accent }]}>{friendCode || '------'}</Text>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
              <Ionicons
                name={copiedCode ? 'checkmark' : 'copy-outline'}
                size={24}
                color={copiedCode ? themeColors.success : themeColors.subText}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={handleShareCode}>
            <Ionicons name="share-outline" size={18} color="#fff" />
            <Text style={styles.shareButtonText}>Share Code</Text>
          </TouchableOpacity>
        </View>

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <View style={styles.pendingSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: themeColors.sectionTitle }]}>
                Pending Requests
              </Text>
              <Text style={[styles.sectionCount, { color: themeColors.subText }]}>
                {pendingRequests.length}
              </Text>
            </View>
            {pendingRequests.map((request) => (
              <View key={request.id} style={[styles.requestCard, { backgroundColor: themeColors.card }]}>
                <View style={styles.requestInfo}>
                  <View style={styles.requestAvatar}>
                    <Text style={styles.requestAvatarText}>{getInitials(request.fromUserName)}</Text>
                  </View>
                  <View style={styles.requestDetails}>
                    <Text style={[styles.requestName, { color: themeColors.text }]}>
                      {request.fromUserName}
                    </Text>
                    <Text style={[styles.requestCode, { color: themeColors.subText }]}>
                      {request.fromUserCode}
                    </Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(request)}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.declineButton, { backgroundColor: isDark ? '#2c2c2e' : '#f5f5f5' }]}
                    onPress={() => handleDeclineRequest(request)}
                  >
                    <Text style={[styles.declineButtonText, { color: themeColors.subText }]}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Pending Player Links Section */}
        {pendingInvites.length > 0 && (
          <View style={styles.pendingSection}>
            <View style={styles.sectionHeader}>
              <View style={localStyles.linkSectionHeader}>
                <Ionicons name="link" size={18} color={themeColors.accent} />
                <Text style={[styles.sectionTitle, { color: themeColors.sectionTitle }]}>
                  Player Link Invites
                </Text>
              </View>
              <Text style={[styles.sectionCount, { color: themeColors.subText }]}>
                {pendingInvites.length}
              </Text>
            </View>
            {pendingInvites.map((link) => (
              <TouchableOpacity
                key={link.id}
                style={[localStyles.linkCard, { backgroundColor: themeColors.card }]}
                onPress={() => setSelectedLinkInvite(link)}
              >
                <View style={localStyles.linkInfo}>
                  <View style={[localStyles.linkIcon, { backgroundColor: isDark ? '#1a3a4a' : '#e3f2fd' }]}>
                    <Ionicons name="link" size={20} color={themeColors.accent} />
                  </View>
                  <View style={localStyles.linkDetails}>
                    <Text style={[styles.requestName, { color: themeColors.text }]}>
                      {link.initiatorName}
                    </Text>
                    <Text style={[localStyles.linkDescription, { color: themeColors.subText }]}>
                      wants to link "{link.initiatorPlayerName}"
                    </Text>
                  </View>
                </View>
                <View style={localStyles.linkAction}>
                  <Text style={localStyles.linkActionText}>Review</Text>
                  <Ionicons name="chevron-forward" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Sent Requests Section */}
        {sentRequests.length > 0 && (
          <View style={styles.sentSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: themeColors.sectionTitle }]}>
                Sent Requests
              </Text>
              <Text style={[styles.sectionCount, { color: themeColors.subText }]}>
                {sentRequests.length}
              </Text>
            </View>
            {sentRequests.map((request) => (
              <View key={request.id} style={[styles.sentCard, { backgroundColor: themeColors.card }]}>
                <View style={styles.sentInfo}>
                  <View style={styles.requestAvatar}>
                    <Text style={styles.requestAvatarText}>{getInitials(request.toUserName)}</Text>
                  </View>
                  <View style={styles.requestDetails}>
                    <Text style={[styles.requestName, { color: themeColors.text }]}>
                      {request.toUserName}
                    </Text>
                    <Text style={[styles.requestCode, { color: themeColors.subText }]}>
                      {request.toUserCode}
                    </Text>
                  </View>
                </View>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancelRequest(request)}
                >
                  <Ionicons name="close-circle" size={24} color={themeColors.subText} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Friends List Section */}
        <View style={styles.friendsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.sectionTitle }]}>
              My Friends
            </Text>
            <Text style={[styles.sectionCount, { color: themeColors.subText }]}>
              {friends.length}/100
            </Text>
          </View>

          {friends.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: themeColors.card, borderRadius: 12 }]}>
              <Ionicons name="people-outline" size={48} color={themeColors.subText} style={styles.emptyIcon} />
              <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Friends Yet</Text>
              <Text style={[styles.emptyText, { color: themeColors.subText }]}>
                Share your friend code or add friends using their code to get started.
              </Text>
            </View>
          ) : (
            friends.map((friend) => {
              const shareCount = countByFriend.get(friend.odUserId) || 0;
              return (
                <TouchableOpacity 
                  key={friend.odUserId} 
                  style={[styles.friendCard, { backgroundColor: themeColors.card }]}
                  onPress={() => handleFriendPress(friend)}
                  activeOpacity={shareCount > 0 ? 0.7 : 1}
                >
                  <View style={styles.friendAvatar}>
                    <Text style={styles.friendAvatarText}>{getInitials(friend.displayName)}</Text>
                  </View>
                  <View style={styles.friendInfo}>
                    <Text style={[styles.friendName, { color: themeColors.text }]}>
                      {friend.displayName}
                    </Text>
                    <Text style={[styles.friendCode, { color: themeColors.subText }]}>
                      {friend.friendCode}
                    </Text>
                  </View>
                  {shareCount > 0 && (
                    <View style={styles.friendShareBadgeContainer}>
                      <View style={styles.friendShareBadge}>
                        <Text style={styles.friendShareBadgeText}>{shareCount}</Text>
                      </View>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.friendActions}
                    onPress={() => handleRemoveFriend(friend)}
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color={themeColors.subText} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Pending Shares Modal */}
      {selectedFriendForShares && (
        <PendingSharesModal
          visible={!!selectedFriendForShares}
          onClose={() => setSelectedFriendForShares(null)}
          friendId={selectedFriendForShares.odUserId}
          friendName={selectedFriendForShares.displayName}
        />
      )}

      {/* Accept Link Modal */}
      {selectedLinkInvite && (
        <AcceptLinkModal
          visible={!!selectedLinkInvite}
          onClose={() => setSelectedLinkInvite(null)}
          linkInvite={selectedLinkInvite}
          onAccepted={() => {
            refreshLinks();
            setSelectedLinkInvite(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  linkSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  linkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  linkDetails: {
    flex: 1,
  },
  linkDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  linkAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  linkActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
