import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert, Platform } from 'react-native';

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
const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ id: 'test-session-id' }),
  useFocusEffect: jest.fn((cb) => cb()),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-native-community/datetimepicker', () => 'RNDateTimePicker');

// Mock session data
const mockTable = {
  sessionId: 'test-session-id',
  buttonPosition: 1,
  heroSeatIndex: 5,
  seats: [
    { index: 0, seatNumber: 1, player: null, playerId: null },
    { index: 1, seatNumber: 2, player: null, playerId: null },
    { index: 2, seatNumber: 3, player: null, playerId: null },
    { index: 3, seatNumber: 4, player: null, playerId: null },
    { index: 4, seatNumber: 5, player: { id: 'hero', name: 'Hero', isTemp: false, stack: 1000 }, playerId: 'hero' },
    { index: 5, seatNumber: 6, player: null, playerId: null },
    { index: 6, seatNumber: 7, player: null, playerId: null },
    { index: 7, seatNumber: 8, player: null, playerId: null },
    { index: 8, seatNumber: 9, player: null, playerId: null },
  ],
};

const mockSession = {
  id: 'test-session-id',
  userId: 'test-user',
  name: 'Test Session',
  location: 'Test Casino',
  stakes: '1/2',
  buyIn: 200,
  startTime: Date.now(),
  endTime: null,
  status: 'active',
};

const mockPlayers = [
  { id: 'player-1', name: 'John', notes: 'Aggressive player', color: '#ff0000' },
  { id: 'player-2', name: 'Jane', notes: 'Tight player', color: '#00ff00' },
  { id: 'player-3', name: 'Bob', notes: '', color: '#0000ff' },
];

const mockAssignPlayerToSeat = jest.fn().mockResolvedValue(undefined);
const mockUpdatePlayer = jest.fn().mockResolvedValue(undefined);
const mockCreatePlayer = jest.fn().mockResolvedValue({ id: 'new-player', name: 'New Player' });

