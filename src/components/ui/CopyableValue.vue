<script setup lang="ts">
import { computed, ref } from 'vue';
import { useClipboard } from '@vueuse/core';
import { iconButtonClass } from './classes.ts';

const props = withDefaults(defineProps<{
    value: string | null | undefined;
    /** Human name of the value ("Account ID"), used in accessible labels. */
    label?: string;
    /** Characters kept at the start / end when truncated. */
    head?: number;
    tail?: number;
    expandable?: boolean;
}>(), {
    label: 'value',
    head: 8,
    tail: 6,
    expandable: true,
});

const { copy, copied, isSupported } = useClipboard({ copiedDuring: 2000 });
const expanded = ref(false);

const isLong = computed(() => (props.value?.length ?? 0) > props.head + props.tail + 1);
const shown = computed(() => {
    const value = props.value ?? '';
    if (expanded.value || !isLong.value) return value;
    return `${value.slice(0, props.head)}…${value.slice(-props.tail)}`;
});
</script>

<template>
    <div v-if="!props.value" class="text-sm text-fg-muted">—</div>
    <div v-else class="flex min-w-0 items-center gap-0.5">
        <code
            class="min-w-0 flex-1 font-mono text-sm text-fg"
            :class="expanded ? 'break-all' : 'truncate'"
        >{{ shown }}</code>

        <button
            v-if="props.expandable && isLong"
            type="button"
            :class="iconButtonClass"
            :aria-expanded="expanded"
            :aria-label="expanded ? `Show less of ${props.label}` : `Show full ${props.label}`"
            @click="expanded = !expanded"
        >
            <i class="pi" :class="expanded ? 'pi-angle-up' : 'pi-angle-down'" aria-hidden="true" />
        </button>

        <button
            type="button"
            :class="iconButtonClass"
            :disabled="!isSupported"
            :aria-label="`Copy ${props.label}`"
            @click="copy(props.value)"
        >
            <i class="pi" :class="copied ? 'pi-check text-success' : 'pi-copy'" aria-hidden="true" />
        </button>

        <span class="sr-only" role="status">{{ copied ? `${props.label} copied` : '' }}</span>
    </div>
</template>
