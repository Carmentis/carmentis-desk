<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import {VerifiableCredential} from "../../../../types/types.ts";
import CredentialClaims from './CredentialClaims.vue';
import { humanizeKey } from '../../../../components/ui/humanize.ts';
import CredentialCardFace from './CredentialCardFace.vue';

const props = defineProps<{
    credential: VerifiableCredential;
}>();

const emit = defineEmits<{
    (e: 'browse'): void;
    (e: 'delete'): void;
}>();

// ---------------------------------------------------------------------------
// JSON preview
// ---------------------------------------------------------------------------

const MAX_PREVIEW_KEYS = 6;
const PREVIEW_LENGTH = 60;

interface PreviewEntry {
    id: string;
    key: string;
    preview: string;
    full: string;
    expandable: boolean;
}

const jsonPreview = computed<PreviewEntry[] | null>(() => {
    try {
        const parsed = JSON.parse(props.credential.sdjwt);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            const s = String(props.credential.sdjwt);
            return [
                {
                    id: '(value)',
                    key: '(value)',
                    preview: s.slice(0, PREVIEW_LENGTH),
                    full: s,
                    expandable: s.length > PREVIEW_LENGTH,
                },
            ];
        }
        return Object.keys(parsed)
            .slice(0, MAX_PREVIEW_KEYS)
            .map((k) => {
                const v = parsed[k];
                let preview: string;
                let full: string;
                let expandable = false;

                if (v === null) {
                    preview = full = 'null';
                } else if (Array.isArray(v)) {
                    preview = full = `[ ${v.length} item${v.length !== 1 ? 's' : ''} ]`;
                } else if (typeof v === 'object') {
                    const n = Object.keys(v).length;
                    preview = full = `{ ${n} key${n !== 1 ? 's' : ''} }`;
                } else {
                    full = String(v);
                    expandable = full.length > PREVIEW_LENGTH;
                    preview = expandable ? full.slice(0, PREVIEW_LENGTH) + '…' : full;
                }
                return { id: k, key: k, preview, full, expandable };
            });
    } catch {
        return null;
    }
});

const totalKeys = computed<number | null>(() => {
    try {
        const parsed = JSON.parse(props.credential.sdjwt);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return Object.keys(parsed).length;
        }
        return null;
    } catch {
        return null;
    }
});

const showDetails = ref(false);

// The first entries are enough for the front of the card.
const faceClaims = computed(() =>
    (jsonPreview.value ?? []).slice(0, 3).map((entry) => ({ label: humanizeKey(entry.key), value: entry.preview })),
);

const hiddenKeyCount = computed(() => (totalKeys.value !== null ? Math.max(0, totalKeys.value - MAX_PREVIEW_KEYS) : 0));
</script>

<template>
    <article class="min-w-0 space-y-3">
        <!-- The credential, drawn as a (grey) card: its format is not recognized -->
        <CredentialCardFace
            :name="credential.name"
            kind="Unknown format"
            :claims="faceClaims"
            palette="neutral"
        />

        <p v-if="!jsonPreview" role="alert" class="flex items-center gap-2 text-sm text-danger">
            <i class="pi pi-exclamation-circle shrink-0" aria-hidden="true" />
            Invalid JSON
        </p>

        <div class="flex flex-wrap items-center gap-2">
            <Button label="Browse" icon="pi pi-search" severity="secondary" outlined @click="emit('browse')" />
            <Button label="Delete" icon="pi pi-trash" severity="danger" text class="ml-auto" @click="emit('delete')" />
        </div>

        <div v-if="jsonPreview">
            <button
                type="button"
                class="flex min-h-11 items-center gap-2 text-sm font-medium text-accent hover:underline"
                :aria-expanded="showDetails"
                @click="showDetails = !showDetails"
            >
                <i class="pi text-xs" :class="showDetails ? 'pi-chevron-down' : 'pi-chevron-right'" aria-hidden="true" />
                {{ showDetails ? 'Hide details' : 'Show details' }}
            </button>

            <div v-if="showDetails" class="mt-2 rounded-card border border-line bg-surface p-4">
                <CredentialClaims :entries="jsonPreview" tone="muted" />
                <p v-if="hiddenKeyCount > 0" class="mt-2 px-1 text-xs text-fg-muted">
                    … and {{ hiddenKeyCount }} more key{{ hiddenKeyCount !== 1 ? 's' : '' }}
                </p>
            </div>
        </div>
    </article>
</template>
