import { Player, Seat, TablePlayer } from '@/types/poker';
import { getCurrencySymbol } from '@/utils/currency';
import { getPositionName } from '@/utils/positionCalculator';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SEAT_SIZE, styles, TABLE_HEIGHT, TABLE_WIDTH } from './PokerTable.styles';

const RX = TABLE_WIDTH / 2;
const RY = TABLE_HEIGHT / 2;
const SEAT_OFFSET = 30;

// Dealer Position (Between Seat 9 and Seat 1)
const DEALER_ANGLE = 180;
const DEALER_RAD = (DEALER_ANGLE * Math.PI) / 180;
const DEALER_X = (RX + SEAT_OFFSET) * Math.cos(DEALER_RAD);
const DEALER_Y = (RY + SEAT_OFFSET) * Math.sin(DEALER_RAD);

const getSeatPosition = (seatNumber: number) => {
  const safeSeatNum = (typeof seatNumber === 'number' && !isNaN(seatNumber)) ? seatNumber : 1;
  const angleDeg = 180 + safeSeatNum * 36;
  const angleRad = (angleDeg * Math.PI) / 180;
  
  const x = (RX + SEAT_OFFSET) * Math.cos(angleRad);
  const y = (RY + SEAT_OFFSET) * Math.sin(angleRad);
  
  return { x, y };
};

const getCardPosition = (seatNumber: number) => {
  const { x: seatX, y: seatY } = getSeatPosition(seatNumber);
  
  // Calculate distance from center
  const dist = Math.sqrt(seatX * seatX + seatY * seatY);
  
  // Place cards at a fixed distance from the seat center (inwards)
  // Seat radius is 30, so 55 gives a nice gap
  const offset = 55;
  const factor = Math.max(0, (dist - offset) / dist);
  
  const x = seatX * factor;
  const y = seatY * factor;
  
  return { x, y };
};

const getBlindPosition = (seatNumber: number) => {
  const { x: seatX, y: seatY } = getSeatPosition(seatNumber);
  
  // Calculate distance from center
  const dist = Math.sqrt(seatX * seatX + seatY * seatY);
  
  // Place blinds further in than cards (which are at 55)
  const offset = 85;
  const factor = Math.max(0, (dist - offset) / dist);
  
  const x = seatX * factor;
  const y = seatY * factor;
  
  return { x, y };
};

interface SeatViewProps {
  seat: Seat;
  player?: TablePlayer | null;
  isButton: boolean;
  isHero: boolean;
  onPress: () => void;
  buttonPosition: number;
  themeColors: any;
  isNinjaMode: boolean;
  currency?: string;
}

