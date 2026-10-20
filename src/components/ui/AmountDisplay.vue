<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
    /** Amount in display units (anything whose string form is a decimal number). */
    value: unknown;
    unit?: string;
    /** Fixed number of decimals. Callers that know the token precision should set it. */
    decimals?: number;
    size?: 'hero' | 'default' | 'sm';
}>(), {
    unit: 'CMTS',
    decimals: 2,
    size: 'default',
});

const SIZES = {
    hero: 'text-amount text-fg',
    default: 'text-lg font-semibold text-fg',
    sm: 'text-sm font-medium text-fg-muted',
};

const parsed = computed(() => {
    const raw = String(props.value ?? '').trim();
    // Anything that is not a plain decimal number is shown untouched, and without a unit.
    if (!/^-?\d+(\.\d+)?$/.test(raw)) return { text: raw || '—', numeric: false };
    const format = new Intl.NumberFormat(undefined, {
        minimumFractionDigits: props.decimals,
        maximumFractionDigits: props.decimals,
    });
    // Modern engines format decimal strings exactly; older ones fall back to a Number.
    return { text: format.format(raw as unknown as number), numeric: true };
});
</script>

<template>
    <span class="inline-flex min-w-0 flex-wrap items-baseline gap-x-1.5">
        <span class="tabular-nums" :class="SIZES[props.size]">{{ parsed.text }}</span>
        <span v-if="parsed.numeric" class="text-sm font-medium text-fg-muted">{{ props.unit }}</span>
    </span>
</template>
