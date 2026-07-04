import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, Image, ScrollView,
  ActivityIndicator, TextInput, Modal, Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Network from 'expo-network';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

export default function PhoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { referralCode } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [displayPhone, setDisplayPhone] = useState(''); // E.g. "90 123 45 67"
  const [rawPhone, setRawPhone] = useState(''); // E.g. "901234567"
  const [ipAddress, setIpAddress] = useState<string>('Unknown');
  const [showRecaptcha, setShowRecaptcha] = useState(false);
  const [isRobotVerified, setIsRobotVerified] = useState(false);

  // Fetch device IP Address on load
  useEffect(() => {
    async function getIP() {
      try {
        const ip = await Network.getIpAddressAsync();
        setIpAddress(ip);
      } catch (err) {
        console.warn('Failed to retrieve IP Address:', err);
      }
    }
    getIP();
  }, []);

  const handlePhoneChange = (text: string) => {
    // Keep only digits
    const digits = text.replace(/\D/g, '');
    if (digits.length > 9) return;

    setRawPhone(digits);

    // Format: XX XXX XX XX
    let formatted = '';
    if (digits.length > 0) {
      formatted += digits.substring(0, 2);
    }
    if (digits.length > 2) {
      formatted += ' ' + digits.substring(2, 5);
    }
    if (digits.length > 5) {
      formatted += ' ' + digits.substring(5, 7);
    }
    if (digits.length > 7) {
      formatted += ' ' + digits.substring(7, 9);
    }
    setDisplayPhone(formatted);
  };

  const handlePhoneAuth = async () => {
    if (rawPhone.length !== 9) {
      Alert.alert('Xato', 'Iltimos, telefon raqamingizni to\'liq (9 ta raqam) kiriting.');
      return;
    }

    const fullPhone = `+998${rawPhone}`;
    await proceedSendOTP(fullPhone, 'telegram');
  };

  const proceedSendOTP = async (phoneVal: string, method: 'telegram' | 'recaptcha', recaptchaToken?: string) => {
    try {
      setLoading(true);
      await authAPI.sendOTP(phoneVal, method, recaptchaToken, ipAddress);
      setLoading(false);
      setShowRecaptcha(false);
      
      // Navigate to OTP Screen
      router.push({
        pathname: '/(auth)/otp',
        params: {
          identifier: phoneVal,
          phone: phoneVal,
          type: 'phone'
        }
      });
    } catch (err: any) {
      Alert.alert('Xato', err?.response?.data?.detail || 'OTP yuborishda xatolik yuz berdi.');
      setLoading(false);
    }
  };

  const handleRecaptchaVerify = async () => {
    setIsRobotVerified(true);
    setLoading(true);
    // Simulate a slight delay for verification check
    setTimeout(async () => {
      const mockToken = 'mock-recaptcha-token-123456';
      const fullPhone = `+998${rawPhone}`;
      await proceedSendOTP(fullPhone, 'recaptcha', mockToken);
    }, 1500);
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
            <Text style={styles.title}>Tizimga kirish / Ro'yxatdan o'tish</Text>
            <Text style={styles.subtitle}>Telefon raqamingizni kiriting. Tasdiqlash kodi Telegram orqali yuboriladi.</Text>
          </View>

          {/* Telefon kiritish inputi */}
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
            <Text style={styles.countryCode}>+998</Text>
            <TextInput
              style={styles.textInput}
              placeholder="90 123 45 67"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
              autoCapitalize="none"
              value={displayPhone}
              onChangeText={handlePhoneChange}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (rawPhone.length !== 9 || loading) && styles.buttonDisabled]}
            onPress={handlePhoneAuth}
            disabled={rawPhone.length !== 9 || loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Kodni olish</Text>
            )}
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark" size={16} color="#FFB800" />
            <Text style={styles.infoText}>Barcha ma'lumotlaringiz va IP manzilingiz ({ipAddress}) xavfsizlik maqsadida himoyalangan.</Text>
          </View>
        </View>
      </ScrollView>

      {/* ReCaptcha Verification Modal */}
      <Modal
        visible={showRecaptcha}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRecaptcha(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.recaptchaHeader}>
              <Ionicons name="shield-checkmark-outline" size={32} color="#4A90E2" />
              <Text style={styles.recaptchaTitle}>Robot emasligingizni tasdiqlang</Text>
              <Text style={styles.recaptchaSubtitle}>Telefoningizda Telegram topilmadi. Davom etish uchun tekshiruvdan o'ting.</Text>
            </View>

            <TouchableOpacity 
              style={[styles.recaptchaCheckboxWrap, isRobotVerified && styles.recaptchaVerified]}
              onPress={handleRecaptchaVerify}
              disabled={isRobotVerified}
            >
              <View style={styles.checkboxSquare}>
                {isRobotVerified ? (
                  <Ionicons name="checkmark" size={20} color="#00E676" />
                ) : null}
              </View>
              <Text style={styles.checkboxLabel}>Men robot emasman</Text>
              <Image 
                source={{ uri: 'https://www.gstatic.com/recaptcha/api2/logo_48.png' }}
                style={styles.recaptchaLogo}
              />
            </TouchableOpacity>

            {isRobotVerified && (
              <ActivityIndicator size="small" color="#FFB800" style={{ marginTop: 20 }} />
            )}

            <TouchableOpacity 
              style={styles.closeModalBtn}
              onPress={() => setShowRecaptcha(false)}
            >
              <Text style={styles.closeModalBtnText}>Bekor qilish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  countryCode: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
  },
  submitBtn: {
    backgroundColor: '#FFB800',
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 16,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1A1505',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#FFB800',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#E0C068',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#121212',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  recaptchaHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  recaptchaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 10,
    marginBottom: 6,
  },
  recaptchaSubtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
  },
  recaptchaCheckboxWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  recaptchaVerified: {
    borderColor: '#00E676',
  },
  checkboxSquare: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#555',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  checkboxLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginLeft: 12,
  },
  recaptchaLogo: {
    width: 32,
    height: 32,
  },
  closeModalBtn: {
    marginTop: 10,
    paddingVertical: 10,
  },
  closeModalBtnText: {
    color: '#FFB800',
    fontSize: 14,
    fontWeight: '600',
  },
});
