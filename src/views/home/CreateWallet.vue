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
import {JwkPrivateSignatureKey, SeedEncoder, SignatureSchemeId, WalletCrypto} from '@cmts-dev/carmentis-sdk-core';
import { mnemonicToSeedSync, generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import FieldNameAndDescription from "../../components/utils/FieldNameAndDescription.vue";
import Select from "primevue/select";
import {KeyType, Network, WalletKey} from "../../types/types.ts";
import {Bip39Utils} from "../../utils/Bip39Utils.ts";
import {useAppStore} from "../../stores/appStore.ts";
import NetworkSelector from "../../components/network/NetworkSelector.vue";
import {networkFromPreset} from "../../utils/networkPresets.ts";


// we propose two methods to create a key for a wallet:
// Method 1: by providing a seedable private key (obtained either by providing a seed or mnemonic)
// Method 2: by providing a JWK.

const router = useRouter();
const appStore = useAppStore()
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

// Network selection (preset or custom)
const network = ref<Network>(networkFromPreset('mainnet'));

const walletName = ref('');
const seed = ref('');
const passphrase = ref('');



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
        const mnemonic = Bip39Utils.generateMnemonic();
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
    if (!walletName.value) return false;

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

    isCreatingWallet.value = true;
    if (!walletName.value) return;

    // set the wallet network
    const walletNetwork: Network = { ...network.value };

    // compute the private key
    let walletKey: WalletKey;
    if (keyMethod.value === 'seedphrase') {
        let finalPassphrase = undefined;
        let finalSeed = '';
        if (creationMethod.value === 'seed') {
            if (!seed.value) return;
            finalSeed = seed.value;

        } else {
            if (!passphrase.value) return;
            finalPassphrase = passphrase.value;
            finalSeed = deriveSeedFromPassphrase(passphrase.value);
        }
        walletKey = {
            keyType: KeyType.SEED,
            passphrase: finalPassphrase,
            seed: finalSeed,
            schemeId: chosenSignatureScheme.value,
        };
    } else {
        const sk = await JwkPrivateSignatureKey.fromJwk(JSON.parse(jwkInput.value));
        const jwk = sk.getPrivateJwk();
        walletKey = {
            keyType: KeyType.JWK,
            jwk: jwk
        };
    }

    // ensure the wallet key is correctly defined
    if (!walletKey) {
        throw new Error('Wallet key is not defined');
    }

    // create the wallet
    const createdWalletId = await appStore.createWallet(walletName.value, walletKey, walletNetwork);
    isCreatingWallet.value = false;
    await router.push(`/wallet/${createdWalletId}`);


    /*
    const createdWalletId = await storageStore.addOrganization({
        name: walletName.value,
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
                    <h1 class="text-lg font-bold">General</h1>
                    <p class="mb-4">Configure the general wallet setting.</p>
                    <label for="org-name" class="block text-sm font-medium text-gray-700 mb-2">
                        Wallet Name
                        <span class="text-red-500">*</span>
                    </label>
                    <InputText
                        id="org-name"
                        v-model="walletName"
                        placeholder="Enter wallet name"
                        class="w-full"
                    />
                </div>
            </template>
        </Card>

        <!-- Section 2: Network Configuration -->
        <Card>
            <template #content>
                <h1 class="text-lg font-bold">Network</h1>
                <p class="mb-4">Configure the network settings.</p>
                <NetworkSelector v-model="network" />
            </template>
        </Card>

        <!-- Section 3: Private Key Creation (via Tabs) -->
        <Card>
            <template #content>
                <h1 class="text-lg font-bold">Private Key</h1>
                <p class="mb-4">Configure your private key, stored securely in your vault.</p>

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
