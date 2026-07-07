<script setup lang="ts">
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
</script>

<template>
    <div class="flex flex-col gap-2">
        <!-- Header -->
        <div class="px-1 mb-2">
            <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide">App Ledgers</p>
            <p class="text-xs text-gray-500 mt-1">
                All ledger instances associated with this application where you have participated.
            </p>
        </div>

        <!-- Custom List -->
        <div class="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <!-- Column headers -->
            <div class="grid grid-cols-1 gap-1 bg-gray-50 border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <div>Ledger ID</div>
                <div class="text-gray-500 hidden sm:block">Operator</div>
            </div>

            <!-- Rows -->
            <button
                v-for="row in reversedLedgers"
                :key="row.id"
                class="w-full text-left flex flex-col sm:grid sm:grid-cols-1 gap-2 px-3 py-3 border-b border-gray-100 transition-colors last:border-b-0"
                :class="
                    selectedRow?.id === row.id
                        ? 'bg-blue-50 border-l-2 border-l-blue-500'
                        : 'hover:bg-gray-50'
                "
                @click="emit('select', row.originalIdx)"
            >
                <span class="font-mono text-xs text-gray-800 break-all">{{ shortId(row.id) }}</span>
                <span class="text-xs text-gray-500 truncate hidden sm:block">
                    {{ row.operatorEndpoint ?? '—' }}
                </span>
            </button>

            <!-- Empty state -->
            <div v-if="reversedLedgers.length === 0" class="px-3 py-8 text-center">
                <p class="text-sm text-gray-500">No ledgers found</p>
            </div>
        </div>
    </div>
</template>
