<script setup lang="ts">
import {computed, reactive, ref, watch} from "vue";
import {useRoute} from "vue-router";
import {useAsyncState} from "@vueuse/core";
import {useToast} from "primevue/usetoast";
import Card from "primevue/card";
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import Tag from "primevue/tag";
import {useClipboard} from "../../../composables/useClipboard.ts";
import * as walletRepo from "../../../db/repositories/walletRepository.ts";

const route = useRoute();
const toast = useToast();
const clipboard = useClipboard();
const walletId = computed(() => Number(route.params.walletId));

const { state: wallet, execute: fetchWallet } = useAsyncState(
    () => walletRepo.getWalletById(walletId.value),
    null,
    { immediate: true },
);

// Editable form fields
const nodeEndpoint = ref('');
const indexerEndpoint = ref('');

const savedForm = reactive({ nodeEndpoint: '', indexerEndpoint: '' });

const isFormDirty = computed(
    () =>
        nodeEndpoint.value.trim() !== savedForm.nodeEndpoint ||
        indexerEndpoint.value.trim() !== savedForm.indexerEndpoint,
);

const isSaving = ref(false);

// Initialize form values when the wallet loads
function initializeForm() {
    if (wallet.value) {
        nodeEndpoint.value = wallet.value.nodeEndpoint ?? '';
        indexerEndpoint.value = wallet.value.indexer ?? '';
        savedForm.nodeEndpoint = nodeEndpoint.value.trim();
        savedForm.indexerEndpoint = indexerEndpoint.value.trim();
    }
}

watch(wallet, () => initializeForm(), { immediate: true });

async function saveConnectivity() {
    if (!nodeEndpoint.value.trim()) {
        toast.add({
            severity: 'error',
            summary: 'Validation error',
            detail: 'Node endpoint is required',
            life: 3000,
        });
        return;
    }

    isSaving.value = true;
    try {
        await walletRepo.updateWallet(walletId.value, {
            nodeEndpoint: nodeEndpoint.value.trim(),
            indexer: indexerEndpoint.value.trim(),
        });
        await fetchWallet();

        savedForm.nodeEndpoint = nodeEndpoint.value.trim();
        savedForm.indexerEndpoint = indexerEndpoint.value.trim();

        toast.add({
            severity: 'success',
            summary: 'Connectivity updated',
            detail: 'Network endpoints updated successfully',
            life: 3000,
        });
    } catch (e) {
        console.error('Failed to update connectivity:', e);
        toast.add({
            severity: 'error',
            summary: 'Update failed',
            detail: 'Could not update the network endpoints',
            life: 3000,
        });
    } finally {
        isSaving.value = false;
    }
}

function resetForm() {
    initializeForm();
}
</script>
<template>
    <Card>
        <template #title>
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                    <i class="pi pi-server text-xl"></i>
                    <span>Connectivity</span>
                </div>
                <Tag v-if="isFormDirty" icon="pi pi-exclamation-circle" value="Unsaved changes" severity="warn" />
            </div>
        </template>
        <template #subtitle>
            <p class="text-sm text-surface-500">
                The network endpoints this wallet uses to reach the Carmentis node and indexer.
            </p>
        </template>
        <template #content>
            <form @submit.prevent="saveConnectivity" class="space-y-4">
                <div>
                    <label for="node-endpoint" class="block text-sm font-medium text-gray-700 mb-2">
                        Node Endpoint
                        <span class="text-red-500">*</span>
                    </label>
                    <div class="flex items-center gap-2">
                        <InputText
                            id="node-endpoint"
                            v-model="nodeEndpoint"
                            placeholder="https://..."
                            class="w-full"
                            required
                        />
                        <Button
                            icon="pi pi-copy"
                            outlined
                            type="button"
                            :disabled="!nodeEndpoint"
                            @click="clipboard.copyToClipboard(nodeEndpoint, 'Node endpoint')"
                            v-tooltip="'Copy node endpoint'"
                            aria-label="Copy node endpoint"
                        />
                    </div>
                </div>
                <div>
                    <label for="indexer-endpoint" class="block text-sm font-medium text-gray-700 mb-2">
                        Indexer Endpoint
                    </label>
                    <div class="flex items-center gap-2">
                        <InputText
                            id="indexer-endpoint"
                            v-model="indexerEndpoint"
                            placeholder="https://..."
                            class="w-full"
                        />
                        <Button
                            icon="pi pi-copy"
                            outlined
                            type="button"
                            :disabled="!indexerEndpoint"
                            @click="clipboard.copyToClipboard(indexerEndpoint, 'Indexer endpoint')"
                            v-tooltip="'Copy indexer endpoint'"
                            aria-label="Copy indexer endpoint"
                        />
                    </div>
                </div>
                <div class="flex justify-end gap-2">
                    <Button
                        type="button"
                        label="Reset"
                        icon="pi pi-undo"
                        severity="secondary"
                        outlined
                        :disabled="!isFormDirty || isSaving"
                        @click="resetForm"
                    />
                    <Button
                        type="submit"
                        label="Save Changes"
                        icon="pi pi-check"
                        :loading="isSaving"
                        :disabled="!isFormDirty"
                    />
                </div>
            </form>
        </template>
    </Card>
</template>
