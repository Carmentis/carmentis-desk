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
import * as participationRepo from "../../../db/repositories/participationRepository.ts";
import type {ApplicationParticipation} from "../../../stores/storage.ts";
import {CryptoEncoderFactory, SeedEncoder, SignatureSchemeId, WalletCrypto} from "@cmts-dev/carmentis-sdk-core";
import {useRoute} from "vue-router";
import {useSessionStore} from "../../../stores/sessionStore.ts";

const clipboard = useClipboard();
const sessionStore = useSessionStore();
const route = useRoute();


const walletId = computed(() => Number(route.params.walletId));

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


// wallet key pair
const walletKeyPair = computedAsync(async () => {
    if (!wallet.value) return undefined;
    const seedEncoder = new SeedEncoder();
    const rawSeed = await sessionStore.getWalletSeed(wallet.value.id);
    const walletSeed = WalletCrypto.fromSeed(seedEncoder.decode(rawSeed));
    const accountCrypto = walletSeed.getDefaultAccountCrypto();
    const sk = await accountCrypto.getPrivateSignatureKey(SignatureSchemeId.SECP256K1);
    const pk = await sk.getPublicKey();
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
                <SplitButton
                    label="Copy"
                    icon="pi pi-copy"
                    :model="copyMenuItems"
                    size="small"
                    @click="clipboard.copyToClipboard(walletKeyPair?.pk, 'Public key')"
                />
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