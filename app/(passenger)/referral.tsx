import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authAPI } from '../../services/api';
import { t } from '../../services/i18n';

export default function ReferralScreen() {
  const { user, setUser, language } = useAuthStore();
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
      Alert.alert(t('common.error'), t('settings.enter_first_name'));
      return;
    }

    setPromoLoading(true);
    try {
      const response = await authAPI.submitReferralCode(promoCodeInput.trim());
      
      const profileResponse = await authAPI.getProfile();
      setUser(profileResponse.data);

      Alert.alert(t('common.success'), response.data.detail || t('common.success'));
      setPromoCodeInput('');
    } catch (error: any) {
      const errMsg = error.response?.data?.detail || t('settings.update_error');
      Alert.alert(t('common.error'), errMsg);
    } finally {
      setPromoLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }]}>
         <Ionicons name="lock-closed" size={80} color="#333" style={{ marginBottom: 20 }} />
         <Text style={styles.title}>{t('profile.login_to_view')}</Text>
         <Text style={styles.subtitle}>
           {t('settings.login_required')}
         </Text>
         <TouchableOpacity 
           style={[styles.copyBtn, { marginTop: 30, width: '100%', justifyContent: 'center' }]}
           onPress={() => router.push('/(auth)/phone')}
         >
           <Text style={styles.copyBtnText}>{t('profile.login_signup')}</Text>
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
        <Text style={styles.title}>{t('ref.title')}</Text>
        <Text style={styles.subtitle}>
          {t('ref.subtitle')}
        </Text>
      </View>

      {/* Your Promo Code Card */}
      <View style={styles.codeCard}>
        <View style={styles.idRow}>
           <Text style={styles.idLabel}>{t('ref.id_number')}: </Text>
           <Text style={styles.idValue}>{user?.id_number || '100001'}</Text>
        </View>
        <Text style={styles.codeLabel}>{t('ref.your_promo')}</Text>
        <View style={styles.codeRow}>
          <Text style={styles.codeText}>{user?.referral_code || 'GOLDXYZ'}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleShare}>
            <Ionicons name="share-social" size={20} color="#000" />
            <Text style={styles.copyBtnText}>{t('ref.share')}</Text>
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
              <Text style={styles.referredTitle}>{t('ref.promo_applied')}</Text>
              <Text style={styles.referredSubtitle}>{t('ref.promo_applied_desc')}</Text>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.inputCardTitle}>{t('ref.who_invited')}</Text>
            <Text style={styles.inputCardSubtitle}>{t('ref.enter_promo_hint')}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.promoInput}
                placeholder={t('ref.enter_promo_placeholder')}
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
                  <Text style={styles.submitPromoBtnText}>{t('ref.submit')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{user?.gold_points || 0}</Text>
          <Text style={styles.statLabel}>{t('ref.points')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{parseInt(user?.bonus_balance?.toString() || '0').toLocaleString()} UZS</Text>
          <Text style={styles.statLabel}>{t('ref.bonus_wallet')}</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>{t('ref.how_it_works')}</Text>
        <View style={styles.stepRow}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
          <Text style={styles.stepText}>{t('ref.step_1')}</Text>
        </View>
        <View style={styles.stepRow}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
          <Text style={styles.stepText}>{t('ref.step_2')}</Text>
        </View>
        <View style={styles.stepRow}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
          <Text style={styles.stepText}>{t('ref.step_3')}</Text>
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
