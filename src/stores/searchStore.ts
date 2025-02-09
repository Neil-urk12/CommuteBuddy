import { defineStore } from 'pinia'

interface SearchHistory {
  query: string
  timestamp: number
  lat: number | undefined
  lng: number | undefined
}

export const useSearchStore = defineStore('search', {
  state: () => ({
    history: [] as SearchHistory[],
    savedLocations: [] as SearchHistory[]
  }),

  actions: {
    addToHistory(query: string, lat?: number, lng?: number) {
      const entry = {
        query,
        timestamp: Date.now(),
        lat,
        lng
      }

      this.history = [
        entry,
        ...this.history.filter(h => h.query !== query)
      ].slice(0, 5)

      localStorage.setItem('searchHistory', JSON.stringify(this.history))
    },

    loadHistory() {
      const saved = localStorage.getItem('searchHistory')
      if (saved) {
        this.history = JSON.parse(saved)
      }
    }
  }
})
