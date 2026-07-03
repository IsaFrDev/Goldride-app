import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Switch, Alert,
  Dimensions, Animated, ActivityIndicator, Image as RNImage,
  Modal, AppState,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import Svg, { Rect, G, Path } from 'react-native-svg';
import MapView, { Marker, Polyline, Circle } from '../../components/MapComponents';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../../services/i18n';
import { authAPI, ridesAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { generateVirtualDrivers, updateVirtualPositions, balanceDrivers, VirtualDriver } from '../../utils/districtSimulation';
import { generateHeatZones, HeatZone } from '../../utils/heatmapSimulation';
import { soundService } from '../../services/sound';
import { socketService } from '../../services/socket';

const LOCATION_TRACKING = 'location-tracking';

// Background Task Definition
TaskManager.defineTask(LOCATION_TRACKING, async ({ data, error }: any) => {
  if (error) {
    console.log('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      try {
        // Send to backend
        await authAPI.updateLocation(location.coords.latitude, location.coords.longitude);
      } catch (e: any) {
        // Stop tracking if offline, unauthorized, unapproved, or driver profile doesn't exist
        const status = e.response?.status;
        if (status === 400 || status === 401 || status === 403 || status === 404) {
          console.log(`Driver is offline or unauthorized (status: ${status}) on server, stopping background tracking`);
          try {
            await Location.stopLocationUpdatesAsync(LOCATION_TRACKING);
          } catch (stopErr) {
            console.log('Error stopping background tracking:', stopErr);
          }
        } else {
          console.log('Background update failed:', e.message || e);
        }
      }
    }
  }
});

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
      if (bearing !== 0 && Math.abs(bearing - rotation) > 5) setRotation(bearing);
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

