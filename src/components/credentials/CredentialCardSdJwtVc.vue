<script setup lang="ts">
import { computed, ref } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import type { CredentialEntity } from '../../stores/storage';
import { parseSdJwtVc } from '../../composables/credentials/useCredentialType';
import SdJwtVcPresentationDialog from './SdJwtVcPresentationDialog.vue';

const props = defineProps<{
  credential: CredentialEntity;
}>();

const emit = defineEmits<{
  (e: 'browse'): void;
  (e: 'delete'): void;
}>();

const sdJwtVc = computed(() => parseSdJwtVc(props.credential.data));
const showDeriveDialog = ref(false);

// ---------------------------------------------------------------------------
// Expanded rows
// ---------------------------------------------------------------------------

const expandedClaims = ref<Set<string>>(new Set());

function toggleExpand(id: string) {
  const next = new Set(expandedClaims.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedClaims.value = next;
}

// ---------------------------------------------------------------------------
// Metadata helpers
// ---------------------------------------------------------------------------

function formatIsoDate(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso; // return raw string if unparseable
  }
}

const validFrom = computed(() => formatIsoDate(sdJwtVc.value?.jwt.payload.validFrom));
const validUntil = computed(() => formatIsoDate(sdJwtVc.value?.jwt.payload.validUntil));

const credentialTypes = computed(() =>
  (sdJwtVc.value?.jwt.payload.type ?? []).filter(t => t !== 'VerifiableCredential'),
);

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
  (sdJwtVc.value?.disclosures ?? [])
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
  (sdJwtVc.value?.disclosures ?? []).filter(d => d.key === undefined).length,
);
</script>

<template>
  <Card class="overflow-hidden shadow-sm border border-gray-200">

    <!-- Purple header band -->
    <template #header>
      <div class="bg-gradient-to-br from-purple-700 to-purple-500 px-4 py-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-1">
              <i class="pi pi-verified text-white/90 text-sm shrink-0"></i>
              <span class="text-white font-semibold text-sm leading-tight break-words">
                {{ credential.name }}
              </span>
            </div>
            <span
              v-if="sdJwtVc?.jwt.payload.vct"
              class="font-mono text-xs text-purple-200 block truncate"
              :title="sdJwtVc.jwt.payload.vct"
            >
              {{ sdJwtVc.jwt.payload.vct }}
            </span>
          </div>
          <Tag
            value="SD-JWT-VC"
            class="shrink-0 !bg-white/20 !text-white !border-white/30 text-xs"
          />
        </div>
      </div>
    </template>

    <template #content>
      <div v-if="sdJwtVc" class="space-y-4">

        <!-- Core W3C VC metadata -->
        <dl class="space-y-0 divide-y divide-gray-50">
          <div v-if="credentialTypes.length > 0" class="flex gap-3 py-1.5">
            <dt class="w-20 shrink-0 text-xs font-medium text-gray-400 pt-0.5">Types</dt>
            <dd class="min-w-0 flex-1 flex flex-wrap gap-1">
              <Tag
                v-for="t in credentialTypes"
                :key="t"
                :value="t"
                severity="secondary"
                class="text-xs"
              />
            </dd>
          </div>
          <div class="flex gap-3 py-1.5">
            <dt class="w-20 shrink-0 text-xs font-medium text-gray-400 pt-0.5">Valid from</dt>
            <dd class="min-w-0 flex-1 text-sm text-gray-700">{{ validFrom ?? '—' }}</dd>
          </div>
          <div class="flex gap-3 py-1.5">
            <dt class="w-20 shrink-0 text-xs font-medium text-gray-400 pt-0.5">Valid until</dt>
            <dd class="min-w-0 flex-1 text-sm text-gray-700">{{ validUntil ?? '—' }}</dd>
          </div>
          <div class="flex gap-3 py-1.5">
            <dt class="w-20 shrink-0 text-xs font-medium text-gray-400 pt-0.5">Algorithm</dt>
            <dd class="min-w-0 flex-1 text-xs font-mono text-gray-500">
              {{ sdJwtVc.jwt.header.alg }} / {{ sdJwtVc.jwt.payload._sd_alg }}
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
              <dt
                class="w-24 shrink-0 text-xs font-mono font-medium text-purple-600 pt-0.5 truncate"
                :title="claim.key"
              >
                {{ claim.key }}
              </dt>
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
                  class="text-xs text-purple-500 hover:text-purple-700 hover:underline mt-0.5 block"
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
        <span>Could not parse SD-JWT-VC</span>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center gap-2 pt-3 border-t border-gray-100">
        <Button
          label="Derive"
          icon="pi pi-share-alt"
          size="small"
          severity="primary"
          outlined
          @click="showDeriveDialog = true"
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

  <SdJwtVcPresentationDialog
    v-model:visible="showDeriveDialog"
    :credential="credential"
  />
</template>
