<script setup lang="ts">
import {computed, ref} from "vue";
import {useRoute} from "vue-router";
import {useWalletStore} from "../../../stores/walletStore.ts";
import Button from "primevue/button";
import {KeyType} from "../../../types/types.ts";
import UiCard from "../../../components/ui/UiCard.vue";
import SecretField from "../../../components/ui/SecretField.vue";
import CopyableValue from "../../../components/ui/CopyableValue.vue";
import JsonBlock from "../../../components/ui/JsonBlock.vue";
import SegmentedControl from "../../../components/ui/SegmentedControl.vue";
import type {SegmentedOption} from "../../../components/ui/types.ts";

const route = useRoute();
const walletStore = useWalletStore(Number(route.params.walletId));
const {
    walletKeyType,
    walletKeyPair,
    encodedWalletPublicKey,
    encodedWalletPrivateKey,
    walletKeyActorKeysPassphrase,
    walletPublicJwk,
    walletPrivateJwk,
} = walletStore;

// The section is closed on every visit: no secret is rendered until the user opens it and reveals a field.
const isOpen = ref(false);

// JWK wallets can show their keys in the encoded form or as JWK; other wallets only have the encoded form.
type KeyFormat = 'encoded' | 'jwk';
const FORMATS: SegmentedOption<KeyFormat>[] = [
    {value: 'encoded', label: 'Encoded'},
    {value: 'jwk', label: 'JWK'},
];
const format = ref<KeyFormat>('encoded');
const isJwkWallet = computed(() => walletKeyType.value === KeyType.JWK);
const showJwk = computed(() => isJwkWallet.value && format.value === 'jwk');

const keyTypeLabel = computed(() =>
    isJwkWallet.value ? 'Imported JWK key' : 'Standard wallet key',
);

const asJson = (jwk: unknown) => (jwk ? JSON.stringify(jwk, null, 2) : '');
const publicJwkText = computed(() => asJson(walletPublicJwk.value));
const privateJwkText = computed(() => asJson(walletPrivateJwk.value));
const privateKeyText = computed(() => (showJwk.value ? privateJwkText.value : encodedWalletPrivateKey.value));

// Signs and verifies a message so the user gets an immediate answer, shown next to the button.
type CheckState = 'idle' | 'running' | 'ok' | 'failed';
const checkState = ref<CheckState>('idle');

async function checkKeys() {
    checkState.value = 'running';
    try {
        const {sk, pk} = walletKeyPair.value;
        if (!sk || !pk) {
            checkState.value = 'failed';
            return;
        }
        const message = new TextEncoder().encode("Hello world!");
        const signature = await sk.sign(message);
        checkState.value = (await pk.verify(message, signature)) ? 'ok' : 'failed';
    } catch (e) {
        console.error('Failed to verify key pair:', e);
        checkState.value = 'failed';
    }
}
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

        <Transition
            enter-active-class="transition duration-200 ease-out motion-reduce:transition-opacity"
            enter-from-class="-translate-y-1 opacity-0 motion-reduce:translate-y-0"
            leave-active-class="transition duration-100 ease-in motion-reduce:transition-opacity"
            leave-to-class="opacity-0"
            mode="out-in"
        >
            <div v-if="isOpen" id="wallet-keys-body" class="space-y-6">
                <div v-if="isJwkWallet" class="flex flex-wrap items-center justify-between gap-2">
                    <p class="text-sm text-fg-muted">Show keys as</p>
                    <SegmentedControl v-model="format" :options="FORMATS" ariaLabel="Key format" />
                </div>

                <!-- Public: safe to share -->
                <section class="space-y-3" aria-labelledby="wallet-keys-public">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h3 id="wallet-keys-public" class="text-sm font-semibold text-fg">Public key</h3>
                            <p class="text-xs text-fg-muted">{{ keyTypeLabel }} · Safe to share. Others use it to send you tokens.</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <p
                                v-if="checkState === 'ok' || checkState === 'failed'"
                                role="status"
                                class="flex items-center gap-1.5 text-xs font-medium"
                                :class="checkState === 'ok' ? 'text-success' : 'text-danger'"
                            >
                                <i class="pi" :class="checkState === 'ok' ? 'pi-check-circle' : 'pi-times-circle'" aria-hidden="true" />
                                {{ checkState === 'ok' ? 'Your keys match' : 'Your keys do not match' }}
                            </p>
                            <Button
                                label="Test my keys"
                                icon="pi pi-check"
                                severity="secondary"
                                outlined
                                size="small"
                                :loading="checkState === 'running'"
                                :disabled="checkState === 'running'"
                                @click="checkKeys"
                            />
                        </div>
                    </div>

                    <JsonBlock v-if="showJwk" title="Public key (JWK)" :value="publicJwkText" default-open />
                    <CopyableValue
                        v-else
                        :value="encodedWalletPublicKey"
                        label="public key"
                        :head="14"
                        :tail="10"
                    />
                </section>

                <!-- Private: never share -->
                <section class="space-y-4 border-t border-line pt-5" aria-labelledby="wallet-keys-private">
                    <div>
                        <h3 id="wallet-keys-private" class="flex items-center gap-2 text-sm font-semibold text-fg">
                            <i class="pi pi-lock text-xs text-danger" aria-hidden="true" />
                            Private keys
                        </h3>
                        <p class="text-xs text-fg-muted">Never share these. Hidden until you reveal them.</p>
                    </div>

                    <SecretField
                        :label="showJwk ? 'Private key (JWK)' : 'Private key'"
                        description="Gives full control of this wallet."
                        :multiline="showJwk"
                        :value="privateKeyText"
                    />

                    <SecretField
                        label="Actor keys passphrase"
                        description="Used to generate technical access keys on demand."
                        multiline
                        :value="walletKeyActorKeysPassphrase"
                    />
                </section>
            </div>

            <p v-else class="text-sm text-fg-muted">
                Hidden by default. Open this section to view or copy your keys.
            </p>
        </Transition>
    </UiCard>
</template>
