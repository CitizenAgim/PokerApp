import { Seat } from '@/types/poker';
import { renderHook } from '@testing-library/react-native';
import { useHandRecorder } from '../useHandRecorder';

// Mock Seat Data
const mockSeats: Seat[] = Array(9).fill(null).map((_, i) => ({
  index: i,
  seatNumber: i + 1,
  player: { id: `p${i+1}`, name: `Player ${i+1}`, stack: 1000, isTemp: true }
}));

describe('useHandRecorder', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useHandRecorder(mockSeats));
    expect(result.current.seats).toHaveLength(9);
    expect(result.current.street).toBe('preflop');
  });
});