export default function DriverHomeScreen() {
  const { isAuthenticated, isOnline, setIsOnline } = useAuthStore();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const mapRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [driverStatus, setDriverStatus] = useState<string>('loading');
  const [activeRide, setActiveRide] = useState<any>(null);
  const [incomingRequest, setIncomingRequest] = useState<any>(null);

  useEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: (activeRide || incomingRequest) ? { display: 'none' } : {
        backgroundColor: '#000000',
        borderTopWidth: 1,
        borderTopColor: '#1A1A1A',
        height: 80,
        paddingBottom: 20,
        paddingTop: 8,
      }
    });
  }, [activeRide, incomingRequest]);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([]);
  const [virtualDrivers, setVirtualDrivers] = useState<VirtualDriver[]>(generateVirtualDrivers());
  const [displayedDrivers, setDisplayedDrivers] = useState<any[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatZones, setHeatZones] = useState<HeatZone[]>(generateHeatZones());
  const [destFilterActive, setDestFilterActive] = useState(false);
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const waitingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [happyHour, setHappyHour] = useState<any>(null);
  const [showHHModal, setShowHHModal] = useState(false);
  const [completedRide, setCompletedRide] = useState<any>(null);



  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc);
      } catch (error) {
        console.log('Location initial fetch failed:', error);
      }

      // Check driver approval status
      try {
        const resp = await authAPI.getDriverProfile();
        setDriverStatus(resp.data.status);
        setIsOnline(resp.data.is_online);
      } catch (error: any) {
        if (error.response?.status !== 401) {
          console.log('Driver profile error:', error);
        }
      }
    })();
  }, [isAuthenticated]);

  // Loop sound control based on incomingRequest state
  useEffect(() => {
    if (!incomingRequest) {
      soundService.stopNewOrder();
    }
    return () => {
      soundService.stopNewOrder();
    };
  }, [incomingRequest]);

  // Handle Notifications Setup & AppState listener for background status
  useEffect(() => {
    // Request permission & setup notification handler
    Notifications.requestPermissionsAsync();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' && isOnline) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'Siz hali ham onlaynsiz!',
            body: 'Siz hali ham liniyadasiz, yangi buyurtmalarni qabul qilishingiz mumkin.',
          },
          trigger: null,
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isOnline]);

  // Listen for socket events
  useEffect(() => {
    const unsubStatus = socketService.on('driver_status_update', (data) => {
      setDriverStatus(data.status);
      if (data.is_online !== undefined) setIsOnline(data.is_online);
    });

    const unsubRequest = socketService.on('ride_request', (data) => {
      soundService.playNewOrder();
      setIncomingRequest(data.ride);
      setActiveRide(null);
    });

    const unsubRideUpdate = socketService.on('ride_status_update', (data) => {
      if (data.status === 'cancelled') {
        Alert.alert('Eslatma', 'Safar yo\'lovchi tomonidan bekor qilindi.');
      }
      // Refresh active rides if status changed
      checkActiveRides();
    });

    return () => {
      unsubStatus();
      unsubRequest();
      unsubRideUpdate();
    };
  }, []);

  // Poll for driver status if pending (as fallback)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (driverStatus === 'pending') {
      interval = setInterval(async () => {
        try {
          const resp = await authAPI.getDriverProfile();
          if (resp.data.status !== 'pending') {
            setDriverStatus(resp.data.status);
            setIsOnline(resp.data.is_online);
          }
        } catch (e) {}
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [driverStatus]);

  // Location tracking when online
  useEffect(() => {
    let locationSub: Location.LocationSubscription | null = null;

    if (isOnline) {
      (async () => {
        // Ensure background tracking is also running
        const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING);
        if (!isTracking) {
          const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
          if (bgStatus === 'granted') {
            await Location.startLocationUpdatesAsync(LOCATION_TRACKING, {
              accuracy: Location.Accuracy.High,
              timeInterval: 10000,
              distanceInterval: 15,
              foregroundService: {
                notificationTitle: "Goldride Driver",
                notificationBody: "Siz onlaynsiz. Buyurtmalar kutilmoqda...",
                notificationColor: "#FFB800",
              },
            });
          }
        }

        locationSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 10,
          },
          (loc) => {
            setLocation(loc);
            // Send location to server via WebSocket for real-time
            socketService.send('driver_location_update', { 
              lat: loc.coords.latitude, 
              lng: loc.coords.longitude 
            });
            // Also send via REST as fallback/DB persistence
            authAPI.updateLocation(
              loc.coords.latitude,
              loc.coords.longitude
            ).catch(() => {});
          }
        );
      })();

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Check for active rides
      checkActiveRides();

      // Happy Hours tekshirish
      const fetchHappyHours = async () => {
        try {
          const resp = await ridesAPI.getHappyHours();
          setHappyHour(resp.data);
        } catch (e) {}
      };
      fetchHappyHours();
      const hhInterval = setInterval(fetchHappyHours, 60000); // Har daqiqada

      return () => clearInterval(hhInterval);
    }

    return () => {
      locationSub?.remove();
    };
  }, [isOnline]);

  const checkActiveRides = async () => {
    try {
      const resp = await ridesAPI.getActiveRides();
      const rides = resp.data.results || resp.data || [];
      if (rides.length > 0) {
        const ride = rides[0];
        if (ride.status === 'searching') {
          // It's a new request waiting for acceptance
          if (!incomingRequest || incomingRequest.id !== ride.id) {
            soundService.playNewOrder();
          }
          setIncomingRequest(ride);
          setActiveRide(null);
        } else {
          // Always update active ride to catch passenger status changes (picked_up, etc.)
          setActiveRide(ride);
          setIncomingRequest(null);
          
          if (!activeRide || activeRide.id !== ride.id) {
            fetchRoute(ride);
          }
          
          // Handle waiting timer
          if (ride.status === 'arrived') {
              if (!waitingTimerRef.current) {
                setWaitingSeconds(0);
                waitingTimerRef.current = setInterval(() => {
                  setWaitingSeconds(prev => prev + 1);
                }, 1000);
              }
            } else {
              if (waitingTimerRef.current) {
                clearInterval(waitingTimerRef.current);
                waitingTimerRef.current = null;
              }
            }
            
            // Join WebSocket group for the active ride
            if (ride.id) {
              socketService.send('join_ride', { ride_id: ride.id });
            }
        }
      } else {
        setActiveRide(null);
        setIncomingRequest(null);
        setRouteCoords([]);
      }
    } catch (error) {
      console.log('Active rides error:', error);
    }
  };

  const fetchRoute = async (ride: any) => {
    if (!ride || !ride.passengers || ride.passengers.length === 0) return;
    try {
      // For simplicity, route from driver to first passenger's destination or current pickup
      const p = ride.passengers[0];
      const pLat = p.pickup_lat;
      const pLng = p.pickup_lng;
      const dLat = p.drop_lat;
      const dLng = p.drop_lng;

      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?overview=full&geometries=geojson`;
      const resp = await fetch(osrmUrl);
      const data = await resp.json();
      if (data.routes?.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map((c: any) => ({
          latitude: c[1],
          longitude: c[0]
        }));
        setRouteCoords(coords);
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 100, right: 50, bottom: 400, left: 50 },
          animated: true
        });
      }
    } catch (e) {
      console.log('Fetch route error:', e);
    }
  };

  // Polling for new rides and recommendations
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOnline) {
      interval = setInterval(async () => {
        if (!activeRide) checkActiveRides();
        
        try {
          const resp = await authAPI.getNearbyDrivers();
          const data = Array.isArray(resp.data) ? resp.data : (resp.data.results || []);
          setNearbyDrivers(data);
        } catch (e) {}



        setVirtualDrivers(prev => updateVirtualPositions(prev));
      }, 5000);
    }
    return () => interval && clearInterval(interval);
  }, [isOnline, !!activeRide, !!incomingRequest]);

  // Balance drivers for display
  useEffect(() => {
    setDisplayedDrivers(balanceDrivers(nearbyDrivers, virtualDrivers));
  }, [nearbyDrivers, virtualDrivers]);

  // Map: sync other drivers as 3D car markers
  useEffect(() => {
    if (!mapRef.current || activeRide) return;
    if (isOnline && displayedDrivers.length > 0) {
      const payload = displayedDrivers
        .filter((d: any) => d.current_lat && d.current_lng)
        .map((d: any) => ({
          id: d.id,
          lat: d.current_lat,
          lng: d.current_lng,
          rotation: 0,
          isActive: false,
        }));
      mapRef.current.updateDrivers?.(payload);
    } else {
      mapRef.current.clearAllDrivers?.();
    }
  }, [displayedDrivers, isOnline, !!activeRide]);

  // Map: own location dot
  useEffect(() => {
    if (!mapRef.current || !location) return;
    mapRef.current.updateUserLocation?.(location.coords.latitude, location.coords.longitude);
  }, [location]);

  // Map: route polyline when active ride
  useEffect(() => {
    if (!mapRef.current) return;
    if (routeCoords.length > 1) {
      mapRef.current.setRoute?.(routeCoords);
    } else {
      mapRef.current.clearRoute?.();
    }
  }, [routeCoords]);

  const toggleOnline = async () => {
    try {
      const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        const { status: newFgStatus } = await Location.requestForegroundPermissionsAsync();
        if (newFgStatus !== 'granted') {
          Alert.alert('Ruxsat berilmagan', 'Joylashuv ruxsati kerak');
          return;
        }
      }

      setLoading(true);
      const newOnlineStatus = !isOnline;
      
      // Request background permissions for "always on" mode
      if (newOnlineStatus) {
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
          Alert.alert(
            'Fon rejimi', 
            'Ilova yopiq bo\'lganda ham ishlashi uchun "Har doim ruxsat berish" (Allow always) tanlanishi kerak.'
          );
        }
      }

      let lat = location?.coords.latitude;
      let lng = location?.coords.longitude;

      if (newOnlineStatus && (!lat || !lng)) {
        try {
            const lastLoc = await Location.getLastKnownPositionAsync();
            if (lastLoc) {
                lat = lastLoc.coords.latitude;
                lng = lastLoc.coords.longitude;
            } else {
                const freshLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                setLocation(freshLoc);
                lat = freshLoc.coords.latitude;
                lng = freshLoc.coords.longitude;
            }
        } catch (locErr) {
            console.log('Location fetch failed, using fallback:', locErr);
            lat = TASHKENT.latitude;
            lng = TASHKENT.longitude;
        }
      }

      await authAPI.toggleDriverStatus({ 
        is_online: newOnlineStatus,
        lat: lat,
        lng: lng
      });
      
      setIsOnline(newOnlineStatus);
      
      // Manage Background Task
      if (newOnlineStatus) {
        const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING);
        if (!isTracking) {
          await Location.startLocationUpdatesAsync(LOCATION_TRACKING, {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000,
            distanceInterval: 15,
            foregroundService: {
              notificationTitle: "Goldride Driver",
              notificationBody: "Siz onlaynsiz. Buyurtmalar kutilmoqda...",
              notificationColor: "#FFB800",
            },
          });
        }
      } else {
        const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING);
        if (isTracking) {
          await Location.stopLocationUpdatesAsync(LOCATION_TRACKING);
        }
      }

      if (newOnlineStatus && lat && lng) {
        authAPI.updateLocation(lat, lng).catch(() => {});
      }
    } catch (error: any) {
      console.error('Toggle Online Error:', error.response?.data || error.message);
      Alert.alert('Xatolik', error.response?.data?.detail || 'Holatni o\'zgartirishda muammo yuz berdi.');
    } finally {
      setLoading(false);
    }
  };


  const acceptRide = async (rideId: number) => {
    try {
      const resp = await ridesAPI.acceptRide(rideId);
      setActiveRide(resp.data);
      setIncomingRequest(null);
      fetchRoute(resp.data);
      
      // Join WebSocket group for the ride
      if (resp.data.id) {
        socketService.send('join_ride', { ride_id: resp.data.id });
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.detail || t('common.error'));
    }
  };

  const startRide = async () => {
    if (!activeRide) return;
    try {
      const resp = await ridesAPI.startRide(activeRide.id);
      setActiveRide(resp.data);
      if (waitingTimerRef.current) {
        clearInterval(waitingTimerRef.current);
        waitingTimerRef.current = null;
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.detail || t('common.error'));
    }
  };

  const markArrived = async () => {
    if (!activeRide) return;
    try {
      const resp = await ridesAPI.markArrived(activeRide.id);
      setActiveRide(resp.data);
      await soundService.playDriverArrived();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.detail || t('common.error'));
    }
  };

  const completeRide = async () => {
    if (!activeRide) return;
    try {
      const resp = await ridesAPI.completeRide(activeRide.id);
      setActiveRide(null);
      setRouteCoords([]);
      setCompletedRide(resp.data);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.detail || t('common.error'));
    }
  };

  const cancelRide = async () => {
    if (!activeRide) return;
    Alert.alert(
      'Safarni bekor qilish',
      'Haqiqatdan ham ushbu safarni bekor qilmoqchimisiz?',
      [
        { text: 'Yo\'q', style: 'cancel' },
        { 
          text: 'Ha, bekor qilish', 
          style: 'destructive',
          onPress: async () => {
            try {
              await ridesAPI.cancelRide(activeRide.id);
              setActiveRide(null);
              setRouteCoords([]);
              Alert.alert('Bekor qilindi', 'Safar muvaffaqiyatli bekor qilindi.');
            } catch (error: any) {
              Alert.alert(t('common.error'), error.response?.data?.detail || 'Bekor qilishda xato yuz berdi');
            }
          }
        }
      ]
    );
  };


  const handlePickup = async (passengerId: number) => {
    if (!activeRide) return;
    try {
      await ridesAPI.pickupPassenger(activeRide.id, passengerId);
      checkActiveRides();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.detail || 'Xatolik yuz berdi');
    }
  };

  const handleDropoff = async (passengerId: number) => {
    if (!activeRide) return;
    try {
      await ridesAPI.dropoffPassenger(activeRide.id, passengerId);
      checkActiveRides();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.detail || 'Xatolik yuz berdi');
    }
  };

  const formatPrice = (price: number) => {
    return price?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') || '0';
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
                ride_id: activeRide?.id
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

  if (driverStatus === 'loading') {
    return (
      <View style={styles.waitingContainer}>
        <ActivityIndicator size="large" color="#FFB800" />
      </View>
    );
  }

  if (driverStatus === 'pending') {
    return (
      <View style={styles.waitingContainer}>
        <View style={styles.waitingIcon}>
          <Ionicons name="hourglass" size={48} color="#FFB800" />
        </View>
        <Text style={styles.waitingTitle}>{t('driver.waiting_approval')}</Text>
        <Text style={styles.waitingText}>
          Sizning profilingiz admin tomonidan tekshirilmoqda. Iltimos kuting.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={
          location
            ? {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }
            : TASHKENT
        }
        showsUserLocation
        showsMyLocationButton={false}
      >
        {activeRide?.passengers?.map((p: any) => (
          <Marker
            key={p.id}
            coordinate={{
              latitude: p.picked_up ? p.drop_lat : p.pickup_lat,
              longitude: p.picked_up ? p.drop_lng : p.pickup_lng,
            }}
          >
            <View style={[styles.markerCircle, { backgroundColor: p.picked_up ? '#E53935' : '#4CAF50' }]}>
                <Ionicons name={p.picked_up ? "flag" : "person"} size={16} color="#FFF" />
            </View>
          </Marker>
        ))}
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor="#FFB800" />
        )}

        {isOnline && location && (
          <MovingMarker driver={{ 
            id: 'self', 
            current_lat: location.coords.latitude, 
            current_lng: location.coords.longitude,
            is_virtual: false 
          }} />
        )}

        {/* Peer Drivers Visibility */}
        {isOnline && !activeRide && displayedDrivers.map(d => (
          <MovingMarker key={d.id} driver={d} />
        ))}

        {/* Heatmap Overlay */}
        {showHeatmap && heatZones && heatZones.map(zone => (
          <Circle
            key={zone.id}
            center={{ latitude: zone.latitude, longitude: zone.longitude }}
            radius={zone.radius}
            fillColor={zone.color + '33'}
            strokeColor={zone.color + '66'}
            strokeWidth={1}
          />
        ))}
      </MapView>

      {/* Map tools — only heatmap & filter when online */}
      {isOnline && (
        <View style={[styles.mapToolsRow, { top: insets.top + 12 }]}>
          <TouchableOpacity 
            style={[styles.mapToolBtn, showHeatmap && styles.mapToolBtnActive]}
            onPress={() => setShowHeatmap(!showHeatmap)}
          >
            <Ionicons name="flame" size={20} color={showHeatmap ? "#000" : "#FFB800"} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.mapToolBtn, { backgroundColor: '#FF5252', borderColor: '#FF5252' }]}
            onPress={handleSOS}
          >
            <Ionicons name="warning" size={20} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.mapToolBtn}
            onPress={() => setShowHHModal(true)}
          >
            <Ionicons name="calendar" size={20} color="#FFB800" />
          </TouchableOpacity>
        </View>
      )}

      {/* Ride Completion Modal */}
      <Modal
        visible={!!completedRide}
        transparent
        animationType="slide"
        onRequestClose={() => setCompletedRide(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.hhModal, { width: '90%', alignItems: 'center' }]}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="checkmark" size={40} color="#FFF" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFF', marginBottom: 6 }}>Safar yakunlandi!</Text>
            <Text style={{ fontSize: 14, color: '#94A3B8', marginBottom: 24 }}>To'lov ma'lumotlari</Text>

            <View style={{ width: '100%', backgroundColor: '#1E293B', borderRadius: 16, padding: 20, gap: 14, marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#94A3B8', fontSize: 15 }}>Umumiy narx</Text>
                <Text style={{ color: '#FFB800', fontSize: 18, fontWeight: '900' }}>
                  {formatPrice(completedRide?.total_price)} UZS
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#94A3B8', fontSize: 15 }}>Komissiya</Text>
                <Text style={{ color: '#FF5252', fontSize: 15, fontWeight: '700' }}>
                  -{formatPrice(completedRide?.commission_amount)} UZS
                </Text>
              </View>
              <View style={{ height: 1, backgroundColor: '#334155' }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Sizning daromadingiz</Text>
                <Text style={{ color: '#4CAF50', fontSize: 20, fontWeight: '900' }}>
                  {formatPrice(completedRide?.driver_earnings)} UZS
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.hhCloseBtn, { width: '100%' }]}
              onPress={() => setCompletedRide(null)}
            >
              <Text style={styles.hhCloseBtnText}>Davom etish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Happy Hours Banner */}
      {isOnline && happyHour && (
        <View style={[styles.happyHourBanner, { top: insets.top + 60 }]}>
          {happyHour.is_active ? (
            <View style={styles.happyHourActive}>
              <Ionicons name="flash" size={18} color="#000" />
              <Text style={styles.happyHourActiveText}>
                🔥 KAM KOMISSIYA! {happyHour.current?.start}-{happyHour.current?.end} | {Math.round(happyHour.current?.commission_rate * 100)}% komissiya
              </Text>
            </View>
          ) : happyHour.schedule?.length > 0 ? (
            <View style={styles.happyHourUpcoming}>
              <Ionicons name="time-outline" size={14} color="#FFB800" />
              <Text style={styles.happyHourUpcomingText}>
                Kam komissiya: {happyHour.schedule.map((s: any) => `${s.start}-${s.end}`).join(', ')}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* COMPACT TOP TOGGLE */}
      <View style={[styles.statusToggleContainer, { top: insets.top + 12 }]}>
        <TouchableOpacity 
          style={[styles.statusToggle, isOnline ? styles.statusToggleOnline : styles.statusToggleOffline]}
          onPress={toggleOnline}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={isOnline ? "#000" : "#FFB800"} />
          ) : (
            <View style={styles.statusToggleRow}>
              <View style={[styles.statusToggleDot, { backgroundColor: isOnline ? '#000' : '#FF5252' }]} />
              <Text style={[styles.statusToggleText, { color: isOnline ? '#000' : '#FFF' }]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>


      {/* Active ride panel */}
      {activeRide && (
        <View style={[styles.activeRidePanel, { paddingBottom: Math.max(insets.bottom, 40) }]}>
          <View style={styles.activeRideCard}>
            <View style={styles.rideHeader}>
              <View style={styles.rideStatusBadge}>
                <Text style={styles.rideStatusText}>
                  {activeRide.status === 'started'
                    ? t('ride.started')
                    : activeRide.status === 'arrived'
                    ? t('ride.arrived')
                    : t('ride.on_the_way')}
                </Text>
              </View>
              {activeRide.status === 'arrived' && (
                <View style={[styles.rideStatusBadge, { backgroundColor: '#1A0808' }]}>
                  <Text style={[styles.rideStatusText, { color: '#FF5252' }]}>
                    Kutish: {Math.floor(waitingSeconds / 60)}:{(waitingSeconds % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              )}
              {activeRide.is_shared && (
                <View style={styles.sharedBadge}>
                  <Ionicons name="people" size={14} color="#FFB800" />
                  <Text style={styles.sharedText}>
                    {activeRide.passengers?.length || 0} yo'lovchi
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.ridePrice}>
              {formatPrice(activeRide.total_price)} {t('common.currency')}
            </Text>

            {activeRide.passengers?.map((p: any, index: number) => (
              <View key={p.id} style={styles.passengerRow}>
                <View style={styles.passengerIcon}>
                  <Ionicons name="person" size={16} color="#FFB800" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.passengerName}>
                    Yo'lovchi {index + 1}
                  </Text>
                  <Text style={styles.passengerStatus}>
                    {p.dropped_off ? '✅ Tushirildi' : p.picked_up ? '🚗 Mashinada' : '📍 Kutmoqda'}
                  </Text>
                </View>
                {/* Pickup button: show if the passenger is not picked up and not dropped off yet */}
                {!p.picked_up && !p.dropped_off && (
                  <TouchableOpacity
                    style={styles.smallActionBtn}
                    onPress={() => handlePickup(p.id)}
                  >
                    <Text style={styles.smallActionBtnText}>Olib ketish</Text>
                  </TouchableOpacity>
                )}
                {/* Dropoff button: show if the passenger is picked up but not dropped off yet */}
                {p.picked_up && !p.dropped_off && (
                  <TouchableOpacity
                    style={[styles.smallActionBtn, { backgroundColor: '#E53935' }]}
                    onPress={() => handleDropoff(p.id)}
                  >
                    <Text style={styles.smallActionBtnText}>Tushirish</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          <View style={styles.actionButtonsRow}>
            {activeRide.status === 'driver_found' || activeRide.status === 'on_the_way' ? (
              <TouchableOpacity style={[styles.actionBtn, { flex: 2 }]} onPress={markArrived}>
                <Ionicons name="location" size={20} color="#000" />
                <Text style={styles.actionBtnText}>Yetib keldim</Text>
              </TouchableOpacity>
            ) : activeRide.status === 'arrived' ? (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4CAF50', flex: 2 }]} onPress={startRide}>
                <Ionicons name="play" size={20} color="#FFF" />
                <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Boshlash</Text>
              </TouchableOpacity>
            ) : activeRide.status === 'started' ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#E53935', flex: 2 }]}
                onPress={completeRide}
              >
                <Ionicons name="flag" size={20} color="#FFF" />
                <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Manzilga yetib keldik</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#1A0808', borderColor: '#442222', borderWidth: 1, flex: 1.2 }]} 
              onPress={cancelRide}
            >
              <Ionicons name="close-circle" size={20} color="#FF5252" />
              <Text style={[styles.actionBtnText, { color: '#FF5252', fontSize: 15 }]}>Bekor qilish</Text>
            </TouchableOpacity>
          </View>

        </View>
      )}

      {/* Happy Hour Schedule Modal */}
      <Modal
        visible={showHHModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHHModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowHHModal(false)}
        >
          <View style={styles.hhModal}>
            <View style={styles.hhHeader}>
              <View style={styles.hhIconBox}>
                <Ionicons name="flash" size={24} color="#000" />
              </View>
              <Text style={styles.hhTitle}>Happy Hours Jadvali</Text>
            </View>
            <Text style={styles.hhSubtitle}>
              Belgilangan vaqtlarda komissiya miqdori sezilarli darajada kamayadi.
            </Text>

            <View style={styles.hhList}>
              {happyHour?.schedule?.map((item: any, idx: number) => (
                <View key={idx} style={styles.hhItem}>
                  <View>
                    <Text style={styles.hhItemLabel}>{item.label}</Text>
                    <Text style={styles.hhItemTime}>{item.start} — {item.end}</Text>
                  </View>
                  <View style={styles.hhItemBadge}>
                    <Text style={styles.hhItemRate}>{Math.round(item.commission_rate * 100)}%</Text>
                    <Text style={styles.hhItemRateLabel}>komissiya</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.hhCloseBtn}
              onPress={() => setShowHHModal(false)}
            >
              <Text style={styles.hhCloseBtnText}>Tushunarli</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Incoming ride request modal */}
      {incomingRequest && (
        <View style={styles.modalOverlay}>
          <View style={styles.incomingModal}>
            <View style={styles.incomingHeader}>
              <View style={styles.incomingPulse}>
                <Ionicons name="notifications" size={32} color="#000" />
              </View>
              <Text style={styles.incomingTitle}>Yangi buyurtma!</Text>
            </View>

            <View style={styles.incomingDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="location" size={20} color="#4CAF50" />
                <Text style={styles.detailText} numberOfLines={1}>
                  {incomingRequest.passengers?.[0]?.pickup_address || 'Hozirgi joy'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="flag" size={20} color="#E53935" />
                <Text style={styles.detailText} numberOfLines={1}>
                  {incomingRequest.passengers?.[0]?.drop_address || 'Manzil'}
                </Text>
              </View>
            </View>

            <View style={styles.incomingPrice}>
              <View style={{ flex: 1 }}>
                <Text style={styles.priceLabel}>Narxi:</Text>
                <Text style={styles.priceValue}>
                  {formatPrice(incomingRequest.total_price)} UZS
                </Text>
              </View>
              {incomingRequest.is_shared && (
                <View style={styles.sharedBadgeBig}>
                    <Ionicons name="people" size={16} color="#FFB800" />
                    <Text style={styles.sharedTextBig}>
                        {incomingRequest.share_type === 'shared_1' ? 'Sherikli (1+)' : 'Sherikli (2+)'}
                    </Text>
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.rejectBtn} 
                onPress={() => setIncomingRequest(null)}
              >
                <Text style={styles.rejectBtnText}>Rad etish</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.acceptBtnFull} 
                onPress={() => acceptRide(incomingRequest.id)}
              >
                <Text style={styles.acceptBtnText}>Qabul qilish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}



      {/* ONLINE — Status indicator only, power button moved to toggle */}
      {isOnline && !activeRide && !incomingRequest && (
        <View style={[styles.onlineFloatingInfo, { top: insets.top + (happyHour?.is_active ? 150 : 120) }]}>
           <Text style={styles.onlineFloatingText}>Safar so'rovlari kutilmoqda...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  map: { flex: 1 },
  markerCircle: {
      width: 30, height: 30, borderRadius: 15,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2, borderColor: '#FFF',
  },
  waitingContainer: {
    flex: 1, backgroundColor: '#000000',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40,
  },
  waitingIcon: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#1A1A1A',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: '#333',
  },
  waitingTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  waitingText: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22 },

  // Map tools — compact icon buttons at top
  mapToolsRow: {
    position: 'absolute', right: 16, flexDirection: 'column', gap: 10, zIndex: 10,
  },
  mapToolBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(18,18,18,0.92)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 6,
  },
  mapToolBtnActive: { backgroundColor: '#FFB800', borderColor: '#FFB800' },
  mapToolBtnActive2: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },

  statusToggleContainer: {
    position: 'absolute', left: 16, zIndex: 10,
  },
  statusToggle: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
    borderWidth: 1,
  },
  statusToggleOnline: { backgroundColor: '#FFB800', borderColor: '#DA9D00' },
  statusToggleOffline: { backgroundColor: '#1E293B', borderColor: '#334155' },
  statusToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusToggleDot: { width: 8, height: 8, borderRadius: 4 },
  statusToggleText: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Happy Hours Banner
  happyHourBanner: {
    position: 'absolute', left: 16, right: 16, zIndex: 9,
  },
  happyHourActive: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFB800', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#FFB800', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  happyHourActiveText: {
    fontSize: 12, fontWeight: '800', color: '#000', flex: 1,
  },
  happyHourUpcoming: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(18,18,18,0.88)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#333',
  },
  happyHourUpcomingText: {
    fontSize: 11, color: '#94A3B8', flex: 1,
  },

  onlineFloatingInfo: {
    position: 'absolute', top: 120, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#333',
  },
  onlineFloatingText: { color: '#FFB800', fontSize: 13, fontWeight: '700' },

  // Offline bottom panel
  offlinePanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  offlinePanelInner: {
    backgroundColor: '#121212', borderTopLeftRadius: 35, borderTopRightRadius: 35,
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24,
    borderWidth: 1, borderColor: '#1E1E1E', borderBottomWidth: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 25,
  },
  offlineStatusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6,
  },
  offlineDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#666',
  },
  offlineStatusText: {
    fontSize: 14, fontWeight: '800', color: '#666', textTransform: 'uppercase', letterSpacing: 1,
  },
  offlineHint: {
    fontSize: 14, color: '#94A3B8', marginBottom: 20, fontWeight: '500',
  },
  startWorkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFB800', paddingVertical: 18, paddingHorizontal: 28,
    borderRadius: 20, gap: 12,
    shadowColor: '#FFB800', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  startWorkIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  startWorkBtnText: {
    flex: 1, fontSize: 18, fontWeight: '900', color: '#000', textTransform: 'uppercase', letterSpacing: 1,
  },

  // Online waiting panel
  waitingRidesPanel: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  waitingRidesCard: {
    backgroundColor: '#121212', borderTopLeftRadius: 35, borderTopRightRadius: 35,
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24, alignItems: 'center',
    gap: 10, borderWidth: 1, borderColor: '#1E1E1E', borderBottomWidth: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 25,
  },
  waitingIconPulse: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#1A1A1A',
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
    borderWidth: 1, borderColor: '#FFB800',
  },
  waitingRidesText: { color: '#FFF', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  waitingSubText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  endWorkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 14, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14,
    backgroundColor: '#1A0808', borderWidth: 1, borderColor: '#442222',
  },
  endWorkBtnText: { fontSize: 14, fontWeight: '700', color: '#FF5252' },

  // Active ride panel
  activeRidePanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#121212',
    borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 20,
  },
  activeRideCard: {
    backgroundColor: '#1E1E1E', borderRadius: 25, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: '#333',
  },
  rideHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  rideStatusBadge: { backgroundColor: '#2D260D', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  rideStatusText: { fontSize: 12, fontWeight: '800', color: '#FFB800', textTransform: 'uppercase' },
  sharedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2A2A2A',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  sharedText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  ridePrice: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 20 },
  passengerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#333',
  },
  passengerIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#2D260D',
    justifyContent: 'center', alignItems: 'center',
  },
  passengerName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  passengerStatus: { fontSize: 12, color: '#94A3B8' },
  actionBtn: {
    backgroundColor: '#FFB800', paddingVertical: 18, borderRadius: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, shadowColor: '#FFB800', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  actionBtnText: { color: '#000000', fontSize: 18, fontWeight: '800' },
  actionButtonsRow: { flexDirection: 'row', gap: 12, width: '100%' },
  smallActionBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 10 },

  smallActionBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  // Incoming request modal
  modalOverlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center',
    padding: 24, zIndex: 1000,
  },
  incomingModal: {
    backgroundColor: '#121212', width: '100%', borderRadius: 30, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: '#333',
  },
  incomingHeader: { alignItems: 'center', marginBottom: 20 },
  incomingPulse: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFB800',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    shadowColor: '#FFB800', shadowRadius: 20, shadowOpacity: 0.5, elevation: 15,
  },
  incomingTitle: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 },
  incomingDetails: {
    width: '100%', backgroundColor: '#1E1E1E', padding: 20, borderRadius: 24,
    gap: 15, marginBottom: 24, borderWidth: 1, borderColor: '#333',
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  incomingPrice: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 30 },
  offlineToggleLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '800' },

  priceLabel: { fontSize: 18, color: '#94A3B8', fontWeight: '600' },
  priceValue: { fontSize: 32, fontWeight: '900', color: '#FFB800' },
  modalActions: { flexDirection: 'row', gap: 15, width: '100%' },
  rejectBtn: {
    flex: 1, paddingVertical: 18, borderRadius: 18, backgroundColor: '#1A1A1A',
    borderWidth: 1, borderColor: '#333', alignItems: 'center',
  },
  rejectBtnText: { color: '#94A3B8', fontSize: 16, fontWeight: '700' },
  acceptBtnFull: {
    flex: 2, backgroundColor: '#FFB800', paddingVertical: 18, borderRadius: 18,
    alignItems: 'center', shadowColor: '#FFB800', shadowRadius: 15, shadowOpacity: 0.4, elevation: 8,
  },
  acceptBtnText: { color: '#000000', fontSize: 20, fontWeight: '900', textTransform: 'uppercase' },
  sharedBadgeBig: {
    backgroundColor: '#2D260D', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1, borderColor: '#FFB800',
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  sharedTextBig: { color: '#FFB800', fontSize: 14, fontWeight: '800' },

  // Happy Hour Modal Styles
  hhModal: {
    backgroundColor: '#0F172A', width: '85%', borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.2)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5, shadowRadius: 30, elevation: 24,
  },
  hhHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 12 },
  hhIconBox: { 
    width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFB800', 
    justifyContent: 'center', alignItems: 'center' 
  },
  hhTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  hhSubtitle: { fontSize: 13, color: '#94A3B8', lineHeight: 20, marginBottom: 20 },
  hhList: { gap: 12, marginBottom: 24 },
  hhItem: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1E293B', padding: 16, borderRadius: 16,
    borderWidth: 1, borderColor: '#334155'
  },
  hhItemLabel: { fontSize: 14, fontWeight: '700', color: '#FFF', marginBottom: 2 },
  hhItemTime: { fontSize: 13, color: '#FFB800', fontWeight: '600' },
  hhItemBadge: { alignItems: 'flex-end' },
  hhItemRate: { fontSize: 18, fontWeight: '900', color: '#FFB800' },
  hhItemRateLabel: { fontSize: 10, color: '#94A3B8', textTransform: 'uppercase' },
  hhCloseBtn: { 
    backgroundColor: '#FFB800', paddingVertical: 14, borderRadius: 16, 
    alignItems: 'center', shadowColor: '#FFB800', shadowOpacity: 0.3, shadowRadius: 10
  },
  hhCloseBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
});
