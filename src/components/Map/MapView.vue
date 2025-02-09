<template>
  <div class="map-wrapper">
    <SearchBar 
      @search="handleSearch"
      @toggle-directions="toggleDirections"
      :onSearchResult="(result) => currentSearchResult = result"
    />
    <DirectionsSearch 
      ref="directionsSearch"
      v-model="isDirectionsMode"
      @update-pin="handleDirectionPin"
    />
    <div id="map" class="map-container">
      <div class="map-controls">
        <button
          class="location-button"
          @click.stop="goToCurrentLocation"
          :class="{ 'is-locating': isLocating }"
          aria-label="Get current location"
        >
          <span class="location-icon">📍</span>
          <span class="loading-spinner" v-if="isLocating"></span>
        </button>
      </div>
      <button
        class="reset-button"
        @click.stop="resetPins"
        v-if="hasAnyPin"
        aria-label="Reset pins"
      >
        Reset
      </button>

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

      <div 
        v-if="showSavePrompt" 
        class="save-prompt"
      >
        <div class="save-prompt-content">
          <span>Save "{{ lastSearchQuery }}" to favorites?</span>
          <div class="save-prompt-actions">
            <button @click="addToFavorites" class="save-button">
              Save
            </button>
            <button @click="dismissSavePrompt" class="dismiss-button">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showRouteModal" class="route-modal">
      <div class="route-modal-content">
        <h3>Available Routes</h3>
        <div class="routes-list">
          <div
            v-for="route in alternativeRoutes"
            :key="route.id"
            class="route-option"
            :class="{ active: selectedRoute === route.id }"
            @click="selectRoute(route.id)"
          >
            <div class="route-info">
              <div class="route-time">{{ route.timeText }}</div>
              <div class="route-distance">{{ route.distanceText }}</div>
            </div>
          </div>
        </div>
        <button class="close-modal" @click="showRouteModal = false">Close</button>
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
import { useSearchStore } from 'src/stores/searchStore'
import DirectionsSearch from './DirectionsSearch.vue'

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

const routeLine = ref<L.Polyline | null>(null)
const distance = ref<number | null>(null)
const selectedRoute = ref<number>(0)
const alternativeRoutes = ref<any[]>([])
const showRouteModal = ref(false)

const searchStore = useSearchStore()

const currentSearchResult = ref<any>(null)

const showSavePrompt = ref(false)
const lastSearchQuery = ref('')

const directionsSearch = ref<any>(null)
const isDirectionsMode = ref(false)

const isLocationFavorited = (query: string) => {
  return searchStore.favorites.some(f => f.query === query)
}

const handleMapClick = (e: L.LeafletMouseEvent) => {
  if (!map) return

  const latlng = e.latlng

  if (!pinA.value) {
    pinA.value = L.marker(latlng, {
      icon: createCustomMarker('A'),
      draggable: true
    }).addTo(map!)

    pinA.value.on('dragend', () => { void updateRoute() })
  } else if (!pinB.value) {
    pinB.value = L.marker(latlng, {
      icon: createCustomMarker('B'),
      draggable: true
    }).addTo(map!)
    pinB.value.on('dragend', () => { void updateRoute() })
    void updateRoute()
  }
}

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

