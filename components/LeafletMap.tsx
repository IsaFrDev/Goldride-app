import React, { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';

interface LeafletMapProps {
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  showsUserLocation?: boolean;
  onRegionChangeComplete?: (region: any) => void;
  style?: any;
  children?: React.ReactNode;
}

// 3D-looking top-down taxi SVG (44x76)
const CAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 76" width="44" height="76">
  <defs>
    <linearGradient id="body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFE55C"/>
      <stop offset="55%" stop-color="#FFB800"/>
      <stop offset="100%" stop-color="#D49000"/>
    </linearGradient>
    <linearGradient id="roof" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFEE80"/>
      <stop offset="100%" stop-color="#FFB800"/>
    </linearGradient>
    <linearGradient id="glass" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#D6EEFF" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#90C8FF" stop-opacity="0.8"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.55)"/>
    </filter>
  </defs>

  <!-- Ground shadow -->
  <ellipse cx="22" cy="72" rx="15" ry="4" fill="rgba(0,0,0,0.22)"/>

  <!-- === WHEELS === -->
  <ellipse cx="7"  cy="20" rx="5.5" ry="6.5" fill="#111"/>
  <ellipse cx="37" cy="20" rx="5.5" ry="6.5" fill="#111"/>
  <ellipse cx="7"  cy="56" rx="5.5" ry="6.5" fill="#111"/>
  <ellipse cx="37" cy="56" rx="5.5" ry="6.5" fill="#111"/>
  <!-- Wheel hubs -->
  <ellipse cx="7"  cy="20" rx="3"   ry="3.5" fill="#555"/>
  <ellipse cx="37" cy="20" rx="3"   ry="3.5" fill="#555"/>
  <ellipse cx="7"  cy="56" rx="3"   ry="3.5" fill="#555"/>
  <ellipse cx="37" cy="56" rx="3"   ry="3.5" fill="#555"/>
  <circle  cx="7"  cy="20" r="1.2" fill="#888"/>
  <circle  cx="37" cy="20" r="1.2" fill="#888"/>
  <circle  cx="7"  cy="56" r="1.2" fill="#888"/>
  <circle  cx="37" cy="56" r="1.2" fill="#888"/>

  <!-- === MAIN BODY (with drop shadow filter) === -->
  <g filter="url(#shadow)">
    <!-- Body -->
    <rect x="9" y="10" width="26" height="56" rx="7" fill="url(#body)" stroke="#C08000" stroke-width="0.4"/>
    <!-- Left highlight strip (3D light side) -->
    <rect x="9" y="12" width="3.5" height="52" rx="1.5" fill="rgba(255,255,255,0.18)"/>
    <!-- Right shadow strip (3D dark side) -->
    <rect x="31.5" y="12" width="3.5" height="52" rx="1.5" fill="rgba(0,0,0,0.12)"/>

    <!-- === CABIN === -->
    <rect x="12" y="22" width="20" height="28" rx="5" fill="url(#roof)" stroke="#C08000" stroke-width="0.4"/>

    <!-- Front windshield -->
    <rect x="13" y="23" width="18" height="10" rx="3" fill="url(#glass)"/>
    <!-- Windshield inner shine -->
    <rect x="14.5" y="24.5" width="6" height="3" rx="1" fill="rgba(255,255,255,0.55)"/>

    <!-- Rear window -->
    <rect x="13" y="38" width="18" height="8"  rx="3" fill="url(#glass)" opacity="0.75"/>

    <!-- Side windows -->
    <rect x="9"  y="26" width="3.5" height="8" rx="1.5" fill="url(#glass)" opacity="0.8"/>
    <rect x="31.5" y="26" width="3.5" height="8" rx="1.5" fill="url(#glass)" opacity="0.8"/>

    <!-- Center door line -->
    <line x1="22" y1="23" x2="22" y2="49" stroke="#B07800" stroke-width="0.7" opacity="0.7"/>

    <!-- TAXI badge on roof -->
    <rect x="15.5" y="27.5" width="13" height="6" rx="2" fill="#111"/>
    <text x="22" y="32.5" text-anchor="middle" font-size="4.8"
          font-weight="900" fill="#FFB800" font-family="Arial,sans-serif"
          letter-spacing="0.5">TAXI</text>

    <!-- === BUMPERS === -->
    <!-- Front bumper -->
    <rect x="11" y="8"  width="22" height="6" rx="3" fill="#D49000"/>
    <!-- Rear bumper -->
    <rect x="11" y="62" width="22" height="6" rx="3" fill="#B07800"/>

    <!-- === LIGHTS === -->
    <!-- Headlights (yellow-white) -->
    <rect x="11" y="8"  width="9" height="5" rx="2" fill="#FFFBCC"/>
    <rect x="24" y="8"  width="9" height="5" rx="2" fill="#FFFBCC"/>
    <!-- Headlight glow -->
    <rect x="11" y="8"  width="9" height="5" rx="2" fill="rgba(255,255,200,0.6)"/>
    <rect x="24" y="8"  width="9" height="5" rx="2" fill="rgba(255,255,200,0.6)"/>

    <!-- Taillights (red) -->
    <rect x="11" y="63" width="9" height="5" rx="2" fill="#FF2222"/>
    <rect x="24" y="63" width="9" height="5" rx="2" fill="#FF2222"/>
    <!-- Taillight glow -->
    <rect x="11" y="63" width="9" height="5" rx="2" fill="rgba(255,80,80,0.5)"/>
    <rect x="24" y="63" width="9" height="5" rx="2" fill="rgba(255,80,80,0.5)"/>
  </g>
</svg>
`;

// Active driver marker (slightly larger with gold glow ring)
const ACTIVE_CAR_SVG = CAR_SVG.replace('#FFB800', '#FFC820').replace('#FFE55C', '#FFF080');

// Destination pin SVG
const DEST_PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 44" width="32" height="44">
  <defs>
    <linearGradient id="pin" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FF4444"/>
      <stop offset="100%" stop-color="#CC0000"/>
    </linearGradient>
    <filter id="ps" x="-30%" y="-10%" width="160%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.4)"/>
    </filter>
  </defs>
  <ellipse cx="16" cy="42" rx="6" ry="2.5" fill="rgba(0,0,0,0.25)"/>
  <g filter="url(#ps)">
    <path d="M16 2 C8 2 2 8 2 16 C2 26 16 40 16 40 C16 40 30 26 30 16 C30 8 24 2 16 2 Z"
          fill="url(#pin)" stroke="#AA0000" stroke-width="0.5"/>
    <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
    <circle cx="16" cy="16" r="4" fill="#FF3333"/>
  </g>
</svg>
`;

const buildHtml = (lat: number, lng: number) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#121212; }
    #map { height:100vh; width:100vw; background:#121212; }
    .leaflet-container { background:#121212 !important; }
    .leaflet-tile { filter:invert(100%) hue-rotate(180deg) brightness(96%) contrast(88%) saturate(0.9); }
    .leaflet-control-attribution { display:none; }
    .leaflet-control-zoom { display:none; }

    /* User location pulsing dot */
    .user-dot {
      width:18px; height:18px; border-radius:50%;
      background:#4285F4; border:3px solid #fff;
      box-shadow:0 0 0 0 rgba(66,133,244,0.5);
      animation:userPulse 2s infinite;
      position:relative;
    }
    .user-dot::after {
      content:''; position:absolute; inset:-6px; border-radius:50%;
      background:rgba(66,133,244,0.2); animation:userRing 2s infinite;
    }
    @keyframes userPulse {
      0%,100%{ box-shadow:0 0 0 0 rgba(66,133,244,0.4); }
      50%{ box-shadow:0 0 0 8px rgba(66,133,244,0); }
    }
    @keyframes userRing {
      0%{ transform:scale(0.8); opacity:0.6; }
      100%{ transform:scale(1.6); opacity:0; }
    }

    /* Car marker wrapper */
    .car-wrap {
      transition: transform 0.4s ease;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.55));
    }
    .car-wrap.active-car {
      filter: drop-shadow(0 0 10px rgba(255,184,0,0.7)) drop-shadow(0 4px 8px rgba(0,0,0,0.55));
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl:false, attributionControl:false })
               .setView([${lat}, ${lng}], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(map);
    window.map = map;

    // Storage
    window._driverMarkers = {};
    window._userMarker    = null;
    window._routeLine     = null;
    window._destMarker    = null;

    // SVG strings (injected from React Native via template)
    var CAR_SVG        = ${JSON.stringify(CAR_SVG)};
    var ACTIVE_CAR_SVG = ${JSON.stringify(ACTIVE_CAR_SVG)};
    var DEST_PIN_SVG   = ${JSON.stringify(DEST_PIN_SVG)};

    function makeCarIcon(rotation, isActive) {
      var svg = isActive ? ACTIVE_CAR_SVG : CAR_SVG;
      var cls = isActive ? 'car-wrap active-car' : 'car-wrap';
      return L.divIcon({
        html: '<div class="' + cls + '" style="transform:rotate(' + rotation + 'deg);width:44px;height:76px;">' + svg + '</div>',
        iconSize:   [44, 76],
        iconAnchor: [22, 38],
        className:  ''
      });
    }

    function makeUserIcon() {
      return L.divIcon({
        html: '<div class="user-dot"></div>',
        iconSize:   [18, 18],
        iconAnchor: [9, 9],
        className:  ''
      });
    }

    function makeDestIcon() {
      return L.divIcon({
        html: DEST_PIN_SVG,
        iconSize:   [32, 44],
        iconAnchor: [16, 44],
        className:  ''
      });
    }

    /* ---- Public API called via injectJavaScript ---- */

    window.updateDriverMarkers = function(drivers) {
      var newIds = {};
      drivers.forEach(function(d) { newIds[d.id] = true; });

      // Remove stale markers
      Object.keys(window._driverMarkers).forEach(function(id) {
        if (!newIds[id]) {
          map.removeLayer(window._driverMarkers[id]);
          delete window._driverMarkers[id];
        }
      });

      // Add / update
      drivers.forEach(function(d) {
        var icon = makeCarIcon(d.rotation || 0, !!d.isActive);
        if (window._driverMarkers[d.id]) {
          window._driverMarkers[d.id].setLatLng([d.lat, d.lng]);
          window._driverMarkers[d.id].setIcon(icon);
        } else {
          window._driverMarkers[d.id] = L.marker([d.lat, d.lng], {
            icon: icon, zIndexOffset: d.isActive ? 500 : 100
          }).addTo(map);
        }
      });
    };

    window.updateUserLocation = function(lat, lng) {
      if (window._userMarker) {
        window._userMarker.setLatLng([lat, lng]);
      } else {
        window._userMarker = L.marker([lat, lng], {
          icon: makeUserIcon(), zIndexOffset: 1000
        }).addTo(map);
      }
    };

    window.setRoute = function(coords) {
      if (window._routeLine) { map.removeLayer(window._routeLine); }
      if (!coords || coords.length < 2) return;
      var latlngs = coords.map(function(c){ return [c.latitude, c.longitude]; });
      window._routeLine = L.polyline(latlngs, {
        color: '#FFB800', weight: 5, opacity: 0.85,
        lineCap: 'round', lineJoin: 'round',
        dashArray: null
      }).addTo(map);
    };

    window.clearRoute = function() {
      if (window._routeLine) { map.removeLayer(window._routeLine); window._routeLine = null; }
    };

    window.setDestination = function(lat, lng) {
      if (window._destMarker) { map.removeLayer(window._destMarker); }
      window._destMarker = L.marker([lat, lng], {
        icon: makeDestIcon(), zIndexOffset: 900
      }).addTo(map);
    };

    window.clearDestination = function() {
      if (window._destMarker) { map.removeLayer(window._destMarker); window._destMarker = null; }
    };

    window.clearAllDrivers = function() {
      Object.values(window._driverMarkers).forEach(function(m){ map.removeLayer(m); });
      window._driverMarkers = {};
    };

    // Map move events → React Native
    map.on('moveend', function() {
      var c = map.getCenter();
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'regionChange', latitude: c.lat, longitude: c.lng
      }));
    });

    window.mapReady = true;
  </script>
