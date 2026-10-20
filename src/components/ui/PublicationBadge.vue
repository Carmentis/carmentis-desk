<script setup lang="ts">
import StatusBadge from './StatusBadge.vue';

/** Publication state of an item of a list. `loading` while the blockchain is still being searched. */
const props = defineProps<{
    state: 'loading' | 'published' | 'draft';
}>();
</script>

<template>
    <StatusBadge v-if="props.state === 'loading'" tone="neutral" label="Loading" icon="pi-spin pi-spinner" />
    <StatusBadge v-else-if="props.state === 'published'" tone="success" label="Published" icon="pi-check-circle" />
    <StatusBadge v-else tone="warning" label="Draft" icon="pi-file-edit" />
</template>
