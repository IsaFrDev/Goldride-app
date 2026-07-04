import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView, Linking,
  Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Network from 'expo-network';
import { WebView } from 'react-native-webview';
import { t } from '../../services/i18n';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

const RECAPTCHA_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://www.google.com/recaptcha/api.js" async defer></script>
  <style>
    body {
      background-color: #111111;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <form action="?" method="POST">
    <div class="g-recaptcha" 
         data-sitekey="6Le9YEQtAAAAALkttvCTtJlxcCKlljsInLJnYwTk" 
         data-callback="onSuccess"
         data-theme="dark"></div>
  </form>
  <script>
    function onSuccess(token) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'recaptcha_success',
        token: token
      }));
    }
  </script>
</body>
</html>
`;

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

  // Google reCAPTCHA state
  const [showRecaptcha, setShowRecaptcha] = useState(false);

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

  const onRecaptchaMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'recaptcha_success') {
        setShowRecaptcha(false);
        setLoading(true);
        try {
          await authAPI.sendOTP(phone || identifier!, 'recaptcha', data.token, ipAddress);
          setCountdown(60);
          Alert.alert("Muvaffaqiyatli", "reCAPTCHA tasdiqlandi. Sizga 6 xonali kod yuborildi!");
        } catch (err: any) {
          Alert.alert('Xato', err?.response?.data?.detail || 'OTP yuborishda xatolik yuz berdi.');
        } finally {
          setLoading(false);
        }
      }
    } catch (err) {
      console.warn('WebView message parsing error:', err);
    }
  };

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
    Linking.openURL('https://t.me/Goldride_bot');
  };

  const handleNoTelegram = () => {
    setShowRecaptcha(true);
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
            <Text style={styles.noTgText}>Telegramingiz yo'qmi? (reCAPTCHA kod olish)</Text>
          </TouchableOpacity>

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

      {/* Google reCAPTCHA WebView Modal */}
      <Modal
        visible={showRecaptcha}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRecaptcha(false)}
      >
        <View style={styles.recaptchaOverlay}>
          <View style={styles.recaptchaContainer}>
            <View style={styles.recaptchaHeader}>
              <Text style={styles.recaptchaTitle}>Robot emasligingizni tasdiqlang</Text>
              <TouchableOpacity onPress={() => setShowRecaptcha(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.webviewWrapper}>
              <WebView
                source={{ html: RECAPTCHA_HTML }}
                onMessage={onRecaptchaMessage}
                style={styles.webview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                originWhitelist={['*']}
                scalesPageToFit={true}
              />
            </View>
          </View>
        </View>
      </Modal>

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
  // Google reCAPTCHA modal styles
  recaptchaOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recaptchaContainer: {
    width: '90%',
    height: '60%',
    backgroundColor: '#111',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  recaptchaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recaptchaTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  webviewWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#111',
  },
});
