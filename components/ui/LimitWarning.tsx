import { VALIDATION_LIMITS } from '@/services/validation';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

// ============================================
// TYPES
// ============================================

export interface LimitWarningProps {
  current: number;
  max: number;
  label: string;
  showAlways?: boolean;
  warningThreshold?: number; // Default 0.8 (80%)
}

export interface LimitsCheckResult {
  isNearLimit: boolean;
  isAtLimit: boolean;
  percentage: number;
  remaining: number;
}

// ============================================
// LIMIT CHECK UTILITIES
// ============================================

/**
 * Check if a value is near or at its limit
 */
export function checkLimit(current: number, max: number, warningThreshold = 0.8): LimitsCheckResult {
  const percentage = max > 0 ? current / max : 0;
  const remaining = max - current;
  
  return {
    isNearLimit: percentage >= warningThreshold && percentage < 1,
    isAtLimit: current >= max,
    percentage,
    remaining,
  };
}

/**
 * Check player limits
 */
export function checkPlayerLimits(player: {
  notesList?: unknown[];
  locations?: unknown[];
  ranges?: Record<string, unknown>;
}): {
  notes: LimitsCheckResult;
  locations: LimitsCheckResult;
  ranges: LimitsCheckResult;
  hasWarnings: boolean;
  hasErrors: boolean;
} {
  const notes = checkLimit(
    player.notesList?.length || 0,
    VALIDATION_LIMITS.MAX_NOTES_LIST_ITEMS
  );
  const locations = checkLimit(
    player.locations?.length || 0,
    VALIDATION_LIMITS.MAX_LOCATIONS_PER_PLAYER
  );
  const ranges = checkLimit(
    player.ranges ? Object.keys(player.ranges).length : 0,
    VALIDATION_LIMITS.MAX_RANGES_PER_PLAYER
  );

  return {
    notes,
    locations,
    ranges,
    hasWarnings: notes.isNearLimit || locations.isNearLimit || ranges.isNearLimit,
    hasErrors: notes.isAtLimit || locations.isAtLimit || ranges.isAtLimit,
  };
}

/**
 * Check session limits
 */
export function checkSessionLimits(session: {
  table?: { seats?: unknown[] };
}): {
  players: LimitsCheckResult;
  hasWarnings: boolean;
  hasErrors: boolean;
} {
  const occupiedSeats = session.table?.seats?.filter((s: any) => s?.player) || [];
  const players = checkLimit(
    occupiedSeats.length,
    VALIDATION_LIMITS.MAX_PLAYERS_PER_SESSION
  );

  return {
    players,
    hasWarnings: players.isNearLimit,
    hasErrors: players.isAtLimit,
  };
}

// ============================================
// LIMIT WARNING COMPONENT
// ============================================

/**
 * Displays a warning when approaching or at a limit
 */
export function LimitWarning({
  current,
  max,
  label,
  showAlways = false,
  warningThreshold = 0.8,
}: LimitWarningProps) {
  const { isNearLimit, isAtLimit, remaining } = checkLimit(current, max, warningThreshold);

  // Don't show if not near limit and not showing always
  if (!showAlways && !isNearLimit && !isAtLimit) {
    return null;
  }

  const getStyle = () => {
    if (isAtLimit) return styles.error;
    if (isNearLimit) return styles.warning;
    return styles.info;
  };

  const getIcon = () => {
    if (isAtLimit) return 'alert-circle';
    if (isNearLimit) return 'warning';
    return 'information-circle';
  };

  const getColor = () => {
    if (isAtLimit) return '#e74c3c';
    if (isNearLimit) return '#f39c12';
    return '#3498db';
  };

  const getMessage = () => {
    if (isAtLimit) {
      return `${label} limit reached (${current}/${max})`;
    }
    if (isNearLimit) {
      return `${label}: ${remaining} remaining (${current}/${max})`;
    }
    return `${label}: ${current}/${max}`;
  };

  return (
    <View style={[styles.container, getStyle()]}>
      <Ionicons name={getIcon()} size={16} color={getColor()} />
      <Text style={[styles.text, { color: getColor() }]}>{getMessage()}</Text>
    </View>
  );
}

// ============================================
// LIMIT PROGRESS BAR
// ============================================

export interface LimitProgressProps {
  current: number;
  max: number;
  label: string;
  showLabel?: boolean;
}

export function LimitProgress({
  current,
  max,
  label,
  showLabel = true,
}: LimitProgressProps) {
  const { percentage, isNearLimit, isAtLimit } = checkLimit(current, max);
  
  const getColor = () => {
    if (isAtLimit) return '#e74c3c';
    if (isNearLimit) return '#f39c12';
    return '#27ae60';
  };

  return (
    <View style={styles.progressContainer}>
      {showLabel && (
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={styles.progressCount}>{current}/{max}</Text>
        </View>
      )}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(percentage * 100, 100)}%`,
              backgroundColor: getColor(),
            },
          ]}
        />
      </View>
    </View>
  );
}

// ============================================
// LIMIT SUMMARY COMPONENT
// ============================================

export interface LimitSummaryProps {
  limits: Array<{
    label: string;
    current: number;
    max: number;
  }>;
  showAll?: boolean;
}

export function LimitSummary({ limits, showAll = false }: LimitSummaryProps) {
  const warningsAndErrors = limits.filter(({ current, max }) => {
    const { isNearLimit, isAtLimit } = checkLimit(current, max);
    return showAll || isNearLimit || isAtLimit;
  });

  if (warningsAndErrors.length === 0) {
    return null;
  }

  return (
    <View style={styles.summaryContainer}>
      {warningsAndErrors.map(({ label, current, max }) => (
        <LimitWarning
          key={label}
          label={label}
          current={current}
          max={max}
          showAlways={showAll}
        />
      ))}
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 4,
    gap: 8,
  },
  info: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  warning: {
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
  },
  error: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  progressContainer: {
    marginVertical: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
  },
  progressCount: {
    fontSize: 12,
    color: '#999',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  summaryContainer: {
    marginVertical: 8,
  },
});
