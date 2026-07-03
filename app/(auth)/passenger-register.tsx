import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Network from 'expo-network';
import { t } from '../../services/i18n';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

export default function PassengerRegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setUser } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [ipAddress, setIpAddress] = useState<string>('Unknown');

  useEffect(() => {
    async function getIP() {
      try {
        const ip = await Network.getIpAddressAsync();
        setIpAddress(ip);
      } catch (err) {
        console.warn('Failed to retrieve IP Address in PassengerRegister:', err);
      }
    }
    getIP();
  }, []);

  const handleRegister = async () => {
    if (!firstName.trim()) {
      Alert.alert(t('common.error'), 'Ismingizni kiriting');
      return;
    }
    if (!hasAgreed) {
      Alert.alert(t('common.error'), "Davom etish uchun shartnoma bilan tanishib, rozilik berishingiz kerak");
      return;
    }

    setLoading(true);
    try {
      await authAPI.register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: 'passenger',
        has_agreed_to_terms: true,
        ip_address: ipAddress
      });
      
      const profile = await authAPI.getProfile();
      setUser(profile.data);
      
      // Show Welcome Bonus Alert
      Alert.alert(
        "Xush kelibsiz!",
        "Ro'yxatdan o'tganingiz uchun 20 000 so'm bonus hamyoningizga qo'shildi! 🎁",
        [{ text: "Rahmat!", onPress: () => router.replace('/(passenger)/home') }]
      );
    } catch (error: any) {
      const errorData = error.response?.data;
      let errorMsg = t('common.error');
      
      if (errorData?.detail) {
        errorMsg = errorData.detail;
      } else if (typeof errorData === 'object') {
        // Show the first field error if any
        const firstField = Object.keys(errorData)[0];
        if (firstField) {
          errorMsg = `${firstField}: ${errorData[firstField][0]}`;
        }
      }
      
      Alert.alert(t('common.error'), errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={[styles.headerWrap, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFB800" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.registerIcon}>
            <Ionicons name="person-add" size={48} color="#FFB800" />
          </View>
          <Text style={styles.title}>{t('reg.name_title')}</Text>
          <Text style={styles.subtitle}>Tizimga kirish uchun ma'lumotlaringizni kiriting</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('reg.first_name')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Ism"
                placeholderTextColor="#555"
                autoFocus
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('reg.last_name')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Familiya"
                placeholderTextColor="#555"
              />
            </View>
          </View>
        </View>

        <View style={styles.agreementSection}>
          <Text style={styles.agreementTitle}>Foydalanish shartlari</Text>
          <ScrollView style={styles.agreementBox} nestedScrollEnabled>
            <Text style={styles.agreementText}>
              Goldride ilovasidan foydalanish orqali siz ommaviy oferta shartlariga rozilik bildirasiz.{"\n\n"}
              1. Safar xavfsizligi: Haydovchi va yo'lovchi o'zaro hurmatda bo'lishi shart.{"\n"}
              2. Hisob-kitob: To'lovlar naqd yoki hamyon orqali amalga oshiriladi.{"\n"}
              3. Jarimalar: Safarni sababsiz bekor qilish jarimaga sabab bo'lishi mumkin.
            </Text>
          </ScrollView>
          <TouchableOpacity 
            style={styles.checkboxWrapper} 
            onPress={() => setHasAgreed(!hasAgreed)}
          >
            <Ionicons name={hasAgreed ? "checkbox" : "square-outline"} size={22} color="#FFB800" />
            <Text style={styles.checkboxText}>Shartlarga roziman</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.registerBtnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>
            {loading ? t('common.loading') : t('common.next')}
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
  headerWrap: {
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
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  registerIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2D260D',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    gap: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFB800',
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  submitBtn: {
    backgroundColor: '#FFB800',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FFB800',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  submitBtnText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '800',
  },
  registerBtnDisabled: {
    opacity: 0.6,
  },
  agreementSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  agreementTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  agreementBox: {
    height: 120,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  agreementText: {
    color: '#999',
    fontSize: 12,
    lineHeight: 18,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 10,
  },
  checkboxText: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 10,
  },
});

