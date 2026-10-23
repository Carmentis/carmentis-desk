<script setup lang="ts">
import {computed} from 'vue';
import {useTimeAgo} from '@vueuse/core';
import type {ReadActivity} from '../../../../types/activity.ts';
import {presenterOf, unknownActivityPresenter} from './activityPresenters.ts';

const props = defineProps<{
    activity: ReadActivity;
}>();

const emit = defineEmits<{ (e: 'open'): void }>();

const presenter = computed(() => props.activity.event ? presenterOf(props.activity.event) : unknownActivityPresenter);

const title = computed(() => props.activity.event?.title ?? 'Unknown activity');
const description = computed(() =>
    props.activity.event
        ? props.activity.event.description
        : 'Recorded by another version of Desk.',
);

const timeAgo = useTimeAgo(() => props.activity.date);
const absoluteTime = computed(() => props.activity.date.toLocaleString());

// Full class names so that Tailwind can detect them.
const TILE_TONES = {
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-info-soft text-info',
    neutral: 'bg-surface-muted text-fg-muted',
} as const;
</script>

<template>
    <!-- The whole row opens the details of the activity. -->
    <button
        type="button"
        class="flex min-h-14 w-full items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 text-left shadow-card transition-[transform,background-color] duration-150 hover:bg-surface-muted active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
        @click="emit('open')"
    >
        <span class="flex size-10 shrink-0 items-center justify-center rounded-full" :class="TILE_TONES[presenter.tone]">
            <i class="pi" :class="presenter.icon" aria-hidden="true" />
        </span>

        <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-fg" :title="title">{{ title }}</span>
            <span v-if="description" class="block truncate text-xs text-fg-muted" :title="description">{{ description }}</span>
        </span>

        <span class="flex shrink-0 flex-col items-end text-xs text-fg-muted">
            <time :datetime="props.activity.date.toISOString()" :title="absoluteTime">{{ timeAgo }}</time>
            <span>{{ presenter.label }}</span>
        </span>

        <i class="pi pi-chevron-right text-xs text-fg-muted" aria-hidden="true" />
    </button>
</template>
