import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Dimensions, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authAPI, ridesAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function DriverDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_rides: 0,
    rating: 0,
    acceptance: '100%',
    total_earnings: 0,
    today_earnings: 0
  });

  const [goals, setGoals] = useState([
    { id: 1, title: 'Kunlik maqsad', target: 10, current: 0, reward: 50000, type: 'daily' },
    { id: 2, title: 'Haftalik bonus', target: 50, current: 0, reward: 250000, type: 'weekly' }
  ]);

  const [badges, setBadges] = useState([
    { id: 1, name: "Yo'l ustasi", icon: 'car', color: '#FFB800', date: '---' },
    { id: 2, name: 'Xushmuomala', icon: 'happy', color: '#4CAF50', date: '---' },
    { id: 3, name: 'Tungi burgut', icon: 'moon', color: '#2196F3', date: '---' }
  ]);

  useEffect(() => {
     const fetchProfile = async () => {
       try {
         const resp = await authAPI.getDriverProfile();
         const data = resp.data;
         setStats({
           total_rides: data.total_rides || 0,
           rating: data.rating || 5.0,
           acceptance: '100%',
           total_earnings: parseFloat(data.total_earnings) || 0,
           today_earnings: parseFloat(data.net_earnings) || 0 // Assuming net_earnings for today's simplicity or could be separate field
         });
         
         // Mocking progress based on real rides
         setGoals(prev => prev.map(g => ({
           ...g,
           current: g.type === 'daily' ? (data.total_rides % 10) : (data.total_rides % 50)
         })));
       } catch (e) {
         console.log('Dashboard fetch error:', e);
       } finally {
         setLoading(false);
       }
     };

     fetchProfile();
  }, []);

  const formatPrice = (p: number) => p.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFB800" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header Stats */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
            <View style={styles.headerInfo}>
                <Text style={styles.welcomeText}>Xush kelibsiz,</Text>
                <Text style={styles.nameText}>{user?.first_name || 'Haydovchi'}!</Text>
            </View>
            <TouchableOpacity style={styles.earningBadge}>
                <Text style={styles.earningLabel}>Bugungi daromad</Text>
                <Text style={styles.earningVal}>{formatPrice(stats.today_earnings)} UZS</Text>
            </TouchableOpacity>
        </View>

        {/* Level Progress */}
        <View style={styles.levelCard}>
            <View style={styles.levelHeader}>
                <Text style={styles.levelTitle}>Oltin Daraja</Text>
                <Text style={styles.levelPoints}>1250 / 2000 ball</Text>
            </View>
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '62.5%' }]} />
            </View>
            <Text style={styles.levelHint}>Keyingi darajagacha 750 ball qoldi</Text>
        </View>

        {/* Goals Section */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Maqsadlar va Bonuslar</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goalsRow}>
            {goals.map(goal => (
                <View key={goal.id} style={styles.goalCard}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <View style={styles.goalReward}>
                        <Ionicons name="gift-outline" size={14} color="#FFB800" />
                        <Text style={styles.rewardText}>+{formatPrice(goal.reward)} UZS</Text>
                    </View>
                    <View style={styles.goalProgressWrap}>
                        <Text style={styles.goalCount}>{goal.current} / {goal.target}</Text>
                        <View style={styles.goalProgressBarBg}>
                            <View style={[styles.goalProgressBarFill, { width: `${(goal.current/goal.target)*100}%` }]} />
                        </View>
                    </View>
                </View>
            ))}
        </ScrollView>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
            <View style={styles.statBox}>
                <Ionicons name="star" size={24} color="#FFB800" />
                <Text style={styles.statGridVal}>{stats.rating}</Text>
                <Text style={styles.statGridLabel}>Reyting</Text>
            </View>
            <View style={styles.statBox}>
                <Ionicons name="checkmark-done-circle" size={24} color="#4CAF50" />
                <Text style={styles.statGridVal}>{stats.acceptance}</Text>
                <Text style={styles.statGridLabel}>Qabul</Text>
            </View>
            <View style={styles.statBox}>
                <Ionicons name="car" size={24} color="#2196F3" />
                <Text style={styles.statGridVal}>{stats.total_rides}</Text>
                <Text style={styles.statGridLabel}>Safarlar</Text>
            </View>
            <View style={styles.statBox}>
                <Ionicons name="wallet" size={24} color="#9C27B0" />
                <Text style={[styles.statGridVal, { fontSize: 14 }]}>{formatPrice(stats.total_earnings)}</Text>
                <Text style={styles.statGridLabel}>Umumiy</Text>
            </View>
        </View>

        {/* Badges Section */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Yutuqlarim (Badges)</Text>
            <TouchableOpacity><Text style={styles.seeAll}>Hammasi</Text></TouchableOpacity>
        </View>
        <View style={styles.badgesWrap}>
            {badges.map(badge => (
                <View key={badge.id} style={styles.badgeItem}>
                    <View style={[styles.badgeIcon, { backgroundColor: badge.color + '20', borderColor: badge.color }]}>
                        <Ionicons name={badge.icon as any} size={30} color={badge.color} />
                    </View>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                </View>
            ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 20, marginBottom: 25 
  },
  headerInfo: { flex: 1 },
  welcomeText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  nameText: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  earningBadge: { 
    backgroundColor: '#1A160A', padding: 12, borderRadius: 16, 
    borderWidth: 1, borderColor: '#2D260D', alignItems: 'flex-end'
  },
  earningLabel: { color: '#FFB800', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  earningVal: { color: '#FFF', fontSize: 16, fontWeight: '900', marginTop: 2 },
  levelCard: { 
    marginHorizontal: 20, backgroundColor: '#121212', padding: 20, borderRadius: 24, 
    marginBottom: 30, borderWidth: 1, borderColor: '#1E1E1E' 
  },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  levelTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  levelPoints: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  progressBarBg: { height: 8, backgroundColor: '#1E1E1E', borderRadius: 4, marginBottom: 12 },
  progressBarFill: { height: 8, backgroundColor: '#FFB800', borderRadius: 4 },
  levelHint: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  sectionHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 20, marginBottom: 15 
  },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  seeAll: { color: '#FFB800', fontSize: 14, fontWeight: '700' },
  goalsRow: { paddingLeft: 20, paddingRight: 10, gap: 15, marginBottom: 30 },
  goalCard: { 
    width: width * 0.45, backgroundColor: '#121212', padding: 16, borderRadius: 20, 
    borderWidth: 1, borderColor: '#1E1E1E' 
  },
  goalTitle: { color: '#FFF', fontSize: 15, fontWeight: '800', marginBottom: 8 },
  goalReward: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 15 },
  rewardText: { color: '#FFB800', fontSize: 12, fontWeight: '800' },
  goalProgressWrap: { gap: 8 },
  goalCount: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  goalProgressBarBg: { height: 6, backgroundColor: '#1E1E1E', borderRadius: 3 },
  goalProgressBarFill: { height: 6, backgroundColor: '#4CAF50', borderRadius: 3 },
  statsGrid: { 
    flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 30 
  },
  statBox: { 
    flex: 1, backgroundColor: '#121212', padding: 15, borderRadius: 20, 
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#1E1E1E' 
  },
  statGridVal: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  statGridLabel: { color: '#64748B', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  badgesWrap: { 
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, gap: 10 
  },
  badgeItem: { 
    width: (width - 50) / 3, alignItems: 'center', gap: 10, marginBottom: 20 
  },
  badgeIcon: { 
    width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2 
  },
  badgeName: { color: '#E2E8F0', fontSize: 12, fontWeight: '700', textAlign: 'center' }
});
