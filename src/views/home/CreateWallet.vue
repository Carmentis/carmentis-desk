<script setup lang="ts">
import {ref, computed, watch} from 'vue';
import { useRouter } from 'vue-router';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Card from 'primevue/card';
import SelectButton from 'primevue/selectbutton';
import Textarea from 'primevue/textarea';
import Tabs from 'primevue/tabs';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import { useStorageStore } from '../../stores/storage.ts';
import {SeedEncoder, SignatureSchemeId, WalletCrypto} from '@cmts-dev/carmentis-sdk-core';
import { mnemonicToSeedSync, generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import FieldNameAndDescription from "../../components/utils/FieldNameAndDescription.vue";
import Select from "primevue/select";


// we propose two methods to create a key for a wallet:
// Method 1: by providing a seedable private key (obtained either by providing a seed or mnemonic)
// Method 2: by providing a JWK.

const router = useRouter();
const storageStore = useStorageStore();

// Key creation method: 'jwk' (selected via Tabs) or 'seedphrase' (Seed/Passphrase within the second tab)
const keyMethod = ref<'jwk' | 'seedphrase'>('jwk');
const jwkInput = ref('');

// JWK validation: check if input is valid JSON with required 'kty' field
const jwkParseError = computed<string | null>(() => {
    const trimmed = jwkInput.value.trim();
    if (!trimmed) return null; // empty is ok, not yet filled
    try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed.kty !== 'string') {
            return "Champ 'kty' manquant : ce n'est pas un JWK valide";
        }
        return null; // valid
    } catch {
        return "JSON invalide";
    }
});

const isJwkValid = computed(() =>
    jwkInput.value.trim() !== '' && jwkParseError.value === null
);

// Network configuration state
const showNetworkDetails = ref(false);

// Networks selection (for quick network setup)
const networkMethod = ref<'mainnet' | 'testnet' | 'devnet' | 'custom'>('mainnet');
const networkOptions = ref([
    { label: 'Mainnet', value: "mainnet", node: 'https://mercurius.carmentis.io', indexer: 'https://indexer.carmentis.io' },
    { label: 'Testnet', value: 'testnet', node: 'https://ares.testnet.carmentis.io', indexer: 'https://indexer.testnet.carmentis.io' },
    { label: 'Devnet', value: "devnet", node: 'https://node2.server2.devnet.carmentis.io', indexer: 'https://indexer.server4.devnet.carmentis.io' },
    { label: 'Custom', value: "custom", node: '', indexer: '' }
]);
const isCustomNetwork = computed(() => networkMethod.value === 'custom');
const networkDetailsVisible = computed(() => isCustomNetwork.value || showNetworkDetails.value);

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
    // Reset customize toggle when network changes (only relevant for predefined networks)
    if (newMethod !== 'custom') {
        showNetworkDetails.value = false;
    }
}, { immediate: true })


const schemeOptions = [
    {
        label: "Secp256k1",
        value: SignatureSchemeId.SECP256K1
    },
    {
        label: "MLDSA65",
        value: SignatureSchemeId.ML_DSA_65
    }
]
const chosenSignatureScheme = ref(schemeOptions[0].value);

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

    // Validate based on selected key method
    if (keyMethod.value === 'jwk') {
        return isJwkValid.value;
    } else {
        // 'seedphrase' method
        if (creationMethod.value === 'seed') {
            return !!seed.value;
        } else {
            return !!passphrase.value;
        }
    }
});
const isCreatingWallet = ref(false);
const createWallet = async () => {
    /*
    if (!organizationName.value) return;

    let finalSeed = '';
    isCreatingWallet.value = true;
    if (creationMethod.value === 'seed') {
        if (!seed.value) return;
        finalSeed = seed.value;
    } else {
        if (!passphrase.value) return;
        // Derive seed from passphrase
        finalSeed = deriveSeedFromPassphrase(passphrase.value);
    }

    const createdWalletId = await storageStore.addOrganization({
        name: organizationName.value,
        seed: finalSeed,
        nodeEndpoint: nodeEndpoint.value,
        indexer: indexer.value,
        schemeId: chosenSignatureScheme.value,
    });
    isCreatingWallet.value = false;
    await router.push(`/wallet/${createdWalletId}`);

     */
};

const goBack = () => {
    router.push('/');
};
</script>

