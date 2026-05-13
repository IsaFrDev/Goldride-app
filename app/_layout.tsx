import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import * as Network from 'expo-network';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../stores/authStore';
import { socketService } from '../services/socket';

export default function RootLayout() {
  const { isLoading, loadStoredAuth, isAuthenticated, setReferralCode } = useAuthStore();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    loadStoredAuth();
    
    // Handle Deep Linking (Referral Codes)
    const handleDeepLink = (event: { url: string }) => {
        let data = Linking.parse(event.url);
        // Supports: goldride://ref/CODE or https://goldride.uz/ref/CODE
        if (data.path === 'ref' || data.queryParams?.ref) {
            const code = data.queryParams?.ref || data.path?.split('/')[1];
            if (code) setReferralCode(code);
        }
    };

    Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => {
        if (url) handleDeepLink({ url });
    });
    
    // Network listener
    const checkNetwork = async () => {
        const state = await Network.getNetworkStateAsync();
        setIsOffline(!state.isConnected || !state.isInternetReachable);
    };
    
    checkNetwork();
    const interval = setInterval(checkNetwork, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FFB800" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color="#FFF" />
          <Text style={styles.offlineText}>Tarmoq bilan aloqa yo'q. Tekshiring...</Text>
        </View>
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000000' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(passenger)" options={{ headerShown: false }} />
        <Stack.Screen name="(driver)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  offlineBanner: {
    backgroundColor: '#FF5252',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 8,
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  offlineText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
