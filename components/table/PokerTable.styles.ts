import { StyleSheet } from 'react-native';

// Vertical Table Layout
export const TABLE_WIDTH = 200;
export const TABLE_HEIGHT = 340;
export const SEAT_SIZE = 60;

export const styles = StyleSheet.create({
  tableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 450, // Ensure enough space
  },
  table: {
    width: TABLE_WIDTH,
    height: TABLE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableFelt: {
    width: '100%',
    height: '100%',
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
  tableText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    textAlign: 'center',
    width: '60%',
  },
  seat: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -30, // -SEAT_SIZE / 2
    marginLeft: -30, // -SEAT_SIZE / 2
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  seatOccupied: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  seatHero: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
  },
  seatPlayerName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    zIndex: 1,
  },
  seatPosition: {
    fontSize: 9,
    color: '#666',
    zIndex: 1,
  },
  seatTextLight: {
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  seatOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: SEAT_SIZE / 2,
  },
  seatNumber: {
    fontSize: 8,
    color: '#999',
  },
  buttonIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#333',
  },
  heroIndicator: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff9800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroText: {
    fontSize: 12,
    color: '#fff',
  },
  dealer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  dealerText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
    marginTop: -4,
  },
});
