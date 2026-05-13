import { HeatZone } from './heatmapSimulation';

export interface VirtualDriver {
  id: string;
  current_lat: number;
  current_lng: number;
  is_virtual: boolean;
  angle: number; // for movement simulation
}

const TASHKENT_DISTRICTS = [
  { name: 'Yunusobod', lat: 41.3653, lng: 69.2882 },
  { name: 'Chilonzor', lat: 41.2829, lng: 69.2132 },
  { name: 'Mirzo Ulugbek', lat: 41.3262, lng: 69.3274 },
  { name: 'Shaykhontohur', lat: 41.3214, lng: 69.2294 },
  { name: 'Mirobod', lat: 41.2914, lng: 69.2744 },
  { name: 'Uchtepa', lat: 41.2950, lng: 69.1754 },
];

/**
 * Generates an initial set of virtual drivers
 */
export const generateVirtualDrivers = (): VirtualDriver[] => {
  return TASHKENT_DISTRICTS.map((district, index) => ({
    id: `virtual_${index}`,
    current_lat: district.lat + (Math.random() - 0.5) * 0.005,
    current_lng: district.lng + (Math.random() - 0.5) * 0.005,
    is_virtual: true,
    angle: Math.random() * Math.PI * 2,
  }));
};

/**
 * Updates virtual driver positions to simulate movement
 */
export const updateVirtualPositions = (drivers: VirtualDriver[]): VirtualDriver[] => {
  return drivers.map(d => {
    const newAngle = d.angle + (Math.random() - 0.5) * 0.2;
    // Move slowly: ~5-10 meters
    const latOffset = Math.sin(newAngle) * 0.00005;
    const lngOffset = Math.cos(newAngle) * 0.00005;
    
    return {
      ...d,
      current_lat: d.current_lat + latOffset,
      current_lng: d.current_lng + lngOffset,
      angle: newAngle,
    };
  });
};

/**
 * Helper to get the distance between two points (haversine approx)
 */
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Merges real drivers with virtual ones, ensuring 1 per district
 */
export const balanceDrivers = (realDrivers: any[], virtualDrivers: VirtualDriver[]): any[] => {
  const safeRealDrivers = Array.isArray(realDrivers) ? realDrivers : [];
  const merged: any[] = [...safeRealDrivers];
  
  TASHKENT_DISTRICTS.forEach((district, index) => {
    // Check if any real driver is within 2km of this district center
    const hasReal = safeRealDrivers.some(rd => 
      getDistance(rd.current_lat, rd.current_lng, district.lat, district.lng) < 2
    );
    
    if (!hasReal) {
      const vd = virtualDrivers[index];
      merged.push({
        id: vd.id,
        current_lat: vd.current_lat,
        current_lng: vd.current_lng,
        is_virtual: true,
      });
    }
  });

  return merged;
};

/**
 * Analyzes driver density vs demand to recommend a better area.
 */
export const getDistrictRecommendation = (
  currentLat: number,
  currentLng: number,
  allDrivers: any[],
  heatZones: HeatZone[]
): { name: string; lat: number; lng: number; bonus: number; reason: string } | null => {
  if (!allDrivers.length || !heatZones.length) return null;

  // 1. Calculate current district density
  const districtStats = TASHKENT_DISTRICTS.map(district => {
    // Count drivers within 1.5km of this district
    const driverCount = allDrivers.filter(d => 
      getDistance(d.current_lat, d.current_lng, district.lat, district.lng) < 1.5
    ).length;

    // Find corresponding heat zone intensity
    // (Simplified: find closest heat zone to district center)
    const zone = heatZones.reduce((prev, curr) => {
      const distPrev = getDistance(prev.latitude, prev.longitude, district.lat, district.lng);
      const distCurr = getDistance(curr.latitude, curr.longitude, district.lat, district.lng);
      return distCurr < distPrev ? curr : prev;
    });

    const intensityValue = zone.intensity === 'high' ? 1.0 : zone.intensity === 'medium' ? 0.6 : 0.3;
    
    // Density score: lower is better for recommendation (low supply, high demand)
    // We avoid division by zero
    const score = (driverCount + 0.1) / intensityValue;

    return { ...district, driverCount, score, intensity: zone.intensity };
  });

  // 2. Determine current district of the driver
  const currentDistrict = districtStats.reduce((prev, curr) => {
    const dPrev = getDistance(prev.lat, prev.lng, currentLat, currentLng);
    const dCurr = getDistance(curr.lat, curr.lng, currentLat, currentLng);
    return dCurr < dPrev ? curr : prev;
  });

  // 3. If current district is overcrowded (high score) or intensity is low, look for better
  const IS_OVERCROWDED = currentDistrict.score > 2.5; 
  
  if (IS_OVERCROWDED || currentDistrict.intensity !== 'high') {
    // Sort by best score (low supply/high demand)
    const sorted = [...districtStats]
      .filter(d => d.name !== currentDistrict.name)
      .sort((a, b) => a.score - b.score);
    
    const bestTarget = sorted[0];

    // Only recommend if the target is significantly better or has high intensity
    if (bestTarget.score < currentDistrict.score * 0.6 || (bestTarget.intensity === 'high' && currentDistrict.intensity !== 'high')) {
      return {
        name: bestTarget.name,
        lat: bestTarget.lat,
        lng: bestTarget.lng,
        bonus: 5000 + Math.floor(Math.random() * 5000), // Variable bonus for demo
        reason: bestTarget.intensity === 'high' ? "Hududda talab juda yuqori!" : "Haydovchilar yetishmayapti."
      };
    }
  }

  return null;
};
