<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import type { CredentialEntity } from '../../stores/storage';
import {
  parseSdJwtVc,
  parseSdJwtEnvelope,
} from '../../composables/credentials/useCredentialType';

const props = defineProps<{
  credential: CredentialEntity | null;
}>();

const visible = defineModel<boolean>('visible', { default: false });

const toast = useToast();

// Typed payload — used to group disclosures and build the derived W3C VC JSON.
const sdJwtVc = computed(() =>
  props.credential ? parseSdJwtVc(props.credential.data) : null,
);

// Shared envelope — used to build the compact presentation token.
const envelope = computed(() =>
  props.credential ? parseSdJwtEnvelope(props.credential.data) : null,
);

// ---------------------------------------------------------------------------
// Disclosure grouping
// Digest sets are derived from the two _sd arrays in the payload:
//   - credentialSubject._sd → claims placed under credentialSubject in the VC
//   - payload._sd           → claims placed at the top level of the VC
// ---------------------------------------------------------------------------

function digestSet(obj: unknown): Set<string> {
  if (!obj || typeof obj !== 'object') return new Set();
  const sd = (obj as Record<string, unknown>)['_sd'];
  if (!Array.isArray(sd)) return new Set();
  return new Set(sd.filter((s): s is string => typeof s === 'string'));
}

const subjectDigests = computed(() =>
  digestSet(sdJwtVc.value?.jwt.payload.credentialSubject),
);

const topLevelDigests = computed(() =>
  digestSet(sdJwtVc.value?.jwt.payload),
);

type DisclosureContext = 'subject' | 'credential' | 'other';

const namedDisclosures = computed(() =>
  (sdJwtVc.value?.disclosures ?? [])
    .filter(d => d.key !== undefined)
    .map(d => ({
      ...d,
      context: (
        subjectDigests.value.has(d._digest) ? 'subject' :
        topLevelDigests.value.has(d._digest) ? 'credential' :
        'other'
      ) as DisclosureContext,
    }))
    // Subject claims first, then credential-level claims
    .sort((a, b) => {
      const order: Record<DisclosureContext, number> = { subject: 0, credential: 1, other: 2 };
      return order[a.context] - order[b.context];
    }),
);

const arrayDisclosures = computed(() =>
  (sdJwtVc.value?.disclosures ?? []).filter(d => d.key === undefined),
);

// ---------------------------------------------------------------------------
// Selection state
// ---------------------------------------------------------------------------

const selectedDigests = ref<Set<string>>(new Set());

watch(
  () => props.credential,
  () => {
    selectedDigests.value = new Set(namedDisclosures.value.map(d => d._digest));
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
  selectedDigests.value = new Set(namedDisclosures.value.map(d => d._digest));
}

function selectNone() {
  selectedDigests.value = new Set();
}

const selectedCount = computed(() => selectedDigests.value.size);

// ---------------------------------------------------------------------------
// Derived W3C VC JSON
// Reconstructs a clean Verifiable Credential JSON from the selected
// disclosures, placing each claim at the right level of the document.
// ---------------------------------------------------------------------------

const derivedVc = computed((): Record<string, unknown> | null => {
  if (!sdJwtVc.value) return null;
  const payload = sdJwtVc.value.jwt.payload;
  const disclosures = sdJwtVc.value.disclosures;

  const derived: Record<string, unknown> = {
    '@context': payload['@context'],
    type: payload.type,
  };
  if (payload.validFrom) derived.validFrom = payload.validFrom;
  if (payload.validUntil) derived.validUntil = payload.validUntil;
  if (payload.vct) derived.vct = payload.vct;

  // Top-level VC claims (e.g. issuer, credential id)
  for (const disc of disclosures) {
    if (disc.key && topLevelDigests.value.has(disc._digest) && selectedDigests.value.has(disc._digest)) {
      derived[disc.key] = disc.value;
    }
  }

  // credentialSubject claims
  const subject: Record<string, unknown> = {};
  for (const disc of disclosures) {
    if (disc.key && subjectDigests.value.has(disc._digest) && selectedDigests.value.has(disc._digest)) {
      subject[disc.key] = disc.value;
    }
  }
  derived.credentialSubject = subject;

  return derived;
});

// ---------------------------------------------------------------------------
// Compact presentation token (same serialisation as classic SD-JWT)
// ---------------------------------------------------------------------------

const compactToken = computed(() => {
  if (!envelope.value) return '';
  const { jwt, disclosures } = envelope.value;
  const included = disclosures.filter(
    d => d.key === undefined || selectedDigests.value.has(d._digest),
  );
  return [jwt.encoded, ...included.map(d => d._encoded)].join('~') + '~';
});

// ---------------------------------------------------------------------------
// Copy helpers
// ---------------------------------------------------------------------------

async function copyDerivedJson() {
  if (!derivedVc.value) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(derivedVc.value, null, 2));
    toast.add({ severity: 'success', summary: 'Copied', detail: 'Derived W3C VC JSON copied to clipboard', life: 2000 });
  } catch {
    toast.add({ severity: 'error', summary: 'Copy failed', detail: 'Could not write to clipboard', life: 3000 });
  }
}

