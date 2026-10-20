<script setup lang="ts">
import { computed } from 'vue';
import { describeScalar, humanizeKey, isContainer, isInline } from './humanize.ts';

/**
 * Shows any JSON-like value as a plain list: the name of each field in bold, then its value.
 * Nested objects and arrays become nested lists.
 *
 * Nothing is left out (the user may be signing what they see here), and everything is rendered as
 * text: values coming from an application are never interpreted as HTML or turned into links.
 */
const props = withDefaults(defineProps<{
    data: unknown;
    depth?: number;
}>(), {
    depth: 0,
});

/** Beyond this depth the rest is shown as compact JSON instead of more nesting. */
const MAX_DEPTH = 8;

interface Item {
    key: string;
    /** Bold label; null for array items. */
    label: string | null;
    /** The original key, shown only when two labels of the same object would look alike. */
    rawKey: string | null;
    value: unknown;
}

const items = computed<Item[]>(() => {
    const data = props.data;
    if (Array.isArray(data)) {
        return data.map((value, index) => ({ key: String(index), label: null, rawKey: null, value }));
    }
    if (isContainer(data)) {
        const entries = Object.entries(data);
        const labels = entries.map(([key]) => humanizeKey(key));
        return entries.map(([key, value], index) => ({
            key,
            label: labels[index],
            rawKey: labels.filter((label) => label === labels[index]).length > 1 ? key : null,
            value,
        }));
    }
    return [];
});

const scalar = computed(() => describeScalar(props.data));
const inline = computed(() => isInline(props.data));
const isEmptyContainer = computed(() => isContainer(props.data) && items.value.length === 0);
</script>

<template>
    <code v-if="props.depth > MAX_DEPTH" class="break-all font-mono text-xs text-fg">{{ JSON.stringify(props.data) }}</code>

    <span v-else-if="isEmptyContainer" class="text-fg-muted">(none)</span>

    <span v-else-if="inline" class="whitespace-pre-wrap break-words" :class="scalar.muted ? 'text-fg-muted' : 'text-fg'">
        {{ scalar.text }}<span v-if="scalar.raw" class="font-mono text-xs text-fg-muted"> ({{ scalar.raw }})</span>
    </span>

    <!-- Bullets only for arrays; a nested object is set apart by an indent and a thin rule instead. -->
    <ul
        v-else
        class="space-y-1.5"
        :class="[
            Array.isArray(props.data) ? 'list-disc pl-5 marker:text-fg-muted' : 'list-none',
            props.depth > 0 ? 'mt-1' : '',
            props.depth > 0 && !Array.isArray(props.data) ? 'ml-1 border-l border-line pl-3' : '',
        ]"
    >
        <li v-for="item in items" :key="item.key" class="text-sm text-fg">
            <template v-if="item.label !== null">
                <strong class="font-semibold">{{ item.label }}</strong>
                <span v-if="item.rawKey" class="font-mono text-xs text-fg-muted"> ({{ item.rawKey }})</span>
                <template v-if="isInline(item.value)">: </template>
            </template>
            <ReadableData :data="item.value" :depth="props.depth + 1" />
        </li>
    </ul>
</template>
