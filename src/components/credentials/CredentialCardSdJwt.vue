<script setup lang="ts">
import { computed } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import type { CredentialEntity } from '../../stores/storage';
import { parseSdJwt } from '../../composables/credentials/useCredentialType';

const props = defineProps<{
  credential: CredentialEntity;
}>();

const emit = defineEmits<{
  (e: 'browse'): void;
  (e: 'delete'): void;
}>();

const sdJwt = computed(() => parseSdJwt(props.credential.data));

const issuedAt = computed(() => {
  const iat = sdJwt.value?.jwt.payload.iat;
  if (!iat) return null;
  return new Date(iat * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
});

const expireAt = computed(() => {
  const exp = sdJwt.value?.jwt.payload.exp;
  if (!exp) return null;
  return new Date(exp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
});

/**
 * Collect disclosed claims (disclosures that have a `key`, meaning they map
 * to a named payload claim). Array-element disclosures have no key and are
 * omitted from this summary.
 */
const disclosedClaims = computed(() => {
  return (sdJwt.value?.disclosures ?? [])
    .filter(d => d.key !== undefined)
    .map(d => ({
      key: d.key as string,
      value: formatValue(d.value),
    }));
});

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'object') {
    if (Array.isArray(v)) return `[ ${v.length} item${v.length !== 1 ? 's' : ''} ]`;
    return `{ ${Object.keys(v as object).length} key${Object.keys(v as object).length !== 1 ? 's' : ''} }`;
  }
  const str = String(v);
  return str.length > 50 ? str.slice(0, 50) + '…' : str;
}
</script>

<template>
  <Card class="h-full flex flex-col">
    <template #title>
      <div class="flex items-center gap-2 min-w-0">
        <i class="pi pi-shield text-blue-500 flex-shrink-0"></i>
        <span class="text-base font-semibold text-gray-900 truncate">{{ credential.name }}</span>
      </div>
    </template>

    <template #subtitle>
      <div class="flex flex-wrap items-center gap-2 mt-1">
        <Tag value="SD-JWT" severity="info" />
        <span v-if="sdJwt" class="text-xs text-gray-500 font-mono truncate">{{ sdJwt.jwt.payload.vct }}</span>
      </div>
    </template>

    <template #content>
      <div v-if="sdJwt" class="space-y-3">
        <!-- Metadata -->
        <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <span class="text-gray-500 font-medium">Issuer</span>
          <span class="text-gray-800 truncate font-mono text-xs">{{ sdJwt.jwt.payload.iss }}</span>

          <span class="text-gray-500 font-medium">Issued</span>
          <span class="text-gray-800">{{ issuedAt ?? '—' }}</span>

          <span class="text-gray-500 font-medium">Expire at</span>
          <span class="text-gray-800">{{ expireAt ?? '—' }}</span>

          <span class="text-gray-500 font-medium">Algorithm</span>
          <span class="text-gray-800 font-mono text-xs">
            {{ sdJwt.jwt.header.alg }} / {{ sdJwt.jwt.payload._sd_alg }}
          </span>
        </div>

        <!-- Disclosed claims -->
        <div v-if="disclosedClaims.length > 0">
          <div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Disclosed claims ({{ disclosedClaims.length }})
          </div>
          <div class="space-y-1">
            <div
              v-for="claim in disclosedClaims"
              :key="claim.key"
              class="flex items-baseline gap-2 text-sm"
            >
              <span class="font-mono text-xs text-blue-600 shrink-0">{{ claim.key }}</span>
              <span class="text-gray-400">:</span>
              <span class="text-gray-700 truncate">{{ claim.value }}</span>
            </div>
          </div>
        </div>

        <div v-if="sdJwt.disclosures.length - disclosedClaims.length > 0" class="text-xs text-gray-400">
          + {{ sdJwt.disclosures.length - disclosedClaims.length }} array-element
          disclosure{{ sdJwt.disclosures.length - disclosedClaims.length !== 1 ? 's' : '' }}
        </div>
      </div>

      <div v-else class="text-sm text-red-500 flex items-center gap-2">
        <i class="pi pi-exclamation-circle"></i>
        <span>Could not parse SD-JWT</span>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center gap-2 pt-2 border-t border-gray-100">
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
          outlined
          @click="emit('delete')"
        />
      </div>
    </template>
  </Card>
</template>
