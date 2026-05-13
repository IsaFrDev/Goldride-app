import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MapView = ({ children, style }: any) => (
  <View style={[style, styles.webMap]}>
    <Text style={styles.webText}>Xarita faqat mobil qurilmada ishlaydi (Web Mock)</Text>
    {children}
  </View>
);

export const Marker = ({ children }: any) => (
  <View style={styles.webMarker}>
    <Text>📍</Text>
    {children}
  </View>
);

export const Polyline = () => <View style={styles.webPolyline} />;
export const PROVIDER_GOOGLE = 'google';

const styles = StyleSheet.create({
  webMap: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webText: {
    color: '#666',
    fontWeight: '700',
    textAlign: 'center',
  },
  webMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  webPolyline: {
    height: 2,
    backgroundColor: '#FFB800',
    position: 'absolute',
  }
});

export default MapView;
