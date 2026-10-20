<script setup lang="ts">
import { ref } from 'vue';
import AppSidebar from './AppSidebar.vue';
import AppTopBar from './AppTopBar.vue';
import BottomNav from './BottomNav.vue';
import WalletSwitcher from './WalletSwitcher.vue';

const switcherOpen = ref(false);
</script>

<template>
    <!--
        < lg : top app bar + single column + bottom navigation.
        >= lg: persistent sidebar + centered content.
        --bottom-nav-h tells StickyActionBar and the page padding how much room the bottom navigation takes.
    -->
    <div class="min-h-dvh [--bottom-nav-h:calc(3.5rem_+_env(safe-area-inset-bottom))] lg:[--bottom-nav-h:0px]">
        <AppSidebar class="hidden lg:flex" />

        <div class="lg:pl-64">
            <AppTopBar class="lg:hidden" @open-switcher="switcherOpen = true" />
            <main
                class="mx-auto w-full min-w-0 max-w-6xl px-4 pt-4 pb-[calc(var(--bottom-nav-h)_+_1.5rem)] sm:px-6 lg:px-8 lg:py-8"
            >
                <slot />
            </main>
        </div>

        <BottomNav class="lg:hidden" />
        <WalletSwitcher v-model:visible="switcherOpen" />
    </div>
</template>
