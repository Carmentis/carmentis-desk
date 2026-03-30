<script setup lang="ts">
import { ref, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useConfirm } from 'primevue/useconfirm';
import type { CredentialEntity } from '../../stores/storage';
import CredentialCardUnrecognized from './CredentialCardUnrecognized.vue';
import { digest, generateSalt, ES256 } from '@sd-jwt/crypto-browser';
import {SDJwtInstance} from "@sd-jwt/core";
import {SDJwtVcInstance} from "@sd-jwt/sd-jwt-vc";
import {DisclosureFrame} from "@sd-jwt/types";

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

async function generateSdJwt() {
  const { privateKey, publicKey } = await ES256.generateKeyPair();
  const signer = await await ES256.getSigner(privateKey)
  const sdjwt = new SDJwtVcInstance({
    signer,
    signAlg: ES256.alg,
    hasher: digest,
    hashAlg: 'sha-256',
    saltGenerator: generateSalt,
  });
// Issuer Define the claims object with the user's information
  const claims = {
    firstname: 'John',
    lastname: 'Doe',
    ssn: '123-45-6789',
    id: '1234',
    data: {
      firstname: 'John',
      lastname: 'Doe',
      ssn: '123-45-6789',
      list: [{ r: '1' }, 'b', 'c'],
    },
    data2: {
      hi: 'bye',
    },
  };

  // Issuer Define the disclosure frame to specify which claims can be disclosed
  const disclosureFrame: DisclosureFrame<typeof claims> = {
    _sd: ['firstname', 'id', 'data2'],
    data: {
      _sd: ['list'],
      _sd_decoy: 2,
      list: {
        _sd: [0, 2],
        _sd_decoy: 1,
        0: {
          _sd: ['r'],
        },
      },
    },
    data2: {
      _sd: ['hi'],
    },
  };

  // Issue a signed JWT credential with the specified claims and disclosures
  // Return a Encoded SD JWT. Issuer send the credential to the holder
  const credential = await sdjwt.issue(
      {
        iss: 'Issuer',
        iat: Math.floor(Date.now() / 1000),
        vct: 'ExampleCredentials',
        ...claims,
      },
      disclosureFrame,
  );
  console.log('encodedJwt:', credential);

  const sdJwtToken = await sdjwt.decode(credential);
  console.log(JSON.stringify(sdJwtToken));

}
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
