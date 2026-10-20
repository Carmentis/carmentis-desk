<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import Button from 'primevue/button';
import ResponsiveDialog from '../ui/ResponsiveDialog.vue';
import StatusBadge from '../ui/StatusBadge.vue';
import { useToast } from 'primevue/usetoast';
import { CredentialEntity } from '../../stores/storage';
import { useAsyncState } from '@vueuse/core';
import * as walletRepo from '../../db/repositories/walletRepository';
import { parseSdJwtEnvelope } from '../../composables/credentials/useCredentialType';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '../../stores/sessionStore.ts';
import { computedAsync } from '@vueuse/core';
import {WalletSdJwtSigner} from "../../utils/WalletSdJwtSigner.ts";
import {VerifiableCredential} from "../../types/types.ts";

// we search the wallet index
const route = useRoute();
const toast = useToast();
const sessionStore = useSessionStore();
const walletId = computed(() => Number(route.params.walletId));
const { state: wallet } = useAsyncState(
    () => walletRepo.getWalletById(walletId.value),
    null,
    { immediate: true },
);

const props = defineProps<{
    credential: VerifiableCredential | null;
}>();
const visible = defineModel<boolean>('visible', { default: false });

const envelope = computedAsync(async () => (props.credential ? await parseSdJwtEnvelope(props.credential.sdjwt) : null), null);

const compactToken = computed(() => {
    if (!envelope.value) return '';
    const { jwt, disclosures } = envelope.value;
    const included = disclosures.filter((d) => d.key === undefined || selectedDigests.value.has(d._digest));
    return [jwt.encoded, ...included.map((d) => d._encoded)].join('~') + '~';
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
    <ResponsiveDialog v-model:visible="visible" :header="`Present — ${credential?.name ?? ''}`">
        <div v-if="envelope" class="space-y-5">
            <!-- Credential summary -->
            <div class="flex flex-wrap items-center gap-2">
                <StatusBadge tone="neutral" label="SD-JWT" icon="pi-shield" />
                <span v-if="vct" class="max-w-full truncate font-mono text-xs text-fg-muted" :title="vct">{{ vct }}</span>
                <span v-if="iss" class="max-w-full truncate text-xs text-fg-muted" :title="iss">Issued by {{ iss }}</span>
            </div>

            <!-- Claims selector -->
            <fieldset>
                <legend class="mb-1 text-sm font-semibold text-fg">
                    Claims to share
                    <span class="font-normal text-fg-muted">({{ selectedCount }} of {{ namedDisclosures.length }})</span>
                </legend>
                <div class="mb-2 flex gap-1">
                    <Button label="Select all" size="small" text @click="selectAll" />
                    <Button label="Select none" size="small" text severity="secondary" @click="selectNone" />
                </div>

                <ul v-if="namedDisclosures.length > 0" class="divide-y divide-line overflow-hidden rounded-control border border-line">
                    <li v-for="disc in namedDisclosures" :key="disc._digest">
                        <label class="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-muted">
                            <input
                                type="checkbox"
                                class="size-5 shrink-0 accent-[var(--accent)]"
                                :checked="isSelected(disc._digest)"
                                @change="toggleClaim(disc._digest)"
                            />
                            <span class="shrink-0 font-mono text-sm font-medium text-accent">{{ disc.key }}</span>
                            <span
                                class="min-w-0 flex-1 truncate text-sm"
                                :class="isSelected(disc._digest) ? 'text-fg' : 'text-fg-muted line-through'"
                            >
                                {{ formatValue(disc.value) }}
                            </span>
                            <StatusBadge v-if="!isSelected(disc._digest)" tone="neutral" label="Hidden" icon="pi-eye-slash" class="shrink-0" />
                        </label>
                    </li>
                </ul>

                <p v-if="arrayDisclosures.length > 0" class="mt-2 text-xs text-fg-muted">
                    <i class="pi pi-info-circle mr-1" aria-hidden="true" />
                    {{ arrayDisclosures.length }} array-element disclosure{{ arrayDisclosures.length !== 1 ? 's' : '' }}
                    always included.
                </p>
            </fieldset>
        </div>

        <p v-else role="alert" class="flex items-center gap-2 text-sm text-danger">
            <i class="pi pi-exclamation-circle" aria-hidden="true" />
            Could not parse SD-JWT credential.
        </p>

        <template #footer>
            <Button label="Close" severity="secondary" outlined @click="visible = false" />
            <Button label="Copy token" icon="pi pi-copy" :disabled="!envelope" @click="copyEncoded" />
        </template>
    </ResponsiveDialog>
</template>
