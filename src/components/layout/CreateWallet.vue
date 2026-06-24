<script setup lang="ts">
import {ref, computed, watch} from 'vue';
import { useRouter } from 'vue-router';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Card from 'primevue/card';
import SelectButton from 'primevue/selectbutton';
import { useStorageStore } from '../../stores/storage';
import { SeedEncoder, WalletCrypto } from '@cmts-dev/carmentis-sdk-core';
import { mnemonicToSeedSync, generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

const router = useRouter();
const storageStore = useStorageStore();

// Networks selection (for quick network setup)
const networkMethod = ref<'mainnet' | 'testnet' | 'devnet' | 'custom'>('mainnet');
const networkOptions = ref([
    { label: 'Mainnet', value: "mainnet", node: 'https://carmenta.carmentis.io', indexer: 'https://indexer.carmentis.io' },
    { label: 'Testnet', value: 'testnet', node: 'https://ares.testnet.carmentis.io', indexer: 'https://indexer.testnet.carmentis.io' },
    { label: 'Devnet', value: "devnet", node: 'https://node1.server1.devnet.carmentis.io', indexer: 'https://indexer.server4.devnet.carmentis.io' },
    { label: 'Custom', value: "custom", node: '', indexer: '' }
]);
const isCustomNetwork = computed(() => networkMethod.value === 'custom');

const organizationName = ref('');
const seed = ref('');
const passphrase = ref('');
const nodeEndpoint = ref('');
const indexer = ref('');

watch(networkMethod, (newMethod) => {
    const foundMethod = networkOptions.value.find(option => option.value === newMethod);
    if (foundMethod) {
        nodeEndpoint.value = foundMethod.node;
        indexer.value = foundMethod.indexer;
    } else {
        nodeEndpoint.value = '';
        indexer.value = '';
    }
}, { immediate: true })

// Method selection: 'seed' or 'passphrase'
const creationMethod = ref<'seed' | 'passphrase'>('seed');
const methodOptions = ref([
    { label: 'Seed Phrase', value: 'seed' },
    { label: 'Passphrase', value: 'passphrase' },
]);


const isGeneratingSeed = ref(false);
const generateSeed = () => {
    isGeneratingSeed.value = true;
    try {
        const generatedWallet = WalletCrypto.generateWallet();
        const seedEncoder = new SeedEncoder();
        seed.value = seedEncoder.encode(generatedWallet.getSeedAsBytes());
    } finally {
        isGeneratingSeed.value = false;
    }
};

const isGeneratingPassphrase = ref(false);
const generatePassphrase = () => {
    isGeneratingPassphrase.value = true;
    try {
        // Generate a 12-word mnemonic passphrase
        const mnemonic = generateMnemonic(wordlist, 128); // 128 bits = 12 words
        passphrase.value = mnemonic;
    } finally {
        isGeneratingPassphrase.value = false;
    }
};

// Derive seed from passphrase using @scure/bip39
const deriveSeedFromPassphrase = (passphrase: string): string => {
    // Use the passphrase as a mnemonic-like input to derive a seed
    // mnemonicToSeedSync takes a mnemonic and optional passphrase
    // We'll use the passphrase directly as the mnemonic input
    const derivedSeed = mnemonicToSeedSync(passphrase, '');
    const seedEncoder = new SeedEncoder();
    return seedEncoder.encode(derivedSeed);
};

const isFormValid = computed(() => {
    if (!organizationName.value) return false;
    if (creationMethod.value === 'seed') {
        return !!seed.value;
    } else {
        return !!passphrase.value;
    }
});

const createOrganization = async () => {
    if (!organizationName.value) return;

    let finalSeed = '';

    if (creationMethod.value === 'seed') {
        if (!seed.value) return;
        finalSeed = seed.value;
    } else {
        if (!passphrase.value) return;
        // Derive seed from passphrase
        finalSeed = deriveSeedFromPassphrase(passphrase.value);
    }

    await storageStore.addOrganization({
        name: organizationName.value,
        seed: finalSeed,
        nodeEndpoint: nodeEndpoint.value,
        indexer: indexer.value,
    });
    await router.push('/');
};

const goBack = () => {
    router.push('/');
};
</script>

<template>
    <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900">Create a Wallet</h1>
            <p class="mt-2 text-sm text-gray-600">Set up a new wallet</p>
        </div>

        <!-- Form Card -->
        <Card>
            <template #content>
                <div class="space-y-6">
                    <!-- Wallet Name -->
                    <div>
                        <label for="org-name" class="block text-sm font-medium text-gray-700 mb-2">
                            Wallet Name
                            <span class="text-red-500">*</span>
                        </label>
                        <InputText
                            id="org-name"
                            v-model="organizationName"
                            placeholder="Enter wallet name"
                            class="w-full"
                        />
                    </div>

                    <!-- Creation Method Selection -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Creation Method
                            <span class="text-red-500">*</span>
                        </label>
                        <SelectButton
                            v-model="creationMethod"
                            :options="methodOptions"
                            optionLabel="label"
                            optionValue="value"
                            class="w-full"
                        />
                    </div>

                    <!-- Seed Phrase Input (shown when method is 'seed') -->
                    <div v-if="creationMethod === 'seed'">
                        <label for="seed" class="block text-sm font-medium text-gray-700 mb-2">
                            Seed Phrase
                            <span class="text-red-500">*</span>
                        </label>
                        <div class="space-y-2">
                            <InputText
                                id="seed"
                                v-model="seed"
                                placeholder="Enter or generate a seed phrase"
                                :disabled="isGeneratingSeed"
                                class="w-full"
                            />
                            <Button
                                @click="generateSeed"
                                label="Generate Seed"
                                icon="pi pi-refresh"
                                :loading="isGeneratingSeed"
                                outlined
                            />
                        </div>
                        <small class="text-gray-500 mt-1 block">
                            <i class="pi pi-info-circle"></i>
                            Keep your seed phrase secure and never share it
                        </small>
                    </div>

                    <!-- Passphrase Input (shown when method is 'passphrase') -->
                    <div v-if="creationMethod === 'passphrase'">
                        <label for="passphrase" class="block text-sm font-medium text-gray-700 mb-2">
                            Passphrase
                            <span class="text-red-500">*</span>
                        </label>
                        <div class="space-y-2">
                            <InputText
                                id="passphrase"
                                v-model="passphrase"
                                placeholder="Enter or generate a passphrase"
                                :disabled="isGeneratingPassphrase"
                                toggleMask
                                class="w-full"
                            />
                            <Button
                                @click="generatePassphrase"
                                label="Generate Passphrase"
                                icon="pi pi-refresh"
                                :loading="isGeneratingPassphrase"
                                outlined
                            />
                        </div>
                        <small class="text-gray-500 mt-1 block">
                            <i class="pi pi-info-circle"></i>
                            A seed will be derived from your passphrase. Use a strong, memorable passphrase.
                        </small>
                    </div>

                    <!-- Network Selection -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Network Configuration
                            <span class="text-red-500">*</span>
                        </label>
                        <SelectButton
                            v-model="networkMethod"
                            :options="networkOptions"
                            optionLabel="label"
                            optionValue="value"
                            class="w-full"
                        />
                    </div>


                    <div v-if="isCustomNetwork || true">
                        <!-- Node Endpoint -->
                        <div>
                            <label for="node-endpoint" class="block text-sm font-medium text-gray-700 mb-2">
                                Node Endpoint
                            </label>
                            <InputText
                                id="node-endpoint"
                                v-model="nodeEndpoint"
                                placeholder="https://ares.testnet.carmentis.io"
                                class="w-full"
                            />
                        </div>

                        <!-- Indexer -->
                        <div>
                            <label for="indexer" class="block text-sm font-medium text-gray-700 mb-2">
                                Indexer
                            </label>
                            <InputText
                                id="indexer"
                                v-model="indexer"
                                placeholder="https://indexer.testnet.carmentis.io"
                                class="w-full"
                            />
                        </div>
                    </div>
                </div>
            </template>

            <template #footer>
                <div class="flex justify-end gap-3">
                    <Button @click="goBack" label="Cancel" icon="pi pi-times" severity="secondary" outlined />
                    <Button
                        @click="createOrganization"
                        label="Create Wallet"
                        icon="pi pi-check"
                        :disabled="!isFormValid"
                    />
                </div>
            </template>
        </Card>
    </div>
</template>
