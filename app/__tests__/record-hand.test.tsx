import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import RecordHandScreen from '../record-hand';

// Mocks
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useLocalSearchParams: () => ({ sessionId: 'test-session' }),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { id: 'test-user' } }),
}));

jest.mock('@/services/firebase/hands', () => ({
  saveHand: jest.fn(),
}));

jest.mock('@/components/table/PokerTable', () => ({
  PokerTable: () => null
}));

// Dynamic mocks
const mockUseSession = jest.fn();
jest.mock('@/hooks', () => ({
  usePlayers: () => ({ players: [] }),
  useSession: (id: string) => mockUseSession(id),
}));

const mockUseHandRecorder = jest.fn();
jest.mock('@/hooks/useHandRecorder', () => ({
  useHandRecorder: (...args: any[]) => mockUseHandRecorder(args),
}));

describe('RecordHandScreen - Start Hand Validation', () => {
  const defaultHandRecorderState = {
    seats: [],
    setSeats: jest.fn(),
    buttonPosition: 1,
    setButtonPosition: jest.fn(),
    bets: {},
    setBets: jest.fn(),
    pot: 0,
    street: 'preflop',
    minRaise: 2,
    history: [],
    handCards: {},
    setHandCards: jest.fn(),
    communityCards: [],
    setCommunityCards: jest.fn(),
    isHandStarted: false,
    currentActionSeat: null,
    currentBet: 0,
    foldedSeats: new Set(),
    handleStartHand: jest.fn(),
    handleFold: jest.fn(),
    handleCheck: jest.fn(),
    handleCall: jest.fn(),
    handleBet: jest.fn(),
    handleUndo: jest.fn(),
    straddleCount: 0,
    setStraddleCount: jest.fn(),
    isMississippiActive: false,
    setIsMississippiActive: jest.fn(),
    isPickingBoard: false,
    isHandComplete: false,
    winners: [],
    actions: [],
    sidePots: [],
    handleDistributePot: jest.fn(),
  };

  const defaultSessionState = {
    session: { bigBlind: 2, smallBlind: 1, currency: 'USD' },
    table: { seats: [], buttonPosition: 1, heroSeatIndex: undefined },
    updateSeatStack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
    mockUseSession.mockReturnValue(defaultSessionState);
    mockUseHandRecorder.mockReturnValue(defaultHandRecorderState);
  });

  it('shows alert when Hero seat is not selected', () => {
    const { getByText } = render(<RecordHandScreen />);
    
    const startButton = getByText('Start Hand');
    fireEvent.press(startButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Setup Required',
      'Please select a Hero seat (tap a seat and choose "Set as Hero").'
    );
    expect(defaultHandRecorderState.handleStartHand).not.toHaveBeenCalled();
  });

  it('shows alert when Hero cards are not selected', () => {
    // Mock session to have hero seat selected (seat 1)
    mockUseSession.mockReturnValue({
      ...defaultSessionState,
      table: { ...defaultSessionState.table, heroSeatIndex: 1 }
    });

    const { getByText } = render(<RecordHandScreen />);
    
    const startButton = getByText('Start Hand');
    fireEvent.press(startButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Setup Required',
      "Please select Hero's hole cards before starting the hand."
    );
    expect(defaultHandRecorderState.handleStartHand).not.toHaveBeenCalled();
  });

  it('starts hand when Hero seat and cards are selected', () => {
    // Mock session to have hero seat selected (seat 1)
    mockUseSession.mockReturnValue({
      ...defaultSessionState,
      table: { ...defaultSessionState.table, heroSeatIndex: 1 }
    });

    // Mock hand recorder to have cards for seat 1
    mockUseHandRecorder.mockReturnValue({
      ...defaultHandRecorderState,
      handCards: { 1: ['As', 'Ks'] }
    });

    const { getByText } = render(<RecordHandScreen />);
    
    const startButton = getByText('Start Hand');
    fireEvent.press(startButton);

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(defaultHandRecorderState.handleStartHand).toHaveBeenCalled();
  });
});
