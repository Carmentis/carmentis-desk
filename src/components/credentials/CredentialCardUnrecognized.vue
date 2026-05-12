<script setup lang="ts">
import { computed, ref } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import type { CredentialEntity } from '../../stores/storage';

const props = defineProps<{
    credential: CredentialEntity;
}>();

const emit = defineEmits<{
    (e: 'browse'): void;
    (e: 'delete'): void;
}>();

// ---------------------------------------------------------------------------
// Expanded rows
// ---------------------------------------------------------------------------

const expandedEntries = ref<Set<string>>(new Set());

function toggleExpand(key: string) {
    const next = new Set(expandedEntries.value);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    expandedEntries.value = next;
}

// ---------------------------------------------------------------------------
// JSON preview
// ---------------------------------------------------------------------------

const MAX_PREVIEW_KEYS = 6;
const PREVIEW_LENGTH = 60;

interface PreviewEntry {
    key: string;
    preview: string;
    full: string;
    expandable: boolean;
}

const jsonPreview = computed<PreviewEntry[] | null>(() => {
    try {
        const parsed = JSON.parse(props.credential.data);
        if (
            typeof parsed !== 'object' ||
            parsed === null ||
            Array.isArray(parsed)
        ) {
            const s = String(props.credential.data);
            return [
                {
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
                    preview =
                        full = `[ ${v.length} item${v.length !== 1 ? 's' : ''} ]`;
                } else if (typeof v === 'object') {
                    const n = Object.keys(v).length;
                    preview = full = `{ ${n} key${n !== 1 ? 's' : ''} }`;
                } else {
                    full = String(v);
                    expandable = full.length > PREVIEW_LENGTH;
                    preview = expandable
                        ? full.slice(0, PREVIEW_LENGTH) + '…'
                        : full;
                }
                return { key: k, preview, full, expandable };
            });
    } catch {
        return null;
    }
});

const totalKeys = computed<number | null>(() => {
    try {
        const parsed = JSON.parse(props.credential.data);
        if (
            typeof parsed === 'object' &&
            parsed !== null &&
            !Array.isArray(parsed)
        ) {
            return Object.keys(parsed).length;
        }
        return null;
    } catch {
        return null;
    }
});

const hiddenKeyCount = computed(() =>
    totalKeys.value !== null
        ? Math.max(0, totalKeys.value - MAX_PREVIEW_KEYS)
        : 0,
);
</script>

<template>
    <Card class="overflow-hidden shadow-sm border border-gray-200">
        <!-- Neutral header band -->
        <template #header>
            <div class="bg-gradient-to-br from-gray-600 to-gray-500 px-4 py-3">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                            <i
                                class="pi pi-id-card text-white/90 text-sm shrink-0"
                            ></i>
                            <span
                                class="text-white font-semibold text-sm leading-tight break-words"
                            >
                                {{ credential.name }}
                            </span>
                        </div>
                    </div>
                    <span
                        class="shrink-0 text-xs text-gray-200 font-medium uppercase tracking-wide pt-0.5"
                    >
                        Unknown
                    </span>
                </div>
            </div>
        </template>

        <template #content>
            <div v-if="jsonPreview">
                <dl
                    class="rounded-md border border-gray-100 divide-y divide-gray-100 overflow-hidden"
                >
                    <div
                        v-for="entry in jsonPreview"
                        :key="entry.key"
                        class="flex gap-3 px-3 py-2 bg-white hover:bg-gray-50/50"
                    >
                        <!-- Key: fixed width, truncated with tooltip -->
                        <dt
                            class="w-24 shrink-0 text-xs font-mono font-medium text-gray-500 pt-0.5 truncate"
                            :title="entry.key"
                        >
                            {{ entry.key }}
                        </dt>

                        <!-- Value: truncated or expanded -->
                        <dd class="min-w-0 flex-1">
                            <span
                                class="text-sm text-gray-700 leading-snug"
                                :class="
                                    expandedEntries.has(entry.key)
                                        ? 'break-all whitespace-pre-wrap'
                                        : 'block truncate'
                                "
                                :title="
                                    !expandedEntries.has(entry.key) &&
                                    !entry.expandable
                                        ? undefined
                                        : entry.full
                                "
                            >
                                {{
                                    expandedEntries.has(entry.key)
                                        ? entry.full
                                        : entry.preview
                                }}
                            </span>
                            <button
                                v-if="entry.expandable"
                                class="text-xs text-blue-500 hover:text-blue-700 hover:underline mt-0.5 block"
                                @click="toggleExpand(entry.key)"
                            >
                                {{
                                    expandedEntries.has(entry.key)
                                        ? 'Show less'
                                        : 'Show more'
                                }}
                            </button>
                        </dd>
                    </div>
                </dl>

                <p
                    v-if="hiddenKeyCount > 0"
                    class="text-xs text-gray-400 mt-2 px-1"
                >
                    … and {{ hiddenKeyCount }} more key{{
                        hiddenKeyCount !== 1 ? 's' : ''
                    }}
                </p>
            </div>

            <div
                v-else
                class="flex items-center gap-2 text-sm text-red-500 py-2"
            >
                <i class="pi pi-exclamation-circle shrink-0"></i>
                <span>Invalid JSON</span>
            </div>
        </template>

        <template #footer>
            <div class="flex items-center gap-2 pt-3 border-t border-gray-100">
                <Button
                    label="Browse"
                    icon="pi pi-search"
                    size="small"
                    severity="secondary"
                    outlined
                    @click="emit('browse')"
                />
                <Button
                    label="Delete"
                    icon="pi pi-trash"
                    size="small"
                    severity="danger"
                    text
                    class="ml-auto"
                    @click="emit('delete')"
                />
            </div>
        </template>
    </Card>
</template>
