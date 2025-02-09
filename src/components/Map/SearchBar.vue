<template>
  <div class="search-container">
    <div class="search-box">
      <input
        type="text"
        v-model="searchQuery"
        @keyup.enter="confirmSearch"
        @focus="showSuggestions = true"
        placeholder="Search location..."
        class="search-input"
      />
      <button 
        class="search-button" 
        @click="confirmSearch"
        aria-label="Search"
      >
        🔍
      </button>
      <button 
        class="clear-button" 
        v-if="searchQuery" 
        @click="clearSearch"
        aria-label="Clear search"
      >
        ✕
      </button>
    </div>

    <div v-if="showSuggestions && (searchHistory.length > 0 || searchQuery)" class="suggestions-dropdown">

      <div v-if="searchHistory.length > 0 && !searchQuery" class="suggestion-section">
        <div class="section-title">Recent Searches</div>
        <div
          v-for="item in searchHistory"
          :key="item.timestamp"
          class="suggestion-item"
          @click="selectHistoryItem(item)"
        >
          <span class="history-icon">⏱️</span>
          <span class="suggestion-text">{{ item.query }}</span>
          <span class="suggestion-time">{{ formatTime(item.timestamp) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSearchStore } from 'src/stores/searchStore'

const searchQuery = ref('')
const showSuggestions = ref(false)
const searchStore = useSearchStore()

const emit = defineEmits<{
  (e: 'search', query: string, isConfirmed: boolean): void
  (e: 'select-location', location: { lat: number, lng: number }): void
}>()

const searchHistory = computed(() => searchStore.history)

const handleInput = () => {
  // Optionally handle input changes without triggering search
}

const confirmSearch = () => {
  if (searchQuery.value.trim()) {
    emit('search', searchQuery.value, true)
    showSuggestions.value = false
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
  if (container && !container.contains(event.target as Node)) {
    showSuggestions.value = false
  }
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
}

.search-input {
  width: 100%;
  padding: 12px 80px 12px 16px;
  background: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  -webkit-appearance: none;
  appearance: none;

  &:focus {
    outline: none;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  }
}

.search-button {
  position: absolute;
  right: 40px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;

  &:hover {
    background-color: #f0f0f0;
  }
}

.clear-button {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;

  &:hover {
    background-color: #f0f0f0;
  }
}

@media (max-width: 768px) {
  .search-container {
    width: calc(100% - 32px);
  }

  .search-input {
    padding: 14px 40px 14px 16px;
  }
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  margin-top: 8px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
</style> 