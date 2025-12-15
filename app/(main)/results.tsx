import { useSessions } from '@/hooks';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function ResultsScreen() {
  const { sessions, loading, refresh } = useSessions();

  useFocusEffect(
    useCallback(() => {
      // Small delay to avoid "offscreen beginRefreshing" warning on iOS
      // when switching tabs rapidly
      const timer = setTimeout(() => {
        refresh();
      }, 200);
      
      return () => clearTimeout(timer);
    }, [refresh])
  );

  const stats = useMemo(() => {
    const finishedSessions = sessions.filter(s => !s.isActive && s.endTime);
    
    const totalSessions = finishedSessions.length;
    
    let totalDurationMs = 0;
    let totalBuyIn = 0;
    let totalCashOut = 0;
    let winningSessions = 0;

    finishedSessions.forEach(session => {
      const duration = session.duration || ((session.endTime || Date.now()) - session.startTime);
      totalDurationMs += duration;
      
      const buyIn = session.buyIn || 0;
      const cashOut = session.cashOut || 0;
      
      totalBuyIn += buyIn;
      totalCashOut += cashOut;
      
      if (cashOut > buyIn) {
        winningSessions++;
      }
    });

    const totalHours = totalDurationMs / (1000 * 60 * 60);
    const totalNetProfit = totalCashOut - totalBuyIn;
    const hourlyRate = totalHours > 0 ? totalNetProfit / totalHours : 0;
    const winRate = totalSessions > 0 ? (winningSessions / totalSessions) * 100 : 0;
    const avgProfit = totalSessions > 0 ? totalNetProfit / totalSessions : 0;

    return {
      totalSessions,
      totalHours,
      hourlyRate,
      winRate,
      avgProfit,
      totalNetProfit,
    };
  }, [sessions]);

  if (loading && sessions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} colors={['#0a7ea4']} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Performance Results</Text>
        <Text style={styles.headerSubtitle}>Lifetime Statistics</Text>
      </View>

      <View style={styles.mainCard}>
        <Text style={styles.mainLabel}>Total Net Profit</Text>
        <Text style={[
          styles.mainValue, 
          stats.totalNetProfit >= 0 ? styles.profit : styles.loss
        ]}>
          {stats.totalNetProfit >= 0 ? '+' : ''}{stats.totalNetProfit.toFixed(2)}
        </Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="trending-up" size={24} color="#0a7ea4" />
          </View>
          <Text style={styles.cardLabel}>Hourly Rate</Text>
          <Text style={[
            styles.cardValue,
            stats.hourlyRate >= 0 ? styles.profitText : styles.lossText
          ]}>
            {stats.hourlyRate.toFixed(2)}/hr
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="game-controller" size={24} color="#0a7ea4" />
          </View>
          <Text style={styles.cardLabel}>Sessions</Text>
          <Text style={styles.cardValue}>{stats.totalSessions}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="time" size={24} color="#0a7ea4" />
          </View>
          <Text style={styles.cardLabel}>Total Hours</Text>
          <Text style={styles.cardValue}>{stats.totalHours.toFixed(1)}h</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="pie-chart" size={24} color="#0a7ea4" />
          </View>
          <Text style={styles.cardLabel}>Win Rate</Text>
          <Text style={styles.cardValue}>{stats.winRate.toFixed(1)}%</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="bar-chart" size={24} color="#0a7ea4" />
          </View>
          <Text style={styles.cardLabel}>Avg Profit</Text>
          <Text style={[
            styles.cardValue,
            stats.avgProfit >= 0 ? styles.profitText : styles.lossText
          ]}>
            {stats.avgProfit >= 0 ? '+' : ''}{stats.avgProfit.toFixed(2)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  mainCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mainLabel: {
    fontSize: 14,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  mainValue: {
    fontSize: 48,
    fontWeight: '700',
  },
  profit: {
    color: '#27ae60',
  },
  loss: {
    color: '#e74c3c',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  card: {
    width: '45%', // Approximately half width minus margins
    backgroundColor: '#fff',
    margin: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flexGrow: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  profitText: {
    color: '#27ae60',
  },
  lossText: {
    color: '#e74c3c',
  },
});
