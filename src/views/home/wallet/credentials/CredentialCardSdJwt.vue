<script setup lang="ts">
import { computed, ref } from 'vue';
import { computedAsync } from '@vueuse/core';
import Button from 'primevue/button';
import { parseSdJwt } from '../../../../composables/credentials/useCredentialType.ts';
import SdJwtPresentationDialog from '../../../../components/credentials/SdJwtPresentationDialog.vue';
import {VerifiableCredential} from "../../../../types/types.ts";
import CredentialClaims from './CredentialClaims.vue';
import StatusBadge from '../../../../components/ui/StatusBadge.vue';
import { humanizeKey, truncateMiddle } from '../../../../components/ui/humanize.ts';
import CredentialCardFace from './CredentialCardFace.vue';
import CopyableValue from '../../../../components/ui/CopyableValue.vue';

const props = defineProps<{
    credential: VerifiableCredential;
}>();

const emit = defineEmits<{
    (e: 'browse'): void;
    (e: 'delete'): void;
}>();

const sdJwt = computedAsync(() => parseSdJwt(props.credential.sdjwt), null);
const showPresentDialog = ref(false);
const showDetails = ref(false);

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const issuedAt = computed(() => {
    const iat = sdJwt.value?.jwt.payload.iat;
    return iat
        ? new Date(iat * 1000).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
          })
        : null;
});

const expireAt = computed(() => {
    const exp = sdJwt.value?.jwt.payload.exp;
    return exp
        ? new Date(exp * 1000).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
          })
        : null;
});

const isExpired = computed(() => {
    const exp = sdJwt.value?.jwt.payload.exp;
    return !!exp && exp * 1000 < Date.now();
});

const subject = computed(() => sdJwt.value?.jwt.payload.sub ?? null);

// ---------------------------------------------------------------------------
// Disclosed claims with expandable values
// ---------------------------------------------------------------------------

const PREVIEW_LENGTH = 60;

function previewValue(v: unknown): string {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'object') {
        if (Array.isArray(v)) return `[ ${v.length} item${v.length !== 1 ? 's' : ''} ]`;
        const n = Object.keys(v as object).length;
        return `{ ${n} key${n !== 1 ? 's' : ''} }`;
    }
    const s = String(v);
    return s.length > PREVIEW_LENGTH ? s.slice(0, PREVIEW_LENGTH) + '…' : s;
}

function fullValue(v: unknown): string {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'object') return JSON.stringify(v, null, 2);
    return String(v);
}

function isExpandable(v: unknown): boolean {
    return typeof v === 'string' && v.length > PREVIEW_LENGTH;
}

const disclosedClaims = computed(() =>
    (sdJwt.value?.disclosures ?? [])
        .filter((d) => d.key !== undefined)
        .map((d) => ({
            id: d._digest,
            key: d.key as string,
            preview: previewValue(d.value),
            full: fullValue(d.value),
            expandable: isExpandable(d.value),
        })),
);

// ---------------------------------------------------------------------------
// What the front of the card shows
// ---------------------------------------------------------------------------

// Identity-like claims first, so that e.g. the name comes before technical fields.
const FACE_PRIORITY = ['name', 'given_name', 'family_name', 'first_name', 'last_name', 'firstname', 'lastname', 'email', 'birthdate', 'birth_date'];

const faceClaims = computed(() => {
    const rank = (key: string) => {
        const index = FACE_PRIORITY.indexOf(key.toLowerCase());
        return index === -1 ? FACE_PRIORITY.length : index;
    };
    return (sdJwt.value?.disclosures ?? [])
        .filter((d) => d.key !== undefined && ['string', 'number', 'boolean'].includes(typeof d.value))
        .map((d) => ({ key: d.key as string, value: String(d.value) }))
        .sort((a, b) => rank(a.key) - rank(b.key))
        .slice(0, 3)
        .map((claim) => ({ label: humanizeKey(claim.key), value: claim.value }));
});

const issuerShort = computed(() => {
    const iss = sdJwt.value?.jwt.payload.iss;
    return iss ? truncateMiddle(String(iss)) : undefined;
});

