<script setup lang="ts">
import { computed, ref } from 'vue';
import { computedAsync } from '@vueuse/core';
import Button from 'primevue/button';
import { parseSdJwt } from '../../../../composables/credentials/useCredentialType.ts';
import SdJwtPresentationDialog from '../../../../components/credentials/SdJwtPresentationDialog.vue';
import {VerifiableCredential} from "../../../../types/types.ts";
import CredentialClaims from './CredentialClaims.vue';
import StatusBadge from '../../../../components/ui/StatusBadge.vue';
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

const arrayDisclosureCount = computed(() => (sdJwt.value?.disclosures ?? []).filter((d) => d.key === undefined).length);
</script>

<template>
    <article class="min-w-0 overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <header class="flex items-start justify-between gap-3 bg-accent-soft px-4 py-3">
            <div class="min-w-0">
                <h3 class="flex items-start gap-2 text-sm font-semibold text-fg">
                    <i class="pi pi-shield mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                    <span class="break-words">{{ credential.name }}</span>
                </h3>
                <p
                    v-if="sdJwt"
                    class="mt-0.5 truncate font-mono text-xs text-fg-muted"
                    :title="sdJwt.jwt.payload.vct"
                >
                    {{ sdJwt.jwt.payload.vct }}
                </p>
            </div>
            <StatusBadge tone="neutral" label="SD-JWT" icon="pi-shield" class="shrink-0" />
        </header>

        <div class="space-y-4 p-4">
            <template v-if="sdJwt">
                <!-- Core metadata -->
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

                <!-- Disclosed claims -->
                <section v-if="disclosedClaims.length > 0">
                    <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                        Disclosed claims ({{ disclosedClaims.length }})
                    </h4>
                    <CredentialClaims :entries="disclosedClaims" tone="accent" />
                    <p v-if="arrayDisclosureCount > 0" class="mt-1.5 text-xs text-fg-muted">
                        + {{ arrayDisclosureCount }} array-element disclosure{{ arrayDisclosureCount !== 1 ? 's' : '' }}
                    </p>
                </section>
            </template>

            <p v-else role="alert" class="flex items-center gap-2 py-2 text-sm text-danger">
                <i class="pi pi-exclamation-circle shrink-0" aria-hidden="true" />
                Could not parse SD-JWT
            </p>
        </div>

        <footer class="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
            <Button label="Present" icon="pi pi-share-alt" outlined @click="showPresentDialog = true" />
            <Button label="Browse" icon="pi pi-search" severity="secondary" outlined @click="emit('browse')" />
            <Button label="Delete" icon="pi pi-trash" severity="danger" text class="ml-auto" @click="emit('delete')" />
        </footer>
    </article>

    <SdJwtPresentationDialog v-model:visible="showPresentDialog" :credential="credential" />
</template>
