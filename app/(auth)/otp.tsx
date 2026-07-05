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

  // Local Simple Captcha (WB style) states
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaStyles, setCaptchaStyles] = useState<{ rotate: string; translateY: number; color: string }[]>([]);

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

  // Generates a random 4-digit code and styling for each digit
  const generateCaptcha = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setCaptchaCode(code);
    setCaptchaInput('');

    // Generate random rotations, offsets and colors for each character to make it look like a real captcha
    const styles = Array.from({ length: 4 }).map(() => {
      const rot = Math.floor(-25 + Math.random() * 50); // -25deg to 25deg
      const transY = Math.floor(-6 + Math.random() * 12); // -6 to 6 offset
      const colors = ['#FFB800', '#FFD700', '#FFA500', '#F5C400', '#FFE600'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      return {
        rotate: `${rot}deg`,
        translateY: transY,
        color: randomColor
      };
    });
    setCaptchaStyles(styles);
  };

  const handleNoTelegram = () => {
    generateCaptcha();
    setShowCaptcha(true);
  };

  const handleVerifyCaptcha = async () => {
    if (captchaInput.trim() !== captchaCode) {
      Alert.alert("Xato", "Captcha kodi noto'g'ri kiritildi. Qaytadan urinib ko'ring.");
      generateCaptcha();
      return;
    }

    setShowCaptcha(false);
    setLoading(true);
    try {
      const mockToken = `local-captcha-token-${captchaCode}`;
      await authAPI.sendOTP(phone || identifier!, 'recaptcha', mockToken, ipAddress);
      setCountdown(60);
      Alert.alert("Muvaffaqiyatli", "Tasdiq kodi yuborildi!");
    } catch (err: any) {
      Alert.alert('Xato', err?.response?.data?.detail || 'OTP yuborishda xatolik yuz berdi.');
    } finally {
      setLoading(false);
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
    // Correct URL to `@Goldride_bot`
    Linking.openURL('https://t.me/Goldride_bot');
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
            <Text style={styles.noTgText}>Telegramingiz yo'qmi? (Oddiy kod olish)</Text>
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

      {/* Local WB-Style Captcha Modal */}
      <Modal
        visible={showCaptcha}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCaptcha(false)}
      >
        <View style={styles.captchaOverlay}>
          <View style={styles.captchaContainer}>
            <View style={styles.captchaHeader}>
              <Text style={styles.captchaTitle}>Robot emasligingizni tasdiqlang</Text>
              <TouchableOpacity onPress={() => setShowCaptcha(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Captcha Image/Text Box with noise */}
            <View style={styles.captchaBox}>
              {/* Noise lines */}
              <View style={styles.noiseLine1} />
              <View style={styles.noiseLine2} />
              <View style={styles.noiseLine3} />
              
              {/* Stylized Digits */}
              <View style={styles.digitsWrapper}>
                {captchaCode.split('').map((char, index) => {
                  const style = captchaStyles[index] || { rotate: '0deg', translateY: 0, color: '#FFB800' };
                  return (
                    <Text
                      key={index}
                      style={[
                        styles.captchaDigit,
                        {
                          color: style.color,
                          transform: [
                            { rotate: style.rotate },
                            { translateY: style.translateY }
                          ]
                        }
                      ]}
                    >
                      {char}
                    </Text>
                  );
                })}
              </View>

              <TouchableOpacity style={styles.refreshBtn} onPress={generateCaptcha}>
                <Ionicons name="refresh-outline" size={20} color="#FFB800" />
              </TouchableOpacity>
            </View>

            {/* Input fields */}
            <TextInput
              style={styles.captchaInput}
              placeholder="Rasmda ko'rsatilgan sonlarni yozing"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              maxLength={4}
              value={captchaInput}
              onChangeText={setCaptchaInput}
            />

            <TouchableOpacity 
              style={[styles.captchaVerifyBtn, captchaInput.length !== 4 && styles.captchaVerifyBtnDisabled]} 
              onPress={handleVerifyCaptcha}
              disabled={captchaInput.length !== 4}
            >
              <Text style={styles.captchaVerifyBtnText}>Tasdiqlash</Text>
            </TouchableOpacity>
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
  // Captcha Modal styles
  captchaOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captchaContainer: {
    width: '85%',
    backgroundColor: '#111',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#222',
  },
  captchaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  captchaTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  captchaBox: {
    height: 90,
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
  },
  noiseLine1: {
    position: 'absolute',
    width: '120%',
    height: 2,
    backgroundColor: '#333',
    transform: [{ rotate: '15deg' }],
    opacity: 0.6,
  },
  noiseLine2: {
    position: 'absolute',
    width: '120%',
    height: 1.5,
    backgroundColor: '#444',
    transform: [{ rotate: '-20deg' }],
    opacity: 0.5,
  },
  noiseLine3: {
    position: 'absolute',
    width: '100%',
    height: 1.2,
    backgroundColor: '#222',
    top: 45,
    opacity: 0.7,
  },
  digitsWrapper: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  captchaDigit: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 4,
  },
  refreshBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#2C2C2C',
  },
  captchaInput: {
    height: 52,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    borderColor: '#333',
    borderWidth: 1,
    color: '#FFF',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 20,
  },
  captchaVerifyBtn: {
    backgroundColor: '#FFB800',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  captchaVerifyBtnDisabled: {
    opacity: 0.5,
  },
  captchaVerifyBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
});
