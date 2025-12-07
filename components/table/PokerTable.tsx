import { Seat as SeatType } from '@/types/poker';
import { StyleSheet, View } from 'react-native';
import { Seat } from './Seat';

interface PokerTableProps {
  seats: SeatType[];
  onSeatPress: (index: number) => void;
  heroSeatIndex?: number;
}

export function PokerTable({ seats, onSeatPress, heroSeatIndex = 6 }: PokerTableProps) {
  // Calculate seat positions
  // We want an oval shape. 
  // Center is (0,0) relative to the table container.
  // Table dimensions: Reduced to fit better on screen
  
  const TABLE_WIDTH = 260;
  const TABLE_HEIGHT = 440;
  const RX = TABLE_WIDTH / 2; // Horizontal radius
  const RY = TABLE_HEIGHT / 2; // Vertical radius
  
  // Seat positions (0-8)
  // Seat 1 (Index 0) is Top Left (approx 210 degrees)
  // Order is Clockwise.
  // Formula: angleDeg = 210 + index * 40
  // 0: 210 (Top Left)
  // 1: 250 (Top)
  // 2: 290 (Top Right)
  // ...
  // 6: 450 -> 90 (Bottom Center - Hero)
  
  const getPosition = (index: number) => {
    const angleDeg = 210 + index * 40;
    const angleRad = (angleDeg * Math.PI) / 180;
    
    // Calculate position relative to center
    // We push seats slightly outside the table edge
    const x = (RX + 30) * Math.cos(angleRad);
    const y = (RY + 30) * Math.sin(angleRad);
    
    return { x, y };
  };

  return (
    <View style={styles.container}>
      {/* Table Felt */}
      <View style={[styles.table, { width: TABLE_WIDTH, height: TABLE_HEIGHT }]}>
        <View style={styles.innerRing} />
        <View style={styles.centerLogo} />
      </View>

      {/* Seats */}
      {Array.from({ length: 9 }).map((_, i) => {
        const { x, y } = getPosition(i);
        const seatData = seats.find(s => s.index === i);
        
        return (
          <Seat
            key={i}
            player={seatData?.player}
            onPress={() => onSeatPress(i)}
            isActive={i === heroSeatIndex}
            style={{
              transform: [
                { translateX: x },
                { translateY: y },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 500,
  },
  table: {
    backgroundColor: '#27ae60',
    borderRadius: 150, // Oval approximation
    borderWidth: 15,
    borderColor: '#3e2723', // Wood rail
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  innerRing: {
    width: '85%',
    height: '85%',
    borderRadius: 120,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  centerLogo: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
});
