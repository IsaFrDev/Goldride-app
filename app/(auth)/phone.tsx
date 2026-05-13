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
  const login = useAuthStore(state => state.login);
  const [step, setStep] = useState<'phone' | 'email'>(method === 'phone' ? 'phone' : 'email');

  const handleNextStep = () => {
    if (step === 'phone') {
        const identifier = getRawPhone();
        if (identifier.length !== 13) {
          Alert.alert(t('common.error'), "Telefon raqamini to'liq kiriting");
          return;
        }
        setStep('email');
    } else {
        handleSendOTP();
    }
  };

  const handleSendOTP = async () => {
    let identifier = email.trim();
    if (!identifier.includes('@')) {
        Alert.alert(t('common.error'), "Email manzilini to'g'ri kiriting");
        return;
    }

    setLoading(true);
    try {
      const phoneIdentifier = getRawPhone();
      // Send OTP to Email, providing the Phone for linking
      await authAPI.sendOTP(phoneIdentifier, identifier);
      
      router.push({
        pathname: '/(auth)/otp',
        params: { 
            identifier, // email
            phone: phoneIdentifier,
            method: 'email',
            type: 'email'
        }
      });
    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      const msg = error.response?.data?.detail || error.message || "Xatolik yuz berdi";
      Alert.alert(t('common.error'), msg);
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
              <Text style={[styles.tabText, method !== 'telegram' && styles.activeTabText]}>Telefon / Email</Text>
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
              {step === 'phone' ? (
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
              ) : (
                <View>
                  <Text style={styles.inputLabel}>Endi email manzilingizni kiriting:</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      placeholder="example@mail.com"
                      placeholderTextColor="#666"
                      autoCapitalize="none"
                      autoFocus
                    />
                  </View>
                </View>
              )}
              
              <TouchableOpacity
                style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
                onPress={handleNextStep}
                disabled={loading}
              >
                <Text style={styles.sendBtnText}>
                  {loading ? "Yuborilmoqda..." : step === 'phone' ? "Keyingisi" : "Emailga kod yuborish"}
                </Text>
                {!loading && <Ionicons name="chevron-forward" size={20} color="#000" />}
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.telegramNotice}>
                <Ionicons name="information-circle" size={24} color="#24A1DE" />
                <Text style={styles.telegramNoticeText}>
                  Telegramga kirib, botga /start buyrug'ini bosing, ro'yxatdan o'tasiz.
                </Text>
              </View>

              <TouchableOpacity style={styles.tgBtn} onPress={handleTelegramLogin}>
                <Ionicons name="paper-plane" size={24} color="#FFF" />
                <Text style={styles.tgBtnText}>Telegram botga o'tish</Text>
              </TouchableOpacity>

              <View style={styles.inputContainer}>
                <Ionicons name="keypad" size={20} color="#666" style={{ marginRight: 10 }} />
                <TextInput
                    style={styles.input}
                    value={chatId}
                    onChangeText={setChatId}
                    keyboardType="numeric"
                    placeholder="Chat ID (Bot bergan kod)"
                    placeholderTextColor="#666"
                />
              </View>
              <TouchableOpacity
                style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
                onPress={async () => {
                    if (!chatId) return;
                    const { login, referralCode } = useAuthStore.getState();
                    setLoading(true);
                    try {
                        const response = await authAPI.verifyOTP(chatId, '0000', 'telegram', undefined, referralCode || undefined);
                        const { access, refresh, user } = response.data;
                        login(access, refresh, user);
                        router.replace(user.role === 'driver' ? '/(driver)/home' : '/(passenger)/home');
                    } catch (e: any) {
                        Alert.alert("Xato", "Chat ID noto'g'ri yoki botdan ro'yxatdan o'tilmagan");
                    } finally { setLoading(false); }
                }}
                disabled={loading}
              >
                <Text style={styles.sendBtnText}>Kirish</Text>
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
