<template>
  <div class="directions-container" v-if="showDirections">
    <div class="directions-box">
      <!-- Origin Search -->
      <div class="search-row">
        <div class="pin-marker">A</div>
        <input
          type="text"
          v-model="originQuery"
          @focus="showOriginSuggestions = true"
          @blur="handleOriginBlur"
          @input="handleOriginInput"
          placeholder="Choose starting point, or click on the map"
          class="search-input"
        />
        <button 
          v-if="originQuery" 
          @click="clearOrigin"
          class="clear-button"
        >✕</button>
      </div>

      <!-- Destination Search -->
      <div class="search-row">
        <div class="pin-marker">B</div>
        <input
          type="text"
          v-model="destQuery"
          @focus="showDestSuggestions = true"
          @blur="handleDestBlur"
          @input="handleDestInput"
          placeholder="Choose destination..."
          class="search-input"
        />
        <button 
          v-if="destQuery" 
          @click="clearDest"
          class="clear-button"
        >✕</button>
      </div>

      <!-- Cancel Button -->
      <div class="cancel-row">
        <button class="cancel-button" @click="closeDirections">
          Cancel
        </button>
      </div>
    </div>

    <!-- Origin Suggestions -->
    <div v-if="showOriginSuggestions" class="suggestions-container">
      <!-- Search Results -->
      <div v-if="originQuery" class="suggestions-dropdown">
        <div v-if="originSuggestions.length === 0" class="empty-state">
          No results found
        </div>
        <div
          v-else
          v-for="suggestion in originSuggestions"
          :key="suggestion.place_id"
          class="suggestion-item"
          @click="selectOrigin(suggestion)"
        >
          <span class="suggestion-icon">📍</span>
          <div class="suggestion-text">
            <div>{{ suggestion.display_name }}</div>
            <div class="suggestion-address">{{ suggestion.address }}</div>
          </div>
        </div>
      </div>

      <!-- Favorites and History when not searching -->
      <template v-else>
        <!-- Favorites Section -->
        <div v-if="favorites.length > 0" class="suggestions-dropdown">
          <div class="section-header">Saved places</div>
          <div class="scrollable-section">
            <div
              v-for="favorite in favorites"
              :key="favorite.query"
              class="suggestion-item"
              @click="selectHistoryItem('origin', favorite)"
            >
              <span class="suggestion-icon">⭐</span>
              <div class="suggestion-text">{{ favorite.query }}</div>
            </div>
          </div>
        </div>

        <!-- Recent Searches Section -->
        <div v-if="searchHistory.length > 0" class="suggestions-dropdown">
          <div class="section-header">Recent</div>
          <div class="scrollable-section">
            <div
              v-for="item in searchHistory"
              :key="item.timestamp"
              class="suggestion-item"
              @click="selectHistoryItem('origin', item)"
            >
              <span class="suggestion-icon">🕒</span>
              <div class="suggestion-text">{{ item.query }}</div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Destination Suggestions -->
    <div v-if="showDestSuggestions" class="suggestions-container">
      <!-- Search Results -->
      <div v-if="destQuery" class="suggestions-dropdown">
        <div v-if="destSuggestions.length === 0" class="empty-state">
          No results found
        </div>
        <div
          v-else
          v-for="suggestion in destSuggestions"
          :key="suggestion.place_id"
          class="suggestion-item"
          @click="selectDest(suggestion)"
        >
          <span class="suggestion-icon">📍</span>
          <div class="suggestion-text">
            <div>{{ suggestion.display_name }}</div>
            <div class="suggestion-address">{{ suggestion.address }}</div>
          </div>
        </div>
      </div>

      <!-- Favorites and History when not searching -->
      <template v-else>
        <!-- Favorites Section -->
        <div v-if="favorites.length > 0" class="suggestions-dropdown">
          <div class="section-header">Saved places</div>
          <div class="scrollable-section">
            <div
              v-for="favorite in favorites"
              :key="favorite.query"
              class="suggestion-item"
              @click="selectHistoryItem('dest', favorite)"
            >
              <span class="suggestion-icon">⭐</span>
              <div class="suggestion-text">{{ favorite.query }}</div>
            </div>
          </div>
        </div>

        <!-- Recent Searches Section -->
        <div v-if="searchHistory.length > 0" class="suggestions-dropdown">
          <div class="section-header">Recent</div>
          <div class="scrollable-section">
            <div
              v-for="item in searchHistory"
              :key="item.timestamp"
              class="suggestion-item"
              @click="selectHistoryItem('dest', item)"
            >
              <span class="suggestion-icon">🕒</span>
              <div class="suggestion-text">{{ item.query }}</div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSearchStore } from 'src/stores/searchStore'

