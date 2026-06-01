<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { CredentialEntity } from '../../stores/storage';
import { useAsyncState } from '@vueuse/core';
import * as walletRepo from '../../db/repositories/walletRepository';
import { parseSdJwtEnvelope } from '../../composables/credentials/useCredentialType';
import { SDJwtInstance } from '@sd-jwt/core';
import { useRoute, useRouter } from 'vue-router';
import { useOnChainStore } from '../../stores/onchain.ts';
import { storeToRefs } from 'pinia';
import { Ed25519PrivateSignatureKey, JwkSignatureEncoder, SeedEncoder } from '@cmts-dev/carmentis-sdk-core';
import * as jose from 'jose';
import { JwkSignatureKeyExporter } from '../../utils/jwk-signature-key-exporter.ts';
import { computedAsync } from '@vueuse/core';

// we search the wallet index
const route = useRoute();
const router = useRouter();
const toast = useToast();
const onchainStore = useOnChainStore();
const walletId = computed(() => Number(route.params.walletId));
const { state: wallet } = useAsyncState(
    () => walletRepo.getWalletById(walletId.value),
    null,
    { immediate: true },
);

const props = defineProps<{
    credential: CredentialEntity | null;
}>();
const visible = defineModel<boolean>('visible', { default: false });

const envelope = computedAsync(async () => (props.credential ? await parseSdJwtEnvelope(props.credential.data) : null), null);

const compactToken = computed(() => {
    if (!envelope.value) return '';
    const { jwt, disclosures } = envelope.value;
    const included = disclosures.filter((d) => d.key === undefined || selectedDigests.value.has(d._digest));
    return [jwt.encoded, ...included.map((d) => d._encoded)].join('~') + '~';
});

const verifiablePresentation = computedAsync(async () => {
    console.log('Envelope changed, updating compact token');
    if (!envelope.value) return null;

    // load the current wallet
    const currentWallet = wallet.value;
    if (!currentWallet) return null;

    // derive keys
    const { seed } = currentWallet;
    const sk = Ed25519PrivateSignatureKey.genFromSeed(new SeedEncoder().decode(seed).slice(0, 32));
    const pk = await sk.getPublicKey();
    const skJwk = await JwkSignatureKeyExporter.exportPrivateKey(sk);
    const pkJwk = await JwkSignatureKeyExporter.exportPublicKey(pk);

    try {
        const instance = new SDJwtInstance({
            hasher: async (data) => {
                const contentToHash = typeof data === 'string' ? new TextEncoder().encode(data) : data;
                const hashBytes = await window.crypto.subtle.digest('SHA-256', contentToHash);
                return new Uint8Array(hashBytes);
            },
            kbSignAlg: 'EdDSA',
            kbSigner: async (data: string) => {
                const encoder = new TextEncoder();
                const decoder = new TextDecoder();
                const signature = await window.crypto.subtle.sign(
                    { name: 'Ed25519' },
                    (await jose.importJWK(skJwk, 'EdDSA', {
                        extractable: true,
                    })) as CryptoKey,
                    encoder.encode(data),
                );
                return jose.base64url.encode(new Uint8Array(signature));
            },
        });

        // map the desired disclosures
        const disclosures = namedDisclosures.value;
        const res : Record<string, boolean> = {};
        for (const d of disclosures) {
			if (d.key && typeof d.key === 'string') {
				res[d.key] = true;
			}
        }
        console.log('Disclosures:', res);

        console.log('Instance:', instance);
        const presentation = await instance.present(compactToken.value, res, {
            kb: {
                payload: {
                    nonce: '123',
                    iat: 0,
                    aud: 'test-audience',
                },
            },
        });
        console.log('Presentation:', presentation);
        return presentation;
    } catch (e) {
        console.error('Error presenting SD-JWT:', e);
    }
});

// Extract optional display fields from the loose payload without template casts
const payload = computed(() => envelope.value?.jwt.payload as Record<string, unknown> | undefined);
const vct = computed(() => (typeof payload.value?.['vct'] === 'string' ? (payload.value['vct'] as string) : null));
const iss = computed(() => (typeof payload.value?.['iss'] === 'string' ? (payload.value['iss'] as string) : null));

// ---------------------------------------------------------------------------
// Named vs. array-element disclosures
// ---------------------------------------------------------------------------

const namedDisclosures = computed(() => (envelope.value?.disclosures ?? []).filter((d) => d.key !== undefined));

const arrayDisclosures = computed(() => (envelope.value?.disclosures ?? []).filter((d) => d.key === undefined));

// ---------------------------------------------------------------------------
// Selection state
// ---------------------------------------------------------------------------

