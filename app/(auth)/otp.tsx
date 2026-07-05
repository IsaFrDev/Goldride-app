import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Network from 'expo-network';
import { t } from '../../services/i18n';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

export default function OTPScreen() {
  const router = useRouter();PS C:\Users\sushi\Desktop\Goldride> npx expo start -c
env: load .env
env: export EXPO_PUBLIC_TELEGRAM_API_ID EXPO_PUBLIC_TELEGRAM_API_HASH EXPO_PUBLIC_TELEGRAM_BOT_URL
Starting project at C:\Users\sushi\Desktop\Goldride
Starting Metro Bundler
warning: Bundler cache is empty, rebuilding (this may take a minute)
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ █▄▄▄ ▀▀▀█ █ ▄▄▄▄▄ █
█ █   █ ██▄▀ █ ▀▄▄█ █   █ █
█ █▄▄▄█ ██▀▄ ▄███▀█ █▄▄▄█ █
█▄▄▄▄▄▄▄█ ▀▄█ ▀ ▀ █▄▄▄▄▄▄▄█
█▄▄▀  █▄▀█▄▀█▄▀█▀ █▄█▀█▀▀▄█
█▄▄▄▀▄█▄ ▄▄██▄▄▄▄ ▀███▄▀▀ █
█▀█▀▀█ ▄ █  █▀█▄ █ ▄▀▀█▀ ██
█ ▄  ▄▄▄▄ █▀█▀▄▀ ▄▀ ██▄▀  █
█▄█▄█▄█▄▄▀ ▄ ▄▄ █ ▄▄▄  ▄▀▄█
█ ▄▄▄▄▄ ██ █▀▄  █ █▄█ ███ █
█ █   █ █ ▀ ▄ ▀█▄ ▄  ▄ █▀▀█
█ █▄▄▄█ █▀▄  ▀█▄ ▄█▀▀▄█   █
█▄▄▄▄▄▄▄█▄█▄▄██▄▄▄▄█▄▄███▄█

› Metro waiting on exp://192.168.1.180:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Web is waiting on http://localhost:8081

› Using Expo Go
› Press s │ switch to development build

› Press a │ open Android
› Press w │ open web

› Press j │ open debugger
› Press r │ reload app
› Press m │ toggle menu
› shift+m │ more tools
› Press o │ open project code in your editor

› Press ? │ show all commands

Logs for your project will appear below. Press Ctrl+C to exit.
√ 

It is recommended to log in with your Expo account before proceeding. 
Learn more: https://expo.fyi/unverified-app-expo-go
 » Proceed anonymously
 WARN  The package C:\Users\sushi\Desktop\Goldride\node_modules\use-latest-callback contains an invalid package.json configuration. Consider raising this issue with the package maintainer(s).
Reason: The resolution for "C:\Users\sushi\Desktop\Goldride\node_modules\use-latest-callback" defined in "exports" is C:\Users\sushi\Desktop\Goldride\node_modules\use-latest-callback\esm.mjs, however this file does not exist. Falling back to file-based resolution.   
 WARN  The package C:\Users\sushi\Desktop\Goldride\node_modules\use-latest-callback contains an invalid package.json configuration. Consider raising this issue with the package maintainer(s).
Reason: The resolution for "C:\Users\sushi\Desktop\Goldride\node_modules\use-latest-callback" defined in "exports" is C:\Users\sushi\Desktop\Goldride\node_modules\use-latest-callback\esm.mjs, however this file does not exist. Falling back to file-based resolution.   
 WARN  The package C:\Users\sushi\Desktop\Goldride\node_modules\zustand contains an invalid package.json configuration. Consider raising this issue with the package maintainer(s).
Reason: The resolution for "C:\Users\sushi\Desktop\Goldride\node_modules\zustand" defined in "exports" is C:\Users\sushi\Desktop\Goldride\node_modules\zustand\esm\index.mjs, however this file does not exist. Falling back to file-based resolution.
 WARN  The package C:\Users\sushi\Desktop\Goldride\node_modules\zustand contains an invalid package.json configuration. Consider raising this issue with the package maintainer(s).
Reason: The resolution for "C:\Users\sushi\Desktop\Goldride\node_modules\zustand\middleware" defined in "exports" is C:\Users\sushi\Desktop\Goldride\node_modules\zustand\esm\middleware.mjs, however this file does not exist. Falling back to file-based resolution.     
 WARN  The package C:\Users\sushi\Desktop\Goldride\node_modules\use-latest-callback contains an invalid package.json configuration. Consider raising this issue with the package maintainer(s).
Reason: The resolution for "C:\Users\sushi\Desktop\Goldride\node_modules\use-latest-callback" defined in "exports" is C:\Users\sushi\Desktop\Goldride\node_modules\use-latest-callback\esm.mjs, however this file does not exist. Falling back to file-based resolution.   
Android Bundled 20678ms node_modules\expo-router\entry.js (1405 modules)
 WARN  🚨 React Native's New Architecture is always enabled in Expo Go, but it is explicitly disabled in your project's app config. This may lead to unexpected behavior when creating a production or development build. Remove "newArchEnabled": false from your app.json.
Learn more: https://docs.expo.dev/guides/new-architecture/
 LOG  [API] Using production URL: https://goldride-backend-production.up.railway.app/api
 LOG  [WebSocket] Error: Connection failed
 LOG  [WebSocket] Closed: 1006 Expected HTTP 101 response but was '403 Forbidden'
 LOG  [API 401] Attempting token refresh for: /auth/drivers/nearby/
 LOG  [API 401] Attempting token refresh for: /rides/active/
 LOG  [WebSocket] Error: Connection failed
 LOG  [WebSocket] Closed: 1006 Expected HTTP 101 response but was '403 Forbidden'
 LOG  [API Refresh] Token refresh failed, logging out...
 LOG  [API Refresh] Token refresh failed, logging out...
 LOG  [API Refresh] No refresh token available
 LOG  [API Refresh] No refresh token available
 ERROR  Failed to agree to terms: [AxiosError: Request failed with status code 401] 

Call Stack
  construct (<native>)
  apply (<native>)
  _construct (node_modules\@babel\runtime\helpers\construct.js)
  Wrapper (node_modules\@babel\runtime\helpers\wrapNativeSuper.js)
  construct (<native>)
  _callSuper (node_modules\@babel\runtime\helpers\callSuper.js)
  AxiosError#constructor (node_modules\axios\dist\esm\axios.js)
  settle (node_modules\axios\dist\esm\axios.js)
  onloadend (node_modules\axios\dist\esm\axios.js)
  invoke (node_modules\react-native\src\private\webapis\dom\events\EventTarget.js)       
  dispatch (node_modules\react-native\src\private\webapis\dom\events\EventTarget.js)     
  INTERNAL_DISPATCH_METHOD_KEY (node_modules\react-native\src\private\webapis\dom\events\EventTarget.js)
  dispatchTrustedEvent (node_modules\react-native\src\private\webapis\dom\events\internals\EventTargetInternals.js)
  setReadyState (node_modules\react-native\Libraries\Network\XMLHttpRequest.js)
  __didCompleteResponse (node_modules\react-native\Libraries\Network\XMLHttpRequest.js)  
  apply (<native>)
  RCTNetworking.addListener$argument_1 (node_modules\react-native\Libraries\Network\XMLHttpRequest.js)
  apply (<native>)
  emit (node_modules\react-native\Libraries\vendor\emitter\EventEmitter.js)
  apply (<native>)
  <anonymous> (node_modules\@babel\runtime\helpers\superPropGet.js)
  RCTDeviceEventEmitterImpl#emit (node_modules\react-native\Libraries\EventEmitter\RCTDeviceEventEmitter.js)
  Axios#request (node_modules\axios\dist\esm\axios.js)
  throw (<native>)
  asyncGeneratorStep (node_modules\@babel\runtime\helpers\asyncToGenerator.js)
  _throw (node_modules\@babel\runtime\helpers\asyncToGenerator.js)
  tryCallOne (address at (InternalBytecode.js:1:1180)
  anonymous (address at (InternalBytecode.js:1:1874)
 LOG  [API Refresh] No refresh token available
 ERROR  Failed to agree to terms: [AxiosError: Request failed with status code 401] 

Call Stack
  construct (<native>)
  apply (<native>)
  _construct (node_modules\@babel\runtime\helpers\construct.js)
  Wrapper (node_modules\@babel\runtime\helpers\wrapNativeSuper.js)
  construct (<native>)
  _callSuper (node_modules\@babel\runtime\helpers\callSuper.js)
  AxiosError#constructor (node_modules\axios\dist\esm\axios.js)
  settle (node_modules\axios\dist\esm\axios.js)
  onloadend (node_modules\axios\dist\esm\axios.js)
  invoke (node_modules\react-native\src\private\webapis\dom\events\EventTarget.js)       
  dispatch (node_modules\react-native\src\private\webapis\dom\events\EventTarget.js)     
  INTERNAL_DISPATCH_METHOD_KEY (node_modules\react-native\src\private\webapis\dom\events\EventTarget.js)
  dispatchTrustedEvent (node_modules\react-native\src\private\webapis\dom\events\internals\EventTargetInternals.js)
  setReadyState (node_modules\react-native\Libraries\Network\XMLHttpRequest.js)
  __didCompleteResponse (node_modules\react-native\Libraries\Network\XMLHttpRequest.js)  
  apply (<native>)
  RCTNetworking.addListener$argument_1 (node_modules\react-native\Libraries\Network\XMLHttpRequest.js)
  apply (<native>)
  emit (node_modules\react-native\Libraries\vendor\emitter\EventEmitter.js)
  apply (<native>)
  <anonymous> (node_modules\@babel\runtime\helpers\superPropGet.js)
  RCTDeviceEventEmitterImpl#emit (node_modules\react-native\Libraries\EventEmitter\RCTDeviceEventEmitter.js)
  Axios#request (node_modules\axios\dist\esm\axios.js)
  throw (<native>)
  asyncGeneratorStep (node_modules\@babel\runtime\helpers\asyncToGenerator.js)
  _throw (node_modules\@babel\runtime\helpers\asyncToGenerator.js)
  tryCallOne (address at (InternalBytecode.js:1:1180)
  anonymous (address at (InternalBytecode.js:1:1874)
 LOG  [API Refresh] No refresh token available
 ERROR  Failed to agree to terms: [AxiosError: Request failed with status code 401] 

Call Stack
  construct (<native>)
  apply (<native>)
  _construct (node_modules\@babel\runtime\helpers\construct.js)
  Wrapper (node_modules\@babel\runtime\helpers\wrapNativeSuper.js)
  construct (<native>)
  _callSuper (node_modules\@babel\runtime\helpers\callSuper.js)
  AxiosError#constructor (node_modules\axios\dist\esm\axios.js)
  settle (node_modules\axios\dist\esm\axios.js)
  onloadend (node_modules\axios\dist\esm\axios.js)
  invoke (node_modules\react-native\src\private\webapis\dom\events\EventTarget.js)       
  dispatch (node_modules\react-native\src\private\webapis\dom\events\EventTarget.js)     
  INTERNAL_DISPATCH_METHOD_KEY (node_modules\react-native\src\private\webapis\dom\events\EventTarget.js)
  dispatchTrustedEvent (node_modules\react-native\src\private\webapis\dom\events\internals\EventTargetInternals.js)
  setReadyState (node_modules\react-native\Libraries\Network\XMLHttpRequest.js)
  __didCompleteResponse (node_modules\react-native\Libraries\Network\XMLHttpRequest.js)  
  apply (<native>)
  RCTNetworking.addListener$argument_1 (node_modules\react-native\Libraries\Network\XMLHttpRequest.js)
  apply (<native>)
  emit (node_modules\react-native\Libraries\vendor\emitter\EventEmitter.js)
  apply (<native>)
  <anonymous> (node_modules\@babel\runtime\helpers\superPropGet.js)
  RCTDeviceEventEmitterImpl#emit (node_modules\react-native\Libraries\EventEmitter\RCTDeviceEventEmitter.js)
  Axios#request (node_modules\axios\dist\esm\axios.js)
  throw (<native>)
  asyncGeneratorStep (node_modules\@babel\runtime\helpers\asyncToGenerator.js)
  _throw (node_modules\@babel\runtime\helpers\asyncToGenerator.js)
  tryCallOne (address at (InternalBytecode.js:1:1180)
  anonymous (address at (InternalBytecode.js:1:1874)

  const insets = useSafeAreaInsets();
  const { identifier, phone, type } = useLocalSearchParams<{ identifier: string, phone?: string, type: 'phone' | 'email' }>();
  const { login, referralCode, onboardingRole, setOnboardingRole } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [ipAddress, setIpAddress] = useState<string>('Unknown');

  // WB-Style Captcha states (rendered directly on screen instead of modal)
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
    generateCaptcha();
  }, []);

  // Generates a random 4-digit code and styling for each digit
  const generateCaptcha = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setCaptchaCode(code);
    setCaptchaInput('');

    // Generate random rotations, offsets and colors for each character to make it look like a real captcha
    const styles = Array.from({ length: 4 }).map(() => {
      const rot = Math.floor(-20 + Math.random() * 40); // -20deg to 20deg
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

  const handleVerifyAndSubmit = async () => {
    if (captchaInput.trim() !== captchaCode) {
      Alert.alert("Xato", "Captcha kodi noto'g'ri kiritildi. Iltimos, qaytadan urinib ko'ring.");
      generateCaptcha();
      return;
    }

    setLoading(true);
    try {
      // Send mock OTP code "111111" as backend has bypass enabled
      const response = await authAPI.verifyOTP(identifier!, "111111", type, phone, referralCode || undefined, ipAddress);
      const { access, refresh, user, is_new_user, status } = response.data;

      Alert.alert("Muvaffaqiyatli", "Muvaffaqiyatli ro'yxatdan o'tdingiz!");

      if (status === 'partial') {
          if (access && refresh && user) {
              login(access, refresh, user);
          }
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
      generateCaptcha();
    } finally {
      setLoading(false);
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
          
          <Text style={styles.title}>Robot emasligingizni tasdiqlang</Text>
          <Text style={styles.subtitle}>
            Ro'yxatdan o'tishni yakunlash uchun rasmda ko'rsatilgan sonlarni kiriting.
          </Text>

          {/* Captcha Image/Text Box with noise */}
          <View style={styles.captchaBox}>
            <View style={styles.noiseLine1} />
            <View style={styles.noiseLine2} />
            <View style={styles.noiseLine3} />
            
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

          {/* Captcha Input */}
          <TextInput
            style={styles.captchaInput}
            placeholder="Rasmda ko'rsatilgan 4 ta sonni yozing"
            placeholderTextColor="#666"
            keyboardType="number-pad"
            maxLength={4}
            value={captchaInput}
            onChangeText={setCaptchaInput}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[styles.verifyBtn, (loading || captchaInput.length !== 4) && styles.verifyBtnDisabled]}
          onPress={handleVerifyAndSubmit}
          disabled={loading || captchaInput.length !== 4}
          activeOpacity={0.8}
        >
          <Text style={styles.verifyBtnText}>
            {loading ? t('common.loading') : "Tasdiqlash"}
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
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 20,
  },
  captchaBox: {
    height: 100,
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 24,
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
    top: 50,
    opacity: 0.7,
  },
  digitsWrapper: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  captchaDigit: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 4,
  },
  refreshBtn: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
  },
  captchaInput: {
    height: 56,
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 16,
    borderColor: '#222',
    borderWidth: 1,
    color: '#FFF',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 20,
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
});
