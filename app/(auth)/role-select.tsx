import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../../services/i18n';
import { useAuthStore } from '../../stores/authStore';
import { authAPI } from '../../services/api';

export default function RoleSelectScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const selectRole = async (role: 'passenger' | 'driver') => {
    try {
      const response = await authAPI.register({
        role,
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
      });
      setUser(response.data);

      if (role === 'passenger') {
        router.replace('/(auth)/passenger-register');
      } else {
        router.replace('/(auth)/driver-register');
      }
    } catch (error) {
      // If registration fails, still navigate
      if (role === 'passenger') {
        router.replace('/(auth)/passenger-register');
      } else {
        router.replace('/(auth)/driver-register');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="people" size={48} color="#FFB800" />
        </View>
        <Text style={styles.title}>{t('role.title')}</Text>
      </View>

      <View style={styles.cardsContainer}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => selectRole('passenger')}
          activeOpacity={0.8}
        >
          <View style={[styles.cardIcon, { backgroundColor: '#2D260D' }]}>
            <Ionicons name="person" size={40} color="#FFB800" />
          </View>
          <Text style={styles.cardTitle}>{t('role.passenger')}</Text>
          <Text style={styles.cardDesc}>{t('role.passenger_desc')}</Text>
          <View style={[styles.cardArrow, { backgroundColor: '#2D260D' }]}>
            <Ionicons name="arrow-forward" size={20} color="#FFB800" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => selectRole('driver')}
          activeOpacity={0.8}
        >
          <View style={[styles.cardIcon, { backgroundColor: '#2D260D' }]}>
            <Ionicons name="car-sport" size={40} color="#FFB800" />
          </View>
          <Text style={styles.cardTitle}>{t('role.driver')}</Text>
          <Text style={styles.cardDesc}>{t('role.driver_desc')}</Text>
          <View style={[styles.cardArrow, { backgroundColor: '#2D260D' }]}>
            <Ionicons name="arrow-forward" size={20} color="#FFB800" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#2D260D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#121212',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'column',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  cardIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
  },
  cardArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
