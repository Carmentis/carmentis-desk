<script setup lang="ts">
import InputText from "primevue/inputtext";
import Card from "primevue/card";
import SplitButton from "primevue/splitbutton";
import Password from "primevue/password";
import {computed, ref} from "vue";
import {useClipboard} from "../../../composables/useClipboard.ts";
import {computedAsync, useAsyncState} from "@vueuse/core";
import * as walletRepo from "../../../db/repositories/walletRepository.ts";
import * as orgRepo from "../../../db/repositories/organizationRepository.ts";
import {CryptoEncoderFactory, SignatureSchemeId} from "@cmts-dev/carmentis-sdk-core";
import {useRoute} from "vue-router";
import {useSessionStore} from "../../../stores/sessionStore.ts";
import Select from "primevue/select";
import {useWalletStore} from "../../../stores/walletStore.ts";
import {useToast} from "primevue/usetoast";
import Button from "primevue/button";
const walletStore = useWalletStore();
const clipboard = useClipboard();
const sessionStore = useSessionStore();
const route = useRoute();


const walletIdString = ref(route.params.walletId);
const walletId = computed(() => Number(walletIdString.value));
console.log(`Loading keys for wallet with id ${walletIdString.value}`)

const { state: wallet, execute: fetchWallet } = useAsyncState(
    () => walletRepo.getWalletById(walletId.value),
    null,
    { immediate: true },
);

const { state: organizations, execute: fetchOrgs } = useAsyncState(
    () => orgRepo.getOrganizationsByWalletId(walletId.value),
    [],
    { immediate: true },
);

const toast = useToast();
const {execute: checkKeyPair} = useAsyncState(
    async () => {
        if (!wallet.value) return undefined;
        let verified = false;
        const message = "Hello world!"
        try {
            const walletId = wallet.value.id;
            const {sk, pk} = await walletStore.getKeyPair(walletId, signatureScheme.value);
            const sigEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();

            const textEncoder = new TextEncoder();
            const rawMessage = textEncoder.encode(message);
            const sign = await sk.sign(rawMessage);
            verified = await pk.verify(rawMessage, sign);
        } catch (e) {
            console.error('Failed to verify key pair:', e);
        } finally {
            if (verified) {
                toast.add({
                    severity: 'success',
                    summary: `Key pair is valid`,
                    detail: `Message ${message} has signed and verified successfully (type ${signatureScheme.value.toString()})`,
                    life: 3000,
                })
            } else {
                toast.add({
                    severity: 'error',
                    summary: 'Key pair check failed',
                    detail: 'The key pair is invalid',
                    life: 3000,
                });
            }
        }
    },
    undefined,
)

// wallet key pair
const walletState = walletStore.state;
const signatureScheme = ref(walletState.signatureSchemaType);
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
const walletKeyPair = computedAsync(async () => {
    if (!wallet.value) return undefined;
    const walletId = wallet.value.id;
    const {sk, pk} = await walletStore.getKeyPair(walletId, signatureScheme.value);
    const sigEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
    return {
        sk: await sigEncoder.encodePrivateKey(sk),
        pk: await sigEncoder.encodePublicKey(pk),
    };
});
const sk = computed(() => walletKeyPair.value?.sk);
const pk = computed(() => walletKeyPair.value?.pk);

const walletSeed = computedAsync(async () => {
    if (!wallet.value) return '';
    return sessionStore.getWalletSeed(wallet.value.id);
}, '');


// Copy menu items
const copyMenuItems = ref([
    {
        label: 'Copy Public Key',
        icon: 'pi pi-copy',
        command: () => clipboard.copyToClipboard(pk.value, 'Public key'),
    },
    {
        label: 'Copy Private Key',
        icon: 'pi pi-copy',
        command: () => clipboard.copyToClipboard(sk.value, 'Private key'),
    },
    {
        label: 'Copy Seed',
        icon: 'pi pi-copy',
        command: async () => {
            if (!wallet.value) return;
            const seed = await sessionStore.getWalletSeed(wallet.value.id);
            clipboard.copyToClipboard(seed, 'Seed');
        },
    },
]);
</script>
<template>
    <!-- Wallet Keys Card -->
    <Card>
        <template #title>
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <i class="pi pi-key text-xl"></i>
                    <span>Wallet Keys</span>
                </div>
                <div class="flex gap-2">
                    <Select
                        size="small"
                        v-model="signatureScheme"
                        :options="schemeOptions"
                        optionLabel="label"
                        optionValue="value"
                        class="w-10rem"
                        @change="(event) => { walletStore.setSignatureSchemaType(event.value) }"
                    />
                    <Button
                        label="Check"
                        icon="pi pi-check"
                        size="small"
                        aria-placeholder="Perform a self-test of keys"
                        @click="() => checkKeyPair()"
                    />
                    <SplitButton
                        label="Copy"
                        icon="pi pi-copy"
                        :model="copyMenuItems"
                        size="small"
                        @click="clipboard.copyToClipboard(walletKeyPair?.pk, 'Public key')"
                    />

                </div>
            </div>
        </template>
        <template #subtitle>
            <p class="text-sm text-surface-500">
                Your cryptographic key pair and seed. Keep the private key and seed strictly
                confidential — anyone with access to them can control this wallet.
            </p>
        </template>
        <template #content>
            <div class="space-y-4">

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Public Key</label>
                    <InputText v-model="pk" :disabled="true" class="w-full" />
                </div>
                <div class="w-full">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Private Key</label>
                    <Password
                        v-model="sk"
                        :feedback="false"
                        toggleMask
                        class="w-full"
                        input-class="w-full"
                    />
                </div>
                <div class="w-full">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Private seed</label>
                    <Password
                        v-model="walletSeed"
                        :feedback="false"
                        toggleMask
                        class="w-full"
                        width="100%"
                        input-class="w-full"
                    />
                </div>
            </div>
        </template>
    </Card>
</template>