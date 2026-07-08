<script setup lang="ts">
import AppNavbar from './AppNavbar.vue';
import AppBreadcrumb from './AppBreadcrumb.vue';
import { useUiStore } from '../../stores/uiStore';
import { storeToRefs } from 'pinia';

const uiStore = useUiStore();
const { sidebarOpen } = storeToRefs(uiStore);
</script>

<template>
    <AppNavbar />
    <main class="pt-14 m-8 mt-4 px-4 sm:px-6 lg:px-8 pb-8" :style="{ paddingLeft: sidebarOpen ? '16rem' : '0' }">
        <AppBreadcrumb />
        <router-view />
    </main>
</template>
