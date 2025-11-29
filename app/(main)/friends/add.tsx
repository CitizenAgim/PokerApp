import { useFriends, useUserSearch } from '@/hooks';
import { User } from '@/types/poker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface UserResultProps {
  user: User;
  onAdd: () => void;
  sending: boolean;
}

function UserResult({ user, onAdd, sending }: UserResultProps) {
  return (
    <View style={styles.resultCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{user.displayName}</Text>
        <Text style={styles.resultEmail}>{user.email}</Text>
      </View>
      <TouchableOpacity
        style={[styles.addUserButton, sending && styles.addUserButtonDisabled]}
        onPress={onAdd}
        disabled={sending}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="person-add" size={16} color="#fff" />
            <Text style={styles.addUserText}>Add</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function AddFriendScreen() {
  const router = useRouter();
  const { sendRequest, friends, outgoingRequests } = useFriends();
  const { results, searching, search, clear } = useUserSearch();
  
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  const handleSearch = () => {
    if (email.trim()) {
      search(email.trim());
    }
  };

  const handleSendRequest = async (user: User) => {
    // Check if already friends
    if (friends.some(f => f.id === user.id)) {
      Alert.alert('Already Friends', `You are already friends with ${user.displayName}`);
      return;
    }

    // Check if request already sent
    if (outgoingRequests.some(r => r.toUserId === user.id)) {
      Alert.alert('Request Pending', `You already sent a friend request to ${user.displayName}`);
      return;
    }

    try {
      setSending(true);
      await sendRequest(user.email);
      setSentTo(prev => new Set(prev).add(user.id));
      Alert.alert('Request Sent', `Friend request sent to ${user.displayName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send request';
      Alert.alert('Error', message);
    } finally {
      setSending(false);
    }
  };

  const handleDirectAdd = async () => {
    if (!email.trim()) {
      Alert.alert('Enter Email', 'Please enter an email address to send a friend request');
      return;
    }

    try {
      setSending(true);
      await sendRequest(email.trim());
      Alert.alert('Request Sent', 'Friend request sent successfully');
      setEmail('');
      clear();
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send request';
      Alert.alert('Error', message);
    } finally {
      setSending(false);
    }
  };

  // Filter out already friends and pending requests
  const filteredResults = results.filter(user => {
    if (friends.some(f => f.id === user.id)) return false;
    if (sentTo.has(user.id)) return false;
    return true;
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="mail-outline" size={20} color="#888" />
          <TextInput
            style={styles.searchInput}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email address"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {email.length > 0 && (
            <TouchableOpacity onPress={() => { setEmail(''); clear(); }}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.searchButtons}>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={searching || !email.trim()}
          >
            {searching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="search" size={18} color="#fff" />
                <Text style={styles.searchButtonText}>Search</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.searchButton, styles.directAddButton]}
            onPress={handleDirectAdd}
            disabled={sending || !email.trim()}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color="#fff" />
                <Text style={styles.searchButtonText}>Send Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Ionicons name="information-circle" size={20} color="#0a7ea4" />
        <Text style={styles.instructionsText}>
          Search by email address or send a friend request directly. They will
          receive a notification to accept or decline.
        </Text>
      </View>

      {/* Search Results */}
      {results.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Search Results</Text>
          <FlatList
            data={filteredResults}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <UserResult
                user={item}
                onAdd={() => handleSendRequest(item)}
                sending={sending}
              />
            )}
            ListEmptyComponent={
              results.length > 0 ? (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>
                    All found users are already your friends or have pending requests
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      )}

      {/* No Results State */}
      {email.trim() && !searching && results.length === 0 && (
        <View style={styles.noResultsState}>
          <Ionicons name="search-outline" size={48} color="#ccc" />
          <Text style={styles.noResultsTitle}>No users found</Text>
          <Text style={styles.noResultsSubtext}>
            Try a different email address or send a request directly
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchSection: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  searchButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  searchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a7ea4',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  directAddButton: {
    backgroundColor: '#27ae60',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#e3f2fd',
    margin: 16,
    borderRadius: 10,
    gap: 10,
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
  resultsSection: {
    flex: 1,
    padding: 16,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  resultEmail: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  addUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addUserButtonDisabled: {
    opacity: 0.6,
  },
  addUserText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  noResults: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  noResultsState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
});