const expiresAtMs = computed(() => {
    const exp = sdJwt.value?.jwt.payload.exp;
    return exp ? exp * 1000 : null;
});

const arrayDisclosureCount = computed(() => (sdJwt.value?.disclosures ?? []).filter((d) => d.key === undefined).length);
</script>

<template>
    <article class="min-w-0 space-y-3">
        <!-- The credential, drawn as a card -->
        <CredentialCardFace
            :name="credential.name"
            kind="SD-JWT VC"
            :subtitle="sdJwt?.jwt.payload.vct"
            :claims="faceClaims"
            :issuer="issuerShort"
            :expires-at="expiresAtMs"
            :expired="isExpired"
        />

        <p v-if="!sdJwt" role="alert" class="flex items-center gap-2 text-sm text-danger">
            <i class="pi pi-exclamation-circle shrink-0" aria-hidden="true" />
            Could not parse SD-JWT
        </p>

        <div class="flex flex-wrap items-center gap-2">
            <Button label="Present" icon="pi pi-share-alt" @click="showPresentDialog = true" />
            <Button label="Browse" icon="pi pi-search" severity="secondary" outlined @click="emit('browse')" />
            <Button label="Delete" icon="pi pi-trash" severity="danger" text class="ml-auto" @click="emit('delete')" />
        </div>

        <!-- Everything else about the credential -->
        <div v-if="sdJwt">
            <button
                type="button"
                class="flex min-h-11 items-center gap-2 text-sm font-medium text-accent hover:underline"
                :aria-expanded="showDetails"
                @click="showDetails = !showDetails"
            >
                <i class="pi text-xs" :class="showDetails ? 'pi-chevron-down' : 'pi-chevron-right'" aria-hidden="true" />
                {{ showDetails ? 'Hide details' : 'Show details' }}
            </button>

            <div v-if="showDetails" class="mt-2 space-y-4 rounded-card border border-line bg-surface p-4">
                <dl class="space-y-2 text-sm">
                    <div class="grid gap-0.5 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-3">
                        <dt class="text-fg-muted">Issuer</dt>
                        <dd class="min-w-0">
                            <CopyableValue :value="sdJwt.jwt.payload.iss" label="issuer" :head="14" :tail="8" />
                        </dd>
                    </div>
                    <div v-if="subject" class="grid gap-0.5 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-3">
                        <dt class="text-fg-muted">Subject</dt>
                        <dd class="min-w-0">
                            <CopyableValue :value="subject" label="subject" :head="14" :tail="8" />
                        </dd>
                    </div>
                    <div class="grid gap-0.5 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-3">
                        <dt class="text-fg-muted">Issued</dt>
                        <dd class="text-fg">{{ issuedAt ?? '—' }}</dd>
                    </div>
                    <div class="grid gap-0.5 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-3">
                        <dt class="text-fg-muted">Expires</dt>
                        <dd class="flex flex-wrap items-center gap-2 text-fg">
                            {{ expireAt ?? '—' }}
                            <StatusBadge v-if="expireAt && isExpired" tone="danger" label="Expired" icon="pi-clock" />
                        </dd>
                    </div>
                    <div class="grid gap-0.5 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-3">
                        <dt class="text-fg-muted">Algorithm</dt>
                        <dd class="font-mono text-xs text-fg-muted">
                            {{ sdJwt.jwt.header.alg }} / {{ sdJwt.jwt.payload._sd_alg }}
                        </dd>
                    </div>
                </dl>

                <section v-if="disclosedClaims.length > 0">
                    <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                        Disclosed claims ({{ disclosedClaims.length }})
                    </h4>
                    <CredentialClaims :entries="disclosedClaims" tone="accent" />
                    <p v-if="arrayDisclosureCount > 0" class="mt-1.5 text-xs text-fg-muted">
                        + {{ arrayDisclosureCount }} array-element disclosure{{ arrayDisclosureCount !== 1 ? 's' : '' }}
                    </p>
                </section>
            </div>
        </div>
    </article>

    <SdJwtPresentationDialog v-model:visible="showPresentDialog" :credential="credential" />
</template>
