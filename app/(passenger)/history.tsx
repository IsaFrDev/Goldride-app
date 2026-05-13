import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../../services/i18n';
import { ridesAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

export default function HistoryScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadHistory();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadHistory = async () => {
    try {
      const response = await ridesAPI.getHistory();
      setRides(response.data.results || response.data || []);
    } catch (error) {
      console.log('History error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return price?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') || '0';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return { icon: 'checkmark-circle', color: '#4CAF50' };
      case 'cancelled': return { icon: 'close-circle', color: '#E53935' };
      default: return { icon: 'time', color: '#FF9800' };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('uz', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderRide = ({ item }: { item: any }) => {
    const statusInfo = getStatusIcon(item.status);
    return (
      <View style={styles.rideCard}>
        <View style={styles.rideHeader}>
          <Ionicons name={statusInfo.icon as any} size={24} color={statusInfo.color} />
          <Text style={styles.rideDate}>{formatDate(item.created_at)}</Text>
          {item.is_shared && (
            <View style={styles.sharedBadge}>
              <Ionicons name="people" size={12} color="#FFB800" />
              <Text style={styles.sharedText}>Sherikli</Text>
            </View>
          )}
        </View>

        <View style={styles.rideBody}>
          <Text style={styles.ridePrice}>
            {formatPrice(item.total_price)} {t('common.currency')}
          </Text>
          <Text style={styles.rideDistance}>
            {item.total_distance} km
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFB800" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.history')}</Text>
      </View>

      {!isAuthenticated ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={64} color="#DDD" />
          <Text style={styles.emptyText}>Safarlar tarixini ko'rish uchun profilingizga kiring</Text>
          <TouchableOpacity 
            style={styles.loginBtn}
            onPress={() => router.push('/(auth)/phone')}
          >
            <Text style={styles.loginBtnText}>Tizimga kirish</Text>
          </TouchableOpacity>
        </View>
      ) : rides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="car-sport-outline" size={64} color="#DDD" />
          <Text style={styles.emptyText}>Safarlar tarixi bo'sh</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRide}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  rideCard: {
    backgroundColor: '#121212',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  rideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  rideDate: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2D260D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sharedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFB800',
  },
  rideBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  ridePrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  rideDistance: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#444',
    marginTop: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  loginBtn: {
    backgroundColor: '#FFB800',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
  },
  loginBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
});
