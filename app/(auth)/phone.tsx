import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, Image, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

// OAuth redirect oynasini yopish uchun shart
WebBrowser.maybeCompleteAuthSession();

export default function PhoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, referralCode } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // expo-auth-session Google provider — PKCE flow, to'g'ri redirect bilan
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  // OAuth javobi kelganda avtomatik ishga tushadi
  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const idToken = response.authentication?.idToken;
      const accessToken = response.authentication?.accessToken;

      if (idToken) {
        sendTokenToBackend(idToken);
      } else if (accessToken) {
        // id_token yo'q — access_token bilan user info olib, backend ga yuboramiz
        fetchUserInfoAndLogin(accessToken);
      } else {
        Alert.alert('Xato', 'Google tokenini olishda muammo yuz berdi.');
        setLoading(false);
      }
    } else if (response.type === 'error') {
      Alert.alert('Xato', response.error?.message || 'Google login xatosi yuz berdi.');
      setLoading(false);
    } else if (response.type === 'dismiss') {
      // Foydalanuvchi o'zi yopdi
      setLoading(false);
    }
  }, [response]);

  const sendTokenToBackend = async (idToken: string) => {
    try {
      const res = await authAPI.googleAuth(idToken, undefined, referralCode || undefined);
      const { access, refresh, user } = res.data;
      await login(access, refresh, user);
      router.replace(user.role === 'driver' ? '/(driver)/home' : '/(passenger)/home');
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.email) {
        // Yangi foydalanuvchi — telefon raqami kerak
        router.push({
          pathname: '/(auth)/otp',
          params: {
            mode: 'google_register',
            google_id_token: idToken,
            email: data.email,
            first_name: data.first_name || '',
          },
        });
      } else {
        Alert.alert('Xato', data?.detail || 'Kirish xatosi yuz berdi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInfoAndLogin = async (accessToken: string) => {
    try {
      // Google UserInfo endpoint orqali user ma'lumotlarini olamiz
      const userInfoRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!userInfoRes.ok) throw new Error('UserInfo xatosi');
      // accessToken ni id_token sifatida yuboramiz (backend Google tokeninfo API bilan tekshiradi)
      await sendTokenToBackend(accessToken);
    } catch {
      Alert.alert('Xato', 'Google foydalanuvchi ma\'lumotlarini olishda xato.');
      setLoading(false);
    }
  };

  const handleGooglePress = async () => {
    setLoading(true);
    await promptAsync();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFB800" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.textGroup}>
            <Text style={styles.title}>Goldride'ga xush kelibsiz</Text>
            <Text style={styles.subtitle}>Google orqali tizimga kiring</Text>
          </View>

          <TouchableOpacity
            style={[styles.googleBtn, (loading || !request) && styles.buttonDisabled]}
            onPress={handleGooglePress}
            disabled={loading || !request}
          >
            {loading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#000" />
                <Text style={styles.googleBtnText}>Google orqali kirish</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Goldride xavfsiz tizim</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark" size={16} color="#10B981" />
            <Text style={styles.infoText}>Google hisob orqali kirish eng xavfsiz usul</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 20,
  },
  textGroup: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 24,
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    paddingHorizontal: 12,
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0D1F0D',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#CCC',
    fontWeight: '500',
  },
});
