import { create } from 'zustand';

interface RideLocation {
  lat: number;
  lng: number;
  address?: string;
}

interface Driver {
  id: number;
  name: string;
  phone: string;
  rating: number;
  vehicle: {
    make: string;
    model: string;
    color: string;
    plate_number: string;
  };
  lat?: number;
  lng?: number;
}

interface RideState {
  // Locations
  pickup: RideLocation | null;
  destination: RideLocation | null;

  // Ride info
  rideId: number | null;
  rideRequestId: number | null;
  status: string | null;
  isShared: boolean;
  estimatedPrice: number | null;
  sharedPrice: number | null;
  estimatedDistance: number | null;
  estimatedDuration: number | null;

  // Driver info (for passenger)
  driver: Driver | null;
  driverLocation: { lat: number; lng: number } | null;
  
  // External dispatch
  externalProvider: string | null;
  externalPrice: number | null;
  externalEta: string | null;

  // Actions
  setPickup: (location: RideLocation) => void;
  setDestination: (location: RideLocation) => void;
  setIsShared: (shared: boolean) => void;
  setEstimate: (data: {
    regular_price: number;
    shared_price: number;
    distance_km: number;
    estimated_duration_min: number;
  }) => void;
  setRide: (rideId: number, requestId: number) => void;
  setStatus: (status: string) => void;
  setDriver: (driver: Driver) => void;
  setDriverLocation: (lat: number, lng: number) => void;
  setExternalDispatch: (provider: string, price: number | null, eta?: string | null) => void;
  resetRide: () => void;
}

export const useRideStore = create<RideState>((set) => ({
  pickup: null,
  destination: null,
  rideId: null,
  rideRequestId: null,
  status: null,
  isShared: true,
  estimatedPrice: null,
  sharedPrice: null,
  estimatedDistance: null,
  estimatedDuration: null,
  driver: null,
  driverLocation: null,
  externalProvider: null,
  externalPrice: null,
  externalEta: null,

  setPickup: (location) => set({ pickup: location }),
  setDestination: (location) => set({ destination: location }),
  setIsShared: (shared) => set({ isShared: shared }),

  setEstimate: (data) =>
    set({
      estimatedPrice: data.regular_price,
      sharedPrice: data.shared_price,
      estimatedDistance: data.distance_km,
      estimatedDuration: data.estimated_duration_min,
    }),

  setRide: (rideId, requestId) =>
    set({ rideId, rideRequestId: requestId, status: 'searching' }),

  setStatus: (status) => set({ status }),
  setDriver: (driver) => set({ driver }),
  setDriverLocation: (lat, lng) => set({ driverLocation: { lat, lng } }),
  setExternalDispatch: (provider: string, price: number | null, eta: string | null = null) => 
    set({ externalProvider: provider, externalPrice: price, externalEta: eta }),

  resetRide: () =>
    set({
      rideId: null,
      rideRequestId: null,
      status: null,
      estimatedPrice: null,
      sharedPrice: null,
      estimatedDistance: null,
      estimatedDuration: null,
      driver: null,
      driverLocation: null,
      pickup: null,
      destination: null,
      externalProvider: null,
      externalPrice: null,
      externalEta: null,
    }),
}));
