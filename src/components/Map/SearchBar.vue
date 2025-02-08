<template>
  <div class="search-container">
    <div class="search-box">
      <input
        type="text"
        v-model="searchQuery"
        @input="handleInput"
        placeholder="Search location..."
        class="search-input"
      />
      <button 
        class="clear-button" 
        v-if="searchQuery" 
        @click="clearSearch"
        aria-label="Clear search"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const searchQuery = ref('')
const emit = defineEmits(['search'])

const handleInput = () => {
  emit('search', searchQuery.value)
}

const clearSearch = () => {
  searchQuery.value = ''
  emit('search', '')
}
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
  padding: 12px 40px 12px 16px;
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
</style> 