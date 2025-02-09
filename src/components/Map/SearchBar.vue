<template>
  <div class="search-container">
    <div class="search-box">
      <button 
        class="search-icon"
        aria-label="Search"
      >
        🔍
      </button>
      <input
        type="text"
        v-model="searchQuery"
        @keyup.enter="confirmSearch"
        @focus="showDropdown"
        @input="handleInput"
        placeholder="Search location..."
        class="search-input"
      />
      <button 
        v-if="searchQuery" 
        @click="clearSearch"
        class="clear-button"
      >✕</button>
      <div class="divider"></div>
      <button 
        class="directions-button"
        @click.stop="toggleDirections"
        aria-label="Get directions"
      >
        🗺️
      </button>
    </div>

    <div v-if="showSuggestions" class="suggestions-dropdown">
      <!-- Show search suggestions when typing -->
      <template v-if="searchQuery">
        <div v-if="currentSearchResult" class="suggestion-section">
          <div class="suggestion-item save-suggestion">
            <span class="favorite-icon">⭐</span>
            <span class="suggestion-text">
              Save "{{ currentSearchResult.query }}" to favorites
            </span>
            <button 
              class="add-favorite"
              @click.stop="addToFavorites(currentSearchResult)"
              aria-label="Add to favorites"
            >
              Save
            </button>
          </div>
        </div>

        <div class="suggestion-section">
          <div v-if="searchSuggestions.length === 0" class="empty-state">
            No results found
          </div>
          <div
            v-else
            v-for="suggestion in searchSuggestions"
            :key="suggestion.place_id"
            class="suggestion-item"
            @click="selectSuggestion(suggestion)"
          >
            <span class="suggestion-icon">📍</span>
            <div class="suggestion-text">
              <div>{{ suggestion.display_name }}</div>
              <div class="suggestion-address">{{ suggestion.address }}</div>
            </div>
            <button 
              class="get-directions"
              @click.stop="getDirections(suggestion)"
              aria-label="Get directions"
            >
              🗺️
            </button>
          </div>
        </div>
      </template>

      <!-- Show favorites and history only when not searching -->
      <template v-else>
        <!-- Favorites section -->
        <div class="suggestion-section">
          <div class="section-title">Favorites</div>
          <div v-if="favorites.length === 0" class="empty-state">
            No saved locations yet
          </div>
          <div
            v-else
            v-for="item in favorites"
            :key="item.timestamp"
            class="suggestion-item"
          >
            <span class="favorite-icon">⭐</span>
            <span class="suggestion-text" @click="selectHistoryItem(item)">
              {{ item.query }}
            </span>
            <button 
              class="remove-favorite"
              @click.stop="removeFromFavorites(item.query)"
              aria-label="Remove from favorites"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Recent searches section -->
        <div class="suggestion-section">
          <div class="section-title">Recent Searches</div>
          <div v-if="searchHistory.length === 0" class="empty-state">
            No recent searches
          </div>
          <div
            v-else
            v-for="item in searchHistory"
            :key="item.timestamp"
            class="suggestion-item"
          >
            <span class="history-icon">⏱️</span>
            <span class="suggestion-text" @click="selectHistoryItem(item)">
              {{ item.query }}
            </span>
            <button 
              v-if="!isFavorite(item)"
              class="add-favorite"
              @click.stop="addToFavorites(item)"
              aria-label="Add to favorites"
            >
              ☆
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSearchStore } from 'src/stores/searchStore'

const searchQuery = ref('')
const showSuggestions = ref(false)
const searchStore = useSearchStore()
const currentSearchResult = ref<any>(null)
const searchSuggestions = ref<any[]>([])

const props = defineProps<{
  onSearchResult?: (result: any) => void
}>()

const emit = defineEmits<{
  (e: 'search', query: string, isConfirmed: boolean): void
  (e: 'select-location', location: { lat: number, lng: number }): void
  (e: 'get-directions', location: { lat: number, lng: number }): void
  (e: 'toggle-directions', event: MouseEvent): void
}>()

const searchHistory = computed(() => searchStore.history)
const favorites = computed(() => searchStore.favorites)

const showDropdown = () => {
  showSuggestions.value = true
}

