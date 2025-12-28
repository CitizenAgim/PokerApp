import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SavedHandsScreen from '../saved-hands';
import * as handsService from '@/services/firebase/hands';

// Mock Firebase config FIRST to avoid import errors
jest.mock('@/config/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user' },
  },
  db: {},
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mocks
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock the entire hooks module to avoid transitive imports of firebase
const mockUser = { id: 'test-user' };
jest.mock('@/hooks', () => ({
  useCurrentUser: () => ({ user: mockUser, loading: false }),
  useSettings: () => ({ dateFormat: 'MM/DD/YYYY' }),
  useColorScheme: () => 'light',
}));

jest.mock('@/services/firebase/hands', () => ({
  getUserHands: jest.fn(),
  deleteHands: jest.fn(),
}));

// Mock data
const mockHands = [
  {
    id: 'hand-1',
    sessionId: 'session-1',
    userId: 'test-user',
    timestamp: 1672531200000, // Jan 1 2023
    street: 'river',
    pot: 100,
    sidePots: [],
    actions: [],
    seats: [],
    communityCards: [],
    winners: [1],
  },
  {
    id: 'hand-2',
    sessionId: 'session-1',
    userId: 'test-user',
    timestamp: 1672617600000, // Jan 2 2023
    street: 'flop',
    pot: 50,
    sidePots: [],
    actions: [],
    seats: [],
    communityCards: [],
    winners: [],
  },
];

describe('SavedHandsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (handsService.getUserHands as jest.Mock).mockResolvedValue(mockHands);
    (handsService.deleteHands as jest.Mock).mockResolvedValue(undefined);
    jest.spyOn(Alert, 'alert');
  });

  it('renders list of hands', async () => {
    const { getByText } = render(<SavedHandsScreen />);
    
    await waitFor(() => {
      expect(getByText('$100')).toBeTruthy();
      expect(getByText('$50')).toBeTruthy();
    });
  });

  it('activates selection mode on long press', async () => {
    const { getByText, getAllByText } = render(<SavedHandsScreen />);
    
    await waitFor(() => expect(getByText('$100')).toBeTruthy());

    // Find the first hand item (using pot value as a proxy for the item)
    const handItem = getByText('$100');
    
    // Long press to enter selection mode
    fireEvent(handItem, 'longPress');

    // Should see selection UI (e.g., "1 Selected" or similar, or just check if delete button appears)
    // Since we haven't implemented the UI yet, we'll look for the Delete button which should appear
    expect(getByText('Delete (1)')).toBeTruthy();
  });

  it('selects multiple hands', async () => {
    const { getByText } = render(<SavedHandsScreen />);
    
    await waitFor(() => expect(getByText('$100')).toBeTruthy());

    // Long press first item
    fireEvent(getByText('$100'), 'longPress');
    
    // Tap second item
    fireEvent.press(getByText('$50'));

    expect(getByText('Delete (2)')).toBeTruthy();
  });

  it('deletes selected hands', async () => {
    const { getByText } = render(<SavedHandsScreen />);
    
    await waitFor(() => expect(getByText('$100')).toBeTruthy());

    // Select items
    fireEvent(getByText('$100'), 'longPress');
    fireEvent.press(getByText('$50'));

    // Press delete
    fireEvent.press(getByText('Delete (2)'));

    // Should show confirmation alert
    expect(Alert.alert).toHaveBeenCalled();
    
    // Simulate confirming deletion (Alert.alert mock needs to trigger the callback)
    // Since we can't easily trigger the alert callback in this mock setup without a custom mock implementation,
    // we'll assume the component calls deleteHands directly for this test or we'd need a more complex mock.
    // For TDD simplicity, let's assume we mock Alert.alert to immediately call the "Delete" button onPress.
    
    const alertMock = Alert.alert as jest.Mock;
    const deleteCallback = alertMock.mock.calls[0][2][1].onPress;
    await act(async () => {
      await deleteCallback();
    });

    expect(handsService.deleteHands).toHaveBeenCalledWith(['hand-1', 'hand-2']);
    
    // Should refresh list (mock getUserHands again or check if items removed from view)
    // In a real app, we'd probably optimistically update or refetch.
    // If we refetch, getUserHands is called again.
    expect(handsService.getUserHands).toHaveBeenCalledTimes(1); // Initial only (optimistic update)
  });

  it('exits selection mode', async () => {
    const { getByText, queryByText } = render(<SavedHandsScreen />);
    
    await waitFor(() => expect(getByText('$100')).toBeTruthy());

    // Enter selection mode
    fireEvent(getByText('$100'), 'longPress');
    expect(getByText('Delete (1)')).toBeTruthy();

    // Press cancel/back (assuming the back button changes function or a cancel button appears)
    // Let's assume the header title changes to "1 Selected" and there is a Cancel button
    // Or we use the existing back button to cancel selection mode first.
    // For this feature, let's implement a specific "Cancel" button in the header when selecting.
    
    fireEvent.press(getByText('Cancel'));
    
    expect(queryByText('Delete (1)')).toBeNull();
  });
});
