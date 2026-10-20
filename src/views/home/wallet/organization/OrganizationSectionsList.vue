<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import ResponsiveDialog from '../../../../components/ui/ResponsiveDialog.vue';
import CopyableValue from '../../../../components/ui/CopyableValue.vue';
import JsonBlock from '../../../../components/ui/JsonBlock.vue';
import EmptyState from '../../../../components/ui/EmptyState.vue';
import SkeletonBlock from '../../../../components/ui/SkeletonBlock.vue';

/**
 * Sections published on the organization's blockchain, one card per microblock,
 * with a dialog showing the raw data of the selected one.
 */
interface SectionRow {
    height: number;
    hash: string;
    data: Record<string, unknown>;
}

const props = defineProps<{
    rows: SectionRow[] | undefined;
    isLoading: boolean;
    emptyTitle: string;
    emptyDescription: string;
    /** Header of the details dialog and label of its data block. */
    detailTitle: string;
}>();

const selected = ref<SectionRow | null>(null);
const showDetails = ref(false);

function open(row: SectionRow) {
    selected.value = row;
    showDetails.value = true;
}
</script>

<template>
    <SkeletonBlock v-if="props.isLoading" :lines="3" height-class="h-16" />

    <EmptyState
        v-else-if="!props.rows?.length"
        framed
        icon="pi-database"
        :title="props.emptyTitle"
        :description="props.emptyDescription"
    >
        <!-- Call to action -->
        <slot />
    </EmptyState>

    <ul v-else class="grid gap-3 lg:grid-cols-2">
        <li
            v-for="row in props.rows"
            :key="`${row.height}-${row.hash}`"
            class="min-w-0 space-y-1 rounded-card border border-line bg-surface p-4 shadow-card"
        >
            <div class="flex items-center justify-between gap-3">
                <p class="font-semibold text-fg">Block {{ row.height }}</p>
                <Button label="View" icon="pi pi-eye" severity="secondary" outlined size="small" @click="open(row)" />
            </div>
            <CopyableValue :value="row.hash" label="microblock hash" :head="10" :tail="8" />
        </li>
    </ul>

    <ResponsiveDialog v-model:visible="showDetails" :header="props.detailTitle" size="lg">
        <div v-if="selected" class="space-y-4">
            <dl class="space-y-3 text-sm">
                <div class="flex items-baseline justify-between gap-4">
                    <dt class="text-fg-muted">Block height</dt>
                    <dd class="text-fg">{{ selected.height }}</dd>
                </div>
                <div>
                    <dt class="mb-1 text-fg-muted">Microblock hash</dt>
                    <dd><CopyableValue :value="selected.hash" label="microblock hash" :head="14" :tail="10" /></dd>
                </div>
            </dl>
            <JsonBlock :title="props.detailTitle" :value="selected.data" default-open />
        </div>
        <template #footer>
            <Button label="Close" severity="secondary" outlined @click="showDetails = false" />
        </template>
    </ResponsiveDialog>
</template>