const props = withDefaults(defineProps<{
  modelValue?: boolean
}>(), {
  modelValue: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update-pin', type: 'A' | 'B', location: { lat: number, lng: number }): void
}>()

const showDirections = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const originQuery = ref('')
const destQuery = ref('')
const showOriginSuggestions = ref(false)
const showDestSuggestions = ref(false)
const originSuggestions = ref<any[]>([])
const destSuggestions = ref<any[]>([])

const searchStore = useSearchStore()
const searchHistory = computed(() => searchStore.history)
const favorites = computed(() => searchStore.favorites)

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays} days ago`
}

const selectHistoryItem = (type: 'origin' | 'dest', item: any) => {
  if (type === 'origin') {
    originQuery.value = item.query
    if (item.lat && item.lng) {
      emit('update-pin', 'A', { lat: item.lat, lng: item.lng })
    }
    showOriginSuggestions.value = false
  } else {
    destQuery.value = item.query
    if (item.lat && item.lng) {
      emit('update-pin', 'B', { lat: item.lat, lng: item.lng })
    }
    showDestSuggestions.value = false
  }
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

const handleOriginInput = debounce(async () => {
  if (!originQuery.value.trim()) {
    originSuggestions.value = []
    return
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `format=json&` +
      `q=${encodeURIComponent(originQuery.value)}&` +
      `viewbox=116.94,4.58,126.60,21.12&` +
      `bounded=0&` +
      `countrycodes=ph&` +
      `limit=8`
    )
    const data = await response.json()
    originSuggestions.value = data
  } catch (error) {
    console.error('Search error:', error)
    originSuggestions.value = []
  }
}, 300)

const handleDestInput = debounce(async () => {
  if (!destQuery.value.trim()) {
    destSuggestions.value = []
    return
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `format=json&` +
      `q=${encodeURIComponent(destQuery.value)}&` +
      `viewbox=116.94,4.58,126.60,21.12&` +
      `bounded=0&` +
      `countrycodes=ph&` +
      `limit=8`
    )
    const data = await response.json()
    destSuggestions.value = data
  } catch (error) {
    console.error('Search error:', error)
    destSuggestions.value = []
  }
}, 300)

const selectOrigin = (suggestion: any) => {
  originQuery.value = suggestion.display_name
  showOriginSuggestions.value = false
  emit('update-pin', 'A', {
    lat: parseFloat(suggestion.lat),
    lng: parseFloat(suggestion.lon)
  })
}

const selectDest = (suggestion: any) => {
  destQuery.value = suggestion.display_name
  showDestSuggestions.value = false
  emit('update-pin', 'B', {
    lat: parseFloat(suggestion.lat),
    lng: parseFloat(suggestion.lon)
  })
}

const clearOrigin = () => {
  originQuery.value = ''
  originSuggestions.value = []
}

const clearDest = () => {
  destQuery.value = ''
  destSuggestions.value = []
}

const closeDirections = () => {
  showDirections.value = false
  clearOrigin()
  clearDest()
}

const confirmOriginSearch = () => {
  if (originQuery.value.trim()) {
    handleOriginInput()
  }
}

const confirmDestSearch = () => {
  if (destQuery.value.trim()) {
    handleDestInput()
  }
}

const swapLocations = () => {
  const tempQuery = originQuery.value
  originQuery.value = destQuery.value
  destQuery.value = tempQuery
  
  // If both locations are set, swap the pins too
  if (originQuery.value && destQuery.value) {
    void handleOriginInput()
    void handleDestInput()
  }
}

const handleOriginBlur = () => {
  setTimeout(() => {
    showOriginSuggestions.value = false
  }, 200)
}

const handleDestBlur = () => {
  setTimeout(() => {
    showDestSuggestions.value = false
  }, 200)
}

defineExpose({
  showDirections
})
</script>

<style scoped lang="scss">
.directions-container {
  position: fixed;
  top: max(env(safe-area-inset-top, 16px), 16px);
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 400px;
  z-index: 1000;
}

.directions-box {
  background: white;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  
  &:first-child {
    border-bottom: 1px solid #eee;
  }
}

.pin-marker {
  width: 24px;
  height: 24px;
  min-width: 24px;
  background: #1a73e8;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.search-input {
  flex: 1;
  padding: 8px;
  border: none;
  font-size: 14px;
  background: transparent;

  &:focus {
    outline: none;
  }
}

.clear-button {
  background: none;
  border: none;
  padding: 4px 8px;
  color: #666;
  cursor: pointer;
  font-size: 14px;
}

.suggestions-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.suggestions-dropdown {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.section-header {
  padding: 12px 16px;
  font-weight: 500;
  color: #202124;
  border-bottom: 1px solid #eee;
}

.scrollable-section {
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 12px;
  display: flex;
  align-items: center;
  cursor: pointer;
  
  &:hover {
    background: #f5f5f5;
  }
}

.suggestion-icon {
  margin-right: 12px;
  font-size: 16px;
  color: #666;
}

.suggestion-text {
  flex: 1;
  font-size: 14px;
}

.suggestion-address {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.empty-state {
  padding: 12px;
  color: #999;
  font-size: 14px;
  font-style: italic;
  text-align: center;
}

.cancel-row {
  padding: 8px;
  border-top: 1px solid #eee;
  text-align: right;
}

.cancel-button {
  background: none;
  border: none;
  padding: 8px 16px;
  font-size: 14px;
  color: #1a73e8;
  cursor: pointer;

  &:hover {
    background: #f8f9fa;
    border-radius: 4px;
  }
}

@media (max-width: 768px) {
  .directions-container {
    width: calc(100% - 32px);
  }
}
</style> 