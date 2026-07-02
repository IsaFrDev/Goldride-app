import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, Image, ScrollView,
  ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

// OAuth redirect oynasini yopish uchun — bu SHART, olib tashlash mumkin emas
WebBrowser.maybeCompleteAuthSession();

// Expo Go ichida ishlayaptimi? Google endi Expo Go'ning "exp://" redirect'ini
// xavfsizlik siyosati bo'yicha rad etadi (auth.expo.io proxy Expo tomonidan
// butunlay o'chirilgan). Bu holatda Google tugmasi tushunarli xabar beradi —
// haqiqiy login uchun development build kerak (pastdagi izohga qarang).
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export default function PhoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, referralCode, onboardingRole, setOnboardingRole } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  // Ro'yxatdan o'tish holati (Yangi foydalanuvchilar uchun)
  const [isRegistering, setIsRegistering] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);

  // expo-auth-session v7: Expo "auth.expo.io" proksi xizmatini butunlay
  // o'chirgan, shuning uchun Expo Go'da bu hook endi haqiqiy "exp://<ip>:<port>"
  // manzilini redirect sifatida ishlatadi. Google bunday custom-scheme
  // redirect'ni "Web application" turidagi client uchun siyosat bo'yicha rad
  // etadi (xato: "doesn't comply with Google's OAuth 2.0 policy"). Bu Google
  // Console sozlamalari bilan tuzatib bo'lmaydigan holat — Google Sign-In
  // Expo Go ichida ishlamaydi, faqat development/production build'da ishlaydi
  // (pastdagi IS_EXPO_GO tekshiruviga qarang).
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
        sendGoogleTokenToBackend(idToken);
      } else if (accessToken) {
        fetchGoogleUserInfoAndLogin(accessToken);
      } else {
        Alert.alert('Xato', 'Google tokenini olishda muammo yuz berdi.');
        setLoading(false);
      }
    } else if (response.type === 'error') {
      Alert.alert('Xato', response.error?.message || 'Google login xatosi yuz berdi.');
      setLoading(false);
    } else if (response.type === 'dismiss') {
      setLoading(false);
    }
  }, [response]);

  // Google orqali backendga yuborish
  const sendGoogleTokenToBackend = async (idToken: string, phoneVal?: string) => {
    try {
      setLoading(true);
      const res = await authAPI.googleAuth(idToken, phoneVal, referralCode || undefined);
      const { access, refresh, user } = res.data;
      await login(access, refresh, user);
      
      // Agar yangi foydalanuvchi bo'lsa yoki roli tanlanmagan bo'lsa role-select ga o'tadi
      if (!user.first_name || onboardingRole === 'driver') {
        router.replace({
          pathname: '/(auth)/role-select',
          params: { force_role: onboardingRole || undefined }
        });
        setOnboardingRole(null);
      } else {
        router.replace(user.role === 'driver' ? '/(driver)/home' : '/(passenger)/home');
      }
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.email && !phoneVal) {
        // Yangi foydalanuvchi — Telefon raqamini kiritish oynasini ochamiz
        setRegEmail(data.email);
        setRegFirstName(data.first_name || '');
        setRegLastName(data.last_name || '');
        setGoogleIdToken(idToken);
        setIsRegistering(true);
      } else {
        Alert.alert('Xato', data?.detail || 'Tizimga kirishda xatolik yuz berdi.');
      }
    } finally {
      setLoading(false);
    }
  };

  // accessToken bilan Google userinfo endpoint dan ma'lumot olish
  // (idToken bo'lmagan hollarda fallback)
  const fetchGoogleUserInfoAndLogin = async (accessToken: string) => {
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!userInfoRes.ok) throw new Error('UserInfo xatosi');
      const userInfo = await userInfoRes.json();
      // Backend Firebase id_token kutadi — accessToken ishlamaydi.
      // Google tokeninfo orqali id_token olamiz
      const tokenRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`
      );
      const tokenInfo = await tokenRes.json();
      if (tokenInfo.error) {
        Alert.alert('Xato', 'Google tokenini tekshirishda muammo.');
        setLoading(false);
        return;
      }
      // id_token ni tokeninfo javobidan olib backendga yuboramiz
      if (tokenInfo.id_token) {
        await sendGoogleTokenToBackend(tokenInfo.id_token);
      } else {
        // Fallback: email bilan kirish
        await handleEmailLogin(userInfo.email);
      }
    } catch {
      Alert.alert('Xato', "Google foydalanuvchi ma'lumotlarini olishda xato.");
      setLoading(false);
    }
  };

  // Email orqali backendga yuborish
  const handleEmailLogin = async (emailVal: string, phoneVal?: string) => {
    if (!emailVal.includes('@')) {
      Alert.alert('Xato', 'Iltimos, to\'g\'ri email manzili kiriting.');
      return;
    }

    try {
      setLoading(true);
      const res = await authAPI.emailAuth(emailVal, phoneVal, referralCode || undefined);
      const { access, refresh, user } = res.data;
      await login(access, refresh, user);

      if (!user.first_name || onboardingRole === 'driver') {
        router.replace({
          pathname: '/(auth)/role-select',
          params: { force_role: onboardingRole || undefined }
        });
        setOnboardingRole(null);
      } else {
        router.replace(user.role === 'driver' ? '/(driver)/home' : '/(passenger)/home');
      }
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.email && !phoneVal) {
        // Yangi foydalanuvchi — ma'lumotlarni kiritish oynasini ochamiz
        setRegEmail(data.email);
        setRegFirstName(data.first_name || '');
        setRegLastName(data.last_name || '');
        setGoogleIdToken(null); // Google emas, email orqali registratsiya
        setIsRegistering(true);
      } else {
        Alert.alert('Xato', data?.detail || 'Tizimga kirishda xatolik yuz berdi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePress = async () => {
    if (IS_EXPO_GO) {
      Alert.alert(
        'Google orqali kirish mavjud emas',
        "Expo Go ilovasida Google orqali kirish ishlamaydi — buni Google va Expo tomonidan qo'yilgan cheklov (Expo'ning eski proksi xizmati o'chirilgan). Iltimos, quyidagilardan birini tanlang:\n\n• Hozircha email orqali kiring\n• Yoki development build o'rnating (npx expo run:android / eas build --profile development)",
        [{ text: 'Tushunarli' }]
      );
      return;
    }
    setLoading(true);
    // v7 da promptAsync() ga hech qanday option berilmaydi
    // useProxy parametri expo-auth-session v5+ dan olib tashlangan
    await promptAsync();
  };

  // Ro'yxatdan o'tishni yakunlash (Finish registration)
  const handleCompleteRegistration = async () => {
    if (!regPhone || regPhone.length < 9) {
      Alert.alert('Xato', 'Iltimos, telefon raqamini to\'liq kiriting.');
      return;
    }
    if (!regFirstName.trim()) {
      Alert.alert('Xato', 'Ismingizni kiriting.');
      return;
    }

    // Google yoki Email orqali ro'yxatdan o'tishni davom ettiramiz
    if (googleIdToken) {
      // Ismlarni o'zgartirish kerak bo'lsa, backend profile orqali yangilaydi.
      // Hozircha login qilib, keyin profildan saqlaymiz.
      await sendGoogleTokenToBackend(googleIdToken, regPhone);
    } else {
      await handleEmailLogin(regEmail, regPhone);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (isRegistering) {
              setIsRegistering(false);
            } else {
              router.back();
            }
          }}
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

          {!isRegistering ? (
            // Kirish oynasi (Google yoki Email)
            <>
              <View style={styles.textGroup}>
                <Text style={styles.title}>Goldride'ga xush kelibsiz</Text>
                <Text style={styles.subtitle}>Tizimga kirish usulini tanlang</Text>
              </View>

              {/* Email orqali kirish inputi */}
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Email manzilingizni kiriting"
                  placeholderTextColor="#666"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <TouchableOpacity
                style={[styles.emailBtn, (!email.trim() || loading) && styles.buttonDisabled]}
                onPress={() => handleEmailLogin(email)}
                disabled={!email.trim() || loading}
              >
                {loading && !googleIdToken ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.emailBtnText}>Email orqali kirish</Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>yoki</Text>
                <View style={styles.divider} />
              </View>

              {/* Google orqali kirish tugmasi */}
              <TouchableOpacity
                style={[styles.googleBtn, (loading || !request) && styles.buttonDisabled]}
                onPress={handleGooglePress}
                disabled={loading || !request}
              >
                {loading && googleIdToken ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color="#000" />
                    <Text style={styles.googleBtnText}>Google orqali kirish</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.infoBox}>
                <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                <Text style={styles.infoText}>Barcha login va ma'lumotlar xavfsiz himoyalangan</Text>
              </View>
            </>
          ) : (
            // Ro'yxatdan o'tish oynasi (Telefon raqam va ismlarni olish)
            <>
              <View style={styles.textGroup}>
                <Text style={styles.title}>Ro'yxatdan o'tish</Text>
                <Text style={styles.subtitle}>Profilingizni yakunlash uchun ma'lumotlarni kiriting</Text>
              </View>

              {/* Email (Faqat o'qish uchun) */}
              <View style={[styles.inputContainer, styles.inputDisabled]}>
                <Ionicons name="mail" size={20} color="#444" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: '#666' }]}
                  value={regEmail}
                  editable={false}
                />
              </View>

              {/* Ism */}
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Ismingiz"
                  placeholderTextColor="#666"
                  value={regFirstName}
                  onChangeText={setRegFirstName}
                />
              </View>

              {/* Familiya */}
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Familiyangiz"
                  placeholderTextColor="#666"
                  value={regLastName}
                  onChangeText={setRegLastName}
                />
              </View>

              {/* Telefon raqami */}
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Telefon raqamingiz (+998...)"
                  placeholderTextColor="#666"
                  keyboardType="phone-pad"
                  value={regPhone}
                  onChangeText={setRegPhone}
                />
              </View>

              <TouchableOpacity
                style={[styles.emailBtn, loading && styles.buttonDisabled]}
                onPress={handleCompleteRegistration}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.emailBtnText}>Ro'yxatdan o'tishni yakunlash</Text>
                )}
              </TouchableOpacity>
            </>
          )}
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
    textAlign: 'center',
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
  textInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
  },
  inputDisabled: {
    backgroundColor: '#0A0A0A',
    borderColor: '#111',
  },
  emailBtn: {
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
  emailBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFF',
    height: 56,
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
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#222',
  },
  dividerText: {
    paddingHorizontal: 12,
    color: '#444',
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#07140B',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#8CA693',
    fontWeight: '500',
  },
});
