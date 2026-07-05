import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authAPI } from '../../services/api';

export default function ReferralScreen() {
  const { user, setUser } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const referralLink = `https://goldride.uz/ref/${user?.referral_code}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          `🚕 Goldride — Toshkentning eng qulay taksi!\n\n` +
          `Do'stim taklifi bilan ro'yxatdan o'tsang 20 000 UZS bonus olasan! 🎁\n\n` +
          `👉 ${referralLink}\n\n` +
          `Yoki kod: ${user?.referral_code}`,
        url: referralLink,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubmitPromoCode = async () => {
    if (!promoCodeInput.trim()) {
      Alert.alert("Xato", "Iltimos, promokodni kiriting.");
      return;
    }

    setPromoLoading(true);
    try {
      const response = await authAPI.submitReferralCode(promoCodeInput.trim());
      
      // Fetch latest profile details to update store state
      const profileResponse = await authAPI.getProfile();
      setUser(profileResponse.data);

      Alert.alert("Muvaffaqiyatli", response.data.detail || "Promokod muvaffaqiyatli qabul qilindi!");
      setPromoCodeInput('');
    } catch (error: any) {
      const errMsg = error.response?.data?.detail || "Promokod kiritishda xatolik yuz berdi.";
      Alert.alert("Xato", errMsg);
    } finally {
      setPromoLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }]}>
         <Ionicons name="lock-closed" size={80} color="#333" style={{ marginBottom: 20 }} />
         <Text style={styles.title}>Bonus olish uchun</Text>
         <Text style={styles.subtitle}>
           Avval tizimga kiring yoki ro'yxatdan o'ting.
         </Text>
         <TouchableOpacity 
           style={[styles.copyBtn, { marginTop: 30, width: '100%', justifyContent: 'center' }]}
           onPress={() => router.push('/(auth)/phone')}
         >
           <Text style={styles.copyBtnText}>Kirish / Ro'yxatdan o'tish</Text>
         </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 40 }}>
      <View style={styles.header}>
        <View style={styles.giftIcon}>
          <Ionicons name="gift" size={60} color="#FFB800" />
        </View>
        <Text style={styles.title}>Do'stlaringizni taklif qiling</Text>
        <Text style={styles.subtitle}>
          Do'stingizning birinchi 10 ta safaridan 5% keshbek oling! Do'stingizga esa 20 000 UZS bonus beriladi.
        </Text>
      </View>

      {/* Your Promo Code Card */}
      <View style={styles.codeCard}>
        <View style={styles.idRow}>
           <Text style={styles.idLabel}>ID RAQAMINGIZ: </Text>
           <Text style={styles.idValue}>{user?.id_number || '100001'}</Text>
        </View>
        <Text style={styles.codeLabel}>Sizning promokodingiz</Text>
        <View style={styles.codeRow}>
          <Text style={styles.codeText}>{user?.referral_code || 'GOLDXYZ'}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleShare}>
            <Ionicons name="share-social" size={20} color="#000" />
            <Text style={styles.copyBtnText}>Ulashish</Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 14, backgroundColor: '#0F172A', borderRadius: 12, padding: 12 }}>
          <Text style={{ color: '#94A3B8', fontSize: 11, marginBottom: 4 }}>Havola:</Text>
          <Text style={{ color: '#FFB800', fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{referralLink}</Text>
        </View>
      </View>

      {/* Submit Friend's Promo Code Box */}
      <View style={styles.inputCard}>
        {user.referred_by ? (
          <View style={styles.referredStatusRow}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.referredTitle}>Taklif kodi kiritilgan</Text>
              <Text style={styles.referredSubtitle}>Siz taklif bonusi (20 000 UZS) ga egasiz!</Text>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.inputCardTitle}>Sizni kim taklif qildi?</Text>
            <Text style={styles.inputCardSubtitle}>Do'stingiz promokodini (masalan: GOLD109287) kiriting va 20 000 UZS bonus oling!</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.promoInput}
                placeholder="Promokodni kiriting"
                placeholderTextColor="#666"
                autoCapitalize="characters"
                value={promoCodeInput}
                onChangeText={setPromoCodeInput}
              />
              <TouchableOpacity 
                style={[styles.submitPromoBtn, !promoCodeInput.trim() && styles.submitPromoBtnDisabled]} 
                onPress={handleSubmitPromoCode}
                disabled={promoLoading || !promoCodeInput.trim()}
              >
                {promoLoading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.submitPromoBtnText}>Kiritish</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{user?.gold_points || 0}</Text>
          <Text style={styles.statLabel}>Ballar</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{parseInt(user?.bonus_balance?.toString() || '0').toLocaleString()} UZS</Text>
          <Text style={styles.statLabel}>Bonus Hamyon</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Qanday ishlaydi?</Text>
        <View style={styles.stepRow}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
          <Text style={styles.stepText}>Promokodingizni do'stlaringizga yuboring.</Text>
        </View>
        <View style={styles.stepRow}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
          <Text style={styles.stepText}>Do'stingiz kodingiz bilan ro'yxatdan o'tsin yoki ilovaga kiritsin va 20 000 UZS bonusni kuting.</Text>
        </View>
        <View style={styles.stepRow}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
          <Text style={styles.stepText}>Uning 3-safaridan so'ng uning bonusi aktivlashadi, siz esa uning har bir safaridan 5% keshbek olasiz!</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { alignItems: 'center', paddingHorizontal: 30, marginBottom: 30 },
  giftIcon: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#1A1A1A',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: '#333'
  },
  title: { fontSize: 24, fontWeight: '900', color: '#FFF', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22 },
  codeCard: { 
    marginHorizontal: 24, backgroundColor: '#121212', borderRadius: 25, 
    padding: 24, borderWidth: 1, borderColor: '#1E1E1E', marginBottom: 20 
  },
  idRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15, gap: 5 },
  idLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '800' },
  idValue: { fontSize: 18, color: '#FFB800', fontWeight: '900' },
  codeLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', marginBottom: 15, textAlign: 'center' },
  codeRow: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', 
    borderRadius: 16, padding: 8, paddingLeft: 20, gap: 10 
  },
  codeText: { flex: 1, fontSize: 22, fontWeight: '900', color: '#FFB800', letterSpacing: 2 },
  copyBtn: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFB800', 
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 6 
  },
  copyBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },
  
  // Submit Referral Input Styles
  inputCard: {
    marginHorizontal: 24, backgroundColor: '#121212', borderRadius: 25, 
    padding: 24, borderWidth: 1, borderColor: '#1E1E1E', marginBottom: 20 
  },
  inputCardTitle: { fontSize: 15, fontWeight: '800', color: '#FFF', marginBottom: 6 },
  inputCardSubtitle: { fontSize: 12, color: '#94A3B8', lineHeight: 18, marginBottom: 16 },
  inputRow: { flexDirection: 'row', gap: 10 },
  promoInput: {
    flex: 1, height: 50, backgroundColor: '#1C1C1E', borderRadius: 14,
    borderColor: '#333', borderWidth: 1, color: '#FFF', fontSize: 14,
    fontWeight: '700', paddingHorizontal: 16
  },
  submitPromoBtn: {
    backgroundColor: '#FFB800', borderRadius: 14,
    paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center'
  },
  submitPromoBtnDisabled: {
    opacity: 0.5
  },
  submitPromoBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  
  referredStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  successIconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#064E3B',
    justifyContent: 'center', alignItems: 'center'
  },
  referredTitle: { fontSize: 15, fontWeight: '800', color: '#FFF', marginBottom: 2 },
  referredSubtitle: { fontSize: 12, color: '#10B981', fontWeight: '600' },

  statsSection: { flexDirection: 'row', gap: 16, paddingHorizontal: 24, marginBottom: 30 },
  statCard: { 
    flex: 1, backgroundColor: '#121212', borderRadius: 20, padding: 20, 
    alignItems: 'center', borderWidth: 1, borderColor: '#1E1E1E' 
  },
  statValue: { fontSize: 18, fontWeight: '900', color: '#FFF', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '700' },
  infoSection: { paddingHorizontal: 24 },
  infoTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', marginBottom: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 15 },
  stepNum: { 
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#2D260D', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFB800' 
  },
  stepNumText: { color: '#FFB800', fontWeight: '900', fontSize: 14 },
  stepText: { flex: 1, color: '#E2E8F0', fontSize: 14, fontWeight: '600' },
});
