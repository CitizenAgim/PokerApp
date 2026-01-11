import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFriends } from '@/hooks/useFriends';
import { usePlayerLinks } from '@/hooks/usePlayerLinks';
import { PlayerLinkView } from '@/types/sharing';
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
import { LinkUpdatePreview } from '@/components/sharing';

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

  const [refreshing, setRefreshing] = useState(false);
  const [showLinkUpdatePreview, setShowLinkUpdatePreview] = useState(false);
  const [selectedLinkView, setSelectedLinkView] = useState<PlayerLinkView | null>(null);

  // Find the friend by ID
  const friend = useMemo(() => {
    return friends.find(f => f.odUserId === id);
  }, [friends, id]);

  // Get all links shared with this friend
  const friendLinks = useMemo(() => {
    if (!id) return [];
    return linkViews.filter(view => view.theirUserId === id);
  }, [linkViews, id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshFriends(), refreshLinks()]);
    setRefreshing(false);
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
});
