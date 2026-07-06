import { requireNativeModule } from 'expo-modules-core';

interface GoldrideModuleType {
  helloKotlin(name: string): string;
}

const GoldrideModule = requireNativeModule<GoldrideModuleType>('GoldrideModule');
export default GoldrideModule;
