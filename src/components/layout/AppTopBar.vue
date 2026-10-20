<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import Menu from 'primevue/menu';
import { useActiveWallet } from '../../composables/useActiveWallet.ts';
import { useAppMenuActions } from '../../composables/useAppMenuActions.ts';
import { iconButtonClass } from '../ui/classes.ts';

const emit = defineEmits<{ (e: 'open-switcher'): void }>();

const route = useRoute();
const router = useRouter();
const { activeWallet } = useActiveWallet();
const { menuItems } = useAppMenuActions();
const menu = ref<InstanceType<typeof Menu>>();

const showBack = computed(() => route.name !== 'home');

// vue-router keeps the previous location in history.state: without it (deep link), go to the wallet list.
function goBack() {
    if (window.history.state?.back) router.back();
    else router.push('/');
}
</script>

<template>
    <!-- Mobile and tablet app bar. From `lg` the sidebar takes over (see AppShell). -->
    <header class="sticky top-0 z-40 border-b border-line bg-surface/95 pt-safe backdrop-blur">
        <div class="flex h-14 items-center gap-1 px-2 pl-safe pr-safe">
            <button v-if="showBack" type="button" :class="iconButtonClass" aria-label="Back" @click="goBack">
                <i class="pi pi-arrow-left" aria-hidden="true" />
            </button>
            <RouterLink
                to="/"
                class="flex min-h-11 min-w-0 items-center gap-2 rounded-control px-2"
                :class="showBack ? 'hidden sm:flex' : ''"
            >
                <img src="/carmentis-logo.png" alt="" class="h-7 w-auto" />
                <span class="truncate text-base font-semibold text-fg">Carmentis Desk</span>
            </RouterLink>

            <div class="flex-1" />

            <button
                v-if="activeWallet"
                type="button"
                class="flex min-h-11 max-w-[11rem] items-center gap-2 rounded-control border border-line px-3 text-sm font-medium text-fg hover:bg-surface-muted"
                aria-haspopup="dialog"
                :aria-label="`Current wallet: ${activeWallet.name}. Switch wallet`"
                @click="emit('open-switcher')"
            >
                <i class="pi pi-wallet text-fg-muted" aria-hidden="true" />
                <span class="truncate">{{ activeWallet.name }}</span>
                <i class="pi pi-angle-down text-xs text-fg-muted" aria-hidden="true" />
            </button>

            <button
                type="button"
                :class="iconButtonClass"
                aria-label="More options"
                aria-haspopup="true"
                @click="menu?.toggle($event)"
            >
                <i class="pi pi-ellipsis-v" aria-hidden="true" />
            </button>
            <Menu ref="menu" :model="menuItems" popup />
        </div>
    </header>
</template>
