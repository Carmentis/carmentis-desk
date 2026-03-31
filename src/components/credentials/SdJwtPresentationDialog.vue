<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import type { CredentialEntity } from '../../stores/storage';
import { parseSdJwt } from '../../composables/credentials/useCredentialType';

const props = defineProps<{
  credential: CredentialEntity | null;
}>();

const visible = defineModel<boolean>('visible', { default: false });

const toast = useToast();

const sdJwt = computed(() =>
  props.credential ? parseSdJwt(props.credential.data) : null,
);

// ---------------------------------------------------------------------------
// Named vs. array-element disclosures
// ---------------------------------------------------------------------------

const namedDisclosures = computed(() =>
  (sdJwt.value?.disclosures ?? []).filter(d => d.key !== undefined),
);

const arrayDisclosures = computed(() =>
  (sdJwt.value?.disclosures ?? []).filter(d => d.key === undefined),
);

// ---------------------------------------------------------------------------
// Selection state — Set of _digest strings for selected named disclosures
// ---------------------------------------------------------------------------

const selectedDigests = ref<Set<string>>(new Set());

// Pre-select all named disclosures whenever the credential changes
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

// ---------------------------------------------------------------------------
// Compact token construction
// Included disclosures = selected named disclosures + all array-element
// disclosures (array-element disclosures have no standalone identity so
// they are always bundled).
// ---------------------------------------------------------------------------

const compactToken = computed(() => {
  if (!sdJwt.value) return '';
  const { jwt, disclosures } = sdJwt.value;
  const included = disclosures.filter(
    d => d.key === undefined || selectedDigests.value.has(d._digest),
  );
  const discPart = included.map(d => d._encoded).join('~');
  return `${jwt.encoded}~${discPart}~`;
});

const selectedCount = computed(() => selectedDigests.value.size);

// ---------------------------------------------------------------------------
// Copy helpers
// ---------------------------------------------------------------------------

async function copyEncoded() {
  try {
    await navigator.clipboard.writeText(compactToken.value);
    toast.add({ severity: 'success', summary: 'Copied', detail: 'Compact SD-JWT token copied to clipboard', life: 2000 });
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
    const keys = Object.keys(v as object).length;
    return `{ ${keys} key${keys !== 1 ? 's' : ''} }`;
  }
  const str = String(v);
  return str.length > 60 ? str.slice(0, 60) + '…' : str;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="`Present — ${credential?.name ?? ''}`"
    modal
    class="w-full max-w-lg"
  >
    <div v-if="sdJwt" class="space-y-5">

      <!-- Credential summary -->
      <div class="flex flex-wrap items-center gap-2">
        <Tag value="SD-JWT" severity="info" />
        <span class="font-mono text-xs text-gray-500">{{ sdJwt.jwt.payload.vct }}</span>
        <span class="text-xs text-gray-400">· {{ sdJwt.jwt.payload.iss }}</span>
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
            <span class="font-mono text-sm text-blue-700 shrink-0">{{ disc.key }}</span>
            <span class="text-gray-400 text-xs">:</span>
            <span
              class="text-sm truncate"
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
          {{ arrayDisclosures.length }} array-element
          disclosure{{ arrayDisclosures.length !== 1 ? 's' : '' }} always included.
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
        <Button
          label="Copy JSON"
          icon="pi pi-copy"
          severity="secondary"
          outlined
          disabled
          v-tooltip.top="'Coming soon'"
        />
        <Button
          label="Copy Encoded"
          icon="pi pi-copy"
          :disabled="!sdJwt"
          @click="copyEncoded"
        />
      </div>
    </template>
  </Dialog>
</template>
