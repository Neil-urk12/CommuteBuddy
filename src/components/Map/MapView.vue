<template>
  <div class="map-wrapper">
    <SearchBar @search="handleSearch" />
    <div id="map" class="map-container">
      <button 
        class="location-button" 
        @click="goToCurrentLocation"
        :class="{ 'is-locating': isLocating }"
        aria-label="Get current location"
      >
        <span class="location-icon">📍</span>
        <span class="loading-spinner" v-if="isLocating"></span>
      </button>
      <button 
        class="reset-button" 
        @click="resetPins"
        v-if="hasAnyPin"
        aria-label="Reset pins"
      >
        Reset
      </button>
      
      <!-- Add this new distance display -->
      <div 
        v-if="hasBothPins && distance !== null" 
        class="distance-display"
      >
        <div class="distance-value">
          {{ distance.toFixed(2) }} km
        </div>
        <div class="distance-label">
          Direct distance
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import SearchBar from './SearchBar.vue'
import type { LatLng, LatLngExpression } from 'leaflet'

const DEFAULT_CENTER: [number, number] = [12.8797, 121.7740]
const DEFAULT_ZOOM = 6

let map: L.Map | null = null
const isLocating = ref(false)
const isMobile = ref(window.innerWidth <= 768)

// Pin management
const pinA = ref<L.Marker | null>(null)
const pinB = ref<L.Marker | null>(null)
const hasAnyPin = computed(() => pinA.value !== null || pinB.value !== null)
const hasBothPins = computed(() => pinA.value !== null && pinB.value !== null)

// Custom markers
const createCustomMarker = (label: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="marker-label">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  })
}

// Add these new refs and state variables after the existing ones
const routeLine = ref<L.Polyline | null>(null)
const distance = ref<number | null>(null)
// const isCalculating = ref(false)

// Handle map clicks
const handleMapClick = (e: L.LeafletMouseEvent) => {
  if (!map) return
  
  const latlng = e.latlng
  
  if (!pinA.value) {
    pinA.value = L.marker(latlng, { 
      icon: createCustomMarker('A'),
      draggable: true
    }).addTo(map)
    
    // Add drag end handler for pin A
    pinA.value.on('dragend', () => { void updateRoute() })
  } else if (!pinB.value) {
    pinB.value = L.marker(latlng, { 
      icon: createCustomMarker('B'),
      draggable: true
    }).addTo(map)
    pinB.value.on('dragend', () => { void updateRoute() })
    void updateRoute()
  }
}

// Add this utility function to decode the polyline
const decodePolyline = (str: string): LatLngExpression[] => {
  const points: LatLngExpression[] = []
  let index = 0, lat = 0, lng = 0

  while (index < str.length) {
    let shift = 0, result = 0
    
    do {
      result |= (str.charCodeAt(index) - 63 - 1) << shift
      shift += 5
      index++
    } while (str.charCodeAt(index - 1) >= 0x20)

    lat += ((result & 1) ? ~(result >> 1) : (result >> 1))
    
    shift = 0
    result = 0
    
    do {
      result |= (str.charCodeAt(index) - 63 - 1) << shift
      shift += 5
      index++
    } while (str.charCodeAt(index - 1) >= 0x20)
    
    lng += ((result & 1) ? ~(result >> 1) : (result >> 1))
    
    points.push([lat / 1e5, lng / 1e5])
  }
  
  return points
}

// Update the updateRoute function
const updateRoute = async () => {
  if (!map || !pinA.value || !pinB.value) return
  
  if (routeLine.value) {
    routeLine.value.remove()
    routeLine.value = null
  }
  
  const pointA = pinA.value.getLatLng()
  const pointB = pinB.value.getLatLng()
  
  try {
    const url = `https://graphhopper.com/api/1/route?point=${pointA.lat},${pointA.lng}&point=${pointB.lat},${pointB.lng}&vehicle=car&key=${import.meta.env.VITE_GRAPH_HOPPER_API_KEY}&points_encoded=false`
    console.log('Fetching route:', url)
    const response = await fetch(url)
    const data = await response.json()
    console.log('Route response:', data)

    if (data.paths?.[0]?.points?.coordinates) {
      const coordinates = data.paths[0].points.coordinates
      console.log('Route coordinates:', coordinates)
      
      routeLine.value = L.polyline(coordinates.map((coord: number[]) => [coord[1], coord[0]]), {
        color: '#007AFF',
        weight: 3,
        opacity: 0.8
      }).addTo(map)
      
      distance.value = data.paths[0].distance / 1000 // Convert to km
      
      // Update distance label
      const distanceDisplay = document.querySelector('.distance-label')
      if (distanceDisplay) {
        distanceDisplay.textContent = 'Road distance'
      }
    } else {
      throw new Error('Invalid route data')
    }
  } catch (error) {
    console.warn('Routing failed, falling back to direct line:', error)
    // Fallback to straight line
    routeLine.value = L.polyline([
      [pointA.lat, pointA.lng],
      [pointB.lat, pointB.lng]
    ], {
      color: '#007AFF',
      weight: 3,
      opacity: 0.8,
      dashArray: '5, 10'
    }).addTo(map)
    
    distance.value = calculateDistance(pointA, pointB)
  }

  map.fitBounds([
    [pointA.lat, pointA.lng],
    [pointB.lat, pointB.lng]
  ], {
    padding: [50, 50]
  })
}

