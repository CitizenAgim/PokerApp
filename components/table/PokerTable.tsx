import { Seat as SeatType } from '@/types/poker';
import { StyleSheet, View } from 'react-native';
import { Seat } from './Seat';

interface PokerTableProps {
  seats: SeatType[];
  onSeatPress: (index: number) => void;
  heroSeatIndex?: number;
}

export function PokerTable({ seats, onSeatPress, heroSeatIndex = 4 }: PokerTableProps) {
  // Calculate seat positions
  // We want an oval shape. 
  // Center is (0,0) relative to the table container.
  // Table dimensions: Reduced to fit better on screen
  
  const TABLE_WIDTH = 260;
  const TABLE_HEIGHT = 440;
  const RX = TABLE_WIDTH / 2; // Horizontal radius
  const RY = TABLE_HEIGHT / 2; // Vertical radius
  
  // Seat positions (0-8)
  // 4 is Hero (Bottom Center) -> 90 degrees (or 270 depending on coordinate system)
  // Let's distribute them evenly. 360 / 9 = 40 degrees per seat.
  // If 4 is at 90 degrees (bottom), then:
  // 4: 90
  // 3: 50
  // 2: 10
  // 1: -30 (330)
  // 0: -70 (290)
  // 8: -110 (250)
  // 7: -150 (210)
  // 6: -190 (170)
  // 5: -230 (130)
  
  const getPosition = (index: number) => {
    // Adjust index so Hero (4) is at the bottom
    // Standard circle: 0 is right, 90 is bottom, 180 is left, 270 is top
    // We want index 4 to be at 90 degrees.
    // Angle = 90 - (index - 4) * 40
    
    const angleDeg = 90 - (index - 4) * 40;
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
