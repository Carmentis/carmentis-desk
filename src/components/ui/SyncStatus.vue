<script setup lang="ts">
import {computed} from 'vue';
import {useTimeAgo} from '@vueuse/core';
import Button from 'primevue/button';

/**
 * Tells the user, at all times, whether data is being read from the blockchain,
 * how far along it is, when it was last refreshed, and whether it failed.
 */
const props = defineProps<{
    isFetching: boolean;
    isError: boolean;
    errorMessage?: string;
    /** Timestamp (ms) of the last successful load, 0 when none. */
    updatedAt: number;
    scanned: number;
    total: number;
}>();

const emit = defineEmits<{ (e: 'refresh'): void }>();

const timeAgo = useTimeAgo(computed(() => props.updatedAt));
const progress = computed(() => (props.total > 0 ? Math.min(props.scanned / props.total, 1) : 0));
</script>

<template>
    <div role="status" aria-live="polite" class="min-h-9 space-y-1.5">
        <div class="flex items-center justify-between gap-3 text-sm">
            <p v-if="props.isFetching" class="flex items-center gap-2 text-fg-muted">
                <i class="pi pi-spin pi-spinner text-accent" aria-hidden="true" />
                <span v-if="props.total > 0">
                    Reading the blockchain… block {{ Math.min(props.scanned + 1, props.total) }} of {{ props.total }}
                </span>
                <span v-else>Connecting to the blockchain…</span>
            </p>
            <p v-else-if="props.isError" class="flex items-start gap-2 text-danger">
                <i class="pi pi-times-circle mt-0.5" aria-hidden="true" />
                <span class="break-words">Couldn't load on-chain data. {{ props.errorMessage }}</span>
            </p>
            <p v-else-if="props.updatedAt" class="flex items-center gap-2 text-fg-muted">
                <i class="pi pi-check-circle text-success" aria-hidden="true" />
                Up to date · {{ timeAgo }}
            </p>
            <span v-else />

            <Button
                :label="props.isError ? 'Try again' : 'Refresh'"
                icon="pi pi-refresh"
                text
                size="small"
                severity="secondary"
                :disabled="props.isFetching"
                @click="emit('refresh')"
            />
        </div>

        <!-- Determinate bar, transform-only so it stays smooth; static when motion is reduced. -->
        <div
            v-if="props.isFetching && props.total > 0"
            class="h-1 overflow-hidden rounded-full bg-surface-muted"
            aria-hidden="true"
        >
            <div
                class="h-full origin-left rounded-full bg-accent transition-transform duration-300 ease-out motion-reduce:transition-none"
                :style="{ transform: `scaleX(${progress})` }"
            />
        </div>
    </div>
</template>