const debounce = (fn: Function, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      fn(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

const handleInput = debounce(async () => {
  showSuggestions.value = true
  
  if (!searchQuery.value.trim()) {
    searchSuggestions.value = []
    return
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `format=json&` +
      `q=${encodeURIComponent(searchQuery.value)}&` +
      `viewbox=116.94,4.58,126.60,21.12&` +
      `bounded=0&` +
      `countrycodes=ph&` +
      `limit=8`
    )
    const data = await response.json()
    searchSuggestions.value = data
  } catch (error) {
    console.error('Search suggestions error:', error)
    searchSuggestions.value = []
  }
}, 300)

const confirmSearch = () => {
  if (searchQuery.value.trim()) {
    emit('search', searchQuery.value, true)
    currentSearchResult.value = null
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  emit('search', '', false)
}

const selectHistoryItem = (item: any) => {
  searchQuery.value = item.query
  emit('search', item.query, true)
  if (item.lat && item.lng) {
    emit('select-location', { lat: item.lat, lng: item.lng })
  }
  showSuggestions.value = false
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays} days ago`
}

const handleClickOutside = (event: MouseEvent) => {
  const container = document.querySelector('.search-container')
  const target = event.target as HTMLElement
  
  if (container && !container.contains(target)) {
    // Don't close if clicking the input or if it's focused
    const input = container.querySelector('input')
    if (document.activeElement !== input) {
      showSuggestions.value = false
    }
  }
}

const isFavorite = (item: any) => {
  return favorites.value.some(f => f.query === item.query)
}

const addToFavorites = (item: any) => {
  searchStore.addToFavorites(item)
  currentSearchResult.value = null
}

const removeFromFavorites = (query: string) => {
  searchStore.removeFromFavorites(query)
}

const selectSuggestion = (suggestion: any) => {
  searchQuery.value = suggestion.display_name
  emit('search', suggestion.display_name, true)
  if (suggestion.lat && suggestion.lon) {
    emit('select-location', { 
      lat: parseFloat(suggestion.lat), 
      lng: parseFloat(suggestion.lon) 
    })
  }
  showSuggestions.value = false
}

const getDirections = (suggestion: any) => {
  if (suggestion.lat && suggestion.lon) {
    emit('get-directions', { 
      lat: parseFloat(suggestion.lat), 
      lng: parseFloat(suggestion.lon) 
    })
  }
  showSuggestions.value = false
}

const toggleDirections = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  emit('toggle-directions', e)
}

onMounted(() => {
  searchStore.loadHistory()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped lang="scss">
.search-container {
  position: fixed;
  top: max(env(safe-area-inset-top, 16px), 16px);
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 400px;
  z-index: 1000;
}

.search-box {
  position: relative;
  width: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  padding: 4px 8px;
}

.search-icon {
  background: none;
  border: none;
  padding: 8px;
  color: #666;
  cursor: pointer;
}

.search-input {
  flex: 1;
  padding: 8px;
  border: none;
  font-size: 16px;
  background: transparent;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: #666;
  }
}

.divider {
  width: 1px;
  height: 24px;
  background: #ddd;
  margin: 0 8px;
}

.directions-button {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #666;
  font-size: 20px;
  
  &:hover {
    color: #007AFF;
  }
}

.clear-button {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .search-container {
    width: calc(100% - 32px);
    max-width: none;
  }

  .search-box {
    padding: 8px;
  }

  .search-input {
    font-size: 16px; // Prevents iOS zoom on focus
  }

  .suggestions-dropdown {
    position: fixed;
    top: max(env(safe-area-inset-top, 72px), 72px);
    left: 16px;
    right: 16px;
    bottom: 0;
    max-height: none;
    border-radius: 12px 12px 0 0;
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.1);
  }

  .suggestion-item {
    padding: 16px;
  }

  .section-title {
    padding: 16px;
  }
}

// Add iOS safe area support
@supports (padding: max(0px)) {
  .search-container {
    padding-top: max(0px, env(safe-area-inset-top));
    padding-left: max(16px, env(safe-area-inset-left));
    padding-right: max(16px, env(safe-area-inset-right));
  }
}

.suggestions-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  z-index: 1000;
}

.suggestion-section {
  padding: 8px 0;
  
  .section-title {
    padding: 8px 16px;
    font-size: 12px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.suggestion-item {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
  
  &:hover {
    background: #f5f5f5;
  }
  
  .history-icon {
    margin-right: 12px;
    font-size: 16px;
  }
  
  .suggestion-text {
    flex: 1;
    font-size: 14px;
  }
  
  .suggestion-time {
    font-size: 12px;
    color: #666;
    margin-left: 8px;
  }
}

.add-favorite,
.remove-favorite {
  background: none;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  color: #666;
  font-size: 16px;
  
  &:hover {
    color: #007AFF;
  }
}

.favorite-icon {
  margin-right: 12px;
  font-size: 16px;
  color: #FFD700;
}

.empty-state {
  padding: 12px 16px;
  color: #999;
  font-size: 14px;
  font-style: italic;
}

.save-suggestion {
  background-color: #f8f9fa;
  border-bottom: 1px solid #eee;
  
  .suggestion-text {
    color: #007AFF;
    font-weight: 500;
  }
  
  .add-favorite {
    background-color: #007AFF;
    color: white;
    padding: 4px 12px;
    border-radius: 4px;
    
    &:hover {
      background-color: #0056b3;
      color: white;
    }
  }
}

.suggestion-icon {
  margin-right: 12px;
  font-size: 16px;
  color: #666;
}

.suggestion-address {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.get-directions {
  background: none;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  color: #666;
  font-size: 16px;
  margin-left: 8px;
  
  &:hover {
    color: #007AFF;
  }
}
</style> 