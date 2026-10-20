<script setup lang="ts">
import Button from 'primevue/button';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import type { Hash } from '@cmts-dev/carmentis-sdk-core';
import { useOnChainActions } from '../../../../../composables/useOnChainActions.ts';
import ResponsiveDialog from '../../../../../components/ui/ResponsiveDialog.vue';
import CopyableValue from '../../../../../components/ui/CopyableValue.vue';

const props = defineProps<{
    nodeVbId?: string | null;
    organizationName?: string;
}>();

const isOpen = defineModel<boolean>('isOpen', { default: false });

const route = useRoute();
const onChainStore = useOnChainActions();
const { isClaimingNode } = onChainStore;
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
    <ResponsiveDialog v-model:visible="isOpen" header="Claim node" :closable="!isClaimingNode">
        <div class="space-y-4">
            <p class="text-sm text-fg">
                Are you sure you want to claim this node for the organization
                <strong class="break-words">{{ organizationName }}</strong>?
            </p>
            <div v-if="nodeVbId">
                <p class="mb-1 text-sm text-fg-muted">Node ID</p>
                <CopyableValue :value="nodeVbId" label="node ID" :head="12" :tail="10" />
            </div>
            <p class="text-sm text-fg-muted">
                This action associates the node with your organization on the blockchain.
            </p>
        </div>

        <template #footer>
            <Button label="Cancel" severity="secondary" outlined :disabled="isClaimingNode" @click="isOpen = false" />
            <Button
                label="Claim node"
                icon="pi pi-lock"
                :loading="isClaimingNode"
                :disabled="isClaimingNode"
                @click="submitClaim"
            />
        </template>
    </ResponsiveDialog>
</template>
