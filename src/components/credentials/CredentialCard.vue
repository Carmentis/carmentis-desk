<script setup lang="ts">
import { ref, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useConfirm } from 'primevue/useconfirm';
import type { CredentialEntity } from '../../stores/storage';
import CredentialCardUnrecognized from './CredentialCardUnrecognized.vue';

const props = defineProps<{
  credential: CredentialEntity;
}>();

const emit = defineEmits<{
  (e: 'delete', id: number): void;
}>();

const confirm = useConfirm();

// --- Delete ---
function requestDelete() {
  confirm.require({
    message: `Are you sure you want to delete the credential "${props.credential.name}"? This cannot be undone.`,
    header: 'Delete Credential',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    acceptClass: 'p-button-danger',
    accept: () => emit('delete', props.credential.id),
  });
}

// --- Browse JSON ---
const showBrowseDialog = ref(false);

const MAX_BROWSE_LENGTH = 100_000;

const prettyJson = computed(() => {
  try {
    const parsed = JSON.parse(props.credential.data);
    const full = JSON.stringify(parsed, null, 2);
    if (full.length > MAX_BROWSE_LENGTH) {
      return full.slice(0, MAX_BROWSE_LENGTH) + '\n\n… (truncated, too large to display fully)';
    }
    return full;
  } catch {
    return props.credential.data;
  }
});
</script>

<template>
  <div>
    <!-- Render the appropriate display card based on credential type.
         Currently only "unrecognized" is supported; future types can be
         added here by inspecting the parsed credential structure. -->
    <CredentialCardUnrecognized
      :credential="credential"
      @delete="requestDelete"
      @browse="showBrowseDialog = true"
    />

    <!-- Browse JSON Dialog -->
    <Dialog
      v-model:visible="showBrowseDialog"
      :header="credential.name"
      modal
      class="w-full max-w-2xl"
    >
      <pre class="text-xs font-mono bg-gray-50 rounded p-4 overflow-auto max-h-[60vh] whitespace-pre-wrap break-all">{{ prettyJson }}</pre>
      <template #footer>
        <div class="flex justify-end">
          <Button label="Close" @click="showBrowseDialog = false" severity="secondary" outlined />
        </div>
      </template>
    </Dialog>
  </div>
</template>
