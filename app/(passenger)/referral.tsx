import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ReferralScreen() {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🚕 Goldride ilovasidan foydalaning va 10 000 UZS bonus oling! 🎁\n\nRo'yxatdan o'tishda mening promokodimni kiriting: ${user?.referral_code}\n\nIlovani yuklab olish: https://goldride.uz`,
      });
    } catch (error) {
      console.log(error);
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
      </View>

      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{user?.gold_points || 0}</Text>
          <Text style={styles.statLabel}>Ballar</Text>
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
          <Text style={styles.stepText}>Do'stingiz kodingiz bilan ro'yxatdan o'tsin va 20 000 UZS bonusni kuting.</Text>
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
  header: { alignItems: 'center', paddingHorizontal: 30, marginBottom: 40 },
  giftIcon: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#1A1A1A',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: '#333'
  },
  title: { fontSize: 24, fontWeight: '900', color: '#FFF', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22 },
  codeCard: { 
    marginHorizontal: 24, backgroundColor: '#121212', borderRadius: 25, 
    padding: 24, borderWidth: 1, borderColor: '#1E1E1E', marginBottom: 24 
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
  statsSection: { flexDirection: 'row', gap: 16, paddingHorizontal: 24, marginBottom: 30 },
  statCard: { 
    flex: 1, backgroundColor: '#121212', borderRadius: 20, padding: 20, 
    alignItems: 'center', borderWidth: 1, borderColor: '#1E1E1E' 
  },
  statValue: { fontSize: 20, fontWeight: '900', color: '#FFF', marginBottom: 4 },
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
