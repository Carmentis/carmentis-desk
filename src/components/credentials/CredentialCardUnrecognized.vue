<script setup lang="ts">
import { computed } from 'vue';
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

interface PreviewEntry {
  key: string;
  value: string;
}

const MAX_PREVIEW_KEYS = 5;
const MAX_VALUE_LENGTH = 50;

const jsonPreview = computed<PreviewEntry[] | null>(() => {
  try {
    const parsed = JSON.parse(props.credential.data);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return [{ key: '(value)', value: String(props.credential.data).slice(0, MAX_VALUE_LENGTH) }];
    }
    return Object.keys(parsed)
      .slice(0, MAX_PREVIEW_KEYS)
      .map(k => {
        const v = parsed[k];
        let display: string;
        if (v === null) {
          display = 'null';
        } else if (Array.isArray(v)) {
          display = `[ ${v.length} item${v.length !== 1 ? 's' : ''} ]`;
        } else if (typeof v === 'object') {
          display = `{ ${Object.keys(v).length} key${Object.keys(v).length !== 1 ? 's' : ''} }`;
        } else {
          const str = String(v);
          display = str.length > MAX_VALUE_LENGTH ? str.slice(0, MAX_VALUE_LENGTH) + '…' : str;
        }
        return { key: k, value: display };
      });
  } catch {
    return null;
  }
});

const totalKeys = computed<number | null>(() => {
  try {
    const parsed = JSON.parse(props.credential.data);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return Object.keys(parsed).length;
    }
    return null;
  } catch {
    return null;
  }
});

const hasMoreKeys = computed(
  () => totalKeys.value !== null && totalKeys.value > MAX_PREVIEW_KEYS
);
</script>

<template>
  <Card class="h-full flex flex-col">
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-id-card text-gray-500"></i>
        <span class="text-base font-semibold text-gray-900 truncate">{{ credential.name }}</span>
      </div>
    </template>

    <template #subtitle>
      <span class="text-xs text-gray-400 uppercase tracking-wider">Unrecognized credential</span>
    </template>

    <template #content>
      <div v-if="jsonPreview" class="space-y-1">
        <div
          v-for="entry in jsonPreview"
          :key="entry.key"
          class="flex items-baseline gap-2 text-sm"
        >
          <span class="font-mono text-xs text-blue-600 shrink-0">{{ entry.key }}</span>
          <span class="text-gray-400">:</span>
          <span class="text-gray-700 truncate">{{ entry.value }}</span>
        </div>
        <div v-if="hasMoreKeys" class="text-xs text-gray-400 pt-1">
          … and {{ totalKeys! - MAX_PREVIEW_KEYS }} more key{{ totalKeys! - MAX_PREVIEW_KEYS !== 1 ? 's' : '' }}
        </div>
      </div>
      <div v-else class="text-sm text-red-500 flex items-center gap-2">
        <i class="pi pi-exclamation-circle"></i>
        <span>Invalid JSON</span>
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
