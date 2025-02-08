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
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import SearchBar from './SearchBar.vue'

const DEFAULT_CENTER: [number, number] = [12.8797, 121.7740]
const DEFAULT_ZOOM = 6

let map: L.Map | null = null
const isLocating = ref(false)
const isMobile = ref(window.innerWidth <= 768)

// Pin management
const pinA = ref<L.Marker | null>(null)
const pinB = ref<L.Marker | null>(null)
const hasAnyPin = computed(() => pinA.value !== null || pinB.value !== null)

// Custom markers
const createCustomMarker = (label: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="marker-label">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  })
}

// Handle map clicks
const handleMapClick = (e: L.LeafletMouseEvent) => {
  if (!map) return
  
  const latlng = e.latlng
  
  if (!pinA.value) {
    pinA.value = L.marker(latlng, { 
      icon: createCustomMarker('A'),
      draggable: true
    }).addTo(map)
  } else if (!pinB.value) {
    pinB.value = L.marker(latlng, { 
      icon: createCustomMarker('B'),
      draggable: true
    }).addTo(map)
  }
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
</style>
