<script setup lang="ts">
const props = withDefaults(defineProps<{
    lines?: number;
    /** Tailwind height class of each line. */
    heightClass?: string;
}>(), {
    lines: 3,
    heightClass: 'h-4',
});
</script>

<template>
    <div role="status" aria-live="polite" class="space-y-3">
        <span class="sr-only">Loading…</span>
        <div
            v-for="line in props.lines"
            :key="line"
            aria-hidden="true"
            class="animate-pulse rounded-control bg-surface-muted"
            :class="[props.heightClass, line === props.lines && props.lines > 1 ? 'w-2/3' : 'w-full']"
        />
    </div>
</template>
