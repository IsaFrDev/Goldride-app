import { requireNativeModule } from 'expo-modules-core';

interface GoldrideModuleType {
  helloKotlin(name: string): string;
}

let GoldrideModule: GoldrideModuleType;

try {
  GoldrideModule = requireNativeModule<GoldrideModuleType>('GoldrideModule');
} catch (e) {
  GoldrideModule = {
    helloKotlin: (name: string) => `[Mock/Expo Go] Salom ${name}! (Kotlin module is mocked in Expo Go)`
  };
}

export default GoldrideModule;
