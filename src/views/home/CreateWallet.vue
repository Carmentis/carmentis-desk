<script setup lang="ts">
import {ref, computed, watch} from 'vue';
import {useClipboard} from '@vueuse/core';
import { useRouter } from 'vue-router';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
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
import UiCard from "../../components/ui/UiCard.vue";
import SegmentedControl from "../../components/ui/SegmentedControl.vue";
import StickyActionBar from "../../components/ui/StickyActionBar.vue";
import PageHeader from "../../components/ui/PageHeader.vue";
import type {SegmentedOption} from "../../components/ui/types.ts";


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
            return "The 'kty' field is missing: this is not a valid JWK.";
        }
        return null; // valid
    } catch {
        return "This is not valid JSON.";
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
const methodOptions: SegmentedOption<'seed' | 'passphrase'>[] = [
    { label: 'Seed', value: 'seed' },
    { label: 'Passphrase', value: 'passphrase' },
];
const keyMethodOptions: SegmentedOption<'jwk' | 'seedphrase'>[] = [
    { label: 'JWK', value: 'jwk' },
    { label: 'Seed or passphrase', value: 'seedphrase' },
];

// Secrets are masked in their field; copying is explicit.
const { copy: copySecret, copied: secretCopied } = useClipboard({ copiedDuring: 2000 });


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
    <form class="mx-auto max-w-2xl space-y-4" novalidate @submit.prevent="createWallet">
        <PageHeader title="Create a wallet" subtitle="Set up a new wallet to hold tokens and sign on the Carmentis blockchain." />

        <!-- Section 1: Wallet Name -->
        <UiCard title="General">
            <FieldNameAndDescription
                name="Wallet name"
                description="Only you see this name."
                input-id="wallet-name"
                required
            />
            <InputText
                id="wallet-name"
                v-model="walletName"
                fluid
                autocomplete="off"
                placeholder="e.g. Personal wallet"
            />
        </UiCard>

        <!-- Section 2: Network Configuration -->
        <UiCard title="Network" subtitle="The blockchain network this wallet connects to.">
            <NetworkSelector v-model="network" />
        </UiCard>

        <!-- Section 3: Private Key Creation -->
        <UiCard title="Private key" subtitle="Stored securely in your vault. It stays hidden until you reveal it.">
            <div class="space-y-5">
                <SegmentedControl v-model="keyMethod" :options="keyMethodOptions" ariaLabel="How to create the private key" />

                <!-- JWK -->
                <div v-if="keyMethod === 'jwk'" class="space-y-2">
                    <FieldNameAndDescription
                        name="Private JWK"
                        description="Paste a JSON Web Key containing at least the “kty” field."
                        input-id="jwk-input"
                        required
                    />
                    <Password
                        v-model="jwkInput"
                        input-id="jwk-input"
                        :input-props="{ autocomplete: 'off', spellcheck: false }"
                        placeholder='{"kty":"EC","crv":"P-256","x":"…","y":"…","d":"…"}'
                        :feedback="false"
                        toggleMask
                        fluid
                        :invalid="!!jwkParseError"
                    />
                    <p v-if="jwkParseError" role="alert" class="flex items-start gap-2 text-sm text-danger">
                        <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
                        {{ jwkParseError }}
                    </p>
                    <p v-else-if="isJwkValid" class="flex items-start gap-2 text-sm text-success">
                        <i class="pi pi-check-circle mt-0.5" aria-hidden="true" />
                        JWK is valid
                    </p>
                </div>

                <!-- Seed / Passphrase -->
                <div v-else class="space-y-5">
                    <div>
                        <FieldNameAndDescription
                            name="Signature algorithm"
                            description="The cryptographic algorithm used to sign. Keep the default if unsure."
                            input-id="signature-scheme"
                        />
                        <Select
                            v-model="chosenSignatureScheme"
                            input-id="signature-scheme"
                            :options="schemeOptions"
                            optionLabel="label"
                            optionValue="value"
                            fluid
                        />
                    </div>

                    <div>
                        <p class="mb-1 text-sm font-medium text-fg">
                            Creation method
                            <span class="text-danger" aria-hidden="true">*</span>
                        </p>
                        <SegmentedControl v-model="creationMethod" :options="methodOptions" ariaLabel="Creation method" />
                    </div>

                    <!-- Seed -->
                    <div v-if="creationMethod === 'seed'" class="space-y-2">
                        <FieldNameAndDescription
                            name="Seed"
                            description="Enter an existing seed, or generate a new one."
                            input-id="seed"
                            required
                        />
                        <Password
                            v-model="seed"
                            input-id="seed"
                            :input-props="{ autocomplete: 'off', spellcheck: false }"
                            placeholder="Enter or generate a seed"
                            :feedback="false"
                            :disabled="isGeneratingSeed"
                            toggleMask
                            fluid
                        />
                        <div class="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                label="Generate a seed"
                                icon="pi pi-refresh"
                                severity="secondary"
                                outlined
                                :loading="isGeneratingSeed"
                                @click="generateSeed"
                            />
                            <Button
                                type="button"
                                :label="secretCopied ? 'Copied' : 'Copy'"
                                :icon="secretCopied ? 'pi pi-check' : 'pi pi-copy'"
                                severity="secondary"
                                text
                                :disabled="!seed"
                                @click="copySecret(seed)"
                            />
                        </div>
                        <p class="flex items-start gap-2 text-sm text-fg-muted">
                            <i class="pi pi-info-circle mt-0.5" aria-hidden="true" />
                            Keep a safe backup and never share it: anyone who has it controls this wallet.
                        </p>
                    </div>

                    <!-- Passphrase -->
                    <div v-else class="space-y-2">
                        <FieldNameAndDescription
                            name="Passphrase"
                            description="Enter an existing passphrase, or generate a new one."
                            input-id="passphrase"
                            required
                        />
                        <Password
                            v-model="passphrase"
                            input-id="passphrase"
                            :input-props="{ autocomplete: 'off', spellcheck: false }"
                            placeholder="Enter or generate a passphrase"
                            :feedback="false"
                            :disabled="isGeneratingPassphrase"
                            toggleMask
                            fluid
                        />
                        <div class="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                label="Generate a passphrase"
                                icon="pi pi-refresh"
                                severity="secondary"
                                outlined
                                :loading="isGeneratingPassphrase"
                                @click="generatePassphrase"
                            />
                            <Button
                                type="button"
                                :label="secretCopied ? 'Copied' : 'Copy'"
                                :icon="secretCopied ? 'pi pi-check' : 'pi pi-copy'"
                                severity="secondary"
                                text
                                :disabled="!passphrase"
                                @click="copySecret(passphrase)"
                            />
                        </div>
                        <p class="flex items-start gap-2 text-sm text-fg-muted">
                            <i class="pi pi-info-circle mt-0.5" aria-hidden="true" />
                            A seed is derived from your passphrase. Keep a safe backup and never share it.
                        </p>
                    </div>
                </div>
            </div>
        </UiCard>

        <!-- Footer: Action buttons -->
        <StickyActionBar>
            <Button type="button" label="Cancel" severity="secondary" outlined @click="goBack" />
            <Button
                type="submit"
                label="Create wallet"
                icon="pi pi-check"
                :disabled="!isFormValid"
                :loading="isCreatingWallet"
            />
        </StickyActionBar>
    </form>
</template>
