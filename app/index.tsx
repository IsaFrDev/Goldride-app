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

    if (isAuthenticated) {
      if (!user?.first_name) {
        router.replace('/(auth)/role-select');
      } else if (user?.role === 'driver' && user?.has_driver_profile) {
        router.replace('/(driver)/home');
      } else {
        router.replace('/(passenger)/home');
      }
    } else {
      router.replace('/(passenger)/home');
    }
  }, [isAuthenticated, user?.role, user?.has_driver_profile, navigationState?.key]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#FFB800" />
    </View>
  );
}
