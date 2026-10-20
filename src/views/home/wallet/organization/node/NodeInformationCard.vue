<script setup lang="ts">
import Button from 'primevue/button';
import type { NodeEntity } from '../../../../../stores/storage.ts';
import NodeClaimDialog from "./NodeClaimDialog.vue";
import {computed, inject, ref} from "vue";
import {Node} from "../../../../../types/types.ts";
import {useCurrentNode} from "../../../../../composables/useCurrentNode.ts";
import UiCard from "../../../../../components/ui/UiCard.vue";
import CopyableValue from "../../../../../components/ui/CopyableValue.vue";
import SkeletonBlock from "../../../../../components/ui/SkeletonBlock.vue";

defineProps<{
    node: Node;
    chainName?: string;
    nodePublicKey?: { pk: string; pkType: string } | null;
    isNodePublished?: boolean | null;
    isNodeClaimed?: boolean;
    hasAccountOnChain?: boolean;
}>();
const {
    nodeVbId,
    organization,
    isNodeClaimed,
    isLoadingNode
} = useCurrentNode();

const showClaimDialog = ref(false);
</script>

<template>
    <UiCard title="Node information">
        <template #header-actions>
            <Button
                v-if="node && !node.nodeVbId && !isNodePublished && !isNodeClaimed && hasAccountOnChain"
                @click="() => showClaimDialog = true"
                label="Claim node"
                icon="pi pi-lock"
            />
        </template>

        <SkeletonBlock v-if="isLoadingNode" :lines="4" />

        <dl v-else class="space-y-4 text-sm">
            <div v-if="node.nodeVbId">
                <dt class="mb-1 text-fg-muted">Node ID</dt>
                <dd><CopyableValue :value="node.nodeVbId" label="node ID" :head="12" :tail="10" /></dd>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="min-w-0">
                    <dt class="mb-1 text-fg-muted">Name</dt>
                    <dd class="break-words text-fg">{{ node.name }}</dd>
                </div>
                <div v-if="chainName" class="min-w-0">
                    <dt class="mb-1 text-fg-muted">Chain</dt>
                    <dd class="break-words text-fg">{{ chainName }}</dd>
                </div>
            </div>

            <div v-if="nodePublicKey">
                <dt class="mb-1 text-fg-muted">Public key ({{ nodePublicKey.pkType }})</dt>
                <dd><CopyableValue :value="nodePublicKey.pk" label="node public key" :head="12" :tail="10" /></dd>
            </div>

            <div>
                <dt class="mb-1 text-fg-muted">RPC endpoint</dt>
                <dd class="break-all font-mono text-xs text-fg">{{ node.rpcEndpoint }}</dd>
            </div>
        </dl>
    </UiCard>

    <NodeClaimDialog
        v-model:is-open="showClaimDialog"
        :node-vb-id="nodeVbId"
        :organization-name="organization?.name"
    />
</template>
