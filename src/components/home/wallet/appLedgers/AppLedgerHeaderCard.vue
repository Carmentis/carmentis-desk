<script setup lang="ts">
import Card from 'primevue/card';
import Button from 'primevue/button';
import Skeleton from 'primevue/skeleton';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
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
    <Card>
        <template #content>
            <!-- Loading state -->
            <div v-if="isLoadingDescription" class="flex items-center gap-4">
                <Skeleton shape="circle" size="3.5rem" />
                <div class="flex-1">
                    <Skeleton height="1.5rem" width="35%" class="mb-2" />
                    <Skeleton height="1rem" width="55%" />
                </div>
            </div>

            <!-- Loaded state -->
            <div v-else class="flex flex-col gap-3">
                <!-- Top row: logo + name + actions -->
                <div class="flex items-center justify-between gap-4">
                    <!-- Left: logo + name + tag -->
                    <div class="flex items-center gap-3 min-w-0">
                        <img
                            v-if="appDescription?.logoUrl"
                            :src="appDescription.logoUrl"
                            :alt="appDescription.name"
                            class="w-8 h-8 rounded-lg object-contain border border-surface-200 flex-shrink-0"
                        />
                        <div
                            v-else
                            class="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0"
                            aria-hidden="true"
                        >
                            <i class="pi pi-box text-primary-400 text-sm"></i>
                        </div>
                        <h1 class="text-xl font-semibold text-surface-900 truncate">
                            {{ appDescription?.name ?? 'Unknown Application' }}
                        </h1>
                        <Tag
                            :value="`${ledgerCount} ledger${ledgerCount !== 1 ? 's' : ''}`"
                            severity="secondary"
                            class="flex-shrink-0"
                        />
                    </div>

                    <!-- Right: action buttons -->
                    <div class="flex items-center gap-1 flex-shrink-0">
                        <Button
                            v-if="appDescription?.homepageUrl"
                            icon="pi pi-external-link"
                            label="Website"
                            size="small"
                            outlined
                            as="a"
                            :href="appDescription.homepageUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open application homepage"
                        />
                        <Button
                            icon="pi pi-copy"
                            label="Copy ID"
                            size="small"
                            outlined
                            @click="copyToClipboard(appParticipationId, 'Application ID')"
                            v-tooltip="appParticipationId"
                            aria-label="Copy Application ID"
                        />
                    </div>
                </div>

                <!-- Description -->
                <Textarea
                    v-if="appDescription?.description"
                    :value="appDescription.description"
                    readonly
                    auto-resize
                    rows="2"
                    class="w-full text-sm text-surface-700 resize-none"
                    aria-label="Application description"
                />
            </div>
        </template>
    </Card>
</template>
