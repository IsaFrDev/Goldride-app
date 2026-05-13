import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';

let MapView: any;
let Marker: any;
let Polyline: any;
let Circle: any;
let MapCallout: any;
let PROVIDER_GOOGLE: any = 'google';

if (Platform.OS === 'web') {
  MapView = ({ children, style }: any) => (
    <View style={[style, { backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: '#666', fontWeight: '700', textAlign: 'center' }}>Xarita faqat mobil qurilmada ishlaydi (Web Mock)</Text>
      {children}
    </View>
  );
  
  // Add mock methods to MapView
  MapView.prototype = {
    fitToCoordinates: () => {},
    animateToRegion: () => {},
  };

  Marker = ({ children }: any) => (
    <View style={{ position: 'absolute', alignItems: 'center' }}>
      <Text>📍</Text>
      {children}
    </View>
  );

  Polyline = () => <View style={{ height: 2, backgroundColor: '#FFB800', position: 'absolute' }} />;
  Circle = () => <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,184,0,0.3)', position: 'absolute' }} />;
  MapCallout = ({ children }: any) => <View>{children}</View>;
} else {
  // Use require here to avoid top-level import on Web
  const Maps = require('react-native-maps');
  
  MapView = Maps.default || Maps;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
  Circle = Maps.Circle;
  MapCallout = Maps.Callout;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE || 'google';
  
  // Safety check to ensure components are not undefined
  if (!Circle) Circle = Maps.default?.Circle;
  if (!Marker) Marker = Maps.default?.Marker;
  if (!Polyline) Polyline = Maps.default?.Polyline;
  if (!MapCallout) MapCallout = Maps.default?.Callout;
}

export { Marker, Polyline, Circle, MapCallout, PROVIDER_GOOGLE };
export default MapView;
