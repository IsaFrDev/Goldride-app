import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../../services/i18n';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

export default function OTPScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { identifier, phone, type } = useLocalSearchParams<{ identifier: string, phone?: string, type: 'phone' | 'email' }>();
  const { login, referralCode, onboardingRole, setOnboardingRole } = useAuthStore();

  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 3) {
      inputs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits entered
    if (text && index === 3) {
      const code = newOtp.join('');
      if (code.length === 4) {
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
      const response = await authAPI.verifyOTP(identifier!, code, type, phone, referralCode || undefined);
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
        setOnboardingRole(null); // Clear after use
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
      setOtp(['', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (countdown > 0) return;
    try {
      await authAPI.sendOTP(
          type === 'phone' ? identifier : '', 
          type === 'email' ? identifier : ''
      );
      setCountdown(60);
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
            <Ionicons name="shield-checkmark-outline" size={48} color="#FFB800" />
          </View>
          <Text style={styles.title}>{t('auth.otp_title')}</Text>
          <Text style={styles.subtitle}>
            {type === 'phone' ? "Raqamingizga" : "Emailingizga"} yuborilgan kodni kiriting: {"\n"}
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{identifier}</Text>
          </Text>

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
          style={[styles.verifyBtn, loading && styles.verifyBtnDisabled]}
          onPress={() => verifyOTP(otp.join(''))}
          disabled={loading || otp.join('').length < 4}
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#2D260D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    marginBottom: 32,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  otpInput: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    fontSize: 28,
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
  resendBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendText: {
    color: '#FFB800',
    fontSize: 15,
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
    paddingVertical: 18,
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
    fontSize: 18,
    fontWeight: '800',
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
});
