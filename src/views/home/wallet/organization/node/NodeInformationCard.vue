<script setup lang="ts">
import Card from 'primevue/card';
import Button from 'primevue/button';
import type { NodeEntity } from '../../../../../stores/storage.ts';
import NodeClaimDialog from "./NodeClaimDialog.vue";
import {computed, inject, ref} from "vue";
import {Node} from "../../../../../types/types.ts";
import {useCurrentNode} from "../../../../../composables/useCurrentNode.ts";

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
    <Skeleton class="w-full h-full bg-gray-100" v-if="isLoadingNode">
    </Skeleton>
    <Card v-else>
        <template #title>
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <i class="pi pi-sitemap text-xl"></i>
                    <span>Node Information</span>
                </div>
                <Button
                    v-if="node && !node.nodeVbId && !isNodePublished && !isNodeClaimed"
                    @click="() => showClaimDialog = true"
                    label="Claim Node"
                    icon="pi pi-lock"
                    size="small"
                    outlined
                    :hidden="!hasAccountOnChain"
                />
            </div>
        </template>
        <template #content>
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Node Name</label>
                        <div class="text-gray-900">
                            {{ node.name }}
                        </div>
                    </div>

                    <div v-if="chainName">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Chain</label>
                        <div class="flex items-center gap-2 text-gray-600">
                            <i class="pi pi-server"></i>
                            <span class="text-sm">
                                {{ chainName }}
                            </span>
                        </div>
                    </div>
                </div>

                <div v-if="nodePublicKey">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Node Public Key</label>
                    <div class="flex items-center gap-2 text-gray-600">
                        <i class="pi pi-key"></i>
                        <span class="text-sm">{{ nodePublicKey.pk }} ({{ nodePublicKey.pkType }})</span>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">RPC Endpoint</label>
                    <div class="flex items-center gap-2 text-gray-600">
                        <i class="pi pi-globe"></i>
                        <span class="text-sm">
                            {{ node.rpcEndpoint }}
                        </span>
                    </div>
                </div>

                <div v-if="node.nodeVbId">
                    <label class="block text-sm font-medium text-gray-700 mb-2"> Virtual Blockchain ID </label>
                    <code class="bg-gray-100 px-3 py-2 rounded text-sm block overflow-x-auto">
                        {{ node.nodeVbId }}
                    </code>
                </div>
            </div>
        </template>
    </Card>

    <NodeClaimDialog
        v-model:is-open="showClaimDialog"
        :node-vb-id="nodeVbId"
        :organization-name="organization?.name"
    />
</template>
