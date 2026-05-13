import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, ScrollView, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../../services/i18n';
import { ridesAPI, authAPI } from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Simple bar chart component
const BarChart = ({ data, maxVal }: { data: { label: string; value: number }[]; maxVal: number }) => (
  <View style={chartStyles.container}>
    {data.map((item, i) => (
      <View key={i} style={chartStyles.barCol}>
        <View style={chartStyles.barTrack}>
          <View style={[
            chartStyles.barFill,
            { height: `${Math.max(5, (item.value / maxVal) * 100)}%` as any }
          ]} />
        </View>
        <Text style={chartStyles.barValue}>
          {item.value > 999 ? `${(item.value / 1000).toFixed(0)}k` : item.value}
        </Text>
        <Text style={chartStyles.barLabel}>{item.label}</Text>
      </View>
    ))}
  </View>
);

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const [rides, setRides] = useState<any[]>([]);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [earningsResp, profileResp] = await Promise.all([
        ridesAPI.getEarnings(),
        authAPI.getDriverProfile(),
      ]);
      setRides(earningsResp.data.results || earningsResp.data || []);
      setDriverInfo(profileResp.data);
    } catch (error) {
      console.log('Earnings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return (price || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // Generate weekly chart data from rides
  const getWeeklyData = () => {
    const days = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'];
    const today = new Date().getDay();
    const data = days.map((label, i) => {
      // Simulate earnings per day from ride data
      const dayRides = rides.filter(r => {
        const d = new Date(r.completed_at);
        return d.getDay() === (i + 1) % 7;
      });
      const value = dayRides.reduce((sum: number, r: any) => sum + (r.driver_earnings || 0), 0);
      return { label, value };
    });
    return data;
  };

  const weeklyData = getWeeklyData();
  const maxWeekly = Math.max(...weeklyData.map(d => d.value), 1);
  const totalWeekly = weeklyData.reduce((s, d) => s + d.value, 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFB800" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 20 }]}>
        <Text style={styles.title}>{t('driver.earnings')}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Umumiy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Tarix</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons name="wallet" size={22} color="#FFB800" />
              </View>
              <Text style={styles.statValue}>
                {formatPrice(driverInfo?.net_earnings || 0)}
              </Text>
              <Text style={styles.statLabel}>Sof daromad (UZS)</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons name="car" size={22} color="#4CAF50" />
              </View>
              <Text style={styles.statValue}>{driverInfo?.total_rides || 0}</Text>
              <Text style={styles.statLabel}>{t('driver.total_rides')}</Text>
            </View>
          </View>

          {/* Commission */}
          <View style={styles.commissionCard}>
            <Ionicons name="trending-down" size={20} color="#E53935" />
            <Text style={styles.commissionText}>
              {t('driver.commission')}: {formatPrice(driverInfo?.commission_paid || 0)} UZS
            </Text>
          </View>

          {/* Weekly Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Haftalik daromad</Text>
              <Text style={styles.chartTotal}>{formatPrice(totalWeekly)} UZS</Text>
            </View>
            <BarChart data={weeklyData} maxVal={maxWeekly} />
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStat}>
              <Ionicons name="star" size={18} color="#FFB800" />
              <Text style={styles.quickStatValue}>{driverInfo?.rating?.toFixed(1) || '5.0'}</Text>
              <Text style={styles.quickStatLabel}>Reyting</Text>
            </View>
            <View style={styles.quickStat}>
              <Ionicons name="time" size={18} color="#4CAF50" />
              <Text style={styles.quickStatValue}>
                {rides.length > 0 ? Math.round(rides.reduce((s: number, r: any) => s + (r.total_duration || 0), 0) / rides.length) : 0}
              </Text>
              <Text style={styles.quickStatLabel}>O'rtacha min</Text>
            </View>
            <View style={styles.quickStat}>
              <Ionicons name="speedometer" size={18} color="#2196F3" />
              <Text style={styles.quickStatValue}>
                {rides.length > 0 ? (rides.reduce((s: number, r: any) => s + (r.total_distance || 0), 0)).toFixed(0) : 0}
              </Text>
              <Text style={styles.quickStatLabel}>Jami km</Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* History Tab */
        <>
          <Text style={styles.listTitle}>Oxirgi safarlar</Text>
          {rides.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color="#444" />
              <Text style={styles.emptyText}>Hali safarlar yo'q</Text>
            </View>
          ) : (
            <FlatList
              data={rides}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.rideCard}>
                  <View style={styles.rideRow}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    <Text style={styles.rideDate}>
                      {new Date(item.completed_at).toLocaleDateString('uz')}
                    </Text>
                    <Text style={styles.rideFare}>
                      +{formatPrice(item.driver_earnings)} UZS
                    </Text>
                  </View>
                  <View style={styles.rideDetails}>
                    <Text style={styles.rideDetail}>
                      {item.total_distance} km • {item.passengers?.length || 1} yo'lovchi
                    </Text>
                    <Text style={styles.rideCommission}>
                      Komissiya: -{formatPrice(item.commission_amount)} UZS
                    </Text>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    height: 140, paddingHorizontal: 4,
  },
  barCol: { alignItems: 'center', flex: 1 },
  barTrack: {
    width: 24, height: 100, backgroundColor: '#1A1A1A', borderRadius: 12,
    justifyContent: 'flex-end', overflow: 'hidden', marginBottom: 6,
  },
  barFill: { backgroundColor: '#FFB800', borderRadius: 12, minHeight: 4 },
  barValue: { fontSize: 10, color: '#94A3B8', fontWeight: '700', marginBottom: 4 },
  barLabel: { fontSize: 11, color: '#666', fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 20,
    backgroundColor: '#121212', borderRadius: 16, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  tabActive: { backgroundColor: '#FFB800' },
  tabText: { fontSize: 15, fontWeight: '700', color: '#666' },
  tabTextActive: { color: '#000' },
  statsContainer: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 12 },
  statCard: {
    flex: 1, borderRadius: 20, padding: 20, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#1E1E1E', backgroundColor: '#0A0A0A',
  },
  statIconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A1A1A',
    justifyContent: 'center', alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  commissionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20,
    backgroundColor: '#1A0808', borderRadius: 14, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#331111',
  },
  commissionText: { fontSize: 14, fontWeight: '600', color: '#FF5252' },
  chartCard: {
    marginHorizontal: 20, backgroundColor: '#0A0A0A', borderRadius: 24,
    padding: 24, borderWidth: 1, borderColor: '#1E1E1E', marginBottom: 20,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  chartTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  chartTotal: { fontSize: 16, fontWeight: '700', color: '#FFB800' },
  quickStatsRow: {
    flexDirection: 'row', marginHorizontal: 20, gap: 12,
  },
  quickStat: {
    flex: 1, alignItems: 'center', gap: 6, backgroundColor: '#0A0A0A',
    padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#1E1E1E',
  },
  quickStatValue: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  quickStatLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  listTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', paddingHorizontal: 20, marginBottom: 12 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  rideCard: {
    backgroundColor: '#0A0A0A', borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#1E1E1E',
  },
  rideRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  rideDate: { flex: 1, fontSize: 13, color: '#94A3B8' },
  rideFare: { fontSize: 16, fontWeight: '800', color: '#4CAF50' },
  rideDetails: { marginLeft: 28 },
  rideDetail: { fontSize: 13, color: '#666' },
  rideCommission: { fontSize: 12, color: '#FF5252', marginTop: 2 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: '#444' },
});
