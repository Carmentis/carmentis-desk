<script setup lang="ts">
import { computed } from 'vue';
import { detectCredentialType } from '../../../../composables/credentials/useCredentialType.ts';
import CredentialCardUnrecognized from './CredentialCardUnrecognized.vue';
import CredentialCardSdJwt from './CredentialCardSdJwt.vue';
import {VerifiableCredential, CredentialType} from "../../../../types/types.ts";

const props = defineProps<{
    credential: VerifiableCredential;
}>();

const emit = defineEmits<{
    (e: 'delete', id: number): void;
    (e: 'browse', id: number): void;
}>();

const credentialType = computed(() => detectCredentialType(props.credential.sdjwt));
</script>

<template>
    <CredentialCardSdJwt
        v-if="credentialType === CredentialType.SDJWT"
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
