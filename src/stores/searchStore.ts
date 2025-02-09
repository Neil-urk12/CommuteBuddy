import { defineStore } from 'pinia'

interface SearchHistory {
  query: string
  timestamp: number
  lat: number | undefined
  lng: number | undefined
  isFavorite?: boolean
}

export const useSearchStore = defineStore('search', {
  state: () => ({
    history: [] as SearchHistory[],
    favorites: [] as SearchHistory[]
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

    addToFavorites(item: SearchHistory) {
      if (!this.favorites.some(f => f.query === item.query)) {
        this.favorites.push({ ...item, isFavorite: true })
        localStorage.setItem('searchFavorites', JSON.stringify(this.favorites))
      }
    },

    removeFromFavorites(query: string) {
      this.favorites = this.favorites.filter(f => f.query !== query)
      localStorage.setItem('searchFavorites', JSON.stringify(this.favorites))
    },

    loadHistory() {
      const saved = localStorage.getItem('searchHistory')
      const savedFavorites = localStorage.getItem('searchFavorites')
      
      if (saved) {
        this.history = JSON.parse(saved)
      }
      if (savedFavorites) {
        this.favorites = JSON.parse(savedFavorites)
      }
    }
  }
})
