<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';
import Menu from 'primevue/menu';
import type { MenuItem } from 'primevue/menuitem';
import { iconButtonClass } from './classes.ts';

const props = defineProps<{
    title: string;
    subtitle?: string;
    /** Shows a back button linking here. */
    backTo?: RouteLocationRaw;
    /** Shows a back button going one step back in history (ignored when `backTo` is set). */
    showBack?: boolean;
    /** Overflow menu. Put destructive entries last, with `class: 'text-danger'`. */
    menuItems?: MenuItem[];
}>();

const router = useRouter();
const menu = ref<InstanceType<typeof Menu>>();
</script>

<template>
    <header class="flex items-start gap-2">
        <RouterLink v-if="props.backTo" :to="props.backTo" :class="iconButtonClass" aria-label="Back">
            <i class="pi pi-arrow-left" aria-hidden="true" />
        </RouterLink>
        <button v-else-if="props.showBack" type="button" :class="iconButtonClass" aria-label="Back" @click="router.back()">
            <i class="pi pi-arrow-left" aria-hidden="true" />
        </button>

        <div class="min-w-0 flex-1 self-center">
            <h1 class="truncate text-xl font-semibold text-fg sm:text-2xl">{{ props.title }}</h1>
            <p v-if="props.subtitle" class="truncate text-sm text-fg-muted">{{ props.subtitle }}</p>
            <!-- Badges and other short metadata under the title -->
            <div v-if="$slots.meta" class="mt-1 flex flex-wrap items-center gap-2">
                <slot name="meta" />
            </div>
        </div>

        <div class="flex shrink-0 items-center gap-1">
            <slot name="actions" />
            <template v-if="props.menuItems?.length">
                <button
                    type="button"
                    :class="iconButtonClass"
                    aria-label="More actions"
                    aria-haspopup="true"
                    @click="menu?.toggle($event)"
                >
                    <i class="pi pi-ellipsis-v" aria-hidden="true" />
                </button>
                <Menu ref="menu" :model="props.menuItems" popup />
            </template>
        </div>
    </header>
</template>
