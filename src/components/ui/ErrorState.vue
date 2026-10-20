<script setup lang="ts">
import Button from 'primevue/button';

const props = withDefaults(defineProps<{
    title?: string;
    message?: string;
    retryable?: boolean;
}>(), {
    title: 'Something went wrong',
    retryable: false,
});

const emit = defineEmits<{ (e: 'retry'): void }>();
</script>

<template>
    <div role="alert" class="flex flex-col items-center gap-3 px-4 py-10 text-center">
        <span class="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
            <i class="pi pi-exclamation-circle text-xl" aria-hidden="true" />
        </span>
        <h3 class="text-base font-semibold text-fg">{{ props.title }}</h3>
        <p v-if="props.message" class="max-w-sm break-words text-sm text-fg-muted">{{ props.message }}</p>
        <Button
            v-if="props.retryable"
            label="Try again"
            icon="pi pi-refresh"
            severity="secondary"
            outlined
            @click="emit('retry')"
        />
    </div>
</template>
