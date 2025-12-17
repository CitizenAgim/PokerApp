
import { Session } from '@/types/poker';

// Mock implementation of the logic used in the component
const endSessionLogic = (
  session: Session,
  cashOutAmount: string,
  endSessionBuyIn: string,
  startTime: Date,
  endTime: Date
) => {
  const cashOut = cashOutAmount ? parseFloat(cashOutAmount) : 0;
  const buyIn = endSessionBuyIn ? parseFloat(endSessionBuyIn) : (session.buyIn || 0);
  
  if (endTime < startTime) {
    throw new Error('End time cannot be earlier than start time');
  }

  return {
    cashOut,
    buyIn,
    startTime: startTime.getTime(),
    endTime: endTime.getTime()
  };
};

describe('End Session Logic', () => {
  const mockSession: Session = {
    id: '1',
    startTime: 1000000,
    buyIn: 100,
    isActive: true,
    name: 'Test Session',
    createdBy: 'user1',
    gameType: 'NLHE',
    stakes: '1/2',
    smallBlind: 1,
    bigBlind: 2
  };

  it('should return correct values when inputs are valid', () => {
    const startTime = new Date(1000000);
    const endTime = new Date(2000000);
    const result = endSessionLogic(mockSession, '200', '150', startTime, endTime);

    expect(result).toEqual({
      cashOut: 200,
      buyIn: 150,
      startTime: 1000000,
      endTime: 2000000
    });
  });

  it('should use session buyIn if input is empty', () => {
    const startTime = new Date(1000000);
    const endTime = new Date(2000000);
    const result = endSessionLogic(mockSession, '200', '', startTime, endTime);

    expect(result.buyIn).toBe(100);
  });

  it('should throw error if endTime is before startTime', () => {
    const startTime = new Date(2000000);
    const endTime = new Date(1000000);
    
    expect(() => {
      endSessionLogic(mockSession, '200', '100', startTime, endTime);
    }).toThrow('End time cannot be earlier than start time');
  });
});
