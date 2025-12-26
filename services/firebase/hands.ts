import { db } from '@/config/firebase';
import { Seat } from '@/types/poker';
import { HandAction, HandState, SidePot, Street } from '@/utils/hand-recording/types';
import {
    collection,
    doc,
    serverTimestamp,
    setDoc
} from 'firebase/firestore';

const COLLECTION_NAME = 'hands';
const handsCollection = collection(db, COLLECTION_NAME);

export interface HandRecord {
  id: string;
  sessionId: string;
  timestamp: number;
  street: Street;
  pot: number;
  sidePots: SidePot[];
  actions: HandAction[];
  seats: Seat[]; // Snapshot of seats at end of hand
  communityCards: string[];
  winner?: number; // Seat number of winner if known/determined
}

export async function saveHand(sessionId: string, state: HandState): Promise<string> {
  try {
    const handRef = doc(handsCollection);
    const id = handRef.id;
    
    const handData: any = {
      sessionId,
      timestamp: serverTimestamp(),
      street: state.street,
      pot: state.pot,
      sidePots: state.sidePots,
      actions: state.actions,
      seats: state.seats,
      communityCards: state.communityCards,
    };
    
    await setDoc(handRef, handData);
    return id;
  } catch (error) {
    console.error('Error saving hand:', error);
    throw error;
  }
}