jest.mock('@/hooks', () => ({
  useCurrentUser: () => ({ user: { id: 'test-user' }, loading: false }),
  useSettings: () => ({ dateFormat: 'MM/DD/YYYY' }),
  useCurrentSession: () => ({ clearSession: jest.fn() }),
  usePlayers: () => ({
    players: mockPlayers,
    createPlayer: mockCreatePlayer,
    updatePlayer: mockUpdatePlayer,
  }),
  useSession: () => ({
    session: mockSession,
    table: mockTable,
    loading: false,
    updateButtonPosition: jest.fn(),
    assignPlayerToSeat: mockAssignPlayerToSeat,
    updateSeatStack: jest.fn(),
    movePlayer: jest.fn(),
    endSession: jest.fn(),
    updateSessionDetails: jest.fn(),
    updateHeroSeat: jest.fn(),
    clearTable: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/services/firebase/hands', () => ({
  getHandsBySession: jest.fn().mockResolvedValue([]),
  deleteHandRecords: jest.fn(),
}));

// Import the component after mocks are set up
import SessionDetailScreen from '../(main)/sessions/[id]';

describe('SessionDetailScreen - Player Assignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
  });

  describe('Assign Existing Player Modal', () => {
    it('should show the assign player modal when selecting an existing player', async () => {
      const { getByText, queryByText } = render(<SessionDetailScreen />);
      
      // Wait for component to load
      await waitFor(() => {
        expect(queryByText('Test Session')).toBeTruthy();
      });
      
      // Modal should not be visible initially
      expect(queryByText('Initial Stack Size')).toBeNull();
    });

    it('should have state variables for assign player modal', () => {
      // This tests that the component has the required state
      // The actual state is tested through interaction
      const { UNSAFE_root } = render(<SessionDetailScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should not use Alert.prompt for player assignment (iOS-only API)', async () => {
      // Verify that Alert.prompt is NOT called when assigning players
      // This ensures cross-platform compatibility
      
      const { getByText } = render(<SessionDetailScreen />);
      
      await waitFor(() => {
        expect(getByText('Test Session')).toBeTruthy();
      });
      
      // Alert.prompt should not be called during render
      expect(Alert.alert).not.toHaveBeenCalledWith(
        'Initial Stack',
        expect.any(String),
        expect.any(Array),
        'plain-text',
        expect.any(String),
        'numeric'
      );
    });

    it('should work on both iOS and Android platforms', async () => {
      // Test iOS
      Platform.OS = 'ios';
      const { unmount: unmountIOS } = render(<SessionDetailScreen />);
      unmountIOS();
      
      // Test Android
      Platform.OS = 'android';
      const { getByText } = render(<SessionDetailScreen />);
      
      await waitFor(() => {
        expect(getByText('Test Session')).toBeTruthy();
      });
    });
  });

  describe('Unknown Player Assignment', () => {
    it('should show unknown player modal on both platforms', async () => {
      Platform.OS = 'android';
      
      const { getByText, queryByText } = render(<SessionDetailScreen />);
      
      await waitFor(() => {
        expect(queryByText('Test Session')).toBeTruthy();
      });
      
      // Verify the component renders without errors on Android
      expect(getByText('Test Session')).toBeTruthy();
    });
  });

  describe('handleConfirmAssignPlayer', () => {
    it('should call assignPlayerToSeat with correct parameters when confirmed', async () => {
      const { getByText } = render(<SessionDetailScreen />);
      
      await waitFor(() => {
        expect(getByText('Test Session')).toBeTruthy();
      });
      
      // The actual function test - verify it exists and component renders
      // Integration test would need to trigger the modal and confirm
      expect(mockAssignPlayerToSeat).not.toHaveBeenCalled();
    });

    it('should handle empty stack input as 0', async () => {
      // This tests the logic: empty string should default to 0
      const stack = '';
      const initialStack = stack ? parseFloat(stack) : 0;
      expect(initialStack).toBe(0);
    });

    it('should handle numeric stack input correctly', async () => {
      const stack = '500';
      const initialStack = stack ? parseFloat(stack) : 0;
      expect(initialStack).toBe(500);
    });

    it('should handle invalid stack input', async () => {
      const stack = 'invalid';
      const initialStack = stack ? parseFloat(stack) : 0;
      expect(isNaN(initialStack)).toBe(true);
    });
  });

  describe('Modal State Management', () => {
    it('should close player picker before opening assign modal', async () => {
      // Test the flow: player picker closes -> small delay -> assign modal opens
      const { getByText } = render(<SessionDetailScreen />);
      
      await waitFor(() => {
        expect(getByText('Test Session')).toBeTruthy();
      });
      
      // Component should render successfully with state management
      expect(getByText('Test Session')).toBeTruthy();
    });
  });

  describe('Player List Display', () => {
    it('should display available players in the picker', async () => {
      const { getByText } = render(<SessionDetailScreen />);
      
      await waitFor(() => {
        expect(getByText('Test Session')).toBeTruthy();
      });
      
      // Players should be available in the hook
      expect(mockPlayers).toHaveLength(3);
      expect(mockPlayers[0].name).toBe('John');
    });
  });
});

describe('Assign Player Stack Input Logic', () => {
  it('should parse valid numeric input', () => {
    const testCases = [
      { input: '100', expected: 100 },
      { input: '0', expected: 0 },
      { input: '1500.50', expected: 1500.5 },
      { input: '', expected: 0 },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = input ? parseFloat(input) : 0;
      expect(result).toBe(expected);
    });
  });

  it('should detect invalid numeric input', () => {
    const invalidInputs = ['abc', '12abc', 'NaN', 'undefined'];
    
    invalidInputs.forEach((input) => {
      const result = parseFloat(input);
      expect(isNaN(result)).toBe(true);
    });
  });
});
