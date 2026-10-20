<script setup lang="ts">
import {computed, ref} from "vue";
import {useAsyncState} from "@vueuse/core";
import * as walletRepo from "../../../db/repositories/walletRepository.ts";
import {SignatureSchemeId} from "@cmts-dev/carmentis-sdk-core";
import {useRoute} from "vue-router";
import {useWalletStore} from "../../../stores/walletStore.ts";
import {useToast} from "primevue/usetoast";
import Button from "primevue/button";
import {KeyType} from "../../../types/types.ts";
import {match, P} from "ts-pattern";
import UiCard from "../../../components/ui/UiCard.vue";
import SecretField from "../../../components/ui/SecretField.vue";
import CopyableValue from "../../../components/ui/CopyableValue.vue";
import JsonBlock from "../../../components/ui/JsonBlock.vue";
import StatusBadge from "../../../components/ui/StatusBadge.vue";

const route = useRoute();
const walletStore = useWalletStore(Number(route.params.walletId));
const walletId = computed(() => Number(route.params.walletId));

const { state: wallet } = useAsyncState(
    () => walletRepo.getWalletById(walletId.value),
    null,
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

// The section is closed on every visit: no secret is rendered until the user opens it and reveals a field.
const isOpen = ref(false);
</script>

<template>
    <UiCard
        title="Security and keys"
        subtitle="Your cryptographic keys. Anyone with your private key can control this wallet."
    >
        <template #header-actions>
            <button
                type="button"
                class="inline-flex min-h-11 items-center gap-2 rounded-control px-3 text-sm font-medium text-accent hover:bg-accent-soft"
                :aria-expanded="isOpen"
                aria-controls="wallet-keys-body"
                @click="isOpen = !isOpen"
            >
                {{ isOpen ? 'Hide' : 'Show' }}
                <i class="pi text-xs" :class="isOpen ? 'pi-chevron-up' : 'pi-chevron-down'" aria-hidden="true" />
            </button>
        </template>

        <div v-if="isOpen" id="wallet-keys-body" class="space-y-6">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <StatusBadge tone="neutral" icon="pi-key" :label="`Key type: ${walletStore.walletKeyType.value}`" />
                <Button
                    label="Check keys"
                    icon="pi pi-check"
                    severity="secondary"
                    outlined
                    size="small"
                    @click="() => checkKeyPair()"
                />
            </div>

            <SecretField
                label="Private key"
                description="Gives full control of this wallet. Never share it."
                :value="walletStore.encodedWalletPrivateKey.value"
            />

            <div>
                <p class="text-sm font-medium text-fg">Public key</p>
                <p class="mb-1 text-xs text-fg-muted">Safe to share. Others use it to send you tokens.</p>
                <CopyableValue
                    :value="walletStore.encodedWalletPublicKey.value"
                    label="public key"
                    :head="14"
                    :tail="10"
                />
            </div>

            <SecretField
                label="Actor keys passphrase"
                description="Used to generate technical access keys on demand. Keep it private."
                multiline
                :value="walletStore.walletKeyActorKeysPassphrase.value"
            />

            <!-- JWK-specific section -->
            <div v-if="walletStore.walletKeyType.value === KeyType.JWK" class="space-y-4 border-t border-line pt-5">
                <h3 class="text-sm font-semibold text-fg">Advanced: JWK format</h3>
                <JsonBlock title="Public JWK" :value="publicJwkText" />
                <SecretField
                    label="Private JWK"
                    description="Your private key in JWK format. Never share it."
                    multiline
                    :value="privateJwkText"
                />
            </div>
        </div>

        <p v-else class="text-sm text-fg-muted">
            Hidden by default. Open this section to view or copy your keys.
        </p>
    </UiCard>
</template>
