<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
    /**
     * The amount in CMTS: a number, a decimal string, or an SDK token (anything with `getAmountAsCMTS()`).
     */
    value: unknown;
    unit?: string;
    /** Minimum number of decimals, always shown. */
    decimals?: number;
    /** Extra decimals shown only when they are not zero (the token has 5 decimals). */
    maxDecimals?: number;
    size?: 'hero' | 'default' | 'sm';
}>(), {
    unit: 'CMTS',
    decimals: 2,
    maxDecimals: 5,
    size: 'default',
});

const SIZES = {
    hero: 'text-amount text-fg',
    default: 'text-lg font-semibold text-fg',
    sm: 'text-sm font-medium text-fg',
};

function toNumber(value: unknown): number | null {
    if (value && typeof value === 'object' && 'getAmountAsCMTS' in value && typeof value.getAmountAsCMTS === 'function') {
        return Number(value.getAmountAsCMTS());
    }
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value);
    return null;
}

const parsed = computed(() => {
    const amount = toNumber(props.value);
    // Anything that is not an amount is shown untouched, and without a unit.
    if (amount === null || Number.isNaN(amount)) return { text: String(props.value ?? '').trim() || '—', numeric: false };
    const format = new Intl.NumberFormat(undefined, {
        minimumFractionDigits: props.decimals,
        maximumFractionDigits: Math.max(props.decimals, props.maxDecimals),
    });
    return { text: format.format(amount), numeric: true };
});
</script>

<template>
    <span class="inline-flex min-w-0 flex-wrap items-baseline gap-x-1.5">
        <span class="tabular-nums" :class="SIZES[props.size]">{{ parsed.text }}</span>
        <span v-if="parsed.numeric" class="text-sm font-medium text-fg-muted">{{ props.unit }}</span>
    </span>
</template>
