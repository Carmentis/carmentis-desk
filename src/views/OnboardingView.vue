<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../stores/sessionStore';
import Button from 'primevue/button';
import Password from 'primevue/password';
import Message from 'primevue/message';
import {useAppStore} from "../stores/appStore.ts";
import AuthLayout from "../components/layout/AuthLayout.vue";
import FieldNameAndDescription from "../components/utils/FieldNameAndDescription.vue";

const router = useRouter();
const sessionStore = useAppStore();

const password = ref('');
const confirmPassword = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

async function handleSubmit() {
    errorMessage.value = '';

    if (password.value.length < 8) {
        errorMessage.value = 'Password must be at least 8 characters.';
        return;
    }
    if (password.value !== confirmPassword.value) {
        errorMessage.value = 'Passwords do not match.';
        return;
    }

    isLoading.value = true;
    try {
        await sessionStore.onboard(password.value);
        await router.push('/');
    } catch (e) {
        console.error('Onboarding error:', e);
        errorMessage.value = 'Failed to set up the vault. Please try again.';
    } finally {
        isLoading.value = false;
    }
}
</script>

<template>
    <AuthLayout title="Welcome to Carmentis Desk" subtitle="Set up your secure vault.">
        <template #icon>
            <span class="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
                <i class="pi pi-lock text-2xl" aria-hidden="true" />
            </span>
        </template>

        <form class="flex flex-col gap-5" novalidate @submit.prevent="handleSubmit">
            <div>
                <FieldNameAndDescription
                    name="Vault password"
                    description="At least 8 characters. You will need it every time you open Carmentis Desk."
                    input-id="vault-password"
                    required
                />
                <Password
                    v-model="password"
                    input-id="vault-password"
                    :input-props="{ autocomplete: 'new-password' }"
                    placeholder="Choose a strong password"
                    :feedback="true"
                    toggleMask
                    fluid
                />
            </div>

            <div>
                <FieldNameAndDescription name="Confirm password" input-id="vault-password-confirm" required />
                <Password
                    v-model="confirmPassword"
                    input-id="vault-password-confirm"
                    :input-props="{ autocomplete: 'new-password' }"
                    placeholder="Type the password again"
                    :feedback="false"
                    toggleMask
                    fluid
                />
            </div>

            <Message v-if="errorMessage" severity="error" :closable="false" role="alert">
                {{ errorMessage }}
            </Message>

            <Button type="submit" label="Create vault" icon="pi pi-shield" class="w-full" :loading="isLoading" />
        </form>
    </AuthLayout>
</template>
