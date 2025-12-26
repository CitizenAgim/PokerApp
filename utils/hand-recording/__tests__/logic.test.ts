import { Seat } from '@/types/poker';
import { bet, call, check, fold, initialState, startHand } from '../logic';
import { HandState } from '../types';

const createMockSeats = (count: number): Seat[] => 
  Array(count).fill(null).map((_, i) => ({
    index: i,
    seatNumber: i + 1,
    player: { id: `p${i+1}`, name: `Player ${i+1}`, stack: 1000, isTemp: true }
  }));

describe('Poker Logic', () => {
  let baseState: HandState;

  beforeEach(() => {
    baseState = {
      ...initialState,
      seats: createMockSeats(6), // 6-max table
      smallBlind: 1,
      bigBlind: 2,
      buttonPosition: 1, // Seat 1 is Button
    };
  });

  test('startHand posts blinds and sets first actor', () => {
    const state = startHand(baseState);
    
    // Button is 1.
    // SB should be 2. BB should be 3. UTG should be 4.
    
    expect(state.bets[2]).toBe(1); // SB
    expect(state.bets[3]).toBe(2); // BB
    expect(state.currentActionSeat).toBe(4); // UTG
    expect(state.currentBet).toBe(2);
    expect(state.seats[1].player?.stack).toBe(999); // SB paid 1
    expect(state.seats[2].player?.stack).toBe(998); // BB paid 2
  });

  test('bet updates stack and current bet', () => {
    let state = startHand(baseState);
    // UTG (Seat 4) bets 10
    state = bet(state, 10);
    
    expect(state.bets[4]).toBe(10);
    expect(state.currentBet).toBe(10);
    expect(state.seats[3].player?.stack).toBe(990); // 1000 - 10
    expect(state.currentActionSeat).toBe(5); // Next player
  });

  test('call matches the bet', () => {
    let state = startHand(baseState);
    // UTG (Seat 4) bets 10
    state = bet(state, 10);
    // Seat 5 calls
    state = call(state);
    
    expect(state.bets[5]).toBe(10);
    expect(state.seats[4].player?.stack).toBe(990);
    expect(state.currentActionSeat).toBe(6);
  });

  test('fold removes player from hand', () => {
    let state = startHand(baseState);
    // UTG (Seat 4) folds
    state = fold(state);
    
    expect(state.foldedSeats.has(4)).toBe(true);
    expect(state.currentActionSeat).toBe(5);
  });

  // NEW FEATURE TEST: Street Progression
  test('street advances when everyone calls preflop', () => {
    let state = startHand(baseState);
    // UTG (4) calls 2
    state = call(state);
    // MP (5) calls 2
    state = call(state);
    // CO (6) calls 2
    state = call(state);
    // BTN (1) calls 2
    state = call(state);
    // SB (2) calls (completes 1 to 2)
    state = call(state);
    // BB (3) checks
    state = check(state);
    
    // Should advance to Flop
    expect(state.street).toBe('flop');
    expect(state.pot).toBe(12); // 6 players * 2
    expect(state.bets).toEqual({}); // Bets cleared
    expect(state.currentBet).toBe(0);
    // First to act post-flop is SB (Seat 2) or first active after button
    expect(state.currentActionSeat).toBe(2);
  });

  test('street advances when everyone checks on flop', () => {
    let state = startHand(baseState);
    // Preflop: Everyone calls, BB checks
    state = call(state); // 4
    state = call(state); // 5
    state = call(state); // 6
    state = call(state); // 1
    state = call(state); // 2
    state = check(state); // 3
    
    expect(state.street).toBe('flop');
    
    // Flop: Everyone checks
    // Order: 2, 3, 4, 5, 6, 1
    state = check(state); // 2
    state = check(state); // 3
    state = check(state); // 4
    state = check(state); // 5
    state = check(state); // 6
    state = check(state); // 1
    
    expect(state.street).toBe('turn');
    expect(state.pot).toBe(12); // Unchanged
    expect(state.currentActionSeat).toBe(2);
  });

  test('raise re-opens action and street advances only when matched', () => {
    let state = startHand(baseState);
    // UTG (4) calls 2
    state = call(state);
    // MP (5) raises to 10
    state = bet(state, 10);
    
    expect(state.currentBet).toBe(10);
    expect(state.minRaise).toBe(8); // 10 - 2
    
    // CO (6) folds
    state = fold(state);
    // BTN (1) folds
    state = fold(state);
    // SB (2) folds
    state = fold(state);
    // BB (3) folds
    state = fold(state);
    
    // Action is back to UTG (4)
    expect(state.currentActionSeat).toBe(4);
    expect(state.street).toBe('preflop'); // Still preflop
    
    // UTG calls 10 (needs 8 more)
    state = call(state);
    
    expect(state.street).toBe('flop');
    expect(state.pot).toBe(23); // SB(1) + BB(2) + UTG(10) + MP(10) = 23
    expect(state.currentBet).toBe(0);
  });

  test('side pots are created correctly with all-in player', () => {
    // Setup: 3 players. P1 (BTN), P2 (SB), P3 (BB).
    // P1 stack: 1000. P2 stack: 50. P3 stack: 1000.
    // Blinds 10/20.
    const shortStackState = {
      ...baseState,
      seats: [
        { index: 0, seatNumber: 1, player: { id: 'p1', name: 'P1', stack: 1000, isTemp: true } },
        { index: 1, seatNumber: 2, player: { id: 'p2', name: 'P2', stack: 50, isTemp: true } },
        { index: 2, seatNumber: 3, player: { id: 'p3', name: 'P3', stack: 1000, isTemp: true } },
      ],
      smallBlind: 10,
      bigBlind: 20,
      buttonPosition: 1, // Seat 1 is Button
    };

    let state = startHand(shortStackState);
    // SB (P2) posts 10. BB (P3) posts 20.
    // Action on BTN (P1).
    
    // BTN raises to 100.
    state = bet(state, 100);
    
    // SB (P2) calls all-in (has 50 total, posted 10, puts in 40 more).
    // Total bet for P2 is 50.
    state = call(state);
    
    expect(state.bets[2]).toBe(50);
    expect(state.seats[1].player?.stack).toBe(0);
    
    // BB (P3) calls 100.
    state = call(state);
    
    // Round should end and advance to Flop.
    expect(state.street).toBe('flop');
    
    // Check Side Pots
    // Main Pot: P2 is all-in for 50. Everyone contributed at least 50.
    // 3 players * 50 = 150.
    // Side Pot 1: P1 and P3 contributed 50 more (100 total).
    // 2 players * 50 = 100.
    
    expect(state.sidePots.length).toBeGreaterThan(0);
    
    // Logic might consolidate main pot into "pot" variable or keep it all in sidePots structure depending on implementation.
    // Based on our implementation:
    // Pot variable holds everything until end of hand usually, OR we distribute to side pots.
    // Let's check how we implemented it. We implemented it to clear bets and push to sidePots.
    
    // Total money on table: 100 (P1) + 50 (P2) + 100 (P3) = 250.
    const totalSidePots = state.sidePots.reduce((sum, sp) => sum + sp.amount, 0);
    expect(state.pot).toBe(250);
    expect(totalSidePots).toBe(250);
    
    // Specifically:
    // Main Pot (eligible: P1, P2, P3): 150
    const mainPot = state.sidePots.find(sp => sp.eligibleSeats.includes(2));
    expect(mainPot).toBeDefined();
    expect(mainPot?.amount).toBe(150);
    
    // Side Pot (eligible: P1, P3): 100
    const sidePot = state.sidePots.find(sp => !sp.eligibleSeats.includes(2));
    expect(sidePot).toBeDefined();
    expect(sidePot?.amount).toBe(100);
  });
});