function SeatView({ seat, player, isButton, isHero, onPress, buttonPosition, themeColors, isNinjaMode, currency }: SeatViewProps) {
  const seatNum = seat.seatNumber ?? (typeof seat.index === 'number' ? seat.index + 1 : 1);
  const positionName = getPositionName(seatNum, buttonPosition);
  const currencySymbol = getCurrencySymbol(currency);

  const showPhoto = player?.photoUrl && !isNinjaMode;
  const { x, y } = getSeatPosition(seatNum);

  // Determine background color
  let backgroundColor = themeColors.seatBg;
  let borderColor = themeColors.seatBorder;
  let borderWidth = 2;

  if (player) {
    backgroundColor = themeColors.seatOccupiedBg;
    borderColor = themeColors.seatOccupiedBorder;
  }
  
  if (isHero) {
    backgroundColor = themeColors.seatHeroBg;
    borderColor = themeColors.seatHeroBorder;
  }

  if (player?.color) {
    borderColor = player.color;
    borderWidth = 4;
  }

  return (
    <TouchableOpacity
      style={[
        styles.seat,
        {
          transform: [
            { translateX: x },
            { translateY: y },
          ],
          backgroundColor,
          borderColor,
          borderWidth,
        },
      ]}
      onPress={onPress}
    >
      {player ? (
        <>
          {showPhoto && (
            <>
              <Image 
                source={{ uri: player.photoUrl }} 
                style={[StyleSheet.absoluteFill, { borderRadius: SEAT_SIZE / 2 }]} 
              />
              <View style={styles.seatOverlay} />
            </>
          )}
          <View style={styles.seatContent}>
            <Text style={[styles.seatPosition, { color: themeColors.subText }, showPhoto && styles.seatTextLight]}>
              {positionName}
            </Text>
            <Text style={[styles.seatPlayerName, { color: themeColors.text }, showPhoto && styles.seatTextLight]} numberOfLines={1}>
              {player.name}
            </Text>
            {player.stack !== undefined && (
              <Text style={[styles.seatStack, { color: themeColors.text }, showPhoto && styles.seatTextLight]}>
                {currencySymbol}{player.stack}
              </Text>
            )}
          </View>
        </>
      ) : (
        <>
          <Ionicons name="add" size={20} color={themeColors.icon} />
          <Text style={[styles.seatNumber, { color: themeColors.subText }]}>Seat {seatNum}</Text>
        </>
      )}
      
      {/* Button indicator */}
      {isButton && (
        <View style={[styles.buttonIndicator, { borderColor: themeColors.text }]}>
          <Text style={styles.buttonText}>D</Text>
        </View>
      )}
      
      {/* Hero indicator */}
      {isHero && (
        <View style={styles.heroIndicator}>
          <Text style={styles.heroText}>★</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface PokerTableProps {
  seats: Seat[];
  players?: Player[]; // Optional: if provided, will be used to lookup players by ID
  buttonPosition: number;
  heroSeat?: number;
  onSeatPress: (seatNumber: number) => void;
  themeColors: any;
  isNinjaMode?: boolean;
  centerText?: string;
  currency?: string;
  smallBlind?: number;
  bigBlind?: number;
  bets?: Record<number, number>; // Map of seatNumber to bet amount
  showCards?: boolean;
}

export function PokerTable({ 
  seats, 
  players, 
  buttonPosition, 
  heroSeat, 
  onSeatPress, 
  themeColors, 
  isNinjaMode = false,
  centerText = "Tap seat to assign player",
  currency,
  smallBlind,
  bigBlind,
  bets = {},
  showCards = true,
}: PokerTableProps) {
  
  // Calculate SB and BB positions
  const occupiedSeats = seats.filter(s => s.player || s.playerId).sort((a, b) => {
    const seatA = a.seatNumber ?? (typeof a.index === 'number' ? a.index + 1 : 0);
    const seatB = b.seatNumber ?? (typeof b.index === 'number' ? b.index + 1 : 0);
    return seatA - seatB;
  });
  
  let sbSeatNum = -1;
  let bbSeatNum = -1;

  if (occupiedSeats.length >= 2) {
    // Find the first occupied seat that has seatNumber > buttonPosition
    let nextIndex = occupiedSeats.findIndex(s => {
      const sNum = s.seatNumber ?? (typeof s.index === 'number' ? s.index + 1 : 0);
      return sNum > buttonPosition;
    });
    
    if (nextIndex === -1) {
      // Wrap around to the first occupied seat
      nextIndex = 0;
    }
    
    const sbSeat = occupiedSeats[nextIndex];
    sbSeatNum = sbSeat.seatNumber ?? (typeof sbSeat.index === 'number' ? sbSeat.index + 1 : 0);
    
    // BB is the next one
    let bbIndex = (nextIndex + 1) % occupiedSeats.length;
    const bbSeat = occupiedSeats[bbIndex];
    bbSeatNum = bbSeat.seatNumber ?? (typeof bbSeat.index === 'number' ? bbSeat.index + 1 : 0);
  }

  return (
    <View style={styles.tableContainer}>
      <View style={styles.table}>
        {/* Table felt */}
        <View style={styles.tableFelt} />
        
        {/* Dealer */}
        <View style={[styles.dealer, {
          transform: [
            { translateX: DEALER_X },
            { translateY: DEALER_Y },
          ]
        }]}>
          <MaterialCommunityIcons name="account-tie" size={32} color={themeColors.text} />
          <Text style={[styles.dealerText, { color: themeColors.subText }]}>Dealer</Text>
        </View>
        
        {/* Seats */}
        {seats.map((seat, i) => {
          const seatNum = seat.seatNumber ?? (typeof seat.index === 'number' ? seat.index + 1 : i + 1);
          
          // Resolve player: either from seat.player or lookup in players array
          let player = seat.player;
          
          if (seat.playerId && players) {
            const found = players.find(p => p.id === seat.playerId);
            if (found) {
              player = {
                ...(player || {}), // Keep stack and other session props
                id: found.id,
                name: found.name,
                photoUrl: found.photoUrl,
                color: found.color,
                isTemp: false,
              };
            }
          }

          const { x: cardX, y: cardY } = getCardPosition(seatNum);
          const { x: blindX, y: blindY } = getBlindPosition(seatNum);
          const isSB = seatNum === sbSeatNum;
          const isBB = seatNum === bbSeatNum;
          const betAmount = bets[seatNum];

          return (
            <React.Fragment key={seatNum}>
              {player && (
                <>
                  {showCards && (
                    <View style={[styles.cardContainer, {
                      transform: [
                        { translateX: cardX },
                        { translateY: cardY },
                      ]
                    }]}>
                      <View style={styles.card} />
                      <View style={[styles.card, styles.cardSecond]} />
                    </View>
                  )}
                  
                  {/* Blinds or Bets */}
                  {(betAmount !== undefined || ((isSB || isBB) && (smallBlind || bigBlind))) && (
                    <View style={[styles.blindContainer, {
                      transform: [
                        { translateX: blindX },
                        { translateY: blindY },
                      ]
                    }]}>
                      <View style={styles.blindBadge}>
                        {betAmount !== undefined ? (
                           <Text style={styles.blindText}>{betAmount}</Text>
                        ) : (
                          <>
                            <Text style={styles.blindLabel}>{isSB ? 'SB' : 'BB'}</Text>
                            <Text style={styles.blindText}>
                              {isSB ? smallBlind : bigBlind}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  )}
                </>
              )}
              <SeatView
                seat={seat}
                player={player}
                isButton={seatNum === buttonPosition}
                isHero={seatNum === heroSeat}
                onPress={() => onSeatPress(seatNum)}
                buttonPosition={buttonPosition}
                themeColors={themeColors}
                isNinjaMode={isNinjaMode}
                currency={currency}
              />
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}
