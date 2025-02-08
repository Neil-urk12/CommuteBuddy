<template>
  <div id="map" class="map-container"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Philippines coordinates as LatLngTuple
const DEFAULT_CENTER: [number, number] = [12.8797, 121.7740]
const DEFAULT_ZOOM = 6

let map: L.Map | null = null

onMounted(() => {
  // Initialize map
  map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM)

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map)
})

onUnmounted(() => {
  if (map) {
    map.remove()
  }
})
</script>

<style scoped lang="scss">
.map-container {
  width: 100%;
  height: 100vh;
  z-index: 1;
}
</style>
