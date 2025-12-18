import { useSessions } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const SCREEN_WIDTH = Dimensions.get('window').width;

type TimeFilter = '1W' | '1M' | 'YTD' | '1Y' | '3Y' | 'All';

// Custom Bar Chart Component
const CustomBarChart = ({ data, labels, title, themeColors }: { data: number[], labels: string[], title: string, themeColors: any }) => {
  const maxVal = Math.max(...data.map(Math.abs), 1); // Avoid division by zero
  const chartHeight = 200;
  const halfHeight = chartHeight / 2;

  return (
    <View style={[styles.customChartContainer, { backgroundColor: themeColors.card }]}>
      <Text style={[styles.chartTitle, { color: themeColors.text }]}>{title}</Text>
      <View style={[styles.chartBody, { height: chartHeight }]}>
        {/* Zero Line */}
        <View style={[styles.zeroLine, { top: halfHeight, backgroundColor: themeColors.border }]} />
        
        {data.map((value, index) => {
          const barHeight = (Math.abs(value) / maxVal) * (halfHeight - 20); // Leave some padding
          const isPositive = value >= 0;
          
          return (
            <View key={index} style={styles.barColumn}>
              <View style={styles.barWrapper}>
                {/* Positive Bar Area */}
                <View style={styles.positiveArea}>
                  {isPositive && value !== 0 && (
                    <>
                      <Text style={[styles.barValue, { color: themeColors.subText }]}>{value}</Text>
                      <View style={[styles.bar, styles.positiveBar, { height: barHeight }]} />
                    </>
                  )}
                </View>
                
                {/* Negative Bar Area */}
                <View style={styles.negativeArea}>
                  {!isPositive && value !== 0 && (
                    <>
                      <View style={[styles.bar, styles.negativeBar, { height: barHeight }]} />
                      <Text style={[styles.barValue, { color: themeColors.subText }]}>{value}</Text>
                    </>
                  )}
                </View>
              </View>
              <Text style={[styles.barLabel, { color: themeColors.subText }]}>{labels[index]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default function ResultsScreen() {
  const { sessions, loading, refresh } = useSessions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [activeTab, setActiveTab] = useState<'overview' | 'graph' | 'charts' | 'locations'>('overview');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('All');
  const [chartMetric, setChartMetric] = useState<'profit' | 'hourly' | 'ytd'>('profit');

  // Theme colors
  const themeColors = {
    background: isDark ? '#000' : '#f5f5f5',
    card: isDark ? '#1c1c1e' : '#fff',
    text: isDark ? '#fff' : '#333',
    subText: isDark ? '#aaa' : '#666',
    border: isDark ? '#333' : '#e0e0e0',
    iconBg: isDark ? '#2c2c2e' : '#f0f9ff',
    tabBg: isDark ? '#333' : '#e0e0e0',
    activeTabBg: isDark ? '#1c1c1e' : '#fff',
    filterBg: isDark ? '#333' : '#f0f0f0',
  };

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

  const locationsData = useMemo(() => {
    const finishedSessions = sessions.filter(s => !s.isActive && s.endTime);
    const locationMap = new Map<string, {
      sessions: number;
      duration: number;
      profit: number;
      wins: number;
    }>();

    finishedSessions.forEach(session => {
      const location = session.location || 'Unknown';
      const profit = (session.cashOut || 0) - (session.buyIn || 0);
      const duration = session.duration || ((session.endTime || Date.now()) - session.startTime);
      
      if (!locationMap.has(location)) {
        locationMap.set(location, { sessions: 0, duration: 0, profit: 0, wins: 0 });
      }
      
      const stats = locationMap.get(location)!;
      stats.sessions += 1;
      stats.duration += duration;
      stats.profit += profit;
      if (profit > 0) stats.wins += 1;
    });

    return Array.from(locationMap.entries()).map(([name, stats]) => {
      const totalHours = stats.duration / (1000 * 60 * 60);
      const hourlyRate = totalHours > 0 ? stats.profit / totalHours : 0;
      const winRate = stats.sessions > 0 ? (stats.wins / stats.sessions) * 100 : 0;
      
      return {
        name,
        sessions: stats.sessions,
        totalHours,
        totalProfit: stats.profit,
        winRate,
        hourlyRate
      };
    }).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [sessions]);

  const graphData = useMemo(() => {
    const now = new Date();
    const finishedSessions = sessions
      .filter(s => !s.isActive && s.endTime)
      .sort((a, b) => (a.startTime || 0) - (b.startTime || 0));

    let filteredSessions = finishedSessions;
    const oneDay = 24 * 60 * 60 * 1000;

    switch (timeFilter) {
      case '1W':
        filteredSessions = finishedSessions.filter(s => (now.getTime() - s.startTime) <= 7 * oneDay);
        break;
      case '1M':
        filteredSessions = finishedSessions.filter(s => (now.getTime() - s.startTime) <= 30 * oneDay);
        break;
      case 'YTD':
        const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
        filteredSessions = finishedSessions.filter(s => s.startTime >= startOfYear);
        break;
      case '1Y':
        filteredSessions = finishedSessions.filter(s => (now.getTime() - s.startTime) <= 365 * oneDay);
        break;
      case '3Y':
        filteredSessions = finishedSessions.filter(s => (now.getTime() - s.startTime) <= 3 * 365 * oneDay);
        break;
      case 'All':
      default:
        filteredSessions = finishedSessions;
        break;
    }

    if (filteredSessions.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [0] }],
      };
    }

    let cumulativeProfit = 0;
    const dataPoints = filteredSessions.map(session => {
      const profit = (session.cashOut || 0) - (session.buyIn || 0);
      cumulativeProfit += profit;
      return cumulativeProfit;
    });

    // Generate labels (simplified to avoid overcrowding)
    const labels = filteredSessions.map((session, index) => {
      // Show label for first, last, and some in between
      if (index === 0 || index === filteredSessions.length - 1 || index % Math.ceil(filteredSessions.length / 5) === 0) {
        return new Date(session.startTime).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
      }
      return '';
    });

    return {
      labels,
      datasets: [{ data: dataPoints }],
    };
  }, [sessions, timeFilter]);

  const chartsData = useMemo(() => {
    const finishedSessions = sessions.filter(s => !s.isActive && s.endTime);
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    let sessionsToProcess = finishedSessions;
    if (chartMetric === 'ytd') {
      sessionsToProcess = finishedSessions.filter(s => s.startTime >= startOfYear);
    }

    // Initialize data structures
    const dayStats = Array(7).fill(0).map(() => ({ profit: 0, duration: 0 }));
    const monthStats = Array(12).fill(0).map(() => ({ profit: 0, duration: 0 }));
    const yearMap = new Map<number, { profit: number, duration: number }>();

    sessionsToProcess.forEach(session => {
      const profit = (session.cashOut || 0) - (session.buyIn || 0);
      const duration = session.duration || ((session.endTime || Date.now()) - session.startTime);
      const date = new Date(session.startTime);
      
      // Day (0=Sun, 1=Mon... 6=Sat) -> Convert to 0=Mon... 6=Sun
      let dayIndex = date.getDay() - 1;
      if (dayIndex === -1) dayIndex = 6; // Sunday
      
      dayStats[dayIndex].profit += profit;
      dayStats[dayIndex].duration += duration;
      
      // Month (0-11)
      const monthIndex = date.getMonth();
      monthStats[monthIndex].profit += profit;
      monthStats[monthIndex].duration += duration;
      
      // Year
      const year = date.getFullYear();
      if (!yearMap.has(year)) {
        yearMap.set(year, { profit: 0, duration: 0 });
      }
      const stats = yearMap.get(year)!;
      stats.profit += profit;
      stats.duration += duration;
    });

    // Helper to get value based on metric
    const getValue = (profit: number, duration: number) => {
      if (chartMetric === 'hourly') {
        const hours = duration / (1000 * 60 * 60);
        return hours > 0 ? Math.round(profit / hours) : 0;
      }
      return Math.round(profit);
    };

    // 1. Day of Week
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayData = dayStats.map(s => getValue(s.profit, s.duration));
    
    // 2. Month
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthData = monthStats.map(s => getValue(s.profit, s.duration));
    
    // 3. Year
    const sortedYears = Array.from(yearMap.keys()).sort();
    const yearLabels = sortedYears.map(y => y.toString());
    const yearData = sortedYears.map(y => {
      const stats = yearMap.get(y)!;
      return getValue(stats.profit, stats.duration);
    });

    return {
      day: { labels: dayLabels, data: dayData },
      month: { labels: monthLabels, data: monthData },
      year: { labels: yearLabels, data: yearData },
    };
  }, [sessions, chartMetric]);

  if (loading && sessions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: themeColors.background }]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} colors={['#0a7ea4']} tintColor={themeColors.text} />
      }
    >
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Performance Results</Text>
        <Text style={[styles.headerSubtitle, { color: themeColors.subText }]}>Lifetime Statistics</Text>
      </View>

      <View style={[styles.tabContainer, { backgroundColor: themeColors.tabBg }]}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'overview' && [styles.activeTabButton, { backgroundColor: themeColors.activeTabBg }]]} 
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, { color: themeColors.subText }, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'graph' && [styles.activeTabButton, { backgroundColor: themeColors.activeTabBg }]]} 
          onPress={() => setActiveTab('graph')}
        >
          <Text style={[styles.tabText, { color: themeColors.subText }, activeTab === 'graph' && styles.activeTabText]}>Graph</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'charts' && [styles.activeTabButton, { backgroundColor: themeColors.activeTabBg }]]} 
          onPress={() => setActiveTab('charts')}
        >
          <Text style={[styles.tabText, { color: themeColors.subText }, activeTab === 'charts' && styles.activeTabText]}>Charts</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'locations' && [styles.activeTabButton, { backgroundColor: themeColors.activeTabBg }]]} 
          onPress={() => setActiveTab('locations')}
        >
          <Text style={[styles.tabText, { color: themeColors.subText }, activeTab === 'locations' && styles.activeTabText]}>Locations</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' ? (
        <>
          <View style={[styles.mainCard, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.mainLabel, { color: themeColors.subText }]}>Total Net Profit</Text>
            <Text style={[
              styles.mainValue, 
              stats.totalNetProfit >= 0 ? styles.profit : styles.loss
            ]}>
              {stats.totalNetProfit >= 0 ? '+' : ''}{stats.totalNetProfit.toFixed(2)}
            </Text>
          </View>

          <View style={styles.grid}>
            <View style={[styles.card, { backgroundColor: themeColors.card }]}>
              <View style={[styles.iconContainer, { backgroundColor: themeColors.iconBg }]}>
                <Ionicons name="trending-up" size={24} color="#0a7ea4" />
              </View>
              <Text style={[styles.cardLabel, { color: themeColors.subText }]}>Hourly Rate</Text>
              <Text style={[
                styles.cardValue,
                { color: themeColors.text },
                stats.hourlyRate >= 0 ? styles.profitText : styles.lossText
              ]}>
                {stats.hourlyRate.toFixed(2)}/hr
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: themeColors.card }]}>
              <View style={[styles.iconContainer, { backgroundColor: themeColors.iconBg }]}>
                <Ionicons name="game-controller" size={24} color="#0a7ea4" />
              </View>
              <Text style={[styles.cardLabel, { color: themeColors.subText }]}>Sessions</Text>
              <Text style={[styles.cardValue, { color: themeColors.text }]}>{stats.totalSessions}</Text>
            </View>

            <View style={[styles.card, { backgroundColor: themeColors.card }]}>
              <View style={[styles.iconContainer, { backgroundColor: themeColors.iconBg }]}>
                <Ionicons name="time" size={24} color="#0a7ea4" />
              </View>
              <Text style={[styles.cardLabel, { color: themeColors.subText }]}>Total Hours</Text>
              <Text style={[styles.cardValue, { color: themeColors.text }]}>{stats.totalHours.toFixed(1)}h</Text>
            </View>

            <View style={[styles.card, { backgroundColor: themeColors.card }]}>
              <View style={[styles.iconContainer, { backgroundColor: themeColors.iconBg }]}>
                <Ionicons name="pie-chart" size={24} color="#0a7ea4" />
              </View>
              <Text style={[styles.cardLabel, { color: themeColors.subText }]}>Win Rate</Text>
              <Text style={[styles.cardValue, { color: themeColors.text }]}>{stats.winRate.toFixed(1)}%</Text>
            </View>

            <View style={[styles.card, { backgroundColor: themeColors.card }]}>
              <View style={[styles.iconContainer, { backgroundColor: themeColors.iconBg }]}>
                <Ionicons name="bar-chart" size={24} color="#0a7ea4" />
              </View>
              <Text style={[styles.cardLabel, { color: themeColors.subText }]}>Avg Profit</Text>
              <Text style={[
                styles.cardValue,
                { color: themeColors.text },
                stats.avgProfit >= 0 ? styles.profitText : styles.lossText
              ]}>
                {stats.avgProfit >= 0 ? '+' : ''}{stats.avgProfit.toFixed(2)}
              </Text>
            </View>
          </View>
        </>
      ) : activeTab === 'graph' ? (
        <View style={[styles.graphContainer, { backgroundColor: themeColors.card }]}>
          <View style={styles.filterContainer}>
            {(['1W', '1M', 'YTD', '1Y', '3Y', 'All'] as TimeFilter[]).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterButton, { backgroundColor: themeColors.filterBg }, timeFilter === filter && styles.activeFilterButton]}
                onPress={() => setTimeFilter(filter)}
              >
                <Text style={[styles.filterText, { color: themeColors.subText }, timeFilter === filter && styles.activeFilterText]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {graphData.datasets[0].data.length > 0 && graphData.labels.length > 0 ? (
            <LineChart
              data={graphData}
              width={SCREEN_WIDTH - 40} // from react-native
              height={220}
              yAxisLabel="$"
              yAxisSuffix=""
              yAxisInterval={1} // optional, defaults to 1
              chartConfig={{
                backgroundColor: themeColors.card,
                backgroundGradientFrom: themeColors.card,
                backgroundGradientTo: themeColors.card,
                decimalPlaces: 0, // optional, defaults to 2dp
                color: (opacity = 1) => `rgba(10, 126, 164, ${opacity})`,
                labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: "#0a7ea4"
                }
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16
              }}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={[styles.noDataText, { color: themeColors.subText }]}>No data available for this period</Text>
            </View>
          )}
        </View>
      ) : activeTab === 'charts' ? (
        <View style={styles.chartsTabContainer}>
          <CustomBarChart 
            title={`Earnings by Day of Week${chartMetric === 'hourly' ? ' ($/hr)' : ''}`}
            data={chartsData.day.data} 
            labels={chartsData.day.labels} 
            themeColors={themeColors}
          />
          <CustomBarChart 
            title={`Earnings by Month${chartMetric === 'hourly' ? ' ($/hr)' : ''}`}
            data={chartsData.month.data} 
            labels={chartsData.month.labels} 
            themeColors={themeColors}
          />
          <CustomBarChart 
            title={`Earnings by Year${chartMetric === 'hourly' ? ' ($/hr)' : ''}`}
            data={chartsData.year.data} 
            labels={chartsData.year.labels} 
            themeColors={themeColors}
          />
          
          <View style={[styles.metricToggleContainer, { backgroundColor: themeColors.card }]}>
            <TouchableOpacity 
              style={[styles.metricButton, chartMetric === 'profit' && styles.activeMetricButton]} 
              onPress={() => setChartMetric('profit')}
            >
              <Ionicons name="cash-outline" size={20} color={chartMetric === 'profit' ? '#fff' : themeColors.subText} />
              <Text style={[styles.metricText, { color: themeColors.subText }, chartMetric === 'profit' && styles.activeMetricText]}>PROFIT</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.metricButton, chartMetric === 'hourly' && styles.activeMetricButton]} 
              onPress={() => setChartMetric('hourly')}
            >
              <Ionicons name="time-outline" size={20} color={chartMetric === 'hourly' ? '#fff' : themeColors.subText} />
              <Text style={[styles.metricText, { color: themeColors.subText }, chartMetric === 'hourly' && styles.activeMetricText]}>HOURLY</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.metricButton, chartMetric === 'ytd' && styles.activeMetricButton]} 
              onPress={() => setChartMetric('ytd')}
            >
              <Ionicons name="calendar-outline" size={20} color={chartMetric === 'ytd' ? '#fff' : themeColors.subText} />
              <Text style={[styles.metricText, { color: themeColors.subText }, chartMetric === 'ytd' && styles.activeMetricText]}>YTD</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </View>
      ) : (
        <View style={styles.locationsContainer}>
          {locationsData.map((loc, index) => (
            <View key={index} style={[styles.locationCard, { backgroundColor: themeColors.card }]}>
              <View style={[styles.locationHeader, { borderBottomColor: themeColors.border }]}>
                <Text style={[styles.locationName, { color: themeColors.text }]}>{loc.name}</Text>
                <Text style={[styles.locationProfit, loc.totalProfit >= 0 ? styles.profitText : styles.lossText]}>
                  {loc.totalProfit >= 0 ? '+' : ''}{loc.totalProfit.toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.locationStatsRow}>
                <View style={styles.locationStat}>
                  <Text style={[styles.statLabel, { color: themeColors.subText }]}>Sessions</Text>
                  <Text style={[styles.statValue, { color: themeColors.text }]}>{loc.sessions}</Text>
                </View>
                <View style={styles.locationStat}>
                  <Text style={[styles.statLabel, { color: themeColors.subText }]}>Hours</Text>
                  <Text style={[styles.statValue, { color: themeColors.text }]}>{loc.totalHours.toFixed(1)}h</Text>
                </View>
                <View style={styles.locationStat}>
                  <Text style={[styles.statLabel, { color: themeColors.subText }]}>Win Rate</Text>
                  <Text style={[styles.statValue, { color: themeColors.text }]}>{loc.winRate.toFixed(0)}%</Text>
                </View>
                <View style={styles.locationStat}>
                  <Text style={[styles.statLabel, { color: themeColors.subText }]}>Hourly</Text>
                  <Text style={[styles.statValue, loc.hourlyRate >= 0 ? styles.profitText : styles.lossText]}>
                    {loc.hourlyRate.toFixed(2)}/hr
                  </Text>
                </View>
              </View>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </View>
      )}
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
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  graphContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    minHeight: 300,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    width: '100%',
    justifyContent: 'space-between',
  },
  filterButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  activeFilterButton: {
    backgroundColor: '#0a7ea4',
  },
  filterText: {
    fontSize: 12,
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '600',
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: '#999',
    fontSize: 14,
  },
  chartsTabContainer: {
    padding: 16,
  },
  customChartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    position: 'relative',
  },
  zeroLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#e0e0e0',
    zIndex: 0,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'center', // Centers the content vertically relative to the container
    alignItems: 'center',
  },
  positiveArea: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    paddingBottom: 2, // Space from zero line
  },
  negativeArea: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    paddingTop: 2, // Space from zero line
  },
  bar: {
    width: '80%',
    borderRadius: 4,
    minHeight: 4, // Ensure visibility for small values
  },
  positiveBar: {
    backgroundColor: '#2ecc71',
  },
  negativeBar: {
    backgroundColor: '#ff5252',
  },
  barValue: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
    marginTop: 2,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  metricToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  metricButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  activeMetricButton: {
    backgroundColor: '#0a7ea4',
  },
  metricText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeMetricText: {
    color: '#fff',
  },
  locationsContainer: {
    padding: 16,
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  locationProfit: {
    fontSize: 18,
    fontWeight: '700',
  },
  locationStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationStat: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});
