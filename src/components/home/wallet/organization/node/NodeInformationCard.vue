<script setup lang="ts">
import Card from 'primevue/card';
import Button from 'primevue/button';
import type { NodeEntity } from '../../../../../stores/storage';
import NodeClaimDialog from "./NodeClaimDialog.vue";
import {computed, inject, ref} from "vue";
import {useRoute, useRouter} from "vue-router";
import {useNode} from "../../../../../composables/useNode.ts";

defineProps<{
    node: NodeEntity;
    chainName?: string;
    nodePublicKey?: { pk: string; pkType: string } | null;
    isNodePublished?: boolean | null;
    isNodeClaimed?: boolean;
    hasAccountOnChain?: boolean;
}>();
const route = useRoute();

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));
const nodeId = computed(() => Number(route.params.nodeId));

const {
    nodeVbId,
    organization,
    /*
    organization,
    node,
    nodePublicKey,
    ,
    isNodePublished,

     */
    isNodeClaimed,
} = useNode(walletId, orgId, nodeId);

const showClaimDialog = ref(false);
</script>

<template>
    <Card>
        <template #title>
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <i class="pi pi-sitemap text-xl"></i>
                    <span>Node Information</span>
                </div>
                <Button
                    v-if="node && !node.vbId && !isNodePublished && !isNodeClaimed"
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

                <div v-if="node.vbId">
                    <label class="block text-sm font-medium text-gray-700 mb-2"> Virtual Blockchain ID </label>
                    <code class="bg-gray-100 px-3 py-2 rounded text-sm block overflow-x-auto">
                        {{ node.vbId }}
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