</body>
</html>
`;

const LeafletMap = forwardRef(({
  initialRegion,
  showsUserLocation,
  onRegionChangeComplete,
  style,
  children
}: LeafletMapProps, ref) => {
  const webViewRef = useRef<WebView>(null);

  const inject = useCallback((js: string) => {
    webViewRef.current?.injectJavaScript(js + ';true;');
  }, []);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: any) => {
      inject(`window.map && window.map.flyTo([${region.latitude},${region.longitude}],15,{duration:1})`);
    },
    fitToCoordinates: (coords: any[]) => {
      const b = JSON.stringify(coords.map((c: any) => [c.latitude, c.longitude]));
      inject(`window.map && window.map.fitBounds(${b},{padding:[80,60]})`);
    },
    updateDrivers: (drivers: Array<{id: string|number, lat: number, lng: number, rotation?: number, isActive?: boolean}>) => {
      inject(`window.updateDriverMarkers && window.updateDriverMarkers(${JSON.stringify(drivers)})`);
    },
    updateUserLocation: (lat: number, lng: number) => {
      inject(`window.updateUserLocation && window.updateUserLocation(${lat},${lng})`);
    },
    setRoute: (coords: Array<{latitude: number, longitude: number}>) => {
      inject(`window.setRoute && window.setRoute(${JSON.stringify(coords)})`);
    },
    clearRoute: () => {
      inject(`window.clearRoute && window.clearRoute()`);
    },
    setDestination: (lat: number, lng: number) => {
      inject(`window.setDestination && window.setDestination(${lat},${lng})`);
    },
    clearDestination: () => {
      inject(`window.clearDestination && window.clearDestination()`);
    },
    clearAllDrivers: () => {
      inject(`window.clearAllDrivers && window.clearAllDrivers()`);
    },
  }));

  const lat = initialRegion?.latitude  ?? 41.2995;
  const lng = initialRegion?.longitude ?? 69.2401;

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: buildHtml(lat, lng) }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'regionChange' && onRegionChangeComplete) {
              onRegionChangeComplete({
                latitude: data.latitude,
                longitude: data.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              });
            }
          } catch {}
        }}
        style={styles.webview}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
      />
      {/* Children rendered as RN overlay (for components that don't need map integration) */}
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  webview:   { flex: 1, backgroundColor: '#121212' },
});

export default LeafletMap;
