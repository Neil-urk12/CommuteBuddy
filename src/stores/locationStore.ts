import { defineStore } from 'pinia'
import type { LatLng } from 'leaflet'

interface LocationState {
  lastPosition: LatLng | null
  defaultCenter: LatLng
}

export const useLocationStore = defineStore('location', {
  state: (): LocationState => ({
    lastPosition: null,
    defaultCenter: { lat: 12.8797, lng: 121.7740 } as LatLng
  }),

  actions: {
    setLastPosition(position: LatLng) {
      this.lastPosition = position
      localStorage.setItem('lastPosition', JSON.stringify(position))
    },

    loadLastPosition() {
      const saved = localStorage.getItem('lastPosition')
      if (saved) {
        this.lastPosition = JSON.parse(saved)
      }
    }
  }
})
