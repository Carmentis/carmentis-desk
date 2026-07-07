<script setup lang="ts">
import { useClipboard } from '../../../../composables/useClipboard.ts';
import type { AppDescription } from '../../../../composables/useAppLedgerExplorer.ts';

defineProps<{
    appDescription: AppDescription | null;
    isLoadingDescription: boolean;
    ledgerCount: number;
    appParticipationId: string;
}>();

const { copyToClipboard } = useClipboard();
</script>

<template>
    <div class="bg-white rounded-xl border border-gray-200 p-5">
        <!-- Loading state -->
        <div v-if="isLoadingDescription" class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg bg-gray-200 flex-shrink-0 animate-pulse" />
            <div class="flex-1 space-y-2">
                <div class="h-5 bg-gray-200 rounded animate-pulse w-1/3" />
                <div class="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
            </div>
        </div>

        <!-- Loaded state -->
        <div v-else class="flex flex-col gap-4">
            <!-- Header row: logo + name + count + actions -->
            <div class="flex items-start justify-between gap-4">
                <!-- Left: logo + name + count -->
                <div class="flex items-start gap-3 min-w-0">
                    <img
                        v-if="appDescription?.logoUrl"
                        :src="appDescription.logoUrl"
                        :alt="appDescription.name"
                        class="w-10 h-10 rounded-lg object-contain border border-gray-200 p-1 flex-shrink-0"
                    />
                    <div v-else class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <i class="pi pi-box text-blue-600 text-sm" />
                    </div>
                    <div class="min-w-0">
                        <h1 class="text-lg font-semibold text-gray-900 truncate">
                            {{ appDescription?.name ?? 'Unknown Application' }}
                        </h1>
                        <span class="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full inline-block mt-1">
                            {{ ledgerCount }} ledger{{ ledgerCount !== 1 ? 's' : '' }}
                        </span>
                    </div>
                </div>

                <!-- Right: action buttons -->
                <div class="flex items-center gap-2 flex-shrink-0">
                    <a
                        v-if="appDescription?.homepageUrl"
                        :href="appDescription.homepageUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <i class="pi pi-external-link text-xs" />
                        <span class="hidden sm:inline">Website</span>
                    </a>
                    <button
                        class="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        @click="copyToClipboard(appParticipationId, 'Application ID')"
                        :title="appParticipationId"
                    >
                        <i class="pi pi-copy text-xs" />
                        <span class="hidden sm:inline">Copy ID</span>
                    </button>
                </div>
            </div>

            <!-- Description -->
            <p v-if="appDescription?.description" class="text-sm text-gray-600 leading-relaxed">
                {{ appDescription.description }}
            </p>
        </div>
    </div>
</template>
