import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView, Image,
  Modal, ActivityIndicator, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Network from 'expo-network';
import { t } from '../../services/i18n';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

type TaxiPark = { id: number; name: string; address: string; driver_count: number };

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
  const [step, setStep] = useState(1); // 1 to 6
  const [ipAddress, setIpAddress] = useState<string>('Unknown');

  // Step 1: Agreement
  const [hasAgreed, setHasAgreed] = useState(false);

  // Step 2: Personal info & Passport
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [passport, setPassport] = useState('');
  const [passportPhotoFront, setPassportPhotoFront] = useState<string | null>(null);
  const [passportPhotoBack, setPassportPhotoBack] = useState<string | null>(null);

  // Taksi parki tanlash (ixtiyoriy — bo'sh bo'lsa mustaqil haydovchi)
  const [taxiParks, setTaxiParks] = useState<TaxiPark[]>([]);
  const [loadingParks, setLoadingParks] = useState(true);
  const [selectedPark, setSelectedPark] = useState<TaxiPark | null>(null);
  const [showParkModal, setShowParkModal] = useState(false);

  useEffect(() => {
    async function getIP() {
      try {
        const ip = await Network.getIpAddressAsync();
        setIpAddress(ip);
      } catch (err) {
        console.warn('Failed to retrieve IP Address in DriverRegister:', err);
      }
    }
    getIP();

    authAPI.getTaxiParks()
      .then(res => setTaxiParks(Array.isArray(res.data) ? res.data : []))
      .catch(() => setTaxiParks([]))
      .finally(() => setLoadingParks(false));
  }, []);

  // Step 3: License & Face ID
  const [license, setLicense] = useState('');
  const [licensePhotoFront, setLicensePhotoFront] = useState<string | null>(null);
  const [licensePhotoBack, setLicensePhotoBack] = useState<string | null>(null);
  const [faceIdPhoto, setFaceIdPhoto] = useState<string | null>(null);

  // Step 4: Vehicle & Tech Passport
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plate, setPlate] = useState('');
  const [techPassportFront, setTechPassportFront] = useState<string | null>(null);
  const [techPassportBack, setTechPassportBack] = useState<string | null>(null);

  // Step 5: Vehicle Photos
  const [color, setColor] = useState('white');
  const [photoFront, setPhotoFront] = useState<string | null>(null);
  const [photoBack, setPhotoBack] = useState<string | null>(null);
  const [photoLeft, setPhotoLeft] = useState<string | null>(null);
  const [photoRight, setPhotoRight] = useState<string | null>(null);
  const [interior1, setInterior1] = useState<string | null>(null);
  const [interior2, setInterior2] = useState<string | null>(null);

  // Step 6: Taxi License
  const [taxiLicense, setTaxiLicense] = useState<string | null>(null);

  const pickPhoto = async (setter: (uri: string) => void, aspect: [number, number] = [4, 3]) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect,
      quality: 0.7,
    });
    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  const handleNext = () => {
    if (step === 1 && !hasAgreed) {
        Alert.alert("Xato", "Davom etish uchun shartnoma bilan tanishib, rozilik berishingiz kerak");
        return;
    }
    if (step === 2) {
        if (!firstName.trim() || !lastName.trim() || !passport.trim() || !passportPhotoFront || !passportPhotoBack) {
            Alert.alert("Xato", "Hamma maydonlarni to'ldiring va pasport rasmlarini yuklang");
            return;
        }
    }
    if (step === 3) {
        if (!license.trim() || !licensePhotoFront || !licensePhotoBack || !faceIdPhoto) {
            Alert.alert("Xato", "Guvohnoma rasmlari va Face ID yuklanishi shart");
            return;
        }
    }
    if (step === 4) {
        if (!make || !model || !year || !plate || !techPassportFront || !techPassportBack) {
            Alert.alert("Xato", "Mashina ma'lumotlari va texpasport rasmlarini to'liq kiriting");
            return;
        }
        const cleanPlate = plate.trim().toUpperCase().replace(/\s/g, '');
        const plateRegex = /^(?:\d{2}[A-Z]\d{3}[A-Z]{2}|\d{2}\d{3}[A-Z]{3})$/;
        if (!plateRegex.test(cleanPlate)) {
            Alert.alert("Xato", "Davlat raqami formati noto'g'ri");
            return;
        }
    }
    if (step === 5) {
        if (!photoFront || !photoBack || !photoLeft || !photoRight || !interior1 || !interior2) {
            Alert.alert("Xato", "Mashinaning barcha 4 tomoni va salon rasmlari yuklanishi shart");
            return;
        }
    }
    
    if (step < 6) setStep(step + 1);
    else handleRegister();
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const cleanPlate = plate.trim().toUpperCase().replace(/\s/g, '');
      
      // 1. Update basic info
      await authAPI.register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: 'driver',
        has_agreed_to_terms: true,
        ip_address: ipAddress
      });

      // 2. Prepare Form Data
      const formData = new FormData();
      formData.append('license_number', license.trim().toUpperCase());
      formData.append('passport_number', passport.trim().toUpperCase());
      formData.append('make', make.trim());
      formData.append('vehicle_model', model.trim());
      formData.append('year', year.trim());
      formData.append('color', color);
      formData.append('plate_number', cleanPlate);
      formData.append('vehicle_type', 'sedan');
      formData.append('ip_address', ipAddress);
      if (selectedPark) formData.append('taxi_park_id', String(selectedPark.id));

      // Helper to append files
      const appendFile = (key: string, uri: string | null, fileName: string) => {
        if (uri) {
          const type = uri.split('.').pop();
          formData.append(key, {
            uri,
            name: `${fileName}.${type}`,
            type: `image/${type === 'pdf' ? 'pdf' : 'jpeg'}`,
          } as any);
        }
      };

      appendFile('license_photo', licensePhotoFront, 'license_front');
      appendFile('license_photo_back', licensePhotoBack, 'license_back');
      appendFile('passport_photo_front', passportPhotoFront, 'passport_front');
      appendFile('passport_photo_back', passportPhotoBack, 'passport_back');
      appendFile('face_id_photo', faceIdPhoto, 'face_id');
      appendFile('taxi_license_photo', taxiLicense, 'taxi_license');
      
      appendFile('photo', photoFront, 'car_front');
      appendFile('photo_back', photoBack, 'car_back');
      appendFile('photo_left', photoLeft, 'car_left');
      appendFile('photo_right', photoRight, 'car_right');
      appendFile('interior_photo_1', interior1, 'interior_1');
      appendFile('interior_photo_2', interior2, 'interior_2');
      appendFile('tech_passport_photo_front', techPassportFront, 'tech_front');
      appendFile('tech_passport_photo_back', techPassportBack, 'tech_back');

      await authAPI.registerDriver(formData);

      const profileResp = await authAPI.getProfile();
      setUser(profileResp.data);

      Alert.alert(
        "Muvaffaqiyatli!",
        "Hujjatlaringiz qabul qilindi. Admin tomonidan tekshiruvdan so'ng (24 soat ichida) faoliyati boshlashingiz mumkin.",
        [{ text: "OK", onPress: () => router.replace('/(driver)/home') }]
      );
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error);
      // Serverdan kelgan aniq xabarni ko'rsatamiz (umumiy matn o'rniga)
      const data = error.response?.data;
      let msg = "Ro'yxatdan o'tishda xatolik yuz berdi. Iltimos barcha rasmlar yuklanganini va internetingizni tekshiring.";
      if (data) {
        if (typeof data === 'string') {
          msg = data;
        } else if (data.detail) {
          msg = data.detail;
        } else if (typeof data === 'object') {
          const first = Object.entries(data)[0];
          if (first) {
            const val = Array.isArray(first[1]) ? first[1][0] : first[1];
            msg = `${first[0]}: ${val}`;
          }
        }
      }
      Alert.alert("Xatolik", msg);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch(step) {
      case 1: // Agreement
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Ommaviy Oferta</Text>
            <ScrollView style={styles.agreementScroll}>
              <Text style={styles.agreementText}>
                1. Umumiy qoidalar...{"\n"}
                Goldride platformasi haydovchi va yo'lovchi o'rtasida vositachilik xizmatini ko'rsatadi.{"\n\n"}
                2. Haydovchi majburiyatlari:{"\n"}
                - Yo'l harakati qoidalariga amal qilish.{"\n"}
                - Mijozlarga nisbatan xushmuomala bo'lish.{"\n"}
                - Mashina toza va texnik soz holatda bo'lishi.{"\n\n"}
                3. Taqiqlangan harakatlar:{"\n"}
                - Mast holatda rul boshqarish.{"\n"}
                - Platformadan tashqari hisob-kitob qilish.{"\n"}
                - Shaxsiy ma'lumotlarni uchinchi shaxslarga berish.{"\n\n"}
                4. Maxfiylik siyosati:{"\n"}
                Sizning barcha hujjatlaringiz xavfsiz saqlanadi va faqat identifikatsiya uchun ishlatiladi.
              </Text>
            </ScrollView>
            <TouchableOpacity 
                style={styles.checkboxContainer} 
                onPress={() => setHasAgreed(!hasAgreed)}
            >
                <Ionicons name={hasAgreed ? "checkbox" : "square-outline"} size={24} color="#FFB800" />
                <Text style={styles.checkboxLabel}>Shartnoma shartlariga roziman</Text>
            </TouchableOpacity>
          </View>
        );
      case 2: // Personal Info & Passport
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Shaxsiy ma'lumotlar</Text>
            <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} value={firstName} onChangeText={setFirstName} placeholder="Ism" placeholderTextColor="#666" />
                <TextInput style={[styles.input, { flex: 1 }]} value={lastName} onChangeText={setLastName} placeholder="Familiya" placeholderTextColor="#666" />
            </View>
            <TextInput style={styles.input} value={passport} onChangeText={setPassport} placeholder="Pasport seriya va raqami (AA1234567)" placeholderTextColor="#666" autoCapitalize="characters" />

            <Text style={styles.label}>Taksi parki</Text>
            <TouchableOpacity style={styles.parkSelect} onPress={() => setShowParkModal(true)}>
              <Ionicons name="business-outline" size={20} color="#FFB800" />
              <View style={{ flex: 1 }}>
                <Text style={styles.parkSelectText}>
                  {selectedPark ? selectedPark.name : 'Mustaqil (parksiz) ishlayman'}
                </Text>
                {selectedPark ? (
                  <Text style={styles.parkSelectHint}>{selectedPark.address || 'Manzil ko\'rsatilmagan'}</Text>
                ) : (
                  <Text style={styles.parkSelectHint}>Yoki ro'yxatdan bir taksi parkini tanlang</Text>
                )}
              </View>
              {loadingParks ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <Ionicons name="chevron-down" size={20} color="#666" />
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Pasport rasmi (Oldi tomoni)</Text>
            <TouchableOpacity style={styles.photoUpload} onPress={() => pickPhoto(setPassportPhotoFront)}>
                {passportPhotoFront ? <Image source={{ uri: passportPhotoFront }} style={styles.preview} /> : <Ionicons name="camera" size={32} color="#666" />}
            </TouchableOpacity>

            <Text style={styles.label}>Pasport rasmi (Orqa tomoni)</Text>
            <TouchableOpacity style={styles.photoUpload} onPress={() => pickPhoto(setPassportPhotoBack)}>
                {passportPhotoBack ? <Image source={{ uri: passportPhotoBack }} style={styles.preview} /> : <Ionicons name="camera" size={32} color="#666" />}
            </TouchableOpacity>
          </View>
        );
      case 3: // License & Face ID
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Haydovchilik guvohnomasi</Text>
            <TextInput style={styles.input} value={license} onChangeText={setLicense} placeholder="Guvohnoma raqami (AB1234567)" placeholderTextColor="#666" autoCapitalize="characters" />
            
            <View style={styles.row}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Guvohnoma (Old)</Text>
                    <TouchableOpacity style={[styles.photoUpload, { height: 100 }]} onPress={() => pickPhoto(setLicensePhotoFront)}>
                        {licensePhotoFront ? <Image source={{ uri: licensePhotoFront }} style={styles.preview} /> : <Ionicons name="card" size={24} color="#666" />}
                    </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Guvohnoma (Orqa)</Text>
                    <TouchableOpacity style={[styles.photoUpload, { height: 100 }]} onPress={() => pickPhoto(setLicensePhotoBack)}>
                        {licensePhotoBack ? <Image source={{ uri: licensePhotoBack }} style={styles.preview} /> : <Ionicons name="card" size={24} color="#666" />}
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.stepTitle}>Face ID (Shaxsni tasdiqlash)</Text>
            <Text style={styles.hint}>Yuzingiz aniq ko'ringan holda selfi tushing</Text>
            <TouchableOpacity style={[styles.photoUpload, { height: 200 }]} onPress={() => pickPhoto(setFaceIdPhoto, [1, 1])}>
                {faceIdPhoto ? <Image source={{ uri: faceIdPhoto }} style={styles.preview} /> : <Ionicons name="person" size={48} color="#666" />}
            </TouchableOpacity>
          </View>
        );
      case 4: // Vehicle & Tech Passport
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Mashina ma'lumotlari</Text>
            <TextInput style={styles.input} value={make} onChangeText={setMake} placeholder="Markasi (Masalan: Chevrolet)" placeholderTextColor="#666" />
            <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="Modeli (Masalan: Cobalt)" placeholderTextColor="#666" />
            <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} value={year} onChangeText={setYear} placeholder="Yili" keyboardType="numeric" placeholderTextColor="#666" />
                <TextInput style={[styles.input, { flex: 1 }]} value={plate} onChangeText={setPlate} placeholder="Davlat raqami" placeholderTextColor="#666" autoCapitalize="characters" />
            </View>

            <Text style={styles.label}>Texpasport (Oldi)</Text>
            <TouchableOpacity style={[styles.photoUpload, { height: 120 }]} onPress={() => pickPhoto(setTechPassportFront)}>
                {techPassportFront ? <Image source={{ uri: techPassportFront }} style={styles.preview} /> : <Ionicons name="document-text" size={32} color="#666" />}
            </TouchableOpacity>

            <Text style={styles.label}>Texpasport (Orqa)</Text>
            <TouchableOpacity style={[styles.photoUpload, { height: 120 }]} onPress={() => pickPhoto(setTechPassportBack)}>
                {techPassportBack ? <Image source={{ uri: techPassportBack }} style={styles.preview} /> : <Ionicons name="document-text" size={32} color="#666" />}
            </TouchableOpacity>
          </View>
        );
      case 5: // Car Photos (4 sides + Interior)
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Mashina rasmlari</Text>
            <View style={styles.grid}>
                <View style={styles.gridItem}>
                    <Text style={styles.label}>Oldi</Text>
                    <TouchableOpacity style={styles.gridUpload} onPress={() => pickPhoto(setPhotoFront)}>
                        {photoFront ? <Image source={{ uri: photoFront }} style={styles.preview} /> : <Ionicons name="camera" size={24} color="#666" />}
                    </TouchableOpacity>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.label}>Orqa</Text>
                    <TouchableOpacity style={styles.gridUpload} onPress={() => pickPhoto(setPhotoBack)}>
                        {photoBack ? <Image source={{ uri: photoBack }} style={styles.preview} /> : <Ionicons name="camera" size={24} color="#666" />}
                    </TouchableOpacity>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.label}>Chap</Text>
                    <TouchableOpacity style={styles.gridUpload} onPress={() => pickPhoto(setPhotoLeft)}>
                        {photoLeft ? <Image source={{ uri: photoLeft }} style={styles.preview} /> : <Ionicons name="camera" size={24} color="#666" />}
                    </TouchableOpacity>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.label}>O'ng</Text>
                    <TouchableOpacity style={styles.gridUpload} onPress={() => pickPhoto(setPhotoRight)}>
                        {photoRight ? <Image source={{ uri: photoRight }} style={styles.preview} /> : <Ionicons name="camera" size={24} color="#666" />}
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.stepTitle}>Salon rasmlari</Text>
            <View style={styles.row}>
                <TouchableOpacity style={[styles.photoUpload, { flex: 1, height: 120 }]} onPress={() => pickPhoto(setInterior1)}>
                    {interior1 ? <Image source={{ uri: interior1 }} style={styles.preview} /> : <Ionicons name="car" size={32} color="#666" />}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.photoUpload, { flex: 1, height: 120 }]} onPress={() => pickPhoto(setInterior2)}>
                    {interior2 ? <Image source={{ uri: interior2 }} style={styles.preview} /> : <Ionicons name="car" size={32} color="#666" />}
                </TouchableOpacity>
            </View>
          </View>
        );
      case 6: // Taxi License & Finish
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Yakunlash</Text>
            <Text style={styles.label}>TAXI litsenziyasi (Agar bo'lsa)</Text>
            <TouchableOpacity style={[styles.photoUpload, { height: 150 }]} onPress={() => pickPhoto(setTaxiLicense)}>
                {taxiLicense ? <Image source={{ uri: taxiLicense }} style={styles.preview} /> : <Ionicons name="ribbon" size={48} color="#666" />}
            </TouchableOpacity>

            <View style={styles.summaryBox}>
                <Ionicons name="information-circle" size={24} color="#FFB800" />
                <Text style={styles.summaryText}>
                    Barcha ma'lumotlar kiritildi. "Tugatish" tugmasini bosganingizdan so'ng ma'lumotlar moderatorga yuboriladi.
                    {selectedPark
                      ? ` Siz "${selectedPark.name}" taksi parkiga qo'shilasiz.`
                      : ' Siz mustaqil (parksiz) haydovchi sifatida ishlaysiz.'}
                </Text>
            </View>
          </View>
        );
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFB800" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ro'yxatdan o'tish ({step}/6)</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderStep()}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity 
            style={[styles.nextBtn, loading && styles.disabledBtn]} 
            onPress={handleNext}
            disabled={loading}
        >
            <Text style={styles.nextBtnText}>
                {loading ? "Yuborilmoqda..." : step === 6 ? "Tugatish" : "Keyingisi"}
            </Text>
            {!loading && <Ionicons name="chevron-forward" size={20} color="#000" />}
        </TouchableOpacity>
      </View>

      {/* Taksi parki tanlash modali */}
      <Modal visible={showParkModal} transparent animationType="slide" onRequestClose={() => setShowParkModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowParkModal(false)}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Taksi parkini tanlang</Text>
            <Text style={styles.modalSubtitle}>Parkka a'zo bo'lsangiz bonuslar va qo'llab-quvvatlash olasiz, yoki mustaqil ishlashni davom ettiring.</Text>

            <FlatList
              data={taxiParks}
              keyExtractor={item => String(item.id)}
              style={{ maxHeight: 340 }}
              ListHeaderComponent={
                <TouchableOpacity
                  style={[styles.parkOption, !selectedPark && styles.parkOptionActive]}
                  onPress={() => { setSelectedPark(null); setShowParkModal(false); }}
                >
                  <Ionicons name="person-outline" size={20} color={!selectedPark ? '#FFB800' : '#666'} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.parkOptionTitle, !selectedPark && styles.parkOptionTitleActive]}>Mustaqil (parksiz)</Text>
                    <Text style={styles.parkOptionSub}>O'zingiz mustaqil haydovchi sifatida ishlaysiz</Text>
                  </View>
                  {!selectedPark && <Ionicons name="checkmark-circle" size={20} color="#FFB800" />}
                </TouchableOpacity>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.parkOption, selectedPark?.id === item.id && styles.parkOptionActive]}
                  onPress={() => { setSelectedPark(item); setShowParkModal(false); }}
                >
                  <Ionicons name="business-outline" size={20} color={selectedPark?.id === item.id ? '#FFB800' : '#666'} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.parkOptionTitle, selectedPark?.id === item.id && styles.parkOptionTitleActive]}>{item.name}</Text>
                    <Text style={styles.parkOptionSub}>{item.address || "Manzil ko'rsatilmagan"} · {item.driver_count} haydovchi</Text>
                  </View>
                  {selectedPark?.id === item.id && <Ionicons name="checkmark-circle" size={20} color="#FFB800" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                !loadingParks ? (
                  <Text style={styles.parkEmptyText}>Hozircha tasdiqlangan taksi parklari yo'q</Text>
                ) : null
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
  },
  agreementScroll: {
    height: 300,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 10,
  },
  agreementText: {
    color: '#CCC',
    fontSize: 14,
    lineHeight: 22,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 12,
  },
  checkboxLabel: {
    color: '#FFF',
    fontSize: 16,
    marginLeft: 10,
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#FFF',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  label: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 5,
    textTransform: 'uppercase',
  },
  photoUpload: {
    backgroundColor: '#1A1A1A',
    height: 150,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  hint: {
    color: '#666',
    fontSize: 13,
    marginBottom: 15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  gridItem: {
    width: '48%',
  },
  gridUpload: {
    backgroundColor: '#1A1A1A',
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  summaryBox: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    borderWidth: 1,
    borderColor: '#FFB80033',
  },
  summaryText: {
    color: '#FFF',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  nextBtn: {
    backgroundColor: '#FFB800',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  nextBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  parkSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  parkSelectText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  parkSelectHint: {
    color: '#777',
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderBottomWidth: 0,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 20,
    fontWeight: '500',
    lineHeight: 18,
  },
  parkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#262626',
  },
  parkOptionActive: {
    borderColor: '#FFB800',
    backgroundColor: '#2D260D',
  },
  parkOptionTitle: {
    color: '#DDD',
    fontSize: 14,
    fontWeight: '700',
  },
  parkOptionTitleActive: {
    color: '#FFF',
  },
  parkOptionSub: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  parkEmptyText: {
    color: '#555',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

