<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import WalletSidebar from './WalletSidebar.vue';
import Navbar from './Navbar.vue';

const route = useRoute();

const walletId = computed(() => {
    // Extract walletId from different route params
    if (route.params.walletId) {
        return Number(route.params.walletId);
    }
    if (route.params.id) {
        return Number(route.params.id);
    }
    return null;
});

const sidebarOpen = ref(false);

function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value;
}

function closeSidebar() {
    sidebarOpen.value = false;
}
</script>

<template>
    <div class="flex h-screen overflow-hidden">
        <!-- Mobile backdrop -->
        <Transition name="fade">
            <div v-if="sidebarOpen" class="fixed inset-0 bg-black/40 z-20 lg:hidden" @click="closeSidebar" />
        </Transition>

        <!-- Sidebar -->
        <div
            v-if="walletId"
            class="fixed lg:static inset-y-0 left-0 z-30 w-64 flex-shrink-0 transition-transform duration-300 ease-in-out"
            :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
        >
            <WalletSidebar :wallet-id="walletId" @navigate="closeSidebar" />
        </div>

        <!-- Main Content -->
        <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
            <div class="container mx-auto p-4 sm:p-6">
                <div class="mb-4 flex items-center gap-3">
                    <!-- Hamburger toggle (mobile only) -->
                    <button
                        v-if="walletId"
                        class="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 flex-shrink-0"
                        @click="toggleSidebar"
                    >
                        <i class="pi pi-bars text-lg"></i>
                    </button>
                    <div class="flex-1 min-w-0">
                        <Navbar />
                    </div>
                </div>
                <router-view />
            </div>
        </div>
    </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
