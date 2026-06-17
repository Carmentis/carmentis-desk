<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import type { AppLedgerParticipation } from '../../../../stores/storage.ts';

type LedgerRow = AppLedgerParticipation & { originalIdx: number };

defineProps<{
    reversedLedgers: LedgerRow[];
    selectedRow: LedgerRow | null;
}>();

const emit = defineEmits<{ (e: 'select', originalIdx: number): void }>();

function shortId(id: string) {
    return id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-8)}` : id;
}

function onRowSelect(event: { data: LedgerRow }) {
    emit('select', event.data.originalIdx);
}
</script>

<template>
    <div class="flex flex-col gap-2">
        <div class="px-1 mb-1">
            <p class="text-xs font-semibold text-surface-500 uppercase tracking-wide">App Ledgers</p>
            <p class="text-xs text-surface-400 mt-0.5">
                All ledger instances associated with this application where you have participated.
            </p>
        </div>
        <DataTable
            :value="reversedLedgers"
            selectionMode="single"
            :selection="selectedRow"
            dataKey="id"
            size="small"
            class="text-sm cursor-pointer"
            @row-select="onRowSelect"
            :pt="{ table: { class: 'w-full' } }"
        >
            <Column header="Ledger ID">
                <template #body="{ data }">
                    <span class="font-mono text-xs text-surface-700">{{ shortId(data.id) }}</span>
                </template>
            </Column>
            <Column header="Operator">
                <template #body="{ data }">
                    <span v-if="data.operatorEndpoint" class="text-xs text-surface-500 truncate block max-w-[12rem]">
                        {{ data.operatorEndpoint }}
                    </span>
                    <span v-else class="text-xs text-surface-300">—</span>
                </template>
            </Column>
        </DataTable>
    </div>
</template>
