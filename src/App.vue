<script setup lang="ts">
import Toast from 'primevue/toast';
import {Suspense} from 'vue';
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Toast />

    <!-- Main Content -->
    <main class="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Suspense>
        <router-view />
        <template #fallback>
          Loading...
        </template>
      </Suspense>
    </main>
  </div>
</template>
