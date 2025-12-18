import { PlayerCardSkeleton } from '@/components/ui';
import { usePlayers, useSettings } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getThemeColors, styles } from '@/styles/players/index.styles';
import { Player } from '@/types/poker';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    FlatList,
    RefreshControl,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function PlayersScreen() {
  const router = useRouter();
  const { players, loading, error, refresh } = usePlayers();
  const { ninjaMode } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Theme colors
  const themeColors = getThemeColors(isDark);

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const renderPlayer = ({ item }: { item: Player }) => (
    <TouchableOpacity
      style={[styles.playerCard, { backgroundColor: themeColors.card }]}
      onPress={() => {
        haptics.lightTap();
        router.push(`/(main)/players/${item.id}`);
      }}
    >
      {!ninjaMode && item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.playerInfo}>
        <Text style={[styles.playerName, { color: themeColors.text }]}>{item.name}</Text>
        {item.notes && (
          <Text style={[styles.playerNotes, { color: themeColors.subText }]} numberOfLines={1}>
            {item.notes}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={themeColors.chevron} />
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={themeColors.icon} />
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Players Yet</Text>
      <Text style={[styles.emptyText, { color: themeColors.subText }]}>
        Add players to track their hand ranges
      </Text>
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
    </View>
  );
}
