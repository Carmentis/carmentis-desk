<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {useToast} from "primevue/usetoast";
import Button from "primevue/button";
import NetworkSelector from "../../../components/network/NetworkSelector.vue";
import UiCard from "../../../components/ui/UiCard.vue";
import StickyActionBar from "../../../components/ui/StickyActionBar.vue";
import {useCurrentWallet} from "../../../composables/useCurrentWallet.ts";
import {Network} from "../../../types/types.ts";
import {networkFromPreset} from "../../../utils/networkPresets.ts";

const toast = useToast();
const {walletNetwork, updateNetwork} = useCurrentWallet();

const network = ref<Network>(networkFromPreset('mainnet'));
const isSaving = ref(false);

const isFormDirty = computed(() => {
    const saved = walletNetwork.value;
    if (!saved) return false;
    return network.value.networkName !== saved.networkName ||
        network.value.node.trim() !== saved.node ||
        network.value.indexer.trim() !== saved.indexer;
});

function resetForm() {
    if (walletNetwork.value) network.value = { ...walletNetwork.value };
}

// Initialize the form when the wallet loads (or its network changes)
watch(walletNetwork, () => resetForm(), { immediate: true });

async function saveConnectivity() {
    const node = network.value.node.trim();
    const indexer = network.value.indexer.trim();
    if (!node || !indexer) {
        toast.add({
            severity: 'error',
            summary: 'Validation error',
            detail: 'Node and indexer endpoints are required',
            life: 3000,
        });
        return;
    }

    isSaving.value = true;
    try {
        await updateNetwork({ ...network.value, node, indexer });
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
</script>
<template>
    <UiCard
        title="Connectivity"
        subtitle="The node and indexer this wallet uses to reach the Carmentis blockchain."
    >
        <form @submit.prevent="saveConnectivity" class="space-y-4">
            <NetworkSelector v-model="network" />

            <!-- Only offered once something changed; pinned to the bottom of the screen on mobile -->
            <StickyActionBar v-if="isFormDirty">
                <Button
                    type="button"
                    label="Reset"
                    icon="pi pi-undo"
                    severity="secondary"
                    outlined
                    :disabled="isSaving"
                    @click="resetForm"
                />
                <Button
                    type="submit"
                    label="Save changes"
                    icon="pi pi-check"
                    :loading="isSaving"
                />
            </StickyActionBar>
        </form>
    </UiCard>
</template>
