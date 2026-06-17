<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import type { Hash } from '@cmts-dev/carmentis-sdk-core';
import { useOnChainStore } from '../../../../../stores/onchain';

const props = defineProps<{
    nodeVbId?: string;
    organizationName?: string;
}>();

const isOpen = defineModel<boolean>('isOpen');

const route = useRoute();
const onChainStore = useOnChainStore();
const { isClaimingNode } = storeToRefs(onChainStore);

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));
const nodeId = computed(() => Number(route.params.nodeId));

async function submitClaim() {
    // A published node (one that already has a VB ID) cannot be claimed.
    if (props.nodeVbId) {
        isOpen.value = false;
        return;
    }

    try {
        await onChainStore.claimNode({
            walletId: walletId.value,
            orgId: orgId.value,
            nodeId: nodeId.value,
        });
        isOpen.value = false;
    } catch (error) {
        console.error('Error claiming node:', error);
    }
}
</script>

<template>
    <Dialog v-model:visible="isOpen" modal header="Claim Node" :style="{ width: '30rem' }">
        <div class="space-y-4">
            <p class="text-gray-700">
                Are you sure you want to claim this node for organization
                <strong>{{ organizationName }}</strong>
                ?
            </p>
            <div v-if="nodeVbId" class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Node VB ID</label>
                <code class="text-xs block overflow-x-auto">
                    {{ nodeVbId }}
                </code>
            </div>
            <p class="text-sm text-gray-500">
                This action will associate the node with your organization on the blockchain.
            </p>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2">
                <Button label="Cancel" @click="isOpen = false" text />
                <Button
                    label="Claim Node"
                    @click="submitClaim"
                    :loading="isClaimingNode"
                    :disabled="isClaimingNode"
                    icon="pi pi-lock"
                />
            </div>
        </template>
    </Dialog>
</template>
