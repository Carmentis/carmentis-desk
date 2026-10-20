<script setup lang="ts">
const props = defineProps<{
    name: string;
    description?: string;
    required?: boolean;
    /** Id of the input this label belongs to. */
    inputId?: string;
}>();
</script>

<template>
    <label :for="props.inputId" class="mb-1 block text-sm font-medium text-fg">
        {{ props.name }}
        <span v-if="props.required" class="text-danger" aria-hidden="true">*</span>
        <span v-if="props.required" class="sr-only">(required)</span>
    </label>
    <p v-if="props.description" class="mb-2 text-sm text-fg-muted">
        {{ props.description }}
    </p>
</template>
