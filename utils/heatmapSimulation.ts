/**
 * Goldride - Heatmap Simulation Engine
 * Generates demand zones across Tashkent districts for the driver heatmap overlay.
 * Each zone has a center, radius, and intensity level based on time of day.
 */

export interface HeatZone {
  id: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters for display
  intensity: 'high' | 'medium' | 'low';
  color: string;
  opacity: number;
  label: string;
}

const DEMAND_CENTERS = [
  { name: 'Chorsu Bozor', lat: 41.3261, lng: 69.2293, baseIntensity: 0.8 },
  { name: 'Amir Temur', lat: 41.3111, lng: 69.2797, baseIntensity: 0.9 },
  { name: 'Tashkent City', lat: 41.3142, lng: 69.2488, baseIntensity: 0.95 },
  { name: 'Yunusobod Metro', lat: 41.3455, lng: 69.2845, baseIntensity: 0.7 },
  { name: 'Sergeli Bozor', lat: 41.2289, lng: 69.2274, baseIntensity: 0.6 },
  { name: 'Chilonzor Metro', lat: 41.2829, lng: 69.2132, baseIntensity: 0.75 },
  { name: 'Aeroport', lat: 41.2574, lng: 69.2811, baseIntensity: 0.85 },
  { name: 'Bektemir', lat: 41.2285, lng: 69.3400, baseIntensity: 0.4 },
  { name: 'Olmazor', lat: 41.3533, lng: 69.2154, baseIntensity: 0.5 },
  { name: 'Mirzo Ulugbek', lat: 41.3399, lng: 69.3354, baseIntensity: 0.65 },
];

/**
 * Returns a time multiplier based on the current hour.
 * Rush hours (7-9, 17-20) have higher demand.
 */
const getTimeMultiplier = (): number => {
  const hour = new Date().getHours();
  if (hour >= 7 && hour <= 9) return 1.5;    // Morning rush
  if (hour >= 12 && hour <= 14) return 1.2;   // Lunch
  if (hour >= 17 && hour <= 20) return 1.8;   // Evening rush
  if (hour >= 22 || hour <= 5) return 0.3;    // Night
  return 1.0;
};

/**
 * Gets the color for a given intensity.
 */
const getHeatColor = (intensity: number): { color: string; level: 'high' | 'medium' | 'low' } => {
  if (intensity >= 0.8) return { color: '#FF3D00', level: 'high' };
  if (intensity >= 0.5) return { color: '#FFB800', level: 'medium' };
  return { color: '#4CAF50', level: 'low' };
};

/**
 * Generates heat zones for the current time period.
 */
export const generateHeatZones = (): HeatZone[] => {
  const timeMult = getTimeMultiplier();
  
  return DEMAND_CENTERS.map((center, i) => {
    // Add slight randomness to make it feel dynamic
    const jitter = (Math.random() - 0.5) * 0.15;
    const finalIntensity = Math.min(1, Math.max(0.1, center.baseIntensity * timeMult + jitter));
    const { color, level } = getHeatColor(finalIntensity);
    
    return {
      id: `heat_${i}`,
      latitude: center.lat,
      longitude: center.lng,
      radius: 600 + finalIntensity * 800, // 600m to 1400m
      intensity: level,
      color,
      opacity: 0.15 + finalIntensity * 0.25, // 0.15 to 0.4
      label: center.name,
    };
  });
};
