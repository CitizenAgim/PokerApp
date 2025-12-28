import { Player, Seat, TablePlayer } from '@/types/poker';
import { getCurrencySymbol } from '@/utils/currency';
import { getPositionName } from '@/utils/positionCalculator';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SEAT_SIZE, styles, TABLE_HEIGHT, TABLE_WIDTH } from './PokerTable.styles';

// Responsive offsets based on table size
const SEAT_OFFSET = SEAT_SIZE / 2;
const CARD_OFFSET = TABLE_WIDTH * 0.14;
const BLIND_OFFSET = TABLE_WIDTH * 0.26;

const getSeatPosition = (seatNumber: number) => {
  const safeSeatNum = (typeof seatNumber === 'number' && !isNaN(seatNumber)) ? seatNumber : 1;
  // Distribute 9 seats around 10 positions, leaving top center for dealer
  const angleDeg = 270 + safeSeatNum * 36;
  const angleRad = (angleDeg * Math.PI) / 180;
  
  const x = (TABLE_WIDTH / 2 + SEAT_OFFSET) * Math.cos(angleRad);
  const y = (TABLE_HEIGHT / 2 + SEAT_OFFSET) * Math.sin(angleRad);
  
  return { x, y };
};

const getCardPosition = (seatNumber: number) => {
  const { x: seatX, y: seatY } = getSeatPosition(seatNumber);
  const dist = Math.sqrt(seatX * seatX + seatY * seatY);
  const factor = Math.max(0, (dist - CARD_OFFSET) / dist);
  
  const x = seatX * factor;
  const y = seatY * factor;
  
  return { x, y };
};

const getBlindPosition = (seatNumber: number) => {
  const { x: seatX, y: seatY } = getSeatPosition(seatNumber);
  const dist = Math.sqrt(seatX * seatX + seatY * seatY);
  const factor = Math.max(0, (dist - BLIND_OFFSET) / dist);
  
  let x = seatX * factor;
  let y = seatY * factor;

  // Align bottom seats (4, 5, 6) to the same vertical level
  if (seatNumber === 5) {
    const { x: s4X, y: s4Y } = getSeatPosition(4);
    const d4 = Math.sqrt(s4X * s4X + s4Y * s4Y);
    const f4 = Math.max(0, (d4 - BLIND_OFFSET) / d4);
    y = s4Y * f4;
  }
  
  return { x, y };
};

interface SeatViewProps {
  seat: Seat;
  player?: TablePlayer | null;
  isButton: boolean;
  isHero: boolean;
  isActive: boolean;
  onPress: () => void;
  buttonPosition: number;
  themeColors: any;
  currency?: string;
}

