<script setup lang="ts">
import { computed } from 'vue';
import type { CredentialEntity } from '../../stores/storage';
import { detectCredentialType } from '../../composables/credentials/useCredentialType';
import CredentialCardUnrecognized from './CredentialCardUnrecognized.vue';
import CredentialCardSdJwt from './CredentialCardSdJwt.vue';
import CredentialCardSdJwtVc from './CredentialCardSdJwtVc.vue';

const props = defineProps<{
  credential: CredentialEntity;
}>();

const emit = defineEmits<{
  (e: 'delete', id: number): void;
  (e: 'browse', id: number): void;
}>();

const credentialType = computed(() => detectCredentialType(props.credential.data));
</script>

<template>
  <CredentialCardSdJwtVc
    v-if="credentialType === 'sd-jwt-vc'"
    :credential="credential"
    @delete="emit('delete', credential.id)"
    @browse="emit('browse', credential.id)"
  />
  <CredentialCardSdJwt
    v-else-if="credentialType === 'sd-jwt'"
    :credential="credential"
    @delete="emit('delete', credential.id)"
    @browse="emit('browse', credential.id)"
  />
  <CredentialCardUnrecognized
    v-else
    :credential="credential"
    @delete="emit('delete', credential.id)"
    @browse="emit('browse', credential.id)"
  />
</template>
