import { Seat } from '@/types/poker';
import { useState, useCallback } from 'react';
import { 
  HandState, 
  initialState, 
  startHand, 
  fold, 
  check, 
  call, 
  bet 
} from '@/utils/hand-recording/logic';

export const useHandRecorder = (initialSeats: Seat[], initialButtonPosition: number = 1, bigBlind: number = 0, smallBlind: number = 0) => {
  // State
  const [state, setState] = useState<HandState>({
    ...initialState,
    seats: initialSeats,
    buttonPosition: initialButtonPosition,
    bigBlind,
    smallBlind,
  });

  const [history, setHistory] = useState<HandState[]>([]);

  // Helper to save state for undo
  const saveState = useCallback(() => {
    setHistory(prev => [...prev, state]);
  }, [state]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prevState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setState(prevState);
  }, [history]);

  const handleStartHand = useCallback(() => {
    setState(prev => startHand(prev));
  }, []);

  const handleFold = useCallback(() => {
    saveState();
    setState(prev => fold(prev));
  }, [saveState]);

  const handleCheck = useCallback(() => {
    saveState();
    setState(prev => check(prev));
  }, [saveState]);

  const handleCall = useCallback(() => {
    saveState();
    setState(prev => call(prev));
  }, [saveState]);

  const handleBet = useCallback((amount: number) => {
    saveState();
    setState(prev => bet(prev, amount));
  }, [saveState]);

  // Expose state setters for UI-specific things (like card picking) that might not be in pure logic yet
  // Or better, add them to logic or handle them here if they are "UI state"
  
  const setHandCards = (cards: Record<number, string[]>) => {
      setState(prev => ({ ...prev, handCards: cards }));
  };

  const setCommunityCards = (cards: string[]) => {
      setState(prev => ({ ...prev, communityCards: cards }));
  };
  
  const setSeats = (seats: Seat[]) => {
      setState(prev => ({ ...prev, seats }));
  };

  const setButtonPosition = (pos: number) => {
      setState(prev => ({ ...prev, buttonPosition: pos }));
  };

  const setBets = (bets: Record<number, number>) => {
      setState(prev => ({ ...prev, bets }));
  };

  const setStraddleCount = (count: number | ((prev: number) => number)) => {
      setState(prev => ({ 
          ...prev, 
          straddleCount: typeof count === 'function' ? count(prev.straddleCount) : count 
      }));
  };

  const setIsMississippiActive = (active: boolean) => {
      setState(prev => ({ ...prev, isMississippiActive: active }));
  };

  return {
    // State
    seats: state.seats,
    bets: state.bets,
    pot: state.pot,
    street: state.street,
    currentActionSeat: state.currentActionSeat,
    currentBet: state.currentBet,
    minRaise: state.minRaise,
    foldedSeats: state.foldedSeats,
    handCards: state.handCards,
    communityCards: state.communityCards,
    buttonPosition: state.buttonPosition,
    isHandStarted: state.isHandStarted,
    isPickingBoard: state.isPickingBoard,
    straddleCount: state.straddleCount,
    isMississippiActive: state.isMississippiActive,
    isHandComplete: state.isHandComplete,
    winners: state.winners,
    actions: state.actions,
    sidePots: state.sidePots,
    
    // Actions
    handleStartHand,
    handleFold,
    handleCheck,
    handleCall,
    handleBet,
    handleUndo,
    
    // Setters (for setup/UI)
    setSeats,
    setButtonPosition,
    setHandCards,
    setCommunityCards,
    setBets,
    setStraddleCount,
    setIsMississippiActive,
    
    // History
    history,
  };
};
