<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../stores/sessionStore';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Card from 'primevue/card';
import Message from 'primevue/message';

const router = useRouter();
const sessionStore = useSessionStore();

const pseudo = ref('');
const password = ref('');
const confirmPassword = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

async function handleSubmit() {
    errorMessage.value = '';

    if (!pseudo.value.trim()) {
        errorMessage.value = 'Please enter a display name.';
        return;
    }
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
        await sessionStore.onboard(pseudo.value.trim(), password.value);
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
    <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card class="w-full max-w-md">
            <template #header>
                <div class="px-6 pt-6 text-center">
                    <i class="pi pi-lock text-4xl text-primary mb-3"></i>
                    <h1 class="text-2xl font-bold text-gray-900">Welcome to Carmentis Desk</h1>
                    <p class="text-sm text-gray-500 mt-1">
                        Set up your secure vault to protect your wallet keys.
                    </p>
                </div>
            </template>
            <template #content>
                <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Display name</label>
                        <InputText
                            v-model="pseudo"
                            placeholder="e.g. Alice"
                            class="w-full"
                            autofocus
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Vault password</label>
                        <Password
                            v-model="password"
                            placeholder="At least 8 characters"
                            :feedback="true"
                            toggleMask
                            class="w-full"
                            input-class="w-full"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                        <Password
                            v-model="confirmPassword"
                            placeholder="Repeat your password"
                            :feedback="false"
                            toggleMask
                            class="w-full"
                            input-class="w-full"
                        />
                    </div>

                    <Message v-if="errorMessage" severity="error" :closable="false" class="mt-1">
                        {{ errorMessage }}
                    </Message>

                    <Button
                        type="submit"
                        label="Create vault"
                        icon="pi pi-shield"
                        class="w-full mt-2"
                        :loading="isLoading"
                    />
                </form>
            </template>
        </Card>
    </div>
</template>