<template>
    <div class="max-w-2xl mx-auto space-y-6">
        <!-- Header -->
        <div class="mb-2">
            <h1 class="text-3xl font-bold text-gray-900">Create a Wallet</h1>
            <p class="mt-2 text-sm text-gray-600">Set up a new wallet</p>
        </div>

        <!-- Section 1: Wallet Name -->
        <Card>
            <template #content>
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
            </template>
        </Card>

        <!-- Section 2: Network Configuration -->
        <Card>
            <template #content>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Network
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

                    <!-- Compact network info for predefined networks (non-custom) -->
                    <div v-if="!isCustomNetwork" class="border-t pt-4 space-y-2">
                        <div class="text-sm text-gray-600">
                            <span class="font-medium">Node:</span> {{ nodeEndpoint }}
                        </div>
                        <div class="text-sm text-gray-600">
                            <span class="font-medium">Indexer:</span> {{ indexer }}
                        </div>
                        <Button
                            @click="showNetworkDetails = !showNetworkDetails"
                            :label="showNetworkDetails ? 'Hide settings' : 'Customize'"
                            severity="secondary"
                            text
                            size="small"
                            icon="pi pi-pencil"
                        />
                    </div>

                    <!-- Detailed network settings (shown for custom or when customize is enabled) -->
                    <div v-if="networkDetailsVisible" class="space-y-4">
                        <div v-if="!isCustomNetwork" class="border-t pt-4"></div>
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
        </Card>

        <!-- Section 3: Private Key Creation (via Tabs) -->
        <Card>
            <template #content>
                <Tabs v-model:value="keyMethod">
                    <TabList>
                        <Tab value="jwk">
                            <span>JWK</span>
                        </Tab>
                        <Tab value="seedphrase">
                            <span>Passphrase / Seed</span>
                        </Tab>
                    </TabList>

                    <TabPanels>
                        <!-- Tab: JWK -->
                        <TabPanel value="jwk">
                            <div class="space-y-3">
                                <div>
                                    <label for="jwk-input" class="block text-sm font-medium text-gray-700 mb-2">
                                        JSON Web Key (JWK)
                                        <span class="text-red-500">*</span>
                                    </label>
                                    <Textarea
                                        id="jwk-input"
                                        v-model="jwkInput"
                                        placeholder='{"kty":"EC","crv":"P-256","x":"...","y":"...","d":"..."}'
                                        :rows="8"
                                        class="w-full font-mono text-sm"
                                    />
                                    <small v-if="jwkParseError" class="text-red-500 mt-1 block">
                                        <i class="pi pi-exclamation-circle mr-1"></i>
                                        {{ jwkParseError }}
                                    </small>
                                    <small v-else-if="isJwkValid" class="text-green-600 mt-1 block">
                                        <i class="pi pi-check-circle mr-1"></i>
                                        JWK is valid
                                    </small>
                                </div>
                                <p class="text-xs text-gray-500">
                                    Paste a valid JWK containing at least the <span class="font-mono">"kty"</span> field.
                                </p>
                            </div>
                        </TabPanel>

                        <!-- Tab: Seed / Passphrase -->
                        <TabPanel value="seedphrase">
                            <div class="space-y-4">
                                <!-- Crypto Scheme Selection -->
                                <div>
                                    <FieldNameAndDescription
                                        name="Signature Scheme"
                                        description="Cryptographic scheme to use."
                                    />
                                    <Select
                                        v-model="chosenSignatureScheme"
                                        :options="schemeOptions"
                                        optionLabel="label"
                                        optionValue="value"
                                        class="w-full"
                                    />
                                </div>

                                <!-- Creation Method Selection -->
                                <div>
                                    <FieldNameAndDescription
                                        name="Creation Method"
                                        description="Method used to create the wallet."
                                        required
                                    />
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
                            </div>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </template>
        </Card>

        <!-- Footer: Action buttons -->
        <div class="flex justify-end gap-3">
            <Button
                @click="goBack"
                label="Cancel"
                icon="pi pi-times"
                severity="secondary"
                outlined
            />
            <Button
                @click="createWallet"
                label="Create Wallet"
                icon="pi pi-check"
                :disabled="!isFormValid"
                :loading="isCreatingWallet"
            />
        </div>
    </div>
</template>
