<script setup lang="ts">
import Button from 'primevue/button';
import { useVModel } from '@vueuse/core';
import ResponsiveDialog from './ResponsiveDialog.vue';

const props = withDefaults(defineProps<{
    visible: boolean;
    title: string;
    /** Name of the item the action applies to; it is always quoted in the message. */
    itemName: string;
    action?: string;
    message?: string;
    confirmLabel?: string;
    /** `danger` for deletions, `primary` for other irreversible actions such as publishing. */
    tone?: 'danger' | 'primary';
    loading?: boolean;
}>(), {
    tone: 'danger',
    action: 'delete',
    message: 'This action cannot be undone.',
    confirmLabel: 'Delete',
    loading: false,
});

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
    (e: 'confirm'): void;
}>();
const open = useVModel(props, 'visible', emit);
</script>

<template>
    <!-- The parent closes the dialog once the action succeeded, so it stays open while loading. -->
    <ResponsiveDialog v-model:visible="open" :header="props.title" :closable="!props.loading">
        <p class="text-sm text-fg">
            You are about to {{ props.action }}
            <strong class="break-all font-semibold">“{{ props.itemName }}”</strong>.
        </p>
        <p class="mt-2 text-sm text-fg-muted">{{ props.message }}</p>

        <template #footer>
            <Button
                label="Cancel"
                severity="secondary"
                outlined
                :disabled="props.loading"
                @click="open = false"
            />
            <Button
                :label="props.confirmLabel"
                :severity="props.tone === 'danger' ? 'danger' : undefined"
                :loading="props.loading"
                @click="emit('confirm')"
            />
        </template>
    </ResponsiveDialog>
</template>
