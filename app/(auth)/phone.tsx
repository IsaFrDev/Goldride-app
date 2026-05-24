import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, Image, ScrollView,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../../services/i18n';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

type LoginMethod = 'phone' | 'email' | 'telegram';

export default function PhoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, onboardingRole, setOnboardingRole } = useAuthStore();
  
  const [method, setMethod] = useState<LoginMethod>('phone');
  const [step, setStep] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('+998');
  const [email, setEmail] = useState('');
  const [tgPhone, setTgPhone] = useState('+998');
  const [tgCode, setTgCode] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const formatPhone = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    if (!cleaned.startsWith('998')) {
      cleaned = '998' + cleaned;
    }
    cleaned = cleaned.substring(0, 12);
    
    let formatted = '+998';
    if (cleaned.length > 3) {
      formatted += ' ' + cleaned.substring(3, 5);
    }
    if (cleaned.length > 5) {
      formatted += ' ' + cleaned.substring(5, 8);
    }
    if (cleaned.length > 8) {
      formatted += ' ' + cleaned.substring(8, 10);
    }
    if (cleaned.length > 10) {
      formatted += ' ' + cleaned.substring(10, 12);
    }
    return formatted;
  };

  const getRawPhone = () => {
    return '+' + phone.replace(/\D/g, '');
  };

  const handleNextStep = async () => {
    const phoneIdentifier = getRawPhone();
    if (phoneIdentifier.length !== 13) {
      Alert.alert("Xato", "Telefon raqamini to'liq kiriting");
      return;
    }

    setLoading(true);
    try {
      const { referralCode } = useAuthStore.getState();
      const response = await authAPI.loginDirect(phoneIdentifier, referralCode || undefined);
      const { access, refresh, user, is_new_user } = response.data;
      
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
      console.error('[Auth] Direct Login error:', error);
      const msg = error.response?.data?.detail || error.message || "Tizimga kirishda xatolik yuz berdi";
      Alert.alert("Xatolik", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramLogin = () => {
    const botUsername = 'goldride_auth_bot';
    Linking.openURL(`https://t.me/${botUsername}`);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => step === 'email' ? setStep('phone') : router.back()}
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
            <Text style={styles.subtitle}>Tizimga kirish uchun usulni tanlang</Text>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, method !== 'telegram' && styles.activeTab]}
              onPress={() => { setMethod('phone'); setStep('phone'); }}
            >
              <Ionicons name="call" size={18} color={method !== 'telegram' ? '#000' : '#888'} />
              <Text style={[styles.tabText, method !== 'telegram' && styles.activeTabText]}>Telefon raqam</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, method === 'telegram' && styles.activeTab]}
              onPress={() => setMethod('telegram')}
            >
              <Ionicons name="paper-plane" size={18} color={method === 'telegram' ? '#000' : '#888'} />
              <Text style={[styles.tabText, method === 'telegram' && styles.activeTabText]}>Telegram</Text>
            </TouchableOpacity>
          </View>

          {method !== 'telegram' ? (
            <View>
              <View style={styles.inputContainer}>
                <Text style={styles.flag}>🇺🇿</Text>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={phone}
                  onChangeText={(text) => setPhone(formatPhone(text))}
                  keyboardType="phone-pad"
                  placeholder="+998 00 000 00 00"
                  placeholderTextColor="#666"
                  maxLength={17}
                  autoFocus
                />
              </View>
              
              <TouchableOpacity
                style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
                onPress={handleNextStep}
                disabled={loading}
              >
                <Text style={styles.sendBtnText}>
                  {loading ? "Kirilmoqda..." : "Tizimga kirish"}
                </Text>
                {!loading && <Ionicons name="chevron-forward" size={20} color="#000" />}
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.telegramNotice}>
                <Ionicons name="information-circle" size={24} color="#24A1DE" />
                <Text style={styles.telegramNoticeText}>
                  1. Telefon raqamingizni kiriting{'\n'}
                  2. Telegram botga o'ting va kontaktni yuboring{'\n'}
                  3. Botdan kelgan 6 xonali kodni kiriting
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.flag}>🇺🇿</Text>
                <TextInput
                  style={styles.input}
                  value={tgPhone}
                  onChangeText={(t) => setTgPhone(formatPhone(t))}
                  keyboardType="phone-pad"
                  placeholder="+998 00 000 00 00"
                  placeholderTextColor="#666"
                  maxLength={17}
                />
              </View>

              <TouchableOpacity style={styles.tgBtn} onPress={handleTelegramLogin}>
                <Ionicons name="paper-plane" size={24} color="#FFF" />
                <Text style={styles.tgBtnText}>Telegram botga o'tish →</Text>
              </TouchableOpacity>

              <View style={styles.inputContainer}>
                <Ionicons name="keypad" size={20} color="#666" style={{ marginRight: 10 }} />
                <TextInput
                    style={styles.input}
                    value={tgCode}
                    onChangeText={(t) => setTgCode(t.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="numeric"
                    placeholder="6 xonali kod (Botdan)"
                    placeholderTextColor="#666"
                    maxLength={6}
                />
              </View>
              <TouchableOpacity
                style={[styles.sendBtn, (loading || tgCode.length !== 6) && styles.sendBtnDisabled]}
                onPress={async () => {
                    const rawPhone = '+' + tgPhone.replace(/\D/g, '');
                    if (rawPhone.length !== 13 || tgCode.length !== 6) {
                      Alert.alert("Xato", "Telefon raqam va 6 xonali kodni to'liq kiriting");
                      return;
                    }
                    const { login, referralCode, onboardingRole, setOnboardingRole } = useAuthStore.getState();
                    setLoading(true);
                    try {
                        const response = await authAPI.verifyTelegramOTP(rawPhone, tgCode, referralCode || undefined);
                        const { access, refresh, user } = response.data;
                        login(access, refresh, user);

                        if (onboardingRole === 'driver') {
                           router.replace({ pathname: '/(auth)/role-select', params: { force_role: 'driver' } });
                           setOnboardingRole(null);
                        } else if (user.role === 'driver' && user.has_driver_profile) {
                           router.replace('/(driver)/home');
                        } else {
                           router.replace('/(passenger)/home');
                        }
                    } catch (e: any) {
                        Alert.alert("Xato", e.response?.data?.detail || "Kod noto'g'ri yoki muddati o'tgan");
                    } finally { setLoading(false); }
                }}
                disabled={loading || tgCode.length !== 6}
              >
                <Text style={styles.sendBtnText}>{loading ? "Kirilmoqda..." : "Kirish"}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Goldride xavfsiz tizim</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity style={styles.tgBtn} onPress={handleTelegramLogin}>
            <Ionicons name="paper-plane" size={24} color="#FFF" />
            <Text style={styles.tgBtnText}>Telegram orqali kirish</Text>
          </TouchableOpacity>
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
    marginBottom: 30,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#FFB800',
  },
  tabText: {
    color: '#888',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  flag: {
    fontSize: 22,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#FFF',
    fontWeight: '500',
  },
  sendBtn: {
    backgroundColor: '#FFB800',
    height: 60,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#666',
    paddingHorizontal: 15,
    fontSize: 14,
  },
  tgBtn: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#24A1DE',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  tgBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  inputLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 4,
    fontWeight: '600',
  },
  telegramNotice: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#24A1DE33',
  },
  telegramNoticeText: {
    color: '#FFF',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});