async function copyEncoded() {
  try {
    await navigator.clipboard.writeText(compactToken.value);
    toast.add({ severity: 'success', summary: 'Copied', detail: 'Compact SD-JWT-VC token copied to clipboard', life: 2000 });
  } catch {
    toast.add({ severity: 'error', summary: 'Copy failed', detail: 'Could not write to clipboard', life: 3000 });
  }
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'object') {
    if (Array.isArray(v)) return `[ ${v.length} item${v.length !== 1 ? 's' : ''} ]`;
    const n = Object.keys(v as object).length;
    return `{ ${n} key${n !== 1 ? 's' : ''} }`;
  }
  const str = String(v);
  return str.length > 60 ? str.slice(0, 60) + '…' : str;
}

const contextLabel: Record<DisclosureContext, string> = {
  subject: 'subject',
  credential: 'credential',
  other: 'other',
};

const contextClass: Record<DisclosureContext, string> = {
  subject: 'text-purple-500',
  credential: 'text-blue-500',
  other: 'text-gray-400',
};
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="`Derive — ${credential?.name ?? ''}`"
    modal
    class="w-full max-w-lg"
  >
    <div v-if="sdJwtVc" class="space-y-5">

      <!-- Credential summary -->
      <div class="flex flex-wrap items-center gap-2">
        <Tag value="SD-JWT-VC" severity="contrast" />
        <span
          v-if="sdJwtVc.jwt.payload.vct"
          class="font-mono text-xs text-gray-500 truncate max-w-xs"
          :title="sdJwtVc.jwt.payload.vct"
        >
          {{ sdJwtVc.jwt.payload.vct }}
        </span>
      </div>

      <!-- Claims selector -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-semibold text-gray-700">
            Claims to disclose
            <span class="font-normal text-gray-400">({{ selectedCount }} / {{ namedDisclosures.length }})</span>
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
            <Checkbox
              :model-value="isSelected(disc._digest)"
              :binary="true"
              class="pointer-events-none"
            />
            <span class="font-mono text-sm text-purple-700 shrink-0 min-w-0">{{ disc.key }}</span>
            <span class="text-gray-400 text-xs">:</span>
            <span
              class="text-sm truncate flex-1 min-w-0"
              :class="isSelected(disc._digest) ? 'text-gray-700' : 'text-gray-400 line-through'"
            >
              {{ formatValue(disc.value) }}
            </span>
            <!-- Context badge -->
            <span
              class="text-xs font-medium shrink-0 ml-auto"
              :class="contextClass[disc.context]"
            >
              {{ contextLabel[disc.context] }}
            </span>
            <Tag
              v-if="!isSelected(disc._digest)"
              value="hidden"
              severity="secondary"
              class="shrink-0 text-xs"
            />
          </div>
        </div>

        <p v-if="arrayDisclosures.length > 0" class="text-xs text-gray-400 mt-2">
          <i class="pi pi-info-circle mr-1"></i>
          {{ arrayDisclosures.length }} array-element
          disclosure{{ arrayDisclosures.length !== 1 ? 's' : '' }} always included.
        </p>
      </div>

      <!-- Legend -->
      <div class="flex items-center gap-4 text-xs text-gray-400">
        <span><span class="text-purple-500 font-medium">subject</span> — placed in <code>credentialSubject</code></span>
        <span><span class="text-blue-500 font-medium">credential</span> — placed at VC root</span>
      </div>
    </div>

    <div v-else class="text-sm text-red-500 flex items-center gap-2">
      <i class="pi pi-exclamation-circle"></i>
      <span>Could not parse SD-JWT-VC credential.</span>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Close" severity="secondary" outlined @click="visible = false" />
        <Button
          label="Copy Derived JSON"
          icon="pi pi-file-export"
          severity="secondary"
          outlined
          :disabled="!derivedVc"
          v-tooltip.top="'Copy as W3C Verifiable Credential JSON (derived, not stored)'"
          @click="copyDerivedJson"
        />
        <Button
          label="Copy Encoded"
          icon="pi pi-copy"
          :disabled="!envelope"
          v-tooltip.top="'Copy as compact SD-JWT-VC token'"
          @click="copyEncoded"
        />
      </div>
    </template>
  </Dialog>
</template>
