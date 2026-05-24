import React from 'react';
import { Platform, View, Text } from 'react-native';
import LeafletMap from './LeafletMap';

let MapView: any = LeafletMap;
let Marker: any;
let Polyline: any;
let Circle: any;
let MapCallout: any;
let PROVIDER_GOOGLE: any = 'google';

if (Platform.OS === 'web') {
  // ... (keep web mock as is if needed, or use Leaflet too)
  MapView = ({ children, style }: any) => (
    <View style={[style, { backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: '#666', fontWeight: '700', textAlign: 'center' }}>Xarita faqat mobil qurilmada ishlaydi (Web Mock)</Text>
      {children}
    </View>
  );
  
  Marker = ({ children }: any) => (
    <View style={{ position: 'absolute', alignItems: 'center' }}>
      <Text>📍</Text>
      {children}
    </View>
  );
  Polyline = () => <View />;
  Circle = () => <View />;
  MapCallout = ({ children }: any) => <View>{children}</View>;
} else {
  // Mobile: LeafletMap handles all markers via injectJavaScript.
  // These stubs exist only for JSX compatibility — actual rendering is in LeafletMap.tsx.
  Marker   = () => null;
  Polyline = () => null;
  Circle   = () => null;
  MapCallout = ({ children }: any) => <View>{children}</View>;
}

export { Marker, Polyline, Circle, MapCallout, PROVIDER_GOOGLE };
export default MapView;