// Reset pins
const resetPins = () => {
  if (pinA.value) {
    pinA.value.remove()
    pinA.value = null
  }
  if (pinB.value) {
    pinB.value.remove()
    pinB.value = null
  }
  if (routeLine.value) {
    routeLine.value.remove()
    routeLine.value = null
  }
  distance.value = null
}

// Handle window resize
const handleResize = () => {
  isMobile.value = window.innerWidth <= 768
  if (map) {
    map.removeControl(map.zoomControl)
    if (!isMobile.value) {
      L.control.zoom({ position: 'topright' }).addTo(map)
    }
  }
}

// Search handling
const handleSearch = async (query: string) => {
  if (!query) return
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
    )
    const data = await response.json()
    
    if (data && data.length > 0 && map) {
      const { lat, lon } = data[0]
      map.setView([parseFloat(lat), parseFloat(lon)], 15)
    }
  } catch (error) {
    console.error('Search error:', error)
  }
}

const goToCurrentLocation = async () => {
  if (!map || isLocating.value) return

  isLocating.value = true

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      })
    })

    const { latitude, longitude } = position.coords
    map.setView([latitude, longitude], 15)
  } catch (error) {
    console.error('Error getting location:', error)
  } finally {
    isLocating.value = false
  }
}

// Add this utility function for calculating distance
const calculateDistance = (latlng1: L.LatLng, latlng2: L.LatLng): number => {
  const R = 6371 // Earth's radius in km
  const dLat = (latlng2.lat - latlng1.lat) * Math.PI / 180
  const dLon = (latlng2.lng - latlng1.lng) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(latlng1.lat * Math.PI / 180) * Math.cos(latlng2.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

onMounted(() => {
  map = L.map('map', {
    zoomControl: !isMobile.value
  }).setView(DEFAULT_CENTER, DEFAULT_ZOOM)

  if (!isMobile.value) {
    L.control.zoom({ position: 'topright' }).addTo(map)
  }

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map)

  // Add map click handler
  map.on('click', handleMapClick)

  // Add resize listener
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (map) {
    map.off('click', handleMapClick)
    if (routeLine.value) routeLine.value.remove()
    map.remove()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped lang="scss">
.map-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100%;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
  position: relative;
  touch-action: manipulation;
}

.location-button {
  position: fixed;
  bottom: max(env(safe-area-inset-bottom, 24px), 24px);
  right: 16px;
  z-index: 1000;
  background: white;
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  padding: 12px;
  touch-action: manipulation;
  
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  
  &:hover {
    background-color: #f0f0f0;
  }

  &:active {
    background-color: #e0e0e0;
    transform: scale(0.95);
  }

  &.is-locating {
    background-color: #f0f0f0;
    pointer-events: none;
  }
}

.location-icon {
  font-size: 24px;
  line-height: 1;
}

.loading-spinner {
  position: absolute;
  width: 24px;
  height: 24px;
  border: 2px solid transparent;
  border-top-color: #666;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.reset-button {
  position: fixed;
  bottom: max(env(safe-area-inset-bottom, 24px), 24px);
  left: 16px;
  z-index: 1000;
  background: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: #f0f0f0;
  }

  &:active {
    background-color: #e0e0e0;
    transform: scale(0.98);
  }
}

:global(.custom-marker) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:global(.marker-label) {
  width: 32px;
  height: 32px;
  background: #007AFF;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  
  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid #007AFF;
  }
}

@media (max-width: 768px) {
  .location-button {
    bottom: max(env(safe-area-inset-bottom, 24px), 24px);
    right: 16px;
    width: 52px;
    height: 52px;
    padding: 10px;
  }

  .location-icon {
    font-size: 22px;
  }

  .reset-button {
    bottom: max(env(safe-area-inset-bottom, 88px), 88px);
    padding: 10px 20px;
  }

  // Hide default zoom controls on mobile
  :deep(.leaflet-control-zoom) {
    display: none;
  }
}

@supports (padding: max(0px)) {
  .location-button {
    padding-bottom: max(12px, env(safe-area-inset-bottom, 12px));
    bottom: max(env(safe-area-inset-bottom, 16px), 16px);
  }
}

.distance-display {
  position: fixed;
  top: 80px; // Below search bar
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border-radius: 8px;
  padding: 12px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  text-align: center;
  z-index: 1000;
  
  .distance-value {
    font-size: 18px;
    font-weight: 600;
    color: #007AFF;
  }
  
  .distance-label {
    font-size: 12px;
    color: #666;
    margin-top: 4px;
  }
}

@media (max-width: 768px) {
  .distance-display {
    top: auto;
    bottom: max(env(safe-area-inset-bottom, 152px), 152px);
    padding: 10px 16px;
    
    .distance-value {
      font-size: 16px;
    }
    
    .distance-label {
      font-size: 11px;
    }
  }
}
</style>
