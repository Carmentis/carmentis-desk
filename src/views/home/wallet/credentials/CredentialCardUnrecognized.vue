<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import {VerifiableCredential} from "../../../../types/types.ts";
import CredentialClaims from './CredentialClaims.vue';
import StatusBadge from '../../../../components/ui/StatusBadge.vue';

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

const hiddenKeyCount = computed(() => (totalKeys.value !== null ? Math.max(0, totalKeys.value - MAX_PREVIEW_KEYS) : 0));
</script>

<template>
    <article class="min-w-0 overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <header class="flex items-start justify-between gap-3 bg-surface-muted px-4 py-3">
            <h3 class="flex min-w-0 items-start gap-2 text-sm font-semibold text-fg">
                <i class="pi pi-id-card mt-0.5 shrink-0 text-fg-muted" aria-hidden="true" />
                <span class="break-words">{{ credential.name }}</span>
            </h3>
            <StatusBadge tone="neutral" label="Unknown format" icon="pi-question-circle" class="shrink-0" />
        </header>

        <div class="p-4">
            <template v-if="jsonPreview">
                <CredentialClaims :entries="jsonPreview" tone="muted" />
                <p v-if="hiddenKeyCount > 0" class="mt-2 px-1 text-xs text-fg-muted">
                    … and {{ hiddenKeyCount }} more key{{ hiddenKeyCount !== 1 ? 's' : '' }}
                </p>
            </template>

            <p v-else role="alert" class="flex items-center gap-2 py-2 text-sm text-danger">
                <i class="pi pi-exclamation-circle shrink-0" aria-hidden="true" />
                Invalid JSON
            </p>
        </div>

        <footer class="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
            <Button label="Browse" icon="pi pi-search" severity="secondary" outlined @click="emit('browse')" />
            <Button label="Delete" icon="pi pi-trash" severity="danger" text class="ml-auto" @click="emit('delete')" />
        </footer>
    </article>
</template>
