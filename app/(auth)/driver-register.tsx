import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { t } from '../../services/i18n';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

const CAR_MAKES = ['Chevrolet', 'Hyundai', 'Kia', 'Toyota', 'Daewoo', 'BYD', 'Chery', 'Haval', 'Lada', 'Mercedes'];
const CAR_COLORS = [
  { key: 'white', label: 'Oq', color: '#F5F5F5' },
  { key: 'black', label: 'Qora', color: '#222' },
  { key: 'silver', label: 'Kumush', color: '#C0C0C0' },
  { key: 'grey', label: 'Kulrang', color: '#888' },
  { key: 'red', label: 'Qizil', color: '#E53935' },
  { key: 'blue', label: "Ko'k", color: '#1E88E5' },
  { key: 'green', label: 'Yashil', color: '#43A047' },
  { key: 'yellow', label: 'Sariq', color: '#FDD835' },
];

export default function DriverRegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Personal info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [passport, setPassport] = useState('');
  const [license, setLicense] = useState('');

  // Vehicle info
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('white');
  const [plate, setPlate] = useState('');
  const [carPhoto, setCarPhoto] = useState<string | null>(null);

  // AI Classification logic (Frontend version)
  const getVehicleClass = () => {
    if (!make || !model) return null;
    const m = make.toLowerCase();
    const mod = model.toLowerCase();
    
    const bizBrands = ['mercedes', 'bmw', 'audi', 'lexus', 'porsche', 'genesis'];
    const bizMods = ['s-class', '7-series', 'a8', 'ls', 'gls', 'x7'];
    
    if (bizBrands.some(b => m.includes(b)) && bizMods.some(bm => mod.includes(bm))) {
        return { key: 'business', label: 'Biznes', color: '#FFB800' };
    }
    
    const comBrands = ['toyota', 'kia', 'hyundai', 'chevrolet'];
    const comMods = ['camry', 'k5', 'optima', 'malibu', 'equinox', 'sonata', 'tucson', 'sportage'];
    
    if (comBrands.some(b => m.includes(b)) && comMods.some(bm => mod.includes(bm))) {
        return { key: 'comfort', label: 'Komfort', color: '#4CAF50' };
    }
    
    // Default or year based
    if (Number(year) >= 2022 && comBrands.some(b => m.includes(b))) {
        return { key: 'comfort', label: 'Komfort', color: '#4CAF50' };
    }

    return { key: 'economy', label: 'Ekonom', color: '#94A3B8' };
  };

  const vClass = getVehicleClass();

  const pickCarPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setCarPhoto(result.assets[0].uri);
    }
  };

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert(t('common.error'), "Ism va familiyani kiriting");
      return;
    }
    if (!license.trim()) {
      Alert.alert(t('common.error'), "Guvohnoma raqamini kiriting");
      return;
    }
    if (!passport.trim()) {
      Alert.alert(t('common.error'), "Pasport seriyasi va raqamini kiriting");
      return;
    }
    if (!make.trim() || !model.trim() || !year.trim() || !plate.trim()) {
      Alert.alert(t('common.error'), "Mashina ma'lumotlarini to'liq kiriting");
      return;
    }
    if (!carPhoto) {
      Alert.alert(t('common.error'), "Mashina rasmini yuklash majburiy (AI tekshiruvi uchun)");
      return;
    }

    // Plate number regex validation
    const plateRegex = /^(?:\d{2}[A-Z]\d{3}[A-Z]{2}|\d{2}\d{3}[A-Z]{3})$/;
    if (!plateRegex.test(plate.trim().toUpperCase())) {
      Alert.alert(t('common.error'), "Davlat raqami noto'g'ri formatda (Masalan: 01A123AA yoki 01123AAA)");
      return;
    }

    // Make and Model length validation
    if (make.trim().length < 2 || model.trim().length < 2) {
      Alert.alert(t('common.error'), "Marka va model nomini to'liq kiriting");
      return;
    }
    
    // Prevent random gibberish for the model
    const modelRegex = /^[A-Za-z0-9\s-]+$/;
    if (!modelRegex.test(model.trim())) {
        Alert.alert(t('common.error'), "Model nomida faqat harf, raqam va chiziqcha qatnashishi mumkin");
        return;
    }
    
    // Basic check to prevent keyboard mashing like "asdasd"
    if (/(.)\1{3,}/.test(model.trim())) {
         Alert.alert(t('common.error'), "Noto'g'ri model nomi kiritildi");
         return;
    }

    setLoading(true);
    try {
      // Simulate Smart Image Analysis
      await new Promise(resolve => setTimeout(resolve, 2000)); // AI thinking...
      
      // Update user info first
      await authAPI.register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: 'driver',
      });

      // Register driver profile
      const formData = new FormData();
      formData.append('license_number', license.trim());
      formData.append('passport_number', passport.trim().toUpperCase());
      formData.append('make', make.trim());
      formData.append('vehicle_model', model.trim());
      formData.append('year', year.trim());
      formData.append('color', color);
      formData.append('plate_number', plate.trim().toUpperCase());
      formData.append('vehicle_type', 'sedan');

      if (carPhoto) {
        const uriParts = carPhoto.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('vehicle_photo', {
          uri: carPhoto,
          name: `vehicle.${fileType}`,
          type: `image/${fileType}`,
        } as any);
      }

      await authAPI.registerDriver(formData);

      // Refresh user data
      const profileResp = await authAPI.getProfile();
      setUser(profileResp.data);

      Alert.alert(
        "Muvaffaqiyatli!",
        "Haydovchi sifatida ro'yxatdan o'tganingiz va 20 000 so'm bonus olganingiz bilan tabriklaymiz! 🎁",
        [{ text: "Rahmat!", onPress: () => router.replace('/(driver)/home') }]
      );
    } catch (error: any) {
      const errorData = error.response?.data;
      let errorMsg = t('common.error');
      
      if (errorData?.detail) {
        errorMsg = errorData.detail;
      } else if (typeof errorData === 'object') {
        const firstField = Object.keys(errorData)[0];
        if (firstField) {
          const fieldError = errorData[firstField];
          errorMsg = `${firstField}: ${Array.isArray(fieldError) ? fieldError[0] : fieldError}`;
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
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFB800" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{t('dreg.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Personal Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle" size={24} color="#FFB800" />
            <Text style={styles.sectionTitle}>{t('reg.name_title')}</Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>{t('reg.first_name')}</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Ism"
                placeholderTextColor="#CCC"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>{t('reg.last_name')}</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Familiya"
                placeholderTextColor="#CCC"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('dreg.license')}</Text>
            <TextInput
              style={styles.input}
              value={license}
              onChangeText={setLicense}
              placeholder="AB1234567"
              placeholderTextColor="#CCC"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASPORT SERIYASI VA RAQAMI</Text>
            <TextInput
              style={styles.input}
              value={passport}
              onChangeText={setPassport}
              placeholder="AA1234567"
              placeholderTextColor="#CCC"
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Vehicle Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="car-sport" size={24} color="#FFB800" />
            <Text style={styles.sectionTitle}>{t('dreg.car_title')}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('dreg.make')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                {CAR_MAKES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, make === m && styles.chipActive]}
                    onPress={() => setMake(m)}
                  >
                    <Text style={[styles.chipText, make === m && styles.chipTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.label}>{t('dreg.model')}</Text>
              <TextInput
                style={styles.input}
                value={model}
                onChangeText={setModel}
                placeholder="Spark, Malibu..."
                placeholderTextColor="#CCC"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>{t('dreg.year')}</Text>
              <TextInput
                style={styles.input}
                value={year}
                onChangeText={setYear}
                placeholder="2024"
                placeholderTextColor="#CCC"
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>

          {vClass && (
            <View style={styles.classPreview}>
              <View style={[styles.classBadge, { backgroundColor: vClass.color }]}>
                <Ionicons name="sparkles" size={14} color={vClass.key === 'economy' ? '#FFF' : '#000'} />
                <Text style={[styles.classBadgeText, { color: vClass.key === 'economy' ? '#FFF' : '#000' }]}>
                  {vClass.label} Klass
                </Text>
              </View>
              <Text style={styles.classHint}>Tizim avtomatik ravishda mashinangizni "{vClass.label}" toifasiga kiritdi.</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>MASHINA RASMI</Text>
            <TouchableOpacity style={styles.photoUpload} onPress={pickCarPhoto}>
              {carPhoto ? (
                <View style={styles.photoPreviewWrap}>
                  <View style={styles.photoOverlay}>
                    <Ionicons name="camera" size={24} color="#FFF" />
                    <Text style={styles.photoOverlayText}>O'zgartirish</Text>
                  </View>
                  {/* Image component would rely on URI from local state */}
                  <View style={{height: 160, backgroundColor: '#222', borderRadius: 12, justifyContent: 'center', alignItems: 'center'}}>
                     <Ionicons name="image" size={48} color="#444" />
                     <Text style={{color: '#666', fontSize: 12, marginTop: 10}}>Rasm yuklandi: {carPhoto.split('/').pop()}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera" size={32} color="#94A3B8" />
                  <Text style={styles.photoPlaceholderText}>Mashina rasmini yuklang</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('dreg.color')}</Text>
            <View style={styles.colorContainer}>
              {CAR_COLORS.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[
                    styles.colorBtn,
                    { backgroundColor: c.color },
                    color === c.key && styles.colorBtnActive,
                  ]}
                  onPress={() => setColor(c.key)}
                >
                  {color === c.key && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={c.key === 'white' || c.key === 'yellow' ? '#333' : '#FFF'}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('dreg.plate')}</Text>
            <TextInput
              style={styles.input}
              value={plate}
              onChangeText={setPlate}
              placeholder="01A123BC"
              placeholderTextColor="#CCC"
              autoCapitalize="characters"
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.registerBtnText}>
            {loading ? t('common.loading') : t('dreg.submit')}
          </Text>
          {!loading && <Ionicons name="checkmark-circle" size={22} color="#000" />}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#121212',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#333',
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
  },
  chipActive: {
    backgroundColor: '#FFB800',
    borderColor: '#FFB800',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  chipTextActive: {
    color: '#000000',
  },
  colorContainer: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  colorBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  colorBtnActive: {
    borderColor: '#FFB800',
    borderWidth: 3,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  registerBtn: {
    backgroundColor: '#FFB800',
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  registerBtnDisabled: {
    opacity: 0.6,
  },
  registerBtnText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '800',
  },
  classPreview: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB800',
  },
  classBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  classBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  classHint: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  photoUpload: {
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    backgroundColor: '#1A1A1A',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  photoPreviewWrap: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 2,
  },
  photoOverlayText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

