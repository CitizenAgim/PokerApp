import { LinkedPlayerInlineBadge } from '@/components/sharing';
import { PlayerCardSkeleton } from '@/components/ui';
import { usePlayers } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlayerLinks } from '@/hooks/usePlayerLinks';
import * as localStorage from '@/services/localStorage';
import { getThemeColors, styles } from '@/styles/players/index.styles';
import { Player } from '@/types/poker';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function PlayersScreen() {
  const router = useRouter();
  const { players, loading, error, refresh } = usePlayers();
  const { activeLinks, refresh: refreshLinks } = usePlayerLinks();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterLocation, setFilterLocation] = useState<string | null>(null);
  const [storedLocations, setStoredLocations] = useState<string[]>([]);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Theme colors
  const themeColors = getThemeColors(isDark);

  // Build a map of playerId to linked friend names
  const linkedPlayerMap = useMemo(() => {
    const map = new Map<string, string[]>();
    activeLinks.forEach(link => {
      // Add for userA player
      if (link.userAPlayerId) {
        const existing = map.get(link.userAPlayerId) || [];
        existing.push(link.userBName);
        map.set(link.userAPlayerId, existing);
      }
      // Add for userB player
      if (link.userBPlayerId) {
        const existing = map.get(link.userBPlayerId) || [];
        existing.push(link.userAName);
        map.set(link.userBPlayerId, existing);
      }
    });
    return map;
  }, [activeLinks]);

  // Load stored locations
  useEffect(() => {
    localStorage.getLocations().then(setStoredLocations);
  }, []);

  // Get unique locations from players and stored locations
  const availableLocations = useMemo(() => {
    const locations = new Set<string>(storedLocations);
    players.forEach(player => {
      if (player.locations && player.locations.length > 0) {
        player.locations.forEach(loc => locations.add(loc));
      }
    });
    return Array.from(locations).sort();
  }, [players, storedLocations]);

  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation = !filterLocation || (player.locations && player.locations.includes(filterLocation));
      return matchesSearch && matchesLocation;
    });
  }, [players, searchQuery, filterLocation]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshLinks()]);
    setRefreshing(false);
  };

  const renderPlayer = ({ item }: { item: Player }) => {
    const linkedFriends = linkedPlayerMap.get(item.id) || [];
    
    return (
      <TouchableOpacity
        style={[styles.playerCard, { backgroundColor: themeColors.card }]}
        onPress={() => {
          haptics.lightTap();
          router.push(`/(main)/players/${item.id}`);
        }}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.playerInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.playerName, { color: themeColors.text }]}>{item.name}</Text>
            {linkedFriends.length > 0 && (
              <LinkedPlayerInlineBadge friendNames={linkedFriends} />
            )}
          </View>
          {item.notes && (
            <Text style={[styles.playerNotes, { color: themeColors.subText }]} numberOfLines={1}>
              {item.notes}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={themeColors.chevron} />
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={themeColors.icon} />
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Players Found</Text>
      <Text style={[styles.emptyText, { color: themeColors.subText }]}>
        {searchQuery || filterLocation 
          ? 'Try adjusting your search or filters' 
          : 'Add players to track their hand ranges'}
      </Text>
      {!searchQuery && !filterLocation && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            haptics.lightTap();
            router.push('/(main)/players/new');
          }}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Player</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.searchContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}>
          <Ionicons name="search" size={20} color={themeColors.icon} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.text }]}
            placeholder="Search players..."
            placeholderTextColor={themeColors.placeholder}
            editable={false}
          />
        </View>
        <View style={styles.listContent}>
          {[1, 2, 3, 4, 5].map((i) => (
            <PlayerCardSkeleton key={i} />
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

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}>
        <Ionicons name="search" size={20} color={themeColors.icon} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: themeColors.text }]}
          placeholder="Search players..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={themeColors.placeholder}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={themeColors.icon} />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons 
            name={filterLocation ? "filter" : "filter-outline"} 
            size={20} 
            color={filterLocation ? '#0a7ea4' : themeColors.icon} 
          />
        </TouchableOpacity>
      </View>

      {/* Players List */}
      <FlatList
        data={filteredPlayers}
        renderItem={renderPlayer}
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
      />

      {/* FAB */}
      {players.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            haptics.lightTap();
            router.push('/(main)/players/new');
          }}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Filter Players</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: themeColors.text }]}>Location</Text>
              <View style={styles.filterOptions}>
                {availableLocations.map(location => (
                  <TouchableOpacity
                    key={location}
                    style={[
                      styles.filterChip,
                      { backgroundColor: themeColors.filterChipBg },
                      filterLocation === location && styles.filterChipActive,
                      filterLocation === location && { backgroundColor: themeColors.filterChipActiveBg }
                    ]}
                    onPress={() => {
                      haptics.selectionChanged();
                      setFilterLocation(filterLocation === location ? null : location);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: themeColors.filterChipText },
                        filterLocation === location && styles.filterChipTextActive,
                        filterLocation === location && { color: themeColors.filterChipActiveText }
                      ]}
                    >
                      {location}
                    </Text>
                  </TouchableOpacity>
                ))}
                {availableLocations.length === 0 && (
                  <Text style={{ color: themeColors.subText }}>No locations found</Text>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.resetButton, { borderColor: themeColors.border }]}
                onPress={() => {
                  haptics.lightTap();
                  setFilterLocation(null);
                }}
              >
                <Text style={[styles.resetButtonText, { color: themeColors.text }]}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  haptics.lightTap();
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.applyButtonText}>Show Results</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
