<script setup lang="ts">
import Card from 'primevue/card';
import type { Hash } from '@cmts-dev/carmentis-sdk-core';
import type { NodeEntity } from '../../../../../stores/storage';

defineProps<{
    node: NodeEntity;
    isNodePublished?: boolean;
    isNodeValidator?: unknown;
    isNodeClaimed?: boolean;
    nodeOwnerName?: string;
    nodeOwnerAccountId?: Hash;
    isOwnedByWallet?: boolean;
}>();
</script>

<template>
    <Card>
        <template #title>
            <div class="flex items-center gap-2">
                <i class="pi pi-info-circle text-xl"></i>
                <span>Publication Status</span>
            </div>
        </template>
        <template #content>
            <div v-if="!node.vbId" class="text-center py-8">
                <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                    <i class="pi pi-question-circle text-2xl text-gray-400"></i>
                </div>
                <p class="text-sm text-gray-500">Node has no Virtual Blockchain ID</p>
            </div>
            <div v-else class="space-y-4">
                <!-- Publication Status -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Publication Status</label>
                    <div class="flex items-center gap-2">
                        <div
                            class="px-3 py-1 rounded-full text-sm font-medium"
                            :class="isNodePublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                        >
                            <i class="pi" :class="isNodePublished ? 'pi-check-circle' : 'pi-times-circle'"></i>
                            {{ isNodePublished ? 'Published' : 'Not Published' }}
                        </div>
                        <div
                            class="px-3 py-1 rounded-full text-sm font-medium"
                            :class="isNodeValidator ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                        >
                            <i class="pi" :class="isNodeValidator ? 'pi-check-circle' : 'pi-times-circle'"></i>
                            {{ isNodeValidator ? 'Validator' : 'Replicator' }}
                        </div>
                    </div>
                </div>

                <!-- Claimed Status -->
                <div v-if="isNodePublished">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Claim Status</label>
                    <div class="flex items-center gap-2">
                        <div
                            class="px-3 py-1 rounded-full text-sm font-medium"
                            :class="isNodeClaimed ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'"
                        >
                            <i class="pi" :class="isNodeClaimed ? 'pi-lock' : 'pi-unlock'"></i>
                            {{
                                isNodeClaimed
                                    ? nodeOwnerName
                                        ? `Claimed by ${nodeOwnerName}`
                                        : 'Claimed'
                                    : 'Not Claimed'
                            }}
                        </div>
                    </div>
                </div>

                <!-- Owner Information -->
                <div v-if="isNodeClaimed && nodeOwnerAccountId">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Owner</label>
                    <div class="space-y-2">
                        <code class="bg-gray-100 px-3 py-2 rounded text-xs block overflow-x-auto">
                            {{ nodeOwnerAccountId.encode() }}
                        </code>
                        <div v-if="isOwnedByWallet" class="flex items-center gap-2 text-sm text-green-700">
                            <i class="pi pi-check-circle"></i>
                            <span>Owned by this wallet</span>
                        </div>
                        <div v-else class="flex items-center gap-2 text-sm text-orange-700">
                            <i class="pi pi-exclamation-triangle"></i>
                            <span>Owned by another account</span>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </Card>
</template>