const selectedDigests = ref<Set<string>>(new Set());

watch(
    () => props.credential,
    () => {
        selectedDigests.value = new Set(namedDisclosures.value.map((d) => d._digest));
    },
    { immediate: true },
);

function isSelected(digest: string): boolean {
    return selectedDigests.value.has(digest);
}

function toggleClaim(digest: string) {
    const next = new Set(selectedDigests.value);
    if (next.has(digest)) next.delete(digest);
    else next.add(digest);
    selectedDigests.value = next;
}

function selectAll() {
    selectedDigests.value = new Set(namedDisclosures.value.map((d) => d._digest));
}

function selectNone() {
    selectedDigests.value = new Set();
}

const selectedCount = computed(() => selectedDigests.value.size);

// ---------------------------------------------------------------------------
// Compact token
// Build: jwt.encoded ~ [selected disclosures joined by ~] ~
// Using spread+join avoids a double "~~" when no disclosures are included.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

async function copyEncoded() {
    try {
        await navigator.clipboard.writeText(compactToken.value);
        toast.add({
            severity: 'success',
            summary: 'Copied',
            detail: 'Compact SD-JWT token copied to clipboard',
            life: 2000,
        });
    } catch {
        toast.add({
            severity: 'error',
            summary: 'Copy failed',
            detail: 'Could not write to clipboard',
            life: 3000,
        });
    }
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

function formatValue(v: unknown): string {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'object') {
        if (Array.isArray(v)) return `[ ${v.length} item${v.length !== 1 ? 's' : ''} ]`;
        const keys = Object.keys(v as object).length;
        return `{ ${keys} key${keys !== 1 ? 's' : ''} }`;
    }
    const str = String(v);
    return str.length > 60 ? str.slice(0, 60) + '…' : str;
}
</script>

<template>
    <Dialog v-model:visible="visible" :header="`Present — ${credential?.name ?? ''}`" modal class="w-full max-w-lg">
        <div v-if="envelope" class="space-y-5">
            <!-- Credential summary -->
            <div class="flex flex-wrap items-center gap-2">
                <Tag value="SD-JWT" severity="info" />
                <span v-if="vct" class="font-mono text-xs text-gray-500 truncate max-w-xs" :title="vct">
                    {{ vct }}
                </span>
                <span v-if="iss" class="text-xs text-gray-400">· {{ iss }}</span>
            </div>

            <!-- Claims selector -->
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-semibold text-gray-700">
                        Claims to disclose
                        <span class="font-normal text-gray-400">
                            ({{ selectedCount }} / {{ namedDisclosures.length }})
                        </span>
                    </span>
                    <div class="flex gap-1">
                        <Button label="All" size="small" text @click="selectAll" />
                        <Button label="None" size="small" text severity="secondary" @click="selectNone" />
                    </div>
                </div>

                <div v-if="namedDisclosures.length > 0" class="border rounded-lg divide-y overflow-hidden">
                    <div
                        v-for="disc in namedDisclosures"
                        :key="disc._digest"
                        class="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer select-none"
                        @click="toggleClaim(disc._digest)"
                    >
                        <Checkbox :model-value="isSelected(disc._digest)" :binary="true" class="pointer-events-none" />
                        <span class="font-mono text-sm text-blue-700 shrink-0">
                            {{ disc.key }}
                        </span>
                        <span class="text-gray-400 text-xs">:</span>
                        <span
                            class="text-sm truncate flex-1 min-w-0"
                            :class="isSelected(disc._digest) ? 'text-gray-700' : 'text-gray-400 line-through'"
                        >
                            {{ formatValue(disc.value) }}
                        </span>
                        <Tag
                            v-if="!isSelected(disc._digest)"
                            value="hidden"
                            severity="secondary"
                            class="ml-auto shrink-0 text-xs"
                        />
                    </div>
                </div>

                <p v-if="arrayDisclosures.length > 0" class="text-xs text-gray-400 mt-2">
                    <i class="pi pi-info-circle mr-1"></i>
                    {{ arrayDisclosures.length }} array-element disclosure{{ arrayDisclosures.length !== 1 ? 's' : '' }}
                    always included.
                </p>
            </div>
        </div>

        <div v-else class="text-sm text-red-500 flex items-center gap-2">
            <i class="pi pi-exclamation-circle"></i>
            <span>Could not parse SD-JWT credential.</span>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2">
                <Button label="Close" severity="secondary" outlined @click="visible = false" />
                <Button label="Copy Encoded" icon="pi pi-copy" :disabled="!envelope" @click="copyEncoded" />
            </div>
        </template>
    </Dialog>
</template>
