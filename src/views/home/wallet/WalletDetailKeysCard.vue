<script setup lang="ts">
import InputText from "primevue/inputtext";
import Card from "primevue/card";
import SplitButton from "primevue/splitbutton";
import Password from "primevue/password";
import Divider from "primevue/divider";
import Checkbox from "primevue/checkbox";
import {capitalize, computed, ref} from "vue";
import {useClipboard} from "../../../composables/useClipboard.ts";
import {computedAsync, useAsyncState} from "@vueuse/core";
import * as walletRepo from "../../../db/repositories/walletRepository.ts";
import * as orgRepo from "../../../db/repositories/organizationRepository.ts";
import {
    CryptoEncoderFactory,
    SignatureSchemeId
} from "@cmts-dev/carmentis-sdk-core";
import {useRoute} from "vue-router";
import {useSessionStore} from "../../../stores/sessionStore.ts";
import Select from "primevue/select";
import {useWalletStore} from "../../../stores/walletStore.ts";
import {useToast} from "primevue/usetoast";
import Button from "primevue/button";
import Textarea from "primevue/textarea";
import {KeyType} from "../../../types/types.ts";
import {match, P} from "ts-pattern";
import FieldNameAndDescription from "../../../components/utils/FieldNameAndDescription.vue";


const route = useRoute();
const walletStore = useWalletStore(Number(route.params.walletId));
const clipboard = useClipboard();

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
        let verified = false;
        const message = "Hello world!"
        try {
            const {sk, pk} = walletStore.walletKeyPair.value;
            if (sk && pk) {
                const textEncoder = new TextEncoder();
                const rawMessage = textEncoder.encode(message);
                const sign = await sk.sign(rawMessage);
                verified = await pk.verify(rawMessage, sign);
                if (verified) {
                    toast.add({
                        severity: 'success',
                        summary: `Key pair is valid`,
                        detail: `Message "${message}" has been signed and verified successfully (type ${signatureScheme.value.toString()})`,
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

        } catch (e) {
            console.error('Failed to verify key pair:', e);
            toast.add({
                severity: 'error',
                summary: 'Key pair check failed',
                detail: 'The key pair is invalid',
                life: 3000,
            });
        }
    },
    undefined,
)

// chosen signature scheme
const isPrivateJwkVisible = ref(false);

// JWK representations, only displayed for JWK wallets
const privateJwkText = computed(() => {
    const jwk = walletStore.walletPrivateJwk.value;
    return jwk ? JSON.stringify(jwk, null, 2) : '';
});
const publicJwkText = computed(() => {
    const jwk = walletStore.walletPublicJwk.value;
    return jwk ? JSON.stringify(jwk, null, 2) : '';
});

const signatureScheme = computed(() => {
    return match(wallet.value)
        .with(P.nullish, () => SignatureSchemeId.SECP256K1)
        .otherwise((wallet) => wallet.schemeId)
});


/*
// Copy menu items
const copyMenuItems = computed(() => {
    const alwaysAvailableItems = {
            label: 'Copy Seed',
            icon: 'pi pi-copy',
            command: async () => {
                if (!wallet.value) return;
                const seed = await sessionStore.getWalletSeed(wallet.value.id);
                clipboard.copyToClipboard(seed, 'Seed');
            },
        };

    const extraOptions = match(chosenKeyFormat.value)
        .with(KeyFormat.CMTS, () => [
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
        ])
        .with(KeyFormat.DID_CMTS, () => [
            {
                label: 'Copy DID',
                icon: 'pi pi-copy',
                command: () => {
                    if (didCmtsFormat.value) {
                        clipboard.copyToClipboard(JSON.stringify(didCmtsFormat.value), 'DID JWK');
                    }
                }
            },
        ])
        .otherwise(() => [])

    return [alwaysAvailableItems, ...extraOptions];
});

 */
</script>
<template>
    <!-- Wallet Keys Card -->
    <Card class="w-full">
        <template #title>
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <i class="pi pi-key text-xl"></i>
                    <span>
                        Wallet Keys
                           <span class="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded-md">
                                {{walletStore.walletKeyType}}
                            </span>
                    </span>
                </div>
                <div class="flex gap-2">

                    <Button
                        label="Check keys"
                        icon="pi pi-check"
                        size="small"
                        aria-placeholder="Perform a self-test of keys"
                        @click="() => checkKeyPair()"
                    />


                </div>
            </div>
        </template>
        <template #subtitle>
            <p class="text-sm text-surface-500">
                Your cryptographic keys. Keep the private key strictly
                confidential — anyone with access to them can control this wallet.
            </p>
        </template>
        <template #content>
            <div class="space-y-4">
                <div class="w-full">
                    <FieldNameAndDescription name="Private key" description="Your private key"/>
                    <Password
                        v-model="walletStore.encodedWalletPrivateKey.value"
                        :feedback="false"
                        toggleMask
                        class="w-full"
                        input-class="w-full"
                    />
                </div>
                <div class="w-full">
                    <FieldNameAndDescription name="Public key" description="Your public key"/>
                    <InputText :value="walletStore.encodedWalletPublicKey.value" readonly class="w-full" />
                </div>
                <div class="w-full">
                    <FieldNameAndDescription name="Actor keys passphrase" description="Your generated passphrase used to generate technical access keys on-demand"/>
                    <Password
                        v-model="walletStore.walletKeyActorKeysPassphrase.value"
                        :feedback="false"
                        toggleMask
                        class="w-full"
                        input-class="w-full"
                    />
                </div>

                <!-- JWK-specific section -->
                <template v-if="walletStore.walletKeyType.value === KeyType.JWK">
                    <Divider />
                    <div class="w-full">
                        <div class="flex items-end justify-between gap-2">
                            <FieldNameAndDescription name="Public JWK" description="Your public key in JWK format."/>
                            <Button
                                icon="pi pi-copy"
                                outlined
                                type="button"
                                :disabled="!publicJwkText"
                                @click="clipboard.copyToClipboard(publicJwkText, 'Public JWK')"
                                aria-label="Copy public JWK"
                            />
                        </div>
                        <Textarea :value="publicJwkText" readonly rows="5" class="w-full font-mono text-xs" />
                    </div>
                    <div class="w-full">
                        <div class="flex items-end justify-between gap-2">
                            <FieldNameAndDescription name="Private JWK" description="Your private key in JWK format. Keep it strictly confidential."/>
                            <div class="flex gap-2">
                            <Button
                                :icon="isPrivateJwkVisible ? 'pi pi-eye-slash' : 'pi pi-eye'"
                                :label="isPrivateJwkVisible ? 'Hide' : 'Show'"
                                outlined
                                type="button"
                                @click="isPrivateJwkVisible = !isPrivateJwkVisible"
                                :aria-label="isPrivateJwkVisible ? 'Hide private JWK' : 'Show private JWK'"
                            />
                            <Button
                                icon="pi pi-copy"
                                outlined
                                type="button"
                                :disabled="!privateJwkText"
                                @click="clipboard.copyToClipboard(privateJwkText, 'Private JWK')"
                                aria-label="Copy private JWK"
                            />
                            </div>
                        </div>
                        <Textarea v-if="isPrivateJwkVisible" :value="privateJwkText" readonly rows="8" class="w-full font-mono text-xs" />
                        <InputText v-else value="••••••••••••••••" readonly class="w-full" />
                    </div>
                </template>
            </div>
        </template>
    </Card>
</template>