<script setup lang="ts">
import {computed} from "vue";
import {useRoute} from "vue-router";
import {useAsyncState} from "@vueuse/core";
import Card from "primevue/card";
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import {useClipboard} from "../../../composables/useClipboard.ts";
import * as walletRepo from "../../../db/repositories/walletRepository.ts";

const route = useRoute();
const clipboard = useClipboard();
const walletId = computed(() => Number(route.params.walletId));
const { state: wallet } = useAsyncState(
    () => walletRepo.getWalletById(walletId.value),
    null,
    { immediate: true },
);
const nodeEndpoint = computed(() => wallet.value?.nodeEndpoint ?? '')
const indexerEndpoint = computed(() => wallet.value?.indexer ?? '')
</script>
<template>
    <Card>
        <template #title>
            <div class="flex items-center gap-2">
                <i class="pi pi-server text-xl"></i>
                <span>Connectivity</span>
            </div>
        </template>
        <template #subtitle>
            <p class="text-sm text-surface-500">
                The network endpoints this wallet uses to reach the Carmentis node and indexer.
            </p>
        </template>
        <template #content>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Node Endpoint</label>
                    <div class="flex items-center gap-2">
                        <InputText
                            :value="nodeEndpoint"
                            readonly
                            placeholder="No node endpoint configured"
                            class="w-full"
                        />
                        <Button
                            icon="pi pi-copy"
                            outlined
                            :disabled="!nodeEndpoint"
                            @click="clipboard.copyToClipboard(nodeEndpoint, 'Node endpoint')"
                            v-tooltip="'Copy node endpoint'"
                            aria-label="Copy node endpoint"
                        />
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Indexer Endpoint</label>
                    <div class="flex items-center gap-2">
                        <InputText
                            :value="indexerEndpoint"
                            readonly
                            placeholder="No indexer endpoint configured"
                            class="w-full"
                        />
                        <Button
                            icon="pi pi-copy"
                            outlined
                            :disabled="!indexerEndpoint"
                            @click="clipboard.copyToClipboard(indexerEndpoint, 'Indexer endpoint')"
                            v-tooltip="'Copy indexer endpoint'"
                            aria-label="Copy indexer endpoint"
                        />
                    </div>
                </div>
            </div>
        </template>
    </Card>
</template>
