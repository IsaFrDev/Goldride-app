import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, TextInput, ActivityIndicator, Share, Clipboard } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { t, Language } from '../../services/i18n';
import { useAuthStore } from '../../stores/authStore';

const INVITE_BASE_URL = 'https://goldride.taxi/invite';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, language, setLanguage, logout, setUser, setOnboardingRole } = useAuthStore();
  const [updating, setUpdating] = useState(false);
  const [tgUsername, setTgUsername] = useState(user?.telegram_username || '');

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout'),
      t('settings.logout_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/');
          },
        },
      ]
    );
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

      {/* Avatar & Name / Guest Card */}
      {isAuthenticated ? (
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color="#FFB800" />
          </View>
          <View>
            <Text style={styles.name}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Text style={styles.phone}>{user?.phone}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {user?.role === 'driver' ? t('role.driver') : t('role.passenger')}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.guestCard}>
          <View style={styles.guestTitleRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={36} color="#AAA" />
            </View>
            <View>
              <Text style={styles.name}>{t('profile.guest')}</Text>
              <Text style={styles.phone}>{t('profile.login_to_view')}</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.guestLoginBtn} 
            onPress={() => router.push('/(auth)/phone')}
          >
            <Text style={styles.guestLoginText}>{t('profile.login_signup')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.driverPromoBtn} 
            onPress={() => {
              setOnboardingRole('driver');
              router.push('/(auth)/phone');
            }}
          >
            <Ionicons name="car-sport" size={24} color="#FFF" />
            <View>
              <Text style={styles.driverPromoTitle}>{t('profile.become_driver')}</Text>
              <Text style={styles.driverPromoSub}>{t('profile.earn_with_us')}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>
      )}

      {/* Social / Contact */}
      {isAuthenticated && (
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
                const { authAPI } = await import('../../services/api');
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
      )}

      {/* Referal Karta */}
      {isAuthenticated && user?.referral_code && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Do'stlarni taklif qil</Text>
          <View style={styles.referralCard}>
            <View style={styles.referralTop}>
              <View>
                <Text style={styles.referralLabel}>Sizning taklif kodingiz</Text>
                <Text style={styles.referralCode}>{user.referral_code}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => {
                  Clipboard.setString(`${INVITE_BASE_URL}/${user.referral_code}`);
                  Alert.alert('Nusxalandi!', 'Havola clipboard ga nusxalandi.');
                }}
              >
                <Ionicons name="copy-outline" size={20} color="#FFB800" />
              </TouchableOpacity>
            </View>

            <View style={styles.referralBonusRow}>
              <View style={styles.referralBonusItem}>
                <Ionicons name="person-add" size={16} color="#FFB800" />
                <Text style={styles.referralBonusText}>Do'stingiz 10,000 so'm oladi</Text>
              </View>
              <View style={styles.referralBonusItem}>
                <Ionicons name="gift" size={16} color="#4CAF50" />
                <Text style={[styles.referralBonusText, { color: '#4CAF50' }]}>Siz har safaridan 1-2% bonus</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.shareBtn}
              onPress={async () => {
                const link = `${INVITE_BASE_URL}/${user.referral_code}`;
                try {
                  await Share.share({
                    message: `🚕 Goldride — qulay va arzon taksi!\n\nMening taklif kodim orqali kirting — 10,000 so'm bonus olasiz!\n\n👉 ${link}`,
                    url: link,
                    title: 'Goldride ga taklif qil',
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

      {/* Become a Driver or Switch to Driver Button */}
      {isAuthenticated && (
        user?.has_driver_profile ? (
          <View style={styles.section}>
            <TouchableOpacity 
              style={[styles.driverPromoBtn, { borderColor: '#FFB800', borderWidth: 1 }]} 
              onPress={async () => {
                try {
                  setUpdating(true);
                  const { authAPI } = await import('../../services/api');
                  const resp = await authAPI.updateProfile({ role: 'driver' });
                  setUser(resp.data);
                  router.replace('/(driver)/home');
                } catch (e) {
                  Alert.alert("Xato", "Haydovchi rejimiga o'tishda xatolik yuz berdi.");
                } finally {
                  setUpdating(false);
                }
              }}
              disabled={updating}
            >
              <Ionicons name="car-sport" size={24} color="#FFB800" />
              <View>
                <Text style={[styles.driverPromoTitle, { color: '#FFB800' }]}>Haydovchi rejimiga o'tish</Text>
                <Text style={styles.driverPromoSub}>Taksi haydab daromad olish</Text>
              </View>
              {updating ? <ActivityIndicator size="small" color="#FFB800" style={{ marginLeft: 'auto' }} /> : <Ionicons name="arrow-forward" size={20} color="#FFB800" style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>
          </View>
        ) : (
          user?.role === 'passenger' && (
            <View style={styles.section}>
              <TouchableOpacity 
                style={styles.driverPromoBtn} 
                onPress={() => {
                  setOnboardingRole('driver');
                  router.push('/(auth)/role-select');
                }}
              >
                <Ionicons name="car-sport" size={24} color="#FFB800" />
                <View>
                  <Text style={styles.driverPromoTitle}>{t('profile.become_driver')}</Text>
                  <Text style={styles.driverPromoSub}>{t('profile.earn_with_us')}</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#FFB800" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>
          )
        )
      )}

      {/* Language Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
        <View style={styles.langContainer}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.langBtn,
                language === lang.code && styles.langBtnActive,
              ]}
              onPress={() => setLanguage(lang.code)}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text
                style={[
                  styles.langLabel,
                  language === lang.code && styles.langLabelActive,
                ]}
              >
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/(passenger)/history')}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#2D260D' }]}>
            <Ionicons name="time" size={20} color="#FFB800" />
          </View>
          <Text style={styles.menuText}>{t('profile.history')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#444" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => Alert.alert(t('profile.payments'), t('common.coming_soon'))}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#1A1A1A' }]}>
            <Ionicons name="card" size={20} color="#FFB800" />
          </View>
          <Text style={styles.menuText}>{t('profile.payments')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#444" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => Alert.alert(t('profile.promos'), t('common.coming_soon'))}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#1A1A1A' }]}>
            <Ionicons name="pricetag" size={20} color="#FFB800" />
          </View>
          <Text style={styles.menuText}>{t('profile.promos')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#444" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/(passenger)/settings')}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#1A1A1A' }]}>
            <Ionicons name="settings" size={20} color="#FFB800" />
          </View>
          <Text style={styles.menuText}>{t('settings.title')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#444" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/(passenger)/help')}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#1A1A1A' }]}>
            <Ionicons name="help-circle" size={20} color="#FFB800" />
          </View>
          <Text style={styles.menuText}>{t('profile.help')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#444" />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      {isAuthenticated && (
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#E53935" />
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingBottom: 120,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: '#121212',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2D260D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  phone: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#2D260D',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFB800',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  langContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  langBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#121212',
    gap: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  langBtnActive: {
    backgroundColor: '#FFB800',
    borderColor: '#FFB800',
  },
  langFlag: {
    fontSize: 16,
  },
  langLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  langLabelActive: {
    color: '#000000',
  },
  menuSection: {
    marginHorizontal: 20,
    backgroundColor: '#121212',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#442222',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF5252',
  },
  guestCard: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  guestTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  guestLoginBtn: {
    backgroundColor: '#FFB800',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  guestLoginText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  driverPromoBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  driverPromoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  driverPromoSub: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  inputCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#121212',
    paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: '#333',
    gap: 12, height: 56
  },
  input: { flex: 1, color: '#FFF', fontSize: 16, fontWeight: '600' },
  saveBtn: { backgroundColor: '#1A160A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: '#FFB800', fontWeight: '700', fontSize: 12 },
  inputHint: { fontSize: 11, color: '#64748B', marginTop: 8, marginLeft: 4 },

  // Referral karta
  referralCard: {
    backgroundColor: '#1A1A0A',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3D3000',
  },
  referralTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  referralLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  referralCode: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFB800',
    letterSpacing: 3,
    marginTop: 4,
  },
  copyBtn: {
    backgroundColor: '#2D260D',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  referralBonusRow: {
    gap: 8,
    marginBottom: 16,
  },
  referralBonusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  referralBonusText: {
    fontSize: 13,
    color: '#CCC',
    fontWeight: '500',
  },
  shareBtn: {
    backgroundColor: '#FFB800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#FFB800',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
});
