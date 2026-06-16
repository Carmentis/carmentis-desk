<script setup lang="ts">
import Card from 'primevue/card';
import Button from 'primevue/button';
import type { CMTSToken } from '@cmts-dev/carmentis-sdk-core';

defineProps<{
    nodeStakeInformation?: unknown;
    currentStakedAmount?: CMTSToken;
    hasUnstakingOperationInProgress?: boolean;
    unstakingAmountInProgress?: CMTSToken;
    unstakingAtTimestamp?: number;
    isOwnedByWallet?: boolean;
}>();

const emit = defineEmits<{ (e: 'stake'): void; (e: 'unstake'): void }>();
</script>

<template>
    <Card>
        <template #title>
            <div class="flex items-center gap-2">
                <i class="pi pi-wallet text-xl"></i>
                <span>Staking Information</span>
            </div>
        </template>
        <template #content>
            <!-- No Staking State -->
            <div v-if="nodeStakeInformation === undefined" class="text-center py-8">
                <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                    <i class="pi pi-ban text-2xl text-gray-400"></i>
                </div>
                <p class="text-sm text-gray-500">No staking detected for this node</p>
            </div>

            <!-- Has Staking -->
            <div v-else class="space-y-4">
                <!-- Staked Amount -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Staked Amount</label>
                    <div class="flex items-center gap-2">
                        <div class="">
                            <span class="text-lg font-semibold">
                                {{ currentStakedAmount }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Unstaking Operation -->
                <div v-if="hasUnstakingOperationInProgress">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Programmed Unstaking</label>
                    <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-gray-600">Amount</span>
                            <span class="text-sm font-semibold text-orange-800">
                                {{ unstakingAmountInProgress }}
                            </span>
                        </div>
                        <div class="flex items-center justify-between" v-if="unstakingAtTimestamp">
                            <span class="text-sm text-gray-600">Unlock Date</span>
                            <span class="text-sm font-semibold text-orange-800">
                                {{ new Date(unstakingAtTimestamp * 1000).toLocaleString() }}
                            </span>
                        </div>
                        <div class="flex items-center gap-2 text-xs text-orange-700 mt-2">
                            <i class="pi pi-clock"></i>
                            <span>Unstaking operation in progress</span>
                        </div>
                    </div>
                </div>

                <!-- No Unstaking Operation -->
                <div v-else>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Unstaking Status</label>
                    <div class="flex items-center gap-2 text-sm text-gray-500">
                        <i class="pi pi-info-circle"></i>
                        <span>No programmed unstaking operation</span>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex gap-2 pt-2" v-if="isOwnedByWallet">
                    <Button @click="emit('stake')" label="Stake More" icon="pi pi-plus" size="small" outlined />
                    <Button
                        @click="emit('unstake')"
                        label="Unstake"
                        icon="pi pi-minus"
                        size="small"
                        severity="secondary"
                        outlined
                        v-if="!hasUnstakingOperationInProgress"
                    />
                </div>
            </div>

            <!-- Action Buttons (No Staking) -->
            <div v-if="nodeStakeInformation === undefined && isOwnedByWallet" class="mt-4">
                <Button @click="emit('stake')" label="Stake Tokens" icon="pi pi-wallet" class="w-full" outlined />
            </div>
        </template>
    </Card>
</template>
