<script setup lang="ts">
  import { defineAsyncComponent } from 'vue'
  const MapView = defineAsyncComponent(() => import('../components/Map/MapView.vue'))
</script>

<template>
  <q-layout view="hHh lpR fFf">

    <q-page-container>
      <!-- <router-view /> -->
       <MapView></MapView>
    </q-page-container>

  </q-layout>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  overflow: hidden;
}
</style>