const updateRoute = async () => {
  if (!map || !pinA.value || !pinB.value) return

  if (routeLine.value) {
    routeLine.value.remove()
    routeLine.value = null
  }

  const pointA = pinA.value.getLatLng()
  const pointB = pinB.value.getLatLng()

  try {
    const url = `https://graphhopper.com/api/1/route?` +
      `point=${pointA.lat},${pointA.lng}&` +
      `point=${pointB.lat},${pointB.lng}&` +
      `vehicle=car&` +
      `key=${import.meta.env.VITE_GRAPH_HOPPER_API_KEY}&` +
      `points_encoded=false&` +
      `algorithm=alternative_route&` +
      `alternative_route.max_paths=10&` +
      `alternative_route.max_weight_factor=1.4&` +
      `ch.disable=true`
    const response = await fetch(url)
    const data = await response.json()

    if (data.paths?.length) {
      alternativeRoutes.value.forEach(route => {
        if (route.line) route.line.remove()
      })

      alternativeRoutes.value = data.paths.map((path: any, index: number) => {
        const coordinates = path.points.coordinates.map((coord: number[]) => [coord[1], coord[0]])
        const line = L.polyline(coordinates, {
          color: index === selectedRoute.value ? '#007AFF' : '#B0B0B0',
          weight: index === selectedRoute.value ? 4 : 3,
          opacity: index === selectedRoute.value ? 0.8 : 0.5,
          dashArray: index === selectedRoute.value ? undefined : '5, 10'
        }).addTo(map!)

        return {
          ...path,
          id: index,
          line,
          coordinates,
          timeText: formatTime(path.time),
          distanceText: formatDistance(path.distance)
        }
      })

      if (selectedRoute.value >= alternativeRoutes.value.length) {
        selectedRoute.value = 0
      }

      distance.value = alternativeRoutes.value[selectedRoute.value].distance / 1000
      showRouteModal.value = alternativeRoutes.value.length > 1
    } else {
      throw new Error('No routes found')
    }
  } catch (error) {
    console.warn('Routing failed:', error)
    routeLine.value = L.polyline([
      [pointA.lat, pointA.lng],
      [pointB.lat, pointB.lng]
    ], {
      color: '#007AFF',
      weight: 3,
      opacity: 0.8,
      dashArray: '5, 10'
    }).addTo(map!)

    distance.value = calculateDistance(pointA, pointB)
  }

  map.fitBounds([
    [pointA.lat, pointA.lng],
    [pointB.lat, pointB.lng]
  ], {
    padding: [50, 50]
  })
}

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
  alternativeRoutes.value.forEach(route => {
    if (route.line) route.line.remove()
  })
  alternativeRoutes.value = []
  
  distance.value = null
  showRouteModal.value = false
  selectedRoute.value = 0
}

const handleResize = () => {
  isMobile.value = window.innerWidth <= 768
  if (map?.zoomControl) {
    map.zoomControl.remove()

    if (!isMobile.value) {
      map.zoomControl.setPosition('topright')
      map.zoomControl.addTo(map)
    }
  }
}

const handleSearch = async (query: string, isConfirmed: boolean = false) => {
  if (!query || !isConfirmed) return

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `format=json&` +
      `q=${encodeURIComponent(query)}&` +
      `viewbox=116.94,4.58,126.60,21.12&` +
      `bounded=0&` +
      `countrycodes=ph&` +
      `limit=8`
    )
    const data = await response.json()
    
    if (data && data.length > 0 && map) {
      const { lat, lon } = data[0]
      map.setView([parseFloat(lat), parseFloat(lon)], 15)
      
      currentSearchResult.value = {
        query,
        timestamp: Date.now(),
        lat: parseFloat(lat),
        lng: parseFloat(lon)
      }
      
      searchStore.addToHistory(query, parseFloat(lat), parseFloat(lon))

      if (!isLocationFavorited(query)) {
        lastSearchQuery.value = query
        showSavePrompt.value = true
        
        setTimeout(() => {
          showSavePrompt.value = false
        }, 5000)
      }
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

const calculateDistance = (latlng1: L.LatLng, latlng2: L.LatLng): number => {
  const R = 6371
  const dLat = (latlng2.lat - latlng1.lat) * Math.PI / 180
  const dLon = (latlng2.lng - latlng1.lng) * Math.PI / 180
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(latlng1.lat * Math.PI / 180) * Math.cos(latlng2.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const formatTime = (milliseconds: number): string => {
  const minutes = Math.round(milliseconds / 60000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}min`
}

const formatDistance = (meters: number): string => {
  const km = meters / 1000
  return `${km.toFixed(1)} km`
}

const selectRoute = (routeId: number) => {
  selectedRoute.value = routeId
  void updateRoute()
}

const addCurrentToFavorites = () => {
  if (!map) return
  const center = map.getCenter()
  searchStore.addToFavorites({
    query: 'Saved Location',
    timestamp: Date.now(),
    lat: center.lat,
    lng: center.lng
  })
}

const addToFavorites = () => {
  if (!map) return
  const center = map.getCenter()
  searchStore.addToFavorites({
    query: lastSearchQuery.value,
    timestamp: Date.now(),
    lat: center.lat,
    lng: center.lng
  })
  showSavePrompt.value = false
}

const dismissSavePrompt = () => {
  showSavePrompt.value = false
}

const handleGetDirections = (location: { lat: number, lng: number }) => {
  if (!map) return

  // Set destination pin
  if (pinB.value) {
    pinB.value.remove()
  }
  pinB.value = L.marker([location.lat, location.lng], {
    icon: createCustomMarker('B'),
    draggable: true
  }).addTo(map)
  pinB.value.on('dragend', () => { void updateRoute() })

  // Set origin pin at current location if no pinA
  if (!pinA.value) {
    const center = map.getCenter()
    pinA.value = L.marker([center.lat, center.lng], {
      icon: createCustomMarker('A'),
      draggable: true
    }).addTo(map)
    pinA.value.on('dragend', () => { void updateRoute() })
  }

  void updateRoute()
}

const toggleDirections = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  if (directionsSearch.value) {
    directionsSearch.value.showDirections = !directionsSearch.value.showDirections
  }
}

const handleDirectionPin = (type: 'A' | 'B', location: { lat: number, lng: number }) => {
  if (!map) return

  const pin = type === 'A' ? pinA : pinB
  if (pin.value) {
    pin.value.remove()
  }
  
  pin.value = L.marker([location.lat, location.lng], {
    icon: createCustomMarker(type),
    draggable: true
  }).addTo(map)
  pin.value.on('dragend', () => { void updateRoute() })

  if (pinA.value && pinB.value) {
    void updateRoute()
  }
}

onMounted(() => {
  map = L.map('map', {
    zoomControl: false
  }).setView(DEFAULT_CENTER, DEFAULT_ZOOM)

  const zoomControl = L.control.zoom({
    position: isMobile.value ? undefined : 'topright'
  })

  if (!isMobile.value) {
    zoomControl.addTo(map)
  }

  map.zoomControl = zoomControl

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map)

  map.on('click', handleMapClick)

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

.map-controls {
  position: fixed;
  bottom: max(env(safe-area-inset-bottom, 24px), 24px);
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1000;
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

.favorite-button {
  position: fixed;
  bottom: max(env(safe-area-inset-bottom, 24px), 24px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  
  &:hover {
    background-color: #f0f0f0;
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
  top: 80px;
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

.route-modal {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: 16px 16px 0 0;
  padding: 20px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1001;

  h3 {
    margin: 0 0 16px;
    font-size: 18px;
  }
}

.routes-list {
  max-height: 300px;
  overflow-y: auto;
}

.route-option {
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f5f5f5;
  }

  &.active {
    background: #e6f2ff;
    border: 1px solid #007AFF;
  }
}

.route-info {
  .route-time {
    font-weight: 600;
    font-size: 16px;
  }

  .route-distance {
    font-size: 14px;
    color: #666;
    margin-top: 4px;
  }
}

.close-modal {
  width: 100%;
  padding: 12px;
  margin-top: 16px;
  border: none;
  background: #007AFF;
  color: white;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: #0056b3;
  }
}

.save-prompt {
  position: fixed;
  bottom: max(env(safe-area-inset-bottom, 88px), 88px);
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
}

.save-prompt-content {
  text-align: center;
  
  span {
    font-size: 14px;
    color: #333;
  }
}

.save-prompt-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  
  button {
    flex: 1;
    padding: 8px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    
    &.save-button {
      background: #007AFF;
      color: white;
      
      &:hover {
        background: #0056b3;
      }
    }
    
    &.dismiss-button {
      background: #f0f0f0;
      color: #666;
      
      &:hover {
        background: #e0e0e0;
      }
    }
  }
}

@keyframes slideUp {
  from {
    transform: translate(-50%, 100%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}
</style>
