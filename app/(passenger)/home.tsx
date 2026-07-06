import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  TextInput, Alert, Animated, ScrollView, ActivityIndicator,
  Share, Linking, Image as RNImage, Modal
} from 'react-native';
import Svg, { Rect, G, Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../../services/i18n';
import { ridesAPI, authAPI, savedLocationsAPI } from '../../services/api';
import { socketService } from '../../services/socket';
import { useRideStore } from '../../stores/rideStore';
import { useAuthStore } from '../../stores/authStore';
import { useRecentSearchesStore } from '../../stores/recentSearchesStore';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from '../../components/MapComponents';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { soundService } from '../../services/sound';


const { width, height } = Dimensions.get('window');

// Realistic Car Image Component (Top-down view)
const CarIcon = ({ color = "#FFB800" }) => (
  <View style={{ width: 36, height: 72, justifyContent: 'center', alignItems: 'center' }}>
    <RNImage 
      source={require('../../assets/taxi.png')} 
      style={{ width: '100%', height: '100%', resizeMode: 'contain' }} 
    />
  </View>
);

// Ba'zi qurilmalarda Android'ning tizim ichidagi Geocoder xizmati mavjud
// emas ("UNAVAILABLE" xatosi beradi — Google Play Services yoki tarmoq bilan
// bog'liq). Bunday holatda ochiq OpenStreetMap Nominatim xizmatiga o'tamiz.
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const reverse = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const r = reverse?.[0];
    if (r) {
      const name = r.name && !r.name.includes('+') ? r.name : null;
      const district = r.district || r.subregion;
      const address = [name || r.street, district].filter(Boolean).join(', ');
      if (address) return address;
    }
  } catch (e) {
    console.log('Native reverse geocode mavjud emas, Nominatim orqali urinib ko\'ramiz:', e);
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=uz`,
      { headers: { 'User-Agent': 'GoldrideTaxiApp/1.0 (dev@goldride.uz)' } }
    );
    const data = await res.json();
    const a = data?.address;
    const name = a?.road || a?.suburb || a?.neighbourhood || a?.amenity;
    const district = a?.city_district || a?.district || a?.city || a?.town;
    const address = [name, district].filter(Boolean).join(', ');
    if (address) return address;
    if (data?.display_name) return data.display_name.split(',').slice(0, 2).join(',').trim();
  } catch (e) {
    console.log('Nominatim reverse geocode ham ishlamadi:', e);
  }

  return null;
}

// Helper for rotation
function getBearing(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLon = (lng2 - lng1) * (Math.PI / 180);
  const y = Math.sin(dLon) * Math.cos(lat2 * (Math.PI / 180));
  const x = Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
            Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * (180 / Math.PI);
  return (brng + 360) % 360;
}

// Moving Marker Component
const MovingMarker = ({ driver }: { driver: any }) => {
  const [rotation, setRotation] = useState(0);
  const prevCoord = useRef({ lat: driver.current_lat, lng: driver.current_lng });

  useEffect(() => {
    if (prevCoord.current.lat !== driver.current_lat || prevCoord.current.lng !== driver.current_lng) {
      const bearing = getBearing(
        prevCoord.current.lat, 
        prevCoord.current.lng, 
        driver.current_lat, 
        driver.current_lng
      );
      if (bearing !== 0 && Math.abs(bearing - rotation) > 5) {
        setRotation(bearing);
      }
      prevCoord.current = { lat: driver.current_lat, lng: driver.current_lng };
    }
  }, [driver.current_lat, driver.current_lng]);

  return (
    <Marker 
      coordinate={{ latitude: driver.current_lat, longitude: driver.current_lng }}
      rotation={rotation}
      flat={true}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <CarIcon color={driver.is_virtual ? "#FFD700" : "#FFB800"} />
    </Marker>
  );
};

const TASHKENT = {
  latitude: 41.2995,
  longitude: 69.2401,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function PassengerHomeScreen() {
  const { user, isAuthenticated, setUser, language } = useAuthStore();
  const ride = useRideStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Basic States
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [carClass, setCarClass] = useState<'economy' | 'comfort' | 'electro' | 'business'>('economy');
  const [useBonus, setUseBonus] = useState(false);
  const [bonusPercent, setBonusPercent] = useState(0); // 0, 50, or 100
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [lastRideId, setLastRideId] = useState<number | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([]);
  // Fetch only REAL drivers from the backend
  const fetchNearbyDrivers = async (lat: number, lng: number) => {
    try {
      const resp = await ridesAPI.getNearbyDrivers(lat, lng);
      setNearbyDrivers(resp.data);
    } catch (e) { console.error('Failed to fetch real drivers:', e); }
  };
  const [displayedDrivers, setDisplayedDrivers] = useState<any[]>([]);
  const [savedLocations, setSavedLocations] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeInput, setActiveInput] = useState<'pickup' | 'dest'>('dest');
  
  // UX & Routing States
  const [uiStep, setUiStep] = useState<'idle' | 'searching_dest' | 'confirm_pickup' | 'estimate' | 'ride_active'>('idle');
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [estimate, setEstimate] = useState<any>(null);
  const [shareType, setShareType] = useState<'solo' | 'shared_1' | 'shared_2'>('solo');
  
  const { recent, addSearch } = useRecentSearchesStore();
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pinCode] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());

  // Multi-stop and Scheduled
  const [stops, setStops] = useState<any[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);

  // Mandatory Agreement Modal (for existing users)
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. Permissions & Initial Location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Xatolik', 'Joylashuv ruxsati kerak');
        return;
      }

      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc);
        
        // Set basic coordinates first so it's not null
        ride.setPickup({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          address: 'Hozirgi joyingiz'
        });

        // Try to get address
        const address = await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
        if (address) {
          setPickupAddress(address);
          ride.setPickup({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            address: address
          });
        }
      } catch (error) {
        console.log('Passenger location fetch failed:', error);
      }
      
      // 0. Check for Active Ride and Agreement status on Mount
      if (isAuthenticated) {
        if (user && !user.has_agreed_to_terms) {
            setShowAgreementModal(true);
        }
        try {
          const resp = await ridesAPI.getActiveRide();
          if (resp.data) {
            const activeReq = resp.data;
            
            // Only auto-recover if the ride is already in progress or matched
            // Ignoring 'pending' on mount to avoid the "auto-request" confusion
            const recoverableStatuses = ['accepted', 'matched', 'started', 'arrived', 'picked_up', 'on_the_way'];
            
            if (recoverableStatuses.includes(activeReq.status)) {
              ride.setRide(activeReq.ride?.id || 0, activeReq.id);
              ride.setStatus(activeReq.status);
              ride.setPickup({ lat: activeReq.pickup_lat, lng: activeReq.pickup_lng, address: activeReq.pickup_address });
              ride.setDestination({ lat: activeReq.drop_lat, lng: activeReq.drop_lng, address: activeReq.drop_address });
              
              if (activeReq.ride?.driver) {
                const d = activeReq.ride.driver;
                ride.setDriver({
                  id: d.id,
                  name: `${d.user?.first_name} ${d.user?.last_name}`,
                  phone: d.user?.phone,
                  rating: d.rating,
                  vehicle: d.vehicle
                });
                if (d.current_lat) ride.setDriverLocation(d.current_lat, d.current_lng);
              }
              setUiStep('ride_active');
              fetchRouteOnly(activeReq.pickup_lat, activeReq.pickup_lng, activeReq.drop_lat, activeReq.drop_lng);
              if (activeReq.ride?.id) {
                socketService.send('join_ride', { ride_id: activeReq.ride.id });
              }
            } else if (activeReq.status === 'pending') {
              console.log('Found pending request on mount, but skipping auto-recovery to prevent user confusion.');
              // We could optionally cancel it here if it's too old
            }
          }
        } catch (e: any) {
          if (e.response?.status !== 401) {
            console.log('Active ride check error:', e);
          }
        }
      }
      // Fetch saved locations
      if (isAuthenticated) {
        try {
          const locsResp = await savedLocationsAPI.getAll();
          if (locsResp.data && locsResp.data.results) {
            setSavedLocations(locsResp.data.results);
          }
        } catch (e) {}
      }
    })();
  }, [isAuthenticated]);

  const handleAgreeToTerms = async () => {
    try {
      await authAPI.updateProfile({ has_agreed_to_terms: true });
      setUser({ ...user!, has_agreed_to_terms: true });
      setShowAgreementModal(false);
    } catch (err) {
      console.error('Failed to agree to terms:', err);
      Alert.alert('Xatolik', 'Internet bilan muammo yuz berdi');
    }
  };

  const renderAgreementModal = () => (
    <Modal visible={showAgreementModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.agreementModalContent}>
          <View style={styles.agreementHeader}>
             <Ionicons name="document-text" size={32} color="#FFB800" />
             <Text style={styles.agreementTitle}>Ommaviy Oferta</Text>
          </View>
          <Text style={styles.agreementIntro}>
            Platformamizdan xavfsiz foydalanish uchun shartlarimiz bilan tanishib chiqishingizni so'raymiz.
          </Text>
          <ScrollView style={styles.agreementScrollBox}>
            <Text style={styles.agreementBodyText}>
              1. Umumiy qoidalar...{"\n"}
              Goldride platformasi haydovchi va yo'lovchi o'rtasida vositachilik xizmatini ko'rsatadi.{"\n\n"}
              2. Yo'lovchi majburiyatlari:{"\n"}
              - Haydovchi va avtomobilga nisbatan hurmat bilan munosabatda bo'lish.{"\n"}
              - Safar yakunida to'lovni o'z vaqtida amalga oshirish.{"\n\n"}
              3. Maxfiylik:{"\n"}
              Sizning ma'lumotlaringiz uchinchi shaxslarga berilmaydi.
            </Text>
          </ScrollView>
          <TouchableOpacity style={styles.agreeBtn} onPress={handleAgreeToTerms}>
             <Text style={styles.agreeBtnText}>Roziman va Davom etaman</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // 2. Nearby Drivers Polling
  useEffect(() => {
    const fetchNearby = async () => {
      if (uiStep !== 'idle' && uiStep !== 'searching_dest') return;
      try {
        const response = await authAPI.getNearbyDrivers();
        const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
        setNearbyDrivers(data);
        setDisplayedDrivers(data);
      } catch (error) {}
    };

    fetchNearby();
    const interval = setInterval(fetchNearby, uiStep === 'idle' ? 5000 : 15000);
    return () => clearInterval(interval);
  }, [uiStep]);

  // 3. Ride Status WebSocket Updates
  useEffect(() => {
    const unsubStatus = socketService.on('ride_status_update', (data) => {
      if (data.status) {
        ride.setStatus(data.status);
        if (['accepted', 'matched', 'driver_found', 'arrived', 'started', 'picked_up', 'external_pending'].includes(data.status)) {
          setUiStep('ride_active');
        }
        
        if (data.status === 'cancelled' || data.status === 'expired') {
          handleCancelRide();
          Alert.alert('Eslatma', 'Safar bekor qilindi yoki haydovchi topilmadi');
        } else if (data.status === 'completed') {
          setLastRideId(ride.rideId);
          ride.resetRide();
          setUiStep('idle');
          setShowRatingModal(true);
          // Alert.alert(t('common.success'), t('ride.completed'));
        } else if (data.status === 'arrived' || data.status === 'external_arrived') {
          soundService.playDriverArrived();
          if (data.status === 'external_arrived') {
            Alert.alert('Xabar', data.message || 'Haydovchi yetib keldi!');
          }
        }

        if (data.status === 'external_pending') {
          // Calculate eta date if eta_minutes is provided
          let etaStr = null;
          if (data.eta_minutes) {
            const date = new Date();
            date.setMinutes(date.getMinutes() + data.eta_minutes);
            etaStr = date.toISOString();
          }
          ride.setExternalDispatch(data.provider || 'Hamkor', data.new_price, etaStr);
        }
      }
    });

    const unsubDriverLoc = socketService.on('driver_location', (data) => {
      ride.setDriverLocation(data.lat, data.lng);
    });

    const unsubAccepted = socketService.on('ride_accepted', (data) => {
      if (data.ride) {
          const r = data.ride;
          ride.setStatus(r.status);
          setUiStep('ride_active');
          soundService.playNewOrder(); // Notify passenger that driver is found
          
          if (r.driver) {
              const d = r.driver;
              ride.setDriver({
                  id: d.id,
                  name: `${d.user?.first_name} ${d.user?.last_name}`,
                  phone: d.user?.phone,
                  rating: d.rating,
                  vehicle: d.vehicle
              });
              if (d.current_lat) ride.setDriverLocation(d.current_lat, d.current_lng);
          }
      } else if (data.driver_id) {
          // Fallback for old format
          ride.setStatus('driver_found');
          ride.setDriver({
              id: data.driver_id,
              name: data.driver_name,
              phone: data.driver_phone,
              rating: 5.0,
              vehicle: { make: 'Mashina', model: '', color: '', plate_number: '' }
          });
      }
    });

    return () => {
      unsubStatus();
      unsubDriverLoc();
      unsubAccepted();
    };
  }, []);

  // Poll for status as absolute fallback (much slower)
  useEffect(() => {
    let interval: ReturnType<typeof setTimeout>;
    if (ride.rideRequestId && (ride.status === 'pending' || ride.status === 'accepted' || ride.status === 'driver_found' || ride.status === 'arrived' || ride.status === 'picked_up')) {
      const checkStatus = async () => {
        try {
          const resp = await ridesAPI.getRequestStatus(ride.rideRequestId!);
          const data = resp.data;
          if (data.status !== ride.status) {
            ride.setStatus(data.status);
          }
        } catch (e) {}
      };
      interval = setInterval(checkStatus, 20000); // 20s fallback
    }
    return () => interval && clearInterval(interval);
  }, [ride.rideRequestId, ride.status]);

  // 4. Map: sync nearby drivers → markers (state orqali render qilinadi)
  // updateDrivers/clearAllDrivers/setRoute metodlari custom WebGL map uchun edi,
  // lekin react-native-maps da ular yo'q — state orqali hal qilamiz (pastdagi JSX)
  // Shuning uchun bu effectlar faqat optional chaining bilan chaqiriladi.
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.updateDrivers?.([]);      // faqat custom map uchun
    mapRef.current.clearAllDrivers?.();      // faqat custom map uchun
  }, [displayedDrivers, uiStep]);

  // 4b. Map: sync active driver location (state orqali)
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.updateDrivers?.([]);      // faqat custom map uchun
  }, [ride.driverLocation, uiStep]);

  // 4c. Map: user location — showsUserLocation prop orqali hal qilinadi
  useEffect(() => {
    if (!mapRef.current || !location) return;
    mapRef.current.updateUserLocation?.(location.coords.latitude, location.coords.longitude);
  }, [location]);

  // 4d. Map: route polyline (state orqali render qilinadi)
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setRoute?.(routeCoords);
    if (routeCoords.length === 0) mapRef.current.clearRoute?.();
  }, [routeCoords]);

  // 4e. Map: destination marker (state orqali render qilinadi)
  useEffect(() => {
    if (!mapRef.current) return;
    if (ride.destination?.lat) {
      mapRef.current.setDestination?.(ride.destination?.lat, ride.destination?.lng);
    } else {
      mapRef.current.clearDestination?.();
    }
  }, [ride.destination, uiStep]);

  // 4f. animations
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: showSearch ? 1 : 0,
      useNativeDriver: true,
      tension: 50, friction: 10,
    }).start();
  }, [showSearch]);

  // 5. Search Logic
  const handleAddressChange = (text: string) => {
    setDestAddress(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (text.trim().length > 0) {
      searchTimeout.current = setTimeout(() => searchPlaces(text), 300);
    } else {
      setSearchResults([]);
    }
  };

  const searchPlaces = async (query: string) => {
    setIsSearching(true);
    
    // 1. Try Yandex Maps via SerpAPI (user provided key)
    try {
      const apiKey = "9d529bde53a19b2aef7e56a9ba592f1a7c006549f0eec1a1f6f08939b63d0bc2";
      const lat = location?.coords.latitude || TASHKENT.latitude;
      const lon = location?.coords.longitude || TASHKENT.longitude;
      const url = `https://serpapi.com/search.json?engine=yandex_maps&q=${encodeURIComponent(query)}&ll=@${lat},${lon},14z&api_key=${apiKey}`;
      
      const resp = await fetch(url);
      const data = await resp.json();
      
      if (data.local_results && data.local_results.length > 0) {
        setSearchResults(data.local_results.map((item: any) => ({
          lat: item.gps_coordinates.latitude,
          lng: item.gps_coordinates.longitude,
          name: item.title,
          address: item.address || 'Toshkent, O\'zbekiston',
          type: 'place'
        })));
        setIsSearching(false);
        return;
      }
    } catch (e) {
      console.log('SerpAPI Yandex Maps Search failed, trying Komoot Photon fallback:', e);
    }

    // 2. Fallback to Komoot Photon API
    try {
      const lat = location?.coords.latitude || TASHKENT.latitude;
      const lon = location?.coords.longitude || TASHKENT.longitude;
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=${lat}&lon=${lon}&limit=15`;
      const resp = await fetch(url);
      const data = await resp.json();
      
      if (data.features) {
        const localized = data.features.filter((f: any) => {
          const c = f.geometry.coordinates;
          return c[1] > 37 && c[1] < 46 && c[0] > 55 && c[0] < 75;
        });

        setSearchResults(localized.map((f: any) => {
          const p = f.properties;
          const coords = f.geometry.coordinates;
          
          let name = p.name || p.street || p.city || 'Noma\'lum joy';
          let addressParts = [p.street, p.house_number, p.district || p.locality, p.city].filter(Boolean);
          
          return {
            lat: coords[1],
            lng: coords[0],
            name: name,
            address: addressParts.join(', ') || p.country || 'O\'zbekiston',
            type: p.osm_value || 'place',
            key: p.osm_key
          };
        }));
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.log('Photon search error:', e);
      setSearchResults([]);
    } finally { 
      setIsSearching(false); 
    }
  };

  const getIconForType = (type: string, key?: string) => {
    if (type === 'bank' || type === 'atm') return 'cash-outline';
    if (type === 'cafe' || type === 'restaurant' || type === 'fast_food') return 'restaurant-outline';
    if (type === 'hotel' || type === 'apartment') return 'bed-outline';
    if (type === 'mall' || type === 'supermarket' || type === 'shop') return 'cart-outline';
    if (type === 'hospital' || type === 'clinic') return 'medkit-outline';
    if (type === 'school' || type === 'university') return 'school-outline';
    return 'location-outline';
  };

  const onSelectPlace = (place: any) => {
    if (activeInput === 'dest') {
        setDestAddress(place.name);
        ride.setDestination({ lat: place.lat, lng: place.lng, address: place.address || place.name });
        addSearch({ name: place.name, address: place.address || place.name, lat: place.lat, lng: place.lng });
        
        setSearchResults([]);
        setShowSearch(false);
        
        // Skip the confirm_pickup step and immediately fetch route and price estimate
        setTimeout(() => {
          getRouteAndEstimate({ lat: place.lat, lng: place.lng, address: place.address || place.name });
        }, 100);
    } else {
        // Adding a stop
        setStops([...stops, { ...place, id: Date.now() }]);
        setActiveInput('dest');
        setSearchResults([]);
    }
  };

  // 6. Routing & Estimate
  const getRouteAndEstimate = async (forcedDest?: any) => {
    if (loading) return;
    const dest = forcedDest || ride.destination;
    if (!ride.pickup?.lat || !dest?.lat) {
      Alert.alert('Eslatma', 'Olib ketish nuqtasi yoki manzil topilmadi. Iltimos, xaritani surib ko\'ring.');
      return;
    }
    setLoading(true);
    try {
      console.log('Fetching OSRM for:', ride.pickup, dest);
      const pLat = parseFloat(ride.pickup!.lat.toFixed(6));
      const pLng = parseFloat(ride.pickup!.lng.toFixed(6));
      const dLat = parseFloat(dest.lat.toFixed(6));
      const dLng = parseFloat(dest.lng.toFixed(6));
      
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?overview=full&geometries=geojson`;
      console.log('OSRM URL:', osrmUrl);
      const osrmResp = await fetch(osrmUrl);
      const osrmData = await osrmResp.json();
      console.log('OSRM Resp Status:', osrmResp.status, 'OSRM Data:', osrmData?.code);
      
      if (osrmData.routes?.length > 0) {
        setRouteCoords(osrmData.routes[0].geometry.coordinates.map((c: any) => ({ latitude: c[1], longitude: c[0] })));
        
        const estResp = await ridesAPI.estimatePrice({
          pickup_lat: ride.pickup.lat, pickup_lng: ride.pickup.lng,
          drop_lat: dest.lat, drop_lng: dest.lng,
          is_scheduled: isScheduled,
          stops_count: stops.length,
        });
        setEstimate(estResp.data);
        ride.setEstimate(estResp.data);
        setUiStep('estimate');
        
        // Fit map
        if (mapRef.current) {
          const roundedCoords = osrmData.routes[0].geometry.coordinates.map((c: any) => ({ 
            latitude: parseFloat(c[1].toFixed(6)), 
            longitude: parseFloat(c[0].toFixed(6)) 
          }));
          mapRef.current.fitToCoordinates(
            roundedCoords,
            { edgePadding: { top: 100, right: 50, bottom: 350, left: 50 }, animated: true }
          );
        }
      } else {
        // Fallback: Use straight line if OSRM fails
        console.warn('OSRM No Route fallback');
        setRouteCoords([
          { latitude: ride.pickup.lat, longitude: ride.pickup.lng },
          { latitude: ride.destination?.lat ?? 0, longitude: ride.destination?.lng ?? 0 }
        ]);
        
        const estResp = await ridesAPI.estimatePrice({
          pickup_lat: ride.pickup.lat, pickup_lng: ride.pickup.lng,
          drop_lat: dest.lat, drop_lng: dest.lng,
        });
        setEstimate(estResp.data);
        ride.setEstimate(estResp.data);
        setUiStep('estimate');
      }
    } catch (e) {
        console.error('OSRM/Estimate Error:', e);
        Alert.alert('Xatolik', 'Marshrutni hisoblashda xatolik yuz berdi. Internetingizni tekshiring.');
    } finally { setLoading(false); }
  };

  const onRegionChangeComplete = async (region: any) => {
    // We allow moving the pickup pin in both idle and confirm_pickup modes
    if (uiStep === 'idle' || uiStep === 'confirm_pickup') {
      setIsMapMoving(false);
      const address = await reverseGeocode(region.latitude, region.longitude);
      const addr = address || 'Karta orqali tanlangan joy';
      setPickupAddress(addr);
      ride.setPickup({ lat: region.latitude, lng: region.longitude, address: addr });
    }
  };

  const handleRequestRide = async () => {
    if (!ride.pickup?.lat || !ride.destination?.lat) return;
    if (!isAuthenticated) { router.push('/(auth)/phone'); return; }
    setLoading(true);
    try {
      const resp = await ridesAPI.requestRide({
        pickup_lat: ride.pickup.lat, pickup_lng: ride.pickup.lng, pickup_address: pickupAddress,
        drop_lat: ride.destination.lat, drop_lng: ride.destination.lng, drop_address: destAddress,
        car_category: carClass,
        is_shared: shareType !== 'solo',
        share_type: shareType,
        use_bonus: useBonus,
        bonus_percent: bonusPercent,
        is_scheduled: isScheduled,
        scheduled_time: isScheduled ? scheduledTime?.toISOString() : undefined,
        stops: stops.map((s, idx) => ({ ...s, order: idx + 1 }))
      });
      ride.setRide(resp.data.ride?.id || 0, resp.data.id);
      ride.setStatus(resp.data.status);
      setUiStep('ride_active');
      if (resp.data.ride?.id) {
        socketService.send('join_ride', { ride_id: resp.data.ride.id });
      }
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail || '';
      if (errorMsg.includes('faol safar so\'rovingiz mavjud')) {
        // Automatically try to recover the active ride
        try {
          const activeResp = await ridesAPI.getActiveRide();
          if (activeResp.data?.active) {
             const activeReq = activeResp.data.request;
             ride.setRide(activeReq.ride?.id || 0, activeReq.id);
             ride.setStatus(activeReq.status);
             setUiStep('ride_active');
             return;
          }
        } catch (recoverErr) {}
      }
      Alert.alert('Xatolik', errorMsg || 'Buyurtma berishda xatolik');
    } finally { setLoading(false); }
  };

  const fetchRouteOnly = async (pLat: number, pLng: number, dLat: number, dLng: number) => {
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pLng.toFixed(6)},${pLat.toFixed(6)};${dLng.toFixed(6)},${dLat.toFixed(6)}?overview=full&geometries=geojson`;
      const osrmResp = await fetch(osrmUrl);
      const osrmData = await osrmResp.json();
      if (osrmData.routes?.length > 0) {
        const coords = osrmData.routes[0].geometry.coordinates.map((c: any) => ({ 
          latitude: parseFloat(c[1].toFixed(6)), 
          longitude: parseFloat(c[0].toFixed(6)) 
        }));
        setRouteCoords(coords);
        if (mapRef.current) {
          mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 100, right: 50, bottom: 350, left: 50 }, animated: true });
        }
      }
    } catch (e) { console.error('FetchRouteOnly error:', e); }
  };

  const handleCancelRide = async () => {
    try {
      if (ride.rideId) await ridesAPI.cancelRide(ride.rideId);
    } catch (e) {}
    ride.resetRide();
    setEstimate(null);
    setRouteCoords([]);
    setUiStep('idle');
  };

  const formatPrice = (p: number) => p.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const getArrivalTime = () => {
    if (!estimate?.estimated_duration_min) return '';
    const now = new Date();
    now.setMinutes(now.getMinutes() + estimate.estimated_duration_min);
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleSOS = () => {
    if (!location) return;
    
    Alert.alert(
      'Fevqulodda yordam (SOS)',
      'Haqiqatdan ham yordam kerakmi? Bu signal admin panelga va xavfsizlik xizmatiga yuboriladi.',
      [
        { text: 'Bekor qilish', style: 'cancel' },
        { 
          text: 'HA, YORDAM KERAK', 
          style: 'destructive',
          onPress: async () => {
            try {
              await ridesAPI.triggerSOS({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                ride_id: ride.rideId || undefined
              });
              Alert.alert('SOS', 'Signal yuborildi. Yordam yo\'lda. Iltimos xotirjamlikni saqlang.');
            } catch (e) {
              Alert.alert('Xatolik', 'Signal yuborishda muammo bo\'ldi.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {renderAgreementModal()}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={location ? {
          latitude: location.coords.latitude, longitude: location.coords.longitude,
          latitudeDelta: 0.02, longitudeDelta: 0.02
        } : TASHKENT}
        showsUserLocation={uiStep !== 'confirm_pickup'}
        onRegionChange={() => (uiStep === 'confirm_pickup' || uiStep === 'idle') && setIsMapMoving(true)}
        onRegionChangeComplete={onRegionChangeComplete}
      >
        {(uiStep === 'estimate' || uiStep === 'ride_active') && routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor="#FFB800" />
        )}
        
        {(uiStep === 'estimate' || uiStep === 'ride_active') && ride.destination && (
          <Marker 
            coordinate={{ latitude: ride.destination.lat, longitude: ride.destination.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.destMarkerContainer}>
              <View style={styles.arrivalTooltip}>
                <Text style={styles.arrivalTooltipText}>yetib borish {getArrivalTime()}</Text>
              </View>
              <View style={styles.destDotOuter}>
                <View style={styles.destDotInner} />
              </View>
            </View>
          </Marker>
        )}

        {uiStep === 'estimate' && estimate && routeCoords.length > 5 && (
          <Marker 
            coordinate={routeCoords[Math.floor(routeCoords.length / 5)]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.etaRouteBadge}>
              <Text style={styles.etaRouteText}>{estimate.estimated_duration_min} min</Text>
            </View>
          </Marker>
        )}

        {uiStep === 'ride_active' && ride.driverLocation && (
          <MovingMarker driver={{ 
            id: 'active-driver', 
            current_lat: ride.driverLocation.lat, 
            current_lng: ride.driverLocation.lng,
            is_virtual: false 
          }} />
        )}

        {uiStep === 'idle' && displayedDrivers.map(d => (
          <MovingMarker key={d.id} driver={d} />
        ))}
      </MapView>

      {/* Rating Modal */}
      <Modal visible={showRatingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.ratingCard}>
            <View style={styles.ratingHeader}>
              <Text style={styles.ratingTitle}>Safar yakunlandi!</Text>
              <Text style={styles.ratingSubtitle}>Haydovchini baholang</Text>
            </View>
            
            <View style={styles.starsRow}>
              {[1,2,3,4,5].map(s => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Ionicons name={s <= rating ? "star" : "star-outline"} size={40} color="#FFB800" />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.ratingSubmitBtn}
              onPress={async () => {
                if (lastRideId) {
                  try {
                    await ridesAPI.rateRide(lastRideId, rating);
                  } catch (e) {}
                }
                setShowRatingModal(false);
                setRating(5);
              }}
            >
              <Text style={styles.ratingSubmitText}>Baholash</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 15 }} onPress={() => setShowRatingModal(false)}>
              <Text style={{ color: '#64748B', fontWeight: '600' }}>O'tkazib yuborish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SOS Button */}
      <TouchableOpacity 
        style={styles.sosBtn} 
        onPress={handleSOS}
      >
        <Ionicons name="warning" size={20} color="#FFF" />
        <Text style={styles.sosBtnText}>SOS</Text>
      </TouchableOpacity>

      {/* Center Pin for Confirmation */}
      {(uiStep === 'confirm_pickup' || uiStep === 'idle') && (
        <View style={styles.pinOverlay} pointerEvents="none">
          <Animated.View style={[styles.pinContainer, isMapMoving && { transform: [{ translateY: -10 }] }]}>
            <Ionicons name="location" size={44} color="#FFB800" />
            <View style={styles.pinShadow} />
          </Animated.View>
        </View>
      )}

      {/* Header */}
      {uiStep === 'idle' && (
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 50) }]}>
            <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(passenger)/profile')}>
                <Ionicons name="person-circle" size={36} color="#FFB800" />
                <Text style={styles.profileName}>{isAuthenticated ? (user?.first_name || 'Foydalanuvchi') : 'Mehmon'}</Text>
            </TouchableOpacity>
        </View>
      )}

      {/* UI Panels */}
      <View style={styles.bottomSection}>
        {uiStep === 'idle' && (
          <View style={styles.idlePanel}>
            {/* Ikki input: yuqorida "Qayerdasiz", pastda "Qayerga borasiz?" */}
            <View style={styles.twoInputBox}>
              {/* Yuqori: joriy joylashuv */}
              <TouchableOpacity
                style={styles.twoInputRow}
                onPress={() => {
                  setActiveInput('pickup');
                  setShowSearch(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.twoInputDot}>
                  <View style={styles.twoInputDotInner} />
                </View>
                <Text style={styles.twoInputPickupText} numberOfLines={1}>
                  {pickupAddress || 'Hozirgi joylashuvingiz'}
                </Text>
              </TouchableOpacity>

              <View style={styles.twoInputDivider} />

              {/* Quyi: manzil qidirish */}
              <TouchableOpacity
                style={styles.twoInputRow}
                onPress={() => {
                  setActiveInput('dest');
                  setShowSearch(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.twoInputDot, { backgroundColor: '#FFB800' }]}>
                  <View style={[styles.twoInputDotInner, { backgroundColor: '#000' }]} />
                </View>
                <Text style={[styles.twoInputPickupText, { color: destAddress ? '#FFF' : '#666' }]} numberOfLines={1}>
                  {destAddress || t('home.where_to')}
                </Text>
                {!destAddress && (
                  <Ionicons name="search" size={18} color="#444" style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            </View>

            {/* Oxirgi qidiruvlar */}
            {recent.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentList}>
                {recent.map(r => (
                  <TouchableOpacity key={r.id} style={styles.recentItem} onPress={() => onSelectPlace(r)}>
                    <Ionicons name="time-outline" size={16} color="#888" />
                    <Text style={styles.recentText} numberOfLines={1}>{r.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={{ height: insets.bottom }} />
          </View>
        )}

        {uiStep === 'confirm_pickup' && (
          <View style={styles.confirmPanel}>
            <Text style={styles.panelTitle}>{t('home.pickup')}</Text>
            <Text style={styles.addressText} numberOfLines={2}>{pickupAddress}</Text>
            <TouchableOpacity 
                style={[styles.primaryBtn, isMapMoving && { opacity: 0.6 }]} 
                onPress={getRouteAndEstimate}
                disabled={isMapMoving}
            >
                <Text style={styles.primaryBtnText}>{t('common.confirm')}</Text>
            </TouchableOpacity>
            <View style={{ height: insets.bottom }} />
          </View>
        )}

        {uiStep === 'estimate' && estimate && (
          <View style={styles.estimatePanel}>
            <View style={styles.estimateHeader}>
                <View>
                    <Text style={styles.etaInfo}>{estimate.estimated_duration_min} min • {estimate.distance_km} km</Text>
                    <Text style={styles.destName} numberOfLines={1}>{destAddress}</Text>
                </View>
                <TouchableOpacity onPress={() => setUiStep('idle')}>
                    <Ionicons name="close-circle" size={30} color="#DDD" />
                </TouchableOpacity>
            </View>

            {/* Car Category Selection */}
            <View style={styles.categorySelection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                    {[
                        { id: 'economy', label: 'Ekonom', icon: 'car', price: estimate.prices?.economy?.solo },
                        { id: 'comfort', label: 'Komfort', icon: 'ribbon', price: estimate.prices?.comfort?.solo },
                        { id: 'electro', icon: 'flash', label: 'Elektro', price: estimate.prices?.electro?.solo },
                        { id: 'business', label: 'Biznes', icon: 'briefcase', price: estimate.prices?.business?.solo },
                    ].map(cat => (
                        <TouchableOpacity 
                            key={cat.id} 
                            style={[styles.categoryBtn, carClass === cat.id && styles.categoryBtnActive]}
                            onPress={() => setCarClass(cat.id as any)}
                        >
                            <Ionicons name={cat.icon as any} size={24} color={carClass === cat.id ? "#000" : "#FFB800"} />
                            <Text style={[styles.categoryLabel, carClass === cat.id && styles.categoryLabelActive]}>{cat.label}</Text>
                            <Text style={[styles.categoryPrice, carClass === cat.id && styles.categoryPriceActive]}>
                                {cat.price ? formatPrice(cat.price) : '---'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Bonus Selection (Radio Style) */}
            {user && user.bonus_balance > 0 && (
                <View style={styles.bonusSelection}>
                    <View style={styles.bonusHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="gift" size={20} color="#FFB800" />
                            <Text style={styles.bonusTitle}>Bonus ishlatish (Max 70%)</Text>
                        </View>
                    </View>
                    
                    <View style={styles.bonusRadioGroup}>
                        {[
                            { label: '0%', value: 0 },
                            { label: '50%', value: 50 },
                            { label: '100%', value: 100 }
                        ].map((opt) => {
                            const fare = estimate.prices?.[carClass]?.[shareType] || 0;
                            const maxBonus = fare * 0.7;
                            const appliedBonus = Math.floor(Math.min(user.bonus_balance, maxBonus) * (opt.value / 100));
                            
                            return (
                                <TouchableOpacity 
                                    key={opt.label}
                                    style={[styles.bonusRadioBtn, bonusPercent === opt.value && styles.bonusRadioBtnActive]}
                                    onPress={() => {
                                        setBonusPercent(opt.value);
                                        setUseBonus(opt.value > 0);
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons 
                                            name={bonusPercent === opt.value ? "radio-button-on" : "radio-button-off"} 
                                            size={20} 
                                            color={bonusPercent === opt.value ? "#FFB800" : "#666"} 
                                        />
                                        <Text style={[styles.bonusRadioLabel, bonusPercent === opt.value && { color: '#FFB800' }]}>{opt.label}</Text>
                                    </View>
                                    <Text style={styles.bonusRadioValue}>
                                        {appliedBonus > 0 ? `-${formatPrice(appliedBonus)}` : '0'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {bonusPercent > 0 && (
                        <View style={[styles.bonusRow, { borderTopWidth: 1, borderTopColor: '#2A2A2A', marginTop: 12, paddingTop: 12 }]}>
                            <Text style={[styles.bonusRowLabel, { fontWeight: '800', color: '#FFF' }]}>To'lov:</Text>
                            <Text style={[styles.bonusRowValue, { fontWeight: '900', color: '#FFF', fontSize: 16 }]}>
                                {formatPrice((estimate.prices?.[carClass]?.[shareType] || 0) - Math.floor(Math.min(user.bonus_balance, (estimate.prices?.[carClass]?.[shareType] || 0) * 0.7) * (bonusPercent / 100)))} UZS
                            </Text>
                        </View>
                    )}
                </View>
            )}

            <TouchableOpacity style={styles.primaryBtn} onPress={handleRequestRide} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Buyurtma berish</Text>}
            </TouchableOpacity>
            <View style={{ height: insets.bottom }} />
          </View>
        )}

        {uiStep === 'ride_active' && (
          <View style={styles.ridePanel}>
            <View style={styles.statusRow}>
                <ActivityIndicator size="small" color="#FFB800" />
                <View>
                    <Text style={styles.activeStatusText}>
                        {ride.status === 'pending' || ride.status === 'searching' ? 'Haydovchi qidirilmoqda...' : 
                         ride.status === 'arrived' || ride.status === 'external_arrived' ? t('ride.arrived') :
                         ride.status === 'external_pending' ? `${ride.externalProvider} haydovchisi kelmoqda` :
                         ride.status === 'matched' || ride.status === 'driver_found' || ride.status === 'on_the_way' || ride.status === 'accepted' ? 'Haydovchi kelmoqda' : 
                         ride.status === 'started' || ride.status === 'picked_up' ? 'Safar boshlandi' : 'Safar holati'}
                    </Text>
                    {ride.status === 'arrived' || ride.status === 'external_arrived' ? (
                        <Text style={[styles.arrivalEstimateText, { color: '#FFB800' }]}>{t('ride.arrived_message')}</Text>
                    ) : ride.status === 'external_pending' && ride.externalEta ? (
                        <Text style={styles.arrivalEstimateText}>~ {Math.ceil((new Date(ride.externalEta).getTime() - Date.now()) / 60000)} daqiqada keladi</Text>
                    ) : (ride.status === 'accepted' || ride.status === 'matched' || ride.status === 'on_the_way' || ride.status === 'driver_found') && (
                        <Text style={styles.arrivalEstimateText}>~ 3-5 minutda yetib keladi</Text>
                    )}
                </View>
            </View>
            
            {ride.driver && (
                <View style={styles.driverCard}>
                    <View style={styles.driverMain}>
                        <View style={styles.driverAvatar}>
                            <Ionicons name="person" size={24} color="#FFB800" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={styles.driverName}>{ride.driver.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2D260D', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 3 }}>
                                    <Ionicons name="star" size={10} color="#FFB800" />
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFB800' }}>{ride.driver.rating || '5.0'}</Text>
                                </View>
                            </View>
                            <Text style={styles.driverCarText}>{ride.driver.vehicle?.color} {ride.driver.vehicle?.make} {ride.driver.vehicle?.model}</Text>
                        </View>
                        <View style={styles.plateBadge}>
                            <Text style={styles.plateText}>{ride.driver.vehicle?.plate_number}</Text>
                        </View>
                    </View>
                    <View style={styles.driverActions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Tel', ride.driver?.phone)}>
                            <Ionicons name="call" size={18} color="#FFB800" />
                            <Text style={styles.actionBtnText}>Qo'ng'iroq</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.actionBtn, { borderColor: '#2196F3' }]} 
                            onPress={async () => {
                                try {
                                    await Share.share({
                                        message: `🚕 Goldride | Men hozir safardaman!\n📍 ${pickupAddress} → ${destAddress}\n🔑 PIN: ${pinCode}\n⏰ ${new Date().toLocaleTimeString('uz')}`
                                    });
                                } catch (e) {}
                            }}
                        >
                            <Ionicons name="share-social" size={18} color="#2196F3" />
                            <Text style={[styles.actionBtnText, { color: '#2196F3' }]}>Ulashish</Text>
                        </TouchableOpacity>
                    </View>

                    {/* PIN Code Display */}
                    <View style={styles.pinRow}>
                        <Text style={styles.pinLabel}>Haydovchiga ayting:</Text>
                        <View style={styles.pinBadge}>
                            <Text style={styles.pinCode}>{pinCode}</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.cancelLink} onPress={handleCancelRide}>
                        <Text style={styles.cancelText}>Bekor qilish</Text>
                    </TouchableOpacity>
                </View>
            )}

            {ride.status === 'external_pending' && (
                <View style={styles.driverCard}>
                    <View style={styles.driverMain}>
                        <View style={[styles.driverAvatar, { backgroundColor: '#FFD700' }]}>
                            <Ionicons name="car-sport" size={24} color="#000" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.driverName}>{ride.externalProvider || 'Tashqi xizmat'}</Text>
                            <Text style={styles.driverCarText}>Hamkorimiz orqali chaqirilmoqda</Text>
                        </View>
                        <View style={[styles.plateBadge, { backgroundColor: '#FFB800' }]}>
                            <Text style={[styles.plateText, { color: '#000' }]}>
                                {ride.externalPrice ? `${ride.externalPrice.toLocaleString()} UZS` : 'Narx kutilmoqda'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.payInfoCard}>
                        <Ionicons name="information-circle" size={20} color="#FFB800" />
                        <Text style={styles.payInfoText}>
                           Sizning buyurtmangiz uzoq masofa bo'lgani sababli hamkorimizga yo'naltirildi.
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.cancelLink} onPress={handleCancelRide}>
                        <Text style={styles.cancelText}>Bekor qilish</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!ride.driver && ride.status !== 'external_pending' && (
                <TouchableOpacity style={styles.cancelFullBtn} onPress={handleCancelRide}>
                    <Text style={styles.cancelFullText}>Bekor qilish</Text>
                </TouchableOpacity>
            )}
            <View style={{ height: insets.bottom }} />
          </View>
        )}
      </View>

      {/* Floating My Location */}
      {uiStep !== 'ride_active' && (
        <TouchableOpacity 
            style={[styles.locBtn, { bottom: (uiStep === 'idle' ? 240 : 340) + insets.bottom }]} 
            onPress={() => location && mapRef.current?.animateToRegion({
                latitude: location.coords.latitude, longitude: location.coords.longitude,
                latitudeDelta: 0.01, longitudeDelta: 0.01
            })}
        >
            <Ionicons name="locate" size={24} color="#FFB800" />
        </TouchableOpacity>
      )}

      {/* Search Modal */}
      {showSearch && (
        <Animated.View style={[styles.searchModal, { transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] }]}>
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowSearch(false)} style={styles.backBtn}>
                    <Ionicons name="chevron-down" size={32} color="#AAA" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {activeInput === 'pickup' ? 'Qaerdan chiqasiz?' : 'Qayerga borasiz?'}
                </Text>
            </View>

            <View style={styles.modalSearchBox}>
                <View style={styles.inputContainer}>
                    {/* Pickup input (agar pickup tanlash rejimida bo'lsa) */}
                    {activeInput === 'pickup' && (
                      <View style={[styles.modalInputRow, { borderBottomWidth: 1, borderBottomColor: '#2A2A2A' }]}>
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#555', marginLeft: 15, marginRight: 3 }}>
                          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFF', margin: 3.5 }} />
                        </View>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="Olib ketish manzilini qidiring..."
                          value={pickupAddress}
                          onChangeText={(t) => setPickupAddress(t)}
                          autoFocus
                          placeholderTextColor="#555"
                        />
                      </View>
                    )}

                    {/* Selected Stops */}
                    {stops.map((stop, idx) => (
                        <View key={stop.id} style={styles.stopChip}>
                            <Ionicons name="location-outline" size={16} color="#FFB800" />
                            <Text style={styles.stopChipText} numberOfLines={1}>{stop.name}</Text>
                            <TouchableOpacity onPress={() => setStops(stops.filter(s => s.id !== stop.id))}>
                                <Ionicons name="close-circle" size={18} color="#AAA" />
                            </TouchableOpacity>
                        </View>
                    ))}

                    {activeInput !== 'pickup' && (
                    <View style={styles.modalInputRow}>
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFB800', marginLeft: 15, marginRight: 3, alignItems: 'center', justifyContent: 'center' }}>
                          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#000' }} />
                        </View>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Manzilni qidiring..."
                            value={destAddress}
                            onChangeText={handleAddressChange}
                            autoFocus
                            placeholderTextColor="#555"
                        />
                    </View>
                    )}

                    <View style={styles.searchModalFooter}>
                        <TouchableOpacity 
                            style={styles.addStopBtn} 
                            onPress={() => {
                                if (stops.length >= 3) {
                                    Alert.alert("Eslatma", "Maksimal 3 ta oraliq to'xtash joyi qo'shish mumkin.");
                                    return;
                                }
                                setActiveInput('pickup'); // Re-using state to mean "searching for stop"
                            }}
                        >
                            <Ionicons name="add-circle" size={20} color="#FFB800" />
                            <Text style={styles.addStopText}>Yana manzil qo'shish</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.scheduleBtn, isScheduled && styles.scheduleBtnActive]} 
                            onPress={() => {
                                if (isScheduled) {
                                    setIsScheduled(false);
                                    setScheduledTime(null);
                                } else {
                                    Alert.alert(
                                        "Vaqtni tanlang",
                                        "Qachon yo'lga chiqasiz?",
                                        [
                                            { text: "Hozir", onPress: () => { setIsScheduled(false); setScheduledTime(null); } },
                                            { text: "15 daqiqadan keyin", onPress: () => { setIsScheduled(true); setScheduledTime(new Date(Date.now() + 15*60000)); } },
                                            { text: "30 daqiqadan keyin", onPress: () => { setIsScheduled(true); setScheduledTime(new Date(Date.now() + 30*60000)); } },
                                            { text: "bugun soat 21:00 da", onPress: () => { 
                                                const d = new Date(); d.setHours(21, 0); 
                                                setIsScheduled(true); setScheduledTime(d); 
                                            } },
                                        ]
                                    );
                                }
                            }}
                        >
                            <Ionicons name="time" size={20} color={isScheduled ? "#000" : "#FFB800"} />
                            <Text style={[styles.addStopText, isScheduled && { color: '#000' }]}>
                                {isScheduled ? scheduledTime?.toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' }) : "Vaqtni belgilash"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Saved Locations Quick Actions */}
            {savedLocations.length > 0 && !isSearching && destAddress.length === 0 && (
                <View style={styles.savedLocationsRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}>
                        {savedLocations.map(loc => (
                            <TouchableOpacity 
                                key={loc.id} 
                                style={styles.savedLocationChip}
                                onPress={() => onSelectPlace({
                                    lat: loc.latitude, 
                                    lon: loc.longitude, 
                                    name: loc.name, 
                                    address: loc.address
                                })}
                            >
                                <Ionicons name={loc.icon || "star"} size={16} color="#000" />
                                <Text style={styles.savedLocationText}>{loc.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <ScrollView style={styles.resultsScroll}>
                {isSearching ? <ActivityIndicator style={{ marginTop: 20 }} color="#FFB800" /> : (
                    <>
                        {searchResults.length > 0 ? (
                            searchResults.map((p, i) => (
                                <TouchableOpacity key={i} style={styles.resultRow} onPress={() => onSelectPlace(p)}>
                                    <View style={styles.rowIcon}>
                                        <Ionicons name={getIconForType(p.type, p.key)} size={20} color="#FFB800" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={styles.rowName}>{p.name}</Text>
                                            {(p.type === 'bank' || p.type === 'atm') && (
                                                <View style={{ backgroundColor: 'rgba(255, 184, 0, 0.2)', paddingHorizontal: 4, borderRadius: 4 }}>
                                                    <Text style={{ fontSize: 9, color: '#FFB800', fontWeight: '800' }}>BANK</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.rowAddr} numberOfLines={1}>{p.address}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <>
                                <Text style={styles.sectionLabel}>Oxirgi manzillar</Text>
                                {recent.map(r => (
                                    <TouchableOpacity key={r.id} style={styles.resultRow} onPress={() => onSelectPlace(r)}>
                                        <View style={styles.rowIcon}><Ionicons name="time-outline" size={20} color="#AAA" /></View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.rowName}>{r.name}</Text>
                                            <Text style={styles.rowAddr} numberOfLines={1}>{r.address}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </>
                        )}
                    </>
                )}
            </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  map: { flex: 1 },
  header: { position: 'absolute', top: 60, left: 20, zIndex: 10 },
  profileBtn: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(26, 26, 26, 0.9)', 
    padding: 4, paddingRight: 16, borderRadius: 30, gap: 10,
    borderWidth: 1, borderColor: '#333',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 
  },
  profileName: { fontSize: 15, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
  markerBase: { 
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFB800', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, elevation: 5
  },
  driverDotContainer: { 
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, elevation: 6
  },
  driverDot: {
    width: 24, height: 24, borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FFF'
  },
  pinOverlay: { 
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, 
    justifyContent: 'center', alignItems: 'center' 
  },
  pinContainer: { alignItems: 'center', marginBottom: 40 },
  pinShadow: { width: 8, height: 4, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 4, marginTop: -2 },
  bottomSection: { position: 'absolute', bottom: 30, left: 0, right: 0, zIndex: 10 },
  idlePanel: {
    backgroundColor: '#121212', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 20,
  },
  twoInputBox: {
    backgroundColor: '#1C1C1C',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 12,
  },
  twoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  twoInputDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoInputDotInner: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  twoInputPickupText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#CCC',
  },
  twoInputDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginLeft: 40,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E',
    padding: 18, borderRadius: 20, gap: 12
  },
  searchPlaceholderText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  recentList: { marginTop: 4 },
  recentItem: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', 
    paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, marginRight: 10, gap: 8 
  },
  recentText: { fontSize: 14, fontWeight: '700', color: '#E2E8F0', maxWidth: 150 },
  confirmPanel: { 
    backgroundColor: '#121212', padding: 24, paddingBottom: 40, 
    borderTopLeftRadius: 35, borderTopRightRadius: 35 
  },
  estimatePanel: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  categorySelection: {
    marginVertical: 15,
  },
  categoryScroll: {
    gap: 12,
    paddingRight: 10,
  },
  categoryBtn: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 12,
    width: 100,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryBtnActive: {
    backgroundColor: '#FFB800',
    borderColor: '#FFB800',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  categoryLabelActive: {
    color: '#000',
  },
  categoryPrice: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  categoryPriceActive: {
    color: '#000',
  },
  panelTitle: { fontSize: 12, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 },
  addressText: { fontSize: 22, fontWeight: '800', color: '#FFF', marginBottom: 30 },
  stopChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2D260D',
    padding: 8, borderRadius: 12, marginBottom: 10, gap: 8, borderWidth: 1, borderColor: '#FFB800'
  },
  stopChipText: { flex: 1, color: '#FFF', fontSize: 13, fontWeight: '600' },
  searchModalFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 15 },
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', padding: 10, borderRadius: 12, gap: 6, flex: 1, justifyContent: 'center' },
  scheduleBtnActive: { backgroundColor: '#FFB800' },
  primaryBtn: { 
    backgroundColor: '#FFB800', padding: 18, borderRadius: 20, alignItems: 'center',
    shadowColor: '#FFB800', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 
  },
  primaryBtnText: { color: '#000', fontSize: 18, fontWeight: '800' },
  estimateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  etaInfo: { fontSize: 14, color: '#FFB800', fontWeight: '700' },
  destName: { fontSize: 16, fontWeight: '600', color: '#FFF', marginTop: 2 },
  modeToggle: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  modeCard: { 
    flex: 1, backgroundColor: '#1E1E1E', padding: 16, borderRadius: 20, 
    alignItems: 'center', borderWidth: 2, borderColor: 'transparent' 
  },
  modeActive: { backgroundColor: '#2D260D', borderColor: '#FFB800' },
  modePrice: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  modeLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '700' },
  ridePanel: {
    backgroundColor: '#121212', padding: 24, paddingBottom: 40,
    borderTopLeftRadius: 30, borderTopRightRadius: 30
  },
  payInfoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#1A1A1A', padding: 12, borderRadius: 12, marginTop: 12,
    borderWidth: 1, borderColor: '#FFB800',
  },
  payInfoText: { flex: 1, fontSize: 13, color: '#CCC', fontWeight: '500', lineHeight: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  activeStatusText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  arrivalEstimateText: { fontSize: 13, fontWeight: '600', color: '#FFB800', marginTop: 2 },
  driverCard: { backgroundColor: '#1E1E1E', padding: 16, borderRadius: 25 },
  driverMain: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
  driverAvatar: { 
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#2A2A2A', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333'
  },
  driverName: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  driverCarText: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  plateBadge: { backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  plateText: { fontSize: 14, fontWeight: '800', color: '#FFB800' },
  driverActions: { flexDirection: 'row', gap: 15, alignItems: 'center' },
  actionBtn: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    backgroundColor: '#2A2A2A', padding: 12, borderRadius: 14, gap: 8, borderWidth: 1, borderColor: '#333' 
  },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#FFB800' },
  idleLocationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, backgroundColor: '#1A1A1A', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  idleLocationText: { fontSize: 13, fontWeight: '600', color: '#94A3B8', flex: 1 },
  // idleLocationHeader eski stil — twoInputBox bilan almashtirildi
  cancelLink: { padding: 10 },
  cancelText: { color: '#FF5252', fontWeight: '700' },
  cancelFullBtn: { backgroundColor: '#1E1E1E', padding: 15, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  cancelFullText: { color: '#FF5252', fontWeight: '700' },
  locBtn: { 
    position: 'absolute', right: 20, width: 50, height: 50, borderRadius: 25, 
    backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 
  },
  searchModal: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#121212', zIndex: 100 },
  modalHeader: { paddingTop: 60, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  modalSearchBox: { marginHorizontal: 20, marginBottom: 20 },
  inputContainer: { backgroundColor: '#1E1E1E', borderRadius: 20, overflow: 'hidden' },
  modalInputRow: { flexDirection: 'row', alignItems: 'center' },
  modalInput: { flex: 1, padding: 15, fontSize: 16, fontWeight: '600', color: '#FFF' },
  addStopBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 15, borderTopWidth: 1, borderTopColor: '#2A2A2A' },
  addStopText: { color: '#FFB800', fontSize: 14, fontWeight: '700' },
  resultsScroll: { flex: 1, paddingHorizontal: 20 },
  resultRow: { 
    flexDirection: 'row', alignItems: 'center', paddingVertical: 18, 
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A', gap: 15 
  },
  rowIcon: { 
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E1E1E', 
    justifyContent: 'center', alignItems: 'center' 
  },
  rowName: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  rowAddr: { fontSize: 13, color: '#94A3B8', marginTop: 2, fontWeight: '500' },
  sectionLabel: { fontSize: 12, fontWeight: '900', color: '#E2E8F0', textTransform: 'uppercase', marginTop: 15, marginBottom: 8, letterSpacing: 1.2 },
  savedLocationsRow: { marginBottom: 15, marginTop: -10 },
  savedLocationChip: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFB800',
      paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 6,
  },
  savedLocationText: { color: '#000', fontSize: 14, fontWeight: '700' },
  sosBtn: {
    position: 'absolute', top: 60, right: 20, flexDirection: 'row', alignItems: 'center',
    gap: 8, backgroundColor: '#FF5252', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 30, zIndex: 50, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#FF5252', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 15, elevation: 12,
  },
  sosBtnText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
  pinRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, marginTop: 16, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#333',
  },
  pinLabel: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  pinBadge: {
    backgroundColor: '#2D260D', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 14, borderWidth: 2, borderColor: '#FFB800',
  },
  pinCode: { fontSize: 24, fontWeight: '900', color: '#FFB800', letterSpacing: 6 },
  
  // Shared Ride Styles
  shareSelection: { paddingHorizontal: 4, marginBottom: 20 },
  shareTitle: { color: '#94A3B8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 },
  shareOptionsRow: { flexDirection: 'row', gap: 10 },
  shareBtn: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  shareBtnActive: { backgroundColor: '#2D260D', borderColor: '#FFB800' },
  shareBtnText: { color: '#666', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  shareBtnTextActive: { color: '#FFB800' },
  sharePrice: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  destMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivalTooltip: {
    backgroundColor: '#000',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  arrivalTooltipText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  destDotOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CCC',
  },
  destDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000',
  },
  etaRouteBadge: {
    backgroundColor: '#FFEB3B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FBC02D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  etaRouteText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  ratingCard: {
    backgroundColor: '#121212', width: '85%', padding: 30, borderRadius: 32, alignItems: 'center',
    borderWidth: 1, borderColor: '#1E1E1E',
  },
  ratingHeader: { alignItems: 'center', marginBottom: 25 },
  ratingTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', marginBottom: 5 },
  ratingSubtitle: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 35 },
  ratingSubmitBtn: {
    backgroundColor: '#FFB800', width: '100%', padding: 18, borderRadius: 20, alignItems: 'center',
    shadowColor: '#FFB800', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  ratingSubmitText: { color: '#000', fontSize: 16, fontWeight: '800' },
  
  // Bonus Selection
  bonusSelection: {
    backgroundColor: '#1E1E1E', borderRadius: 20, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#333'
  },
  bonusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bonusTitle: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  bonusBreakdown: { marginTop: 12, gap: 4 },
  bonusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bonusRowLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  bonusRowValue: { fontSize: 13, color: '#FFF', fontWeight: '700' },
  bonusRadioGroup: { marginTop: 12, gap: 8 },
  bonusRadioBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#262626', padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#333'
  },
  bonusRadioBtnActive: { borderColor: '#FFB800', backgroundColor: '#2D260D' },
  bonusRadioLabel: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  bonusRadioValue: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  agreementModalContent: {
    backgroundColor: '#121212',
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333',
  },
  agreementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  agreementTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  agreementIntro: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  agreementScrollBox: {
    backgroundColor: '#000',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  agreementBodyText: {
    color: '#CCC',
    fontSize: 13,
    lineHeight: 20,
  },
  agreeBtn: {
    backgroundColor: '#FFB800',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agreeBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
