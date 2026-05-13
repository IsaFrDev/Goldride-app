import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export default function IndexScreen() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!navigationState?.key) return;

    // If fully authenticated as an active driver
    if (isAuthenticated && user?.role === 'driver' && user?.has_driver_profile) {
      router.replace('/(driver)/home');
    } else {
      // Default to guest/passenger map experience
      router.replace('/(passenger)/home');
    }
  }, [isAuthenticated, user?.role, user?.has_driver_profile, navigationState?.key]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#FFB800" />
    </View>
  );
}
