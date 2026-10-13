<script setup lang="ts">
import {computed, ref} from 'vue';
import SelectButton from 'primevue/selectbutton';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import FieldNameAndDescription from "../utils/FieldNameAndDescription.vue";
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
            <label class="block text-sm font-medium text-gray-700 mb-2">
                Network
                <span class="text-red-500">*</span>
            </label>
            <SelectButton
                v-model="selectedPreset"
                :options="NETWORK_PRESETS"
                optionLabel="label"
                optionValue="value"
                :allowEmpty="false"
                class="w-full"
            />
        </div>

        <div v-if="!isCustom">
            <Button
                @click="showDetails = !showDetails"
                :label="showDetails ? 'Hide settings' : 'Customize'"
                type="button"
                severity="secondary"
                text
                size="small"
                icon="pi pi-pencil"
            />
        </div>

        <div v-if="detailsVisible" class="space-y-4">
            <div v-if="!isCustom" class="border-t pt-4"></div>
            <div>
                <FieldNameAndDescription
                    name="Node Endpoint"
                    description="Indicates node endpoint in which transactions are published"
                    required
                />
                <InputText
                    id="node-endpoint"
                    :modelValue="network.node"
                    @update:modelValue="updateField('node', $event)"
                    placeholder="https://ares.testnet.carmentis.io"
                    class="w-full"
                />
            </div>
            <div>
                <FieldNameAndDescription
                    name="Indexer Endpoint"
                    description="Indicates indexer endpoint used to fetch data from the blockchain."
                    required
                />
                <InputText
                    id="indexer-endpoint"
                    :modelValue="network.indexer"
                    @update:modelValue="updateField('indexer', $event)"
                    placeholder="https://indexer.testnet.carmentis.io"
                    class="w-full"
                />
            </div>
        </div>
    </div>
</template>
