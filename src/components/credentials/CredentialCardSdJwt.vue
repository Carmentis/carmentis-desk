<script setup lang="ts">
import { computed, ref } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import type { CredentialEntity } from '../../stores/storage';
import { parseSdJwt } from '../../composables/credentials/useCredentialType';
import SdJwtPresentationDialog from './SdJwtPresentationDialog.vue';

const props = defineProps<{
  credential: CredentialEntity;
}>();

const emit = defineEmits<{
  (e: 'browse'): void;
  (e: 'delete'): void;
}>();

const sdJwt = computed(() => parseSdJwt(props.credential.data));
const showPresentDialog = ref(false);

// ---------------------------------------------------------------------------
// Expanded rows — tracks which claim rows have been expanded by the user
// ---------------------------------------------------------------------------
const expandedClaims = ref<Set<string>>(new Set());

function toggleExpand(id: string) {
  const next = new Set(expandedClaims.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedClaims.value = next;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const issuedAt = computed(() => {
  const iat = sdJwt.value?.jwt.payload.iat;
  return iat ? new Date(iat * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;
});

const expireAt = computed(() => {
  const exp = sdJwt.value?.jwt.payload.exp;
  return exp ? new Date(exp * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;
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
    .filter(d => d.key !== undefined)
    .map(d => ({
      id: d._digest,
      key: d.key as string,
      preview: previewValue(d.value),
      full: fullValue(d.value),
      expandable: isExpandable(d.value),
    })),
);

const arrayDisclosureCount = computed(() =>
  (sdJwt.value?.disclosures ?? []).filter(d => d.key === undefined).length,
);
</script>

<template>
  <Card class="overflow-hidden shadow-sm border border-gray-200">

    <!-- Colored header band -->
    <template #header>
      <div class="bg-gradient-to-br from-blue-600 to-blue-500 px-4 py-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-1">
              <i class="pi pi-shield text-white/90 text-sm shrink-0"></i>
              <span class="text-white font-semibold text-sm leading-tight break-words">
                {{ credential.name }}
              </span>
            </div>
            <span
              v-if="sdJwt"
              class="font-mono text-xs text-blue-100 block truncate"
              :title="sdJwt.jwt.payload.vct"
            >
              {{ sdJwt.jwt.payload.vct }}
            </span>
          </div>
          <Tag
            value="SD-JWT"
            class="shrink-0 !bg-white/20 !text-white !border-white/30 text-xs"
          />
        </div>
      </div>
    </template>

    <template #content>
      <div v-if="sdJwt" class="space-y-4">

        <!-- Core metadata -->
        <dl class="space-y-0 divide-y divide-gray-50">
          <div class="flex gap-3 py-1.5">
            <dt class="w-20 shrink-0 text-xs font-medium text-gray-400 pt-0.5">Issuer</dt>
            <dd class="min-w-0 flex-1 text-xs font-mono text-gray-700 break-all leading-snug">
              {{ sdJwt.jwt.payload.iss }}
            </dd>
          </div>
          <div v-if="subject" class="flex gap-3 py-1.5">
            <dt class="w-20 shrink-0 text-xs font-medium text-gray-400 pt-0.5">Subject</dt>
            <dd class="min-w-0 flex-1 text-xs font-mono text-gray-700 break-all leading-snug">
              {{ subject }}
            </dd>
          </div>
          <div class="flex gap-3 py-1.5">
            <dt class="w-20 shrink-0 text-xs font-medium text-gray-400 pt-0.5">Issued</dt>
            <dd class="min-w-0 flex-1 text-sm text-gray-700">{{ issuedAt ?? '—' }}</dd>
          </div>
          <div class="flex gap-3 py-1.5">
            <dt class="w-20 shrink-0 text-xs font-medium text-gray-400 pt-0.5">Expires</dt>
            <dd class="min-w-0 flex-1 text-sm text-gray-700">{{ expireAt ?? '—' }}</dd>
          </div>
          <div class="flex gap-3 py-1.5">
            <dt class="w-20 shrink-0 text-xs font-medium text-gray-400 pt-0.5">Algorithm</dt>
            <dd class="min-w-0 flex-1 text-xs font-mono text-gray-500">
              {{ sdJwt.jwt.header.alg }} / {{ sdJwt.jwt.payload._sd_alg }}
            </dd>
          </div>
        </dl>

        <!-- Disclosed claims -->
        <div v-if="disclosedClaims.length > 0">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Disclosed claims
            </span>
            <span class="text-xs text-gray-300">{{ disclosedClaims.length }}</span>
          </div>

          <dl class="rounded-md border border-gray-100 divide-y divide-gray-100 overflow-hidden">
            <div
              v-for="claim in disclosedClaims"
              :key="claim.id"
              class="flex gap-3 px-3 py-2 bg-white hover:bg-gray-50/50"
            >
              <!-- Key: fixed width, truncated with tooltip -->
              <dt
                class="w-24 shrink-0 text-xs font-mono font-medium text-blue-600 pt-0.5 truncate"
                :title="claim.key"
              >
                {{ claim.key }}
              </dt>

              <!-- Value: truncated or expanded -->
              <dd class="min-w-0 flex-1">
                <span
                  class="text-sm text-gray-700 leading-snug"
                  :class="expandedClaims.has(claim.id) ? 'break-all whitespace-pre-wrap' : 'block truncate'"
                  :title="!expandedClaims.has(claim.id) && !claim.expandable ? undefined : claim.full"
                >
                  {{ expandedClaims.has(claim.id) ? claim.full : claim.preview }}
                </span>
                <button
                  v-if="claim.expandable"
                  class="text-xs text-blue-500 hover:text-blue-700 hover:underline mt-0.5 block"
                  @click="toggleExpand(claim.id)"
                >
                  {{ expandedClaims.has(claim.id) ? 'Show less' : 'Show more' }}
                </button>
              </dd>
            </div>
          </dl>

          <p v-if="arrayDisclosureCount > 0" class="text-xs text-gray-400 mt-1.5">
            + {{ arrayDisclosureCount }} array-element
            disclosure{{ arrayDisclosureCount !== 1 ? 's' : '' }}
          </p>
        </div>
      </div>

      <div v-else class="flex items-center gap-2 text-sm text-red-500 py-2">
        <i class="pi pi-exclamation-circle shrink-0"></i>
        <span>Could not parse SD-JWT</span>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center gap-2 pt-3 border-t border-gray-100">
        <Button
          label="Present"
          icon="pi pi-share-alt"
          size="small"
          severity="primary"
          outlined
          @click="showPresentDialog = true"
        />
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

  <SdJwtPresentationDialog
    v-model:visible="showPresentDialog"
    :credential="credential"
  />
</template>
