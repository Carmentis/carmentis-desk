<script setup lang="ts">
import {computed, ref} from 'vue';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import FieldNameAndDescription from "../utils/FieldNameAndDescription.vue";
import SegmentedControl from "../ui/SegmentedControl.vue";
import {Network} from "../../types/types.ts";
import {
    NETWORK_PRESETS,
    networkFromPreset,
    NetworkPresetId,
    presetIdFromNetwork
} from "../../utils/networkPresets.ts";

const network = defineModel<Network>({ required: true });

const showDetails = ref(false);

const selectedPreset = computed<NetworkPresetId>({
    get: () => presetIdFromNetwork(network.value),
    set: (id) => {
        network.value = networkFromPreset(id);
        showDetails.value = false;
    },
});
const isCustom = computed(() => selectedPreset.value === 'custom');
const detailsVisible = computed(() => isCustom.value || showDetails.value);

function updateField(field: 'node' | 'indexer', value: string | undefined) {
    network.value = { ...network.value, [field]: value ?? '' };
}
</script>

<template>
    <div class="space-y-4">
        <div>
            <p class="mb-1 text-sm font-medium text-fg">
                Network
                <span class="text-danger" aria-hidden="true">*</span>
            </p>
            <SegmentedControl v-model="selectedPreset" :options="NETWORK_PRESETS" ariaLabel="Network" />
        </div>

        <div v-if="!isCustom">
            <Button
                @click="showDetails = !showDetails"
                :label="showDetails ? 'Hide settings' : 'Customize endpoints'"
                type="button"
                severity="secondary"
                text
                size="small"
                icon="pi pi-pencil"
                :aria-expanded="showDetails"
            />
        </div>

        <div v-if="detailsVisible" class="space-y-4">
            <div>
                <FieldNameAndDescription
                    name="Node endpoint"
                    description="The node your transactions are published to."
                    input-id="node-endpoint"
                    required
                />
                <InputText
                    id="node-endpoint"
                    :modelValue="network.node"
                    @update:modelValue="updateField('node', $event)"
                    inputmode="url"
                    autocomplete="off"
                    autocapitalize="off"
                    spellcheck="false"
                    placeholder="https://ares.testnet.carmentis.io"
                    fluid
                />
            </div>
            <div>
                <FieldNameAndDescription
                    name="Indexer endpoint"
                    description="The indexer used to read data from the blockchain."
                    input-id="indexer-endpoint"
                    required
                />
                <InputText
                    id="indexer-endpoint"
                    :modelValue="network.indexer"
                    @update:modelValue="updateField('indexer', $event)"
                    inputmode="url"
                    autocomplete="off"
                    autocapitalize="off"
                    spellcheck="false"
                    placeholder="https://indexer.testnet.carmentis.io"
                    fluid
                />
            </div>
        </div>
    </div>
</template>
