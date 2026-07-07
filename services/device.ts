import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// Qurilma uchun barqaror unikal ID. Ilova birinchi ishga tushganda yaratiladi va
// AsyncStorage'da saqlanadi. Takroriy akkauntni aniqlash (anti-fraud) uchun
// har bir so'rovda X-Device-Id header sifatida yuboriladi.
const DEVICE_ID_KEY = 'goldride_device_id';
let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = Crypto.randomUUID();
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    cachedDeviceId = id;
    return id;
  } catch {
    // Saqlab bo'lmasa ham ilova ishlashi kerak — bo'sh qaytaramiz
    return '';
  }
}
