import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Switch, ActivityIndicator, TextInput, Share, Clipboard } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { t, Language } from '../../services/i18n';
import { useAuthStore } from '../../stores/authStore';
import { authAPI } from '../../services/api';

const INVITE_BASE_URL = 'https://goldride.taxi/invite';

export default function DriverProfileScreen() {
  const router = useRouter();
  const { user, language, setLanguage, logout, isOnline, setIsOnline, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [tgUsername, setTgUsername] = useState(user?.telegram_username || '');
  const [switching, setSwitching] = useState(false);

  const handleSwitchToPassenger = async () => {
    try {
      setSwitching(true);
      if (isOnline) {
        await authAPI.toggleDriverStatus({ is_online: false });
        setIsOnline(false);
      }
      const resp = await authAPI.updateProfile({ role: 'passenger' });
      setUser(resp.data);
      router.replace('/(passenger)/home');
    } catch (e) {
      Alert.alert("Xato", "Yo'lovchi rejimiga o'tishda xatolik yuz berdi.");
    } finally {
      setSwitching(false);
    }
  };

  const toggleOnline = async () => {
    try {
      setLoading(true);
      const newStatus = !isOnline;
      
      let lat = null;
      let lng = null;

      if (newStatus) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      }

      await authAPI.toggleDriverStatus({ 
        is_online: newStatus,
        lat: lat,
        lng: lng
      });
      
      setIsOnline(newStatus);
    } catch (error) {
      Alert.alert(t('common.error'), 'Holatni o\'zgartirishda muammo yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(t('profile.logout'), t('settings.logout_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/');
        },
      },
    ]);
  };

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'uz', label: "O'zbekcha", flag: '🇺🇿' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.title')}</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={36} color="#FFB800" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {user?.first_name} {user?.last_name}
          </Text>
          <Text style={styles.phone}>{user?.phone}</Text>
          <View style={[styles.roleBadge, { backgroundColor: 'rgba(255, 184, 0, 0.1)' }]}>
            <Text style={[styles.roleText, { color: '#FFB800' }]}>
              {t('role.driver')}
            </Text>
          </View>
        </View>
        {loading ? (
          <ActivityIndicator color="#FFB800" />
        ) : (
          <Switch
            trackColor={{ false: '#334155', true: '#FFB800' }}
            thumbColor={isOnline ? '#FFF' : '#94A3B8'}
            onValueChange={toggleOnline}
            value={isOnline}
          />
        )}
      </View>

      {/* Online Status Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ish tartibi</Text>
        <TouchableOpacity 
           style={[styles.statusItem, isOnline && styles.statusItemActive]}
           onPress={toggleOnline}
           disabled={loading}
        >
           <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#64748B' }]} />
           <Text style={styles.statusLabel}>
              {isOnline ? 'Hozir ishdasiz' : 'Hozir dam olyapsiz'}
           </Text>
           <Text style={styles.statusAction}>
              {isOnline ? 'Tugallash' : 'Boshlash'}
           </Text>
        </TouchableOpacity>
      </View>

      {/* Social / Contact */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bog'lanish</Text>
        <View style={styles.inputCard}>
          <Ionicons name="paper-plane" size={20} color="#0088cc" />
          <TextInput
            style={styles.input}
            placeholder="Telegram username"
            placeholderTextColor="#666"
            value={tgUsername}
            onChangeText={setTgUsername}
            autoCapitalize="none"
          />
          <TouchableOpacity 
            style={styles.saveBtn} 
            onPress={async () => {
              try {
                setUpdating(true);
                const resp = await authAPI.updateProfile({ telegram_username: tgUsername });
                setUser(resp.data);
                Alert.alert("Muvaffaqiyatli", "Telegram username saqlandi.");
              } catch (e) {
                Alert.alert("Xato", "Saqlashda xatolik yuz berdi.");
              } finally {
                setUpdating(false);
              }
            }}
            disabled={updating}
          >
            {updating ? <ActivityIndicator size="small" color="#FFB800" /> : <Text style={styles.saveBtnText}>Saqlash</Text>}
          </TouchableOpacity>
        </View>
        <Text style={styles.inputHint}>* To'ldirish va yechish so'rovlari uchun kerak</Text>
      </View>

      {/* Haydovchi referal karodi */}
      {user?.referral_code && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Haydovchilarni taklif qil</Text>
          <View style={styles.referralCard}>
            <View style={styles.referralTop}>
              <View>
                <Text style={styles.referralLabel}>Sizning kodingiz</Text>
                <Text style={styles.referralCode}>{user.referral_code}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => {
                  Clipboard.setString(`${INVITE_BASE_URL}/${user.referral_code}`);
                  Alert.alert('Nusxalandi!', 'Havola nusxalandi.');
                }}
              >
                <Ionicons name="copy-outline" size={20} color="#FFB800" />
              </TouchableOpacity>
            </View>
            <View style={styles.referralBonusRow}>
              <View style={styles.referralBonusItem}>
                <Ionicons name="car" size={16} color="#FFB800" />
                <Text style={styles.referralBonusText}>Taklif qilgan haydovchidan 0.5% bonus</Text>
              </View>
              <View style={styles.referralBonusItem}>
                <Ionicons name="person" size={16} color="#4CAF50" />
                <Text style={[styles.referralBonusText, { color: '#4CAF50' }]}>Yo'lovchining safarlaridan ham 0.5%</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={async () => {
                const link = `${INVITE_BASE_URL}/${user.referral_code}`;
                try {
                  await Share.share({
                    message: `🚕 Goldride haydovchisi bo'ling!\n\nMening taklif kodigim bilan ro'yxatdan o'ting — ikkimiz ham bonus olamiz!\n\n👉 ${link}`,
                    url: link,
                  });
                } catch (e) {}
              }}
            >
              <Ionicons name="share-social" size={20} color="#000" />
              <Text style={styles.shareBtnText}>Do'stlarga ulashish</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Language */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
        <View style={styles.langContainer}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langBtn, language === lang.code && styles.langBtnActive]}
              onPress={() => setLanguage(lang.code)}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={[styles.langLabel, language === lang.code && styles.langLabelActive]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Switch to Passenger Mode Button */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.switchBtn} 
          onPress={handleSwitchToPassenger}
          disabled={switching}
        >
          <Ionicons name="people-outline" size={20} color="#FFB800" />
          <Text style={styles.switchText}>Yo'lovchi rejimiga o'tish</Text>
          {switching && <ActivityIndicator size="small" color="#FFB800" style={{ marginLeft: 8 }} />}
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#E53935" />
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { paddingBottom: 120 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    marginHorizontal: 20, padding: 20, backgroundColor: '#121212',
    borderRadius: 20, borderWidth: 1, borderColor: '#333', marginBottom: 24,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#1A160A',
    justifyContent: 'center', alignItems: 'center',
  },
  name: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  phone: { fontSize: 14, color: '#94A3B8', fontWeight: '500', marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8,
    alignSelf: 'flex-start', marginTop: 4,
  },
  roleText: { fontSize: 12, fontWeight: '700' },
  section: { marginHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 12,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  langContainer: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 14, backgroundColor: '#121212', gap: 6,
    borderWidth: 1, borderColor: '#333',
  },
  langBtnActive: { backgroundColor: '#FFB800', borderColor: '#FFB800' },
  langFlag: { fontSize: 16 },
  langLabel: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  langLabelActive: { color: '#000000' },
  statusItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#121212',
    padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#333',
  },
  statusItemActive: { borderColor: '#4CAF50' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  statusLabel: { flex: 1, fontSize: 15, color: '#FFF', fontWeight: '600' },
  statusAction: { fontSize: 13, color: '#FFB800', fontWeight: '700' },
  inputCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#121212',
    paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: '#333',
    gap: 12, height: 56
  },
  input: { flex: 1, color: '#FFF', fontSize: 16, fontWeight: '600' },
  saveBtn: { backgroundColor: '#1A160A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: '#FFB800', fontWeight: '700', fontSize: 12 },
  inputHint: { fontSize: 11, color: '#64748B', marginTop: 8, marginLeft: 4 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#121212', borderWidth: 1, borderColor: '#442222',
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#FF5252' },
  switchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#1A160A', borderWidth: 1, borderColor: '#FFB800',
  },
  switchText: { fontSize: 16, fontWeight: '700', color: '#FFB800' },
  referralCard: { backgroundColor: '#1A1A0A', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#3D3000' },
  referralTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  referralLabel: { fontSize: 12, color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  referralCode: { fontSize: 26, fontWeight: '900', color: '#FFB800', letterSpacing: 3, marginTop: 4 },
  copyBtn: { backgroundColor: '#2D260D', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#FFB800' },
  referralBonusRow: { gap: 8, marginBottom: 16 },
  referralBonusItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  referralBonusText: { fontSize: 13, color: '#CCC', fontWeight: '500' },
  shareBtn: { backgroundColor: '#FFB800', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 16, shadowColor: '#FFB800', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  shareBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },
});
