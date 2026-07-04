import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView, Linking,
  PanResponder, Animated
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Network from 'expo-network';
import { t } from '../../services/i18n';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

export default function OTPScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { identifier, phone, type } = useLocalSearchParams<{ identifier: string, phone?: string, type: 'phone' | 'email' }>();
  const { login, referralCode, onboardingRole, setOnboardingRole } = useAuthStore();

  const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6 xonali OTP
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [ipAddress, setIpAddress] = useState<string>('Unknown');
  const inputs = useRef<(TextInput | null)[]>([]);

  // Slider verification state (ReCAPTCHA simulyatsiyasi)
  const [showSliderVerify, setShowSliderVerify] = useState(false);
  const [sliderVerified, setSliderVerified] = useState(false);
  const slideX = useRef(new Animated.Value(0)).current;
  const sliderWidth = 230; // Track width (280) - handle width (46) - padding

  useEffect(() => {
    async function getIP() {
      try {
        const ip = await Network.getIpAddressAsync();
        setIpAddress(ip);
      } catch (err) {
        console.warn('Failed to retrieve IP Address in OTP:', err);
      }
    }
    getIP();

    inputs.current[0]?.focus();
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (sliderVerified) return;
        const newX = Math.max(0, Math.min(sliderWidth, gestureState.dx));
        slideX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (sliderVerified) return;
        if (gestureState.dx >= sliderWidth - 15) {
          // Muvaffaqiyatli tasdiqlandi!
          Animated.timing(slideX, {
            toValue: sliderWidth,
            duration: 100,
            useNativeDriver: true,
          }).start(async () => {
            setSliderVerified(true);
            setShowSliderVerify(false);
            Alert.alert("Muvaffaqiyatli", "Robot emasligingiz tasdiqlandi! Sizga kod yuborilmoqda.");
            try {
              setLoading(true);
              const mockToken = 'mock-recaptcha-token-123456';
              await authAPI.sendOTP(phone || identifier!, 'recaptcha', mockToken, ipAddress);
              setCountdown(60);
            } catch (err: any) {
              Alert.alert('Xato', err?.response?.data?.detail || 'OTP yuborishda xatolik yuz berdi.');
            } finally {
              setLoading(false);
            }
          });
        } else {
          // Reset slider
          Animated.spring(slideX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    // 6 ta raqam to'liq kiritilganda avtomatik tasdiqlash
    if (text && index === 5) {
      const code = newOtp.join('');
      if (code.length === 6) {
        verifyOTP(code);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const verifyOTP = async (code: string) => {
    setLoading(true);
    try {
      const response = await authAPI.verifyOTP(identifier!, code, type, phone, referralCode || undefined, ipAddress);
      const { access, refresh, user, is_new_user, status } = response.data;

      if (status === 'partial') {
          router.replace({
              pathname: '/(auth)/role-select',
              params: { 
                  identifier,
                  prefill: JSON.stringify(response.data.prefill)
              }
          });
          return;
      }

      if (!access || !refresh || !user) {
        console.error('[Auth] Incomplete verification response:', response.data);
        throw new Error("Serverdan noto'g'ri javob keldi");
      }

      login(access, refresh, user);

      if (is_new_user || !user.first_name || onboardingRole === 'driver') {
        router.replace({
            pathname: '/(auth)/role-select',
            params: { force_role: onboardingRole || undefined }
        });
        setOnboardingRole(null);
      } else if (user.role === 'driver' && user.has_driver_profile) {
        router.replace('/(driver)/home');
      } else if (user.role === 'passenger') {
        router.replace('/(passenger)/home');
      } else {
        router.replace('/(auth)/role-select');
      }
    } catch (error: any) {
      console.error('[Auth] OTP Verification error:', error);
      const msg = error.response?.data?.detail || error.message || t('common.error');
      Alert.alert(t('common.error'), msg);
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const openTelegramBot = () => {
    Linking.openURL('https://t.me/goldride_taxi_bot');
  };

  const handleNoTelegram = () => {
    setSliderVerified(false);
    slideX.setValue(0);
    setShowSliderVerify(true);
  };

  const resendOTP = async () => {
    if (countdown > 0) return;
    try {
      await authAPI.sendOTP(phone || identifier!, 'telegram', undefined, ipAddress);
      setCountdown(60);
      Alert.alert("Muvaffaqiyatli", "Tasdiqlash kodi Telegram botingizga qayta yuborildi.");
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.detail || t('common.error'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFB800" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Ionicons name="chatbubbles-outline" size={48} color="#FFB800" />
          </View>
          <Text style={styles.title}>Tasdiqlash</Text>
          <Text style={styles.subtitle}>
            Ro'yxatdan o'tish uchun kodni oling.
          </Text>

          {/* Telegram Bot orqali kod olish tugmasi */}
          <TouchableOpacity style={styles.tgBtn} onPress={openTelegramBot}>
            <Ionicons name="paper-plane" size={20} color="#000" />
            <Text style={styles.tgBtnText}>Telegram botga kirish</Text>
          </TouchableOpacity>

          <Text style={styles.instructions}>
            Botga kirib <Text style={{fontWeight: 'bold', color: '#FFF'}}>/start</Text> buyrug'ini bosing va kontaktingizni ulashing. Bot bergan 6 xonali kodni quyida kiriting:
          </Text>

          {/* 6 xonali OTP kiritish katakchalari */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputs.current[index] = ref; }}
                style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Telegram yo'q linki */}
          <TouchableOpacity style={styles.noTgLink} onPress={handleNoTelegram}>
            <Text style={styles.noTgText}>Telegramingiz yo'qmi? (SMS kod olish)</Text>
          </TouchableOpacity>

          {/* ReCAPTCHA slider verification modal */}
          {showSliderVerify && (
            <View style={styles.sliderOverlay}>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderTitle}>Robot emasligingizni tasdiqlang</Text>
                
                <View style={styles.sliderTrack}>
                  <Text style={styles.sliderText}>Tasdiqlash uchun suring &gt;&gt;</Text>
                  <Animated.View 
                    style={[styles.sliderHandle, { transform: [{ translateX: slideX }] }]}
                    {...panResponder.panHandlers}
                  >
                    <Ionicons name="arrow-forward" size={20} color="#000" />
                  </Animated.View>
                </View>

                <TouchableOpacity style={styles.sliderClose} onPress={() => setShowSliderVerify(false)}>
                  <Text style={styles.sliderCloseText}>Bekor qilish</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.resendBtn}
            onPress={resendOTP}
            disabled={countdown > 0}
          >
            <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
              {countdown > 0
                ? `${t('auth.resend')} (${countdown}s)`
                : t('auth.resend')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[styles.verifyBtn, (loading || otp.join('').length < 6) && styles.verifyBtnDisabled]}
          onPress={() => verifyOTP(otp.join(''))}
          disabled={loading || otp.join('').length < 6}
          activeOpacity={0.8}
        >
          <Text style={styles.verifyBtnText}>
            {loading ? t('common.loading') : t('auth.verify')}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 8,
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
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2D260D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 24,
    textAlign: 'center',
  },
  tgBtn: {
    backgroundColor: '#FFB800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    marginBottom: 20,
  },
  tgBtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 16,
  },
  instructions: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  otpContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
  },
  otpInput: {
    width: 42,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  otpInputFilled: {
    backgroundColor: '#2D260D',
    borderWidth: 2,
    borderColor: '#FFB800',
  },
  noTgLink: {
    paddingVertical: 10,
    marginBottom: 20,
  },
  noTgText: {
    color: '#FFB800',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  resendBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendText: {
    color: '#FFB800',
    fontSize: 14,
    fontWeight: '700',
  },
  resendDisabled: {
    color: '#444',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  verifyBtn: {
    backgroundColor: '#FFB800',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FFB800',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  verifyBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  // Slider verify styles
  sliderOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  sliderContainer: {
    width: '90%',
    backgroundColor: '#111',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  sliderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 20,
  },
  sliderTrack: {
    width: 280,
    height: 50,
    backgroundColor: '#1E1E1E',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#333',
  },
  sliderText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '700',
  },
  sliderHandle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFB800',
    position: 'absolute',
    left: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderClose: {
    marginTop: 20,
    padding: 10,
  },
  sliderCloseText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
});
