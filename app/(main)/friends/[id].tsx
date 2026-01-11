import { CreatePlayerModal, LinkUpdatePreview, RangePreviewModal, SelectPlayerModal } from '@/components/sharing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFriends, usePendingRangeSharesPerFriend } from '@/hooks/useFriends';
import { usePlayerLinks } from '@/hooks/usePlayerLinks';
import { useRangeSharing } from '@/hooks/useRangeSharing';
import { PlayerLinkView, RangeShare } from '@/types/sharing';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const getThemeColors = (isDark: boolean) => ({
  background: isDark ? '#000' : '#f5f5f5',
  card: isDark ? '#1c1c1e' : '#fff',
  text: isDark ? '#fff' : '#333',
  subText: isDark ? '#aaa' : '#888',
  border: isDark ? '#333' : '#e0e0e0',
  accent: '#0a7ea4',
  success: isDark ? '#4caf50' : '#2e7d32',
  danger: '#e74c3c',
});

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);

  const { friends, removeFriend, refresh: refreshFriends } = useFriends();
  const { linkViews, checkForUpdates, syncFromLink, refresh: refreshLinks, loading: linksLoading } = usePlayerLinks();
  const { sharesByFriend, loading: sharesLoading } = usePendingRangeSharesPerFriend();
  const { dismissShare, importToNewPlayer } = useRangeSharing();

  const [refreshing, setRefreshing] = useState(false);
  const [showLinkUpdatePreview, setShowLinkUpdatePreview] = useState(false);
  const [selectedLinkView, setSelectedLinkView] = useState<PlayerLinkView | null>(null);
  const [selectedShare, setSelectedShare] = useState<RangeShare | null>(null);
  const [showRangePreview, setShowRangePreview] = useState(false);
  const [selectedKeysForImport, setSelectedKeysForImport] = useState<string[] | undefined>(undefined);
  const [showSelectPlayerModal, setShowSelectPlayerModal] = useState(false);
  const [showCreatePlayerModal, setShowCreatePlayerModal] = useState(false);

  // Find the friend by ID
  const friend = useMemo(() => {
    return friends.find(f => f.odUserId === id);
  }, [friends, id]);

  // Get all links shared with this friend
  const friendLinks = useMemo(() => {
    if (!id) return [];
    return linkViews.filter(view => view.theirUserId === id);
  }, [linkViews, id]);

  // Get pending range shares from this friend
  const pendingShares = useMemo(() => {
    if (!id) return [];
    return sharesByFriend.get(id) || [];
  }, [sharesByFriend, id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshFriends(), refreshLinks()]);
    setRefreshing(false);
  };

  const handleSharePress = (share: RangeShare) => {
    setSelectedShare(share);
    setShowRangePreview(true);
  };

  const handleAcceptRanges = async (selectedKeys: string[]) => {
    if (!selectedShare) return;
    
    setShowRangePreview(false);
    setSelectedKeysForImport(selectedKeys);
    
    // Show action choice alert
    Alert.alert(
      'Import Ranges',
      `Import ${selectedKeys.length} range${selectedKeys.length !== 1 ? 's' : ''} to:`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => {
          setSelectedShare(null);
          setSelectedKeysForImport(undefined);
        }},
        { 
          text: 'Existing Player', 
          onPress: () => setShowSelectPlayerModal(true)
        },
        { 
          text: 'New Player', 
          onPress: () => setShowCreatePlayerModal(true)
        },
      ]
    );
  };

  const handleImportSuccess = () => {
    setSelectedShare(null);
    setSelectedKeysForImport(undefined);
    setShowSelectPlayerModal(false);
    setShowCreatePlayerModal(false);
    Alert.alert('Success', 'Ranges imported successfully!');
  };

  const handleDeclineShare = async (share: RangeShare) => {
    Alert.alert(
      'Decline Range Share',
      `Are you sure you want to decline the ranges from ${share.fromUserName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await dismissShare(share.id);
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to decline share');
            }
          },
        },
      ]
    );
  };

  const handleLinkPress = async (linkView: PlayerLinkView) => {
    // Check for updates for this link
    try {
      const result = await checkForUpdates(linkView.link);
      if (result.hasUpdates) {
        setSelectedLinkView(linkView);
        setShowLinkUpdatePreview(true);
      } else {
        Alert.alert(
          'Link Info',
          `Your "${linkView.myPlayerName}" is linked with ${linkView.theirUserName}'s "${linkView.theirPlayerName}".\n\nNo updates available.`,
          [
            { text: 'OK' },
            {
              text: 'Sync Anyway',
              onPress: () => {
                setSelectedLinkView(linkView);
                setShowLinkUpdatePreview(true);
              }
            }
          ]
        );
      }
    } catch (error) {
      // If check fails, still allow opening the preview
      setSelectedLinkView(linkView);
      setShowLinkUpdatePreview(true);
    }
  };

  const handleRemoveFriend = () => {
    if (!friend) return;
    
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.displayName} from your friends? This will also remove all player links with them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(friend.odUserId);
              router.back();
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  if (!friend) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={64} color={themeColors.subText} />
          <Text style={[styles.errorText, { color: themeColors.text }]}>Friend not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Friend Profile</Text>
        <TouchableOpacity style={styles.menuBtn} onPress={handleRemoveFriend}>
          <Ionicons name="trash-outline" size={22} color={themeColors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Section */}
        <View style={[styles.profileSection, { backgroundColor: themeColors.card }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {friend.displayName
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </Text>
          </View>
          <Text style={[styles.displayName, { color: themeColors.text }]}>
            {friend.displayName}
          </Text>
          <Text style={[styles.friendCode, { color: themeColors.subText }]}>
            Friend Code: {friend.friendCode}
          </Text>
          <Text style={[styles.addedDate, { color: themeColors.subText }]}>
            Friends since {new Date(friend.addedAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Links Section */}
        <View style={styles.linksSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="link" size={20} color={themeColors.accent} />
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              Shared Links
            </Text>
            <Text style={[styles.sectionCount, { color: themeColors.subText }]}>
              ({friendLinks.length})
            </Text>
          </View>

          {linksLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={themeColors.accent} />
            </View>
          ) : friendLinks.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: themeColors.card }]}>
              <Ionicons name="link-outline" size={48} color={themeColors.subText} />
              <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Links Yet</Text>
              <Text style={[styles.emptyText, { color: themeColors.subText }]}>
                Share a player link with {friend.displayName} to sync ranges automatically.
              </Text>
            </View>
          ) : (
            friendLinks.map(linkView => (
              <TouchableOpacity
                key={linkView.link.id}
                style={[styles.linkCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                onPress={() => handleLinkPress(linkView)}
                activeOpacity={0.7}
              >
                <View style={styles.linkCardHeader}>
                  <Ionicons name="link" size={18} color={themeColors.accent} />
                  <View style={styles.linkCardInfo}>
                    <Text style={[styles.linkPlayerName, { color: themeColors.text }]}>
                      {linkView.myPlayerName}
                    </Text>
                  </View>
                  {linkView.hasUpdates && (
                    <View style={[styles.updateBadge, { backgroundColor: themeColors.success }]}>
                      <Text style={styles.updateBadgeText}>Updates</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color={themeColors.subText} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Shared Ranges Section */}
        <View style={[styles.linksSection, { marginTop: 24 }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="share" size={20} color={themeColors.accent} />
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              Shared Ranges
            </Text>
            <Text style={[styles.sectionCount, { color: themeColors.subText }]}>
              ({pendingShares.length})
            </Text>
          </View>

          {sharesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={themeColors.accent} />
            </View>
          ) : pendingShares.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: themeColors.card }]}>
              <Ionicons name="share-outline" size={48} color={themeColors.subText} />
              <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Shared Ranges</Text>
              <Text style={[styles.emptyText, { color: themeColors.subText }]}>
                When {friend.displayName} shares ranges with you, they'll appear here.
              </Text>
            </View>
          ) : (
            pendingShares.map(share => (
              <View
                key={share.id}
                style={[styles.shareCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
              >
                <TouchableOpacity
                  style={styles.shareCardContent}
                  onPress={() => handleSharePress(share)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="layers" size={18} color={themeColors.accent} />
                  <View style={styles.shareCardInfo}>
                    <Text style={[styles.sharePlayerName, { color: themeColors.text }]}>
                      {share.playerName}
                    </Text>
                    <Text style={[styles.shareRangeCount, { color: themeColors.subText }]}>
                      {share.rangeCount} range{share.rangeCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={[styles.newBadge, { backgroundColor: themeColors.accent }]}>
                    <Text style={styles.newBadgeText}>New</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.shareActions}>
                  <TouchableOpacity
                    style={[styles.shareActionBtn, styles.acceptBtn]}
                    onPress={() => handleSharePress(share)}
                  >
                    <Ionicons name="eye" size={16} color="#fff" />
                    <Text style={styles.shareActionText}>Preview</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.shareActionBtn, styles.declineBtn]}
                    onPress={() => handleDeclineShare(share)}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                    <Text style={styles.shareActionText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Link Update Preview Modal */}
      {selectedLinkView && (
        <LinkUpdatePreview
          visible={showLinkUpdatePreview}
          onClose={() => {
            setShowLinkUpdatePreview(false);
            setSelectedLinkView(null);
          }}
          linkView={selectedLinkView}
          onSuccess={() => {
            refreshLinks();
            setShowLinkUpdatePreview(false);
            setSelectedLinkView(null);
          }}
        />
      )}

      {/* Range Preview Modal */}
      {selectedShare && (
        <RangePreviewModal
          visible={showRangePreview}
          onClose={() => {
            setShowRangePreview(false);
            setSelectedShare(null);
          }}
          playerName={selectedShare.playerName}
          ranges={selectedShare.ranges}
          rangeKeys={selectedShare.rangeKeys}
          onAcceptSelected={handleAcceptRanges}
        />
      )}

      {/* Select Player Modal (import to existing) */}
      {selectedShare && (
        <SelectPlayerModal
          visible={showSelectPlayerModal}
          onClose={() => {
            setShowSelectPlayerModal(false);
            setSelectedShare(null);
            setSelectedKeysForImport(undefined);
          }}
          share={selectedShare}
          onSuccess={handleImportSuccess}
          selectedKeys={selectedKeysForImport}
        />
      )}

      {/* Create Player Modal (import to new) */}
      {selectedShare && (
        <CreatePlayerModal
          visible={showCreatePlayerModal}
          onClose={() => {
            setShowCreatePlayerModal(false);
            setSelectedShare(null);
            setSelectedKeysForImport(undefined);
          }}
          share={selectedShare}
          onSuccess={handleImportSuccess}
          selectedKeys={selectedKeysForImport}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  menuBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  friendCode: {
    fontSize: 14,
    marginBottom: 4,
  },
  addedDate: {
    fontSize: 13,
  },
  linksSection: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionCount: {
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  linkCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  linkCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkCardInfo: {
    flex: 1,
  },
  linkPlayerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  updateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  updateBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  shareCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  shareCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  shareCardInfo: {
    flex: 1,
  },
  sharePlayerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  shareRangeCount: {
    fontSize: 13,
    marginTop: 2,
  },
  newBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  shareActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  shareActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  acceptBtn: {
    backgroundColor: '#0a7ea4',
  },
  declineBtn: {
    backgroundColor: '#e74c3c',
  },
  shareActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