function SeatView({ seat, player, isButton, isHero, isActive, onPress, buttonPosition, themeColors, currency }: SeatViewProps) {
  const seatNum = seat.seatNumber ?? (typeof seat.index === 'number' ? seat.index + 1 : 1);
  const positionName = getPositionName(seatNum, buttonPosition);
  const currencySymbol = getCurrencySymbol(currency);

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

  if (isActive) {
    borderColor = '#f1c40f'; // Gold highlight for active player
    borderWidth = 4;
  } else if (player?.color) {
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
        <View style={styles.seatContent}>
          <Text style={[styles.seatPosition, { color: themeColors.subText }]}>
            {positionName}
          </Text>
          <Text style={[styles.seatPlayerName, { color: themeColors.text }]} numberOfLines={1}>
            {player.name}
          </Text>
          {player.stack !== undefined && (
            <Text style={[styles.seatStack, { color: themeColors.text }]}>
              {currencySymbol}{player.stack}
            </Text>
          )}
        </View>
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
  activeSeat?: number | null;
  onSeatPress: (seatNumber: number) => void;
  themeColors: any;
  centerText?: string;
  currency?: string;
  smallBlind?: number;
  bigBlind?: number;
  bets?: Record<number, number>; // Map of seatNumber to bet amount
  showCards?: boolean;
  handCards?: Record<number, string[]>; // Map of seatNumber to array of card IDs (e.g. ["As", "Kd"])
  onCardPress?: (seatNumber: number) => void;
  onBoardPress?: () => void;
  communityCards?: string[];
  foldedSeats?: Set<number>;
  pot?: number;
  street?: string;
}

export function PokerTable({ 
  seats, 
  players, 
  buttonPosition, 
  heroSeat, 
  activeSeat,
  onSeatPress, 
  themeColors, 
  centerText = "Tap seat to assign player",
  currency,
  smallBlind,
  bigBlind,
  bets = {},
  showCards = true,
  handCards = {},
  onCardPress,
  communityCards = [],
  foldedSeats,
  pot = 0,
  street = 'preflop',
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

  // Calculate total pot (main pot + current bets)
  const currentBetsTotal = Object.values(bets).reduce((sum, bet) => sum + (bet || 0), 0);
  const displayPot = pot + currentBetsTotal;

  return (
    <View style={styles.tableContainer}>
      <View style={styles.table}>
        {/* Table felt */}
        <View style={styles.tableFelt} />
        
        {/* Pot Display */}
        {displayPot > 0 && (
          <View style={styles.potContainer}>
            <View style={styles.potBadge}>
              <Text style={styles.potLabel}>Pot:</Text>
              <Text style={styles.potText}>{displayPot}</Text>
            </View>
          </View>
        )}
        
        {/* Community Cards */}
        {showCards && (
          <TouchableOpacity 
            style={styles.communityCardsContainer}
            onPress={onBoardPress}
            disabled={!onBoardPress}
          >
            {[0, 1, 2, 3, 4].map((index) => {
              const cardId = communityCards[index];
              if (!cardId) {
                return (
                  <View 
                    key={`community-${index}`}
                    style={styles.communityCard}
                  />
                );
              }

              const rank = cardId.slice(0, -1);
              const suitId = cardId.slice(-1);
              const isRed = suitId === 'h' || suitId === 'd';
              const suitSymbol = suitId === 's' ? '♠' : suitId === 'h' ? '♥' : suitId === 'd' ? '♦' : '♣';

              return (
                <View 
                  key={`community-${index}`}
                  style={[styles.communityCard, styles.communityCardSelected]}
                >
                  <Text style={[styles.communityCardText, { color: isRed ? '#e74c3c' : '#000' }]}>{rank}</Text>
                  <Text style={[styles.communityCardSuit, { color: isRed ? '#e74c3c' : '#000' }]}>{suitSymbol}</Text>
                </View>
              );
            })}
          </TouchableOpacity>
        )}

        {/* Dealer */}
        <View style={[styles.dealer, {
          transform: [
            { translateX: 0 },
            { translateY: -(TABLE_HEIGHT / 2 + SEAT_OFFSET - 8) },
          ]
        }]}>
          <MaterialCommunityIcons name="account-tie" size={Math.max(24, TABLE_HEIGHT * 0.2)} color={themeColors.text} />
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
                color: found.color,
              };
            }
          }

          const { x: cardX, y: cardY } = getCardPosition(seatNum);
          const { x: blindX, y: blindY } = getBlindPosition(seatNum);
          const isSB = seatNum === sbSeatNum;
          const isBB = seatNum === bbSeatNum;
          const betAmount = bets[seatNum];
          const cards = handCards[seatNum] || [];
          const isFolded = foldedSeats?.has(seatNum);

          const renderCard = (cardId?: string, isSecond?: boolean) => {
            if (!cardId) {
              return <View style={[styles.card, isSecond && styles.cardSecond]} />;
            }
            
            const rank = cardId.slice(0, -1);
            const suitId = cardId.slice(-1);
            const isRed = suitId === 'h' || suitId === 'd';
            const suitSymbol = suitId === 's' ? '♠' : suitId === 'h' ? '♥' : suitId === 'd' ? '♦' : '♣';
            
            return (
              <View style={[styles.card, styles.cardSelected, isSecond && styles.cardSecond]}>
                <Text style={[styles.cardText, { color: isRed ? '#e74c3c' : '#000' }]}>{rank}</Text>
                <Text style={[styles.cardSuit, { color: isRed ? '#e74c3c' : '#000' }]}>{suitSymbol}</Text>
              </View>
            );
          };

          return (
            <React.Fragment key={seatNum}>
              {player && (
                <>
                  {showCards && !isFolded && (
                    <TouchableOpacity 
                      style={[styles.cardContainer, {
                        transform: [
                          { translateX: cardX },
                          { translateY: cardY },
                        ]
                      }]}
                      onPress={() => onCardPress?.(seatNum)}
                      disabled={!onCardPress}
                    >
                      {renderCard(cards[0])}
                      {renderCard(cards[1], true)}
                    </TouchableOpacity>
                  )}
                  
                  {/* Blinds or Bets */}
                  {(betAmount !== undefined || ((isSB || isBB) && (smallBlind || bigBlind) && street === 'preflop')) && (
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
                isActive={seatNum === activeSeat}
                onPress={() => onSeatPress(seatNum)}
                buttonPosition={buttonPosition}
                themeColors={themeColors}
                currency={currency}
              />
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}
