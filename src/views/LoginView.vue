<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useSessionStore } from '../stores/sessionStore';
import Button from 'primevue/button';
import Password from 'primevue/password';
import Message from 'primevue/message';
import { storeToRefs } from 'pinia';
import {useAppStore} from "../stores/appStore.ts";
import AuthLayout from "../components/layout/AuthLayout.vue";
import FieldNameAndDescription from "../components/utils/FieldNameAndDescription.vue";

const router = useRouter();
const route = useRoute();
const sessionStore = useAppStore();

const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

async function handleSubmit() {
    errorMessage.value = '';
    if (!password.value) return;

    isLoading.value = true;
    try {
        await sessionStore.login(password.value);
        const redirect = route.query.redirect as string | undefined;
        await router.push(redirect ?? '/');
    } catch (e) {
        console.error('Login error:', e);
        errorMessage.value = 'Incorrect password. Please try again.';
        password.value = '';
    } finally {
        isLoading.value = false;
    }
}
</script>

<template>
    <AuthLayout title="Unlock vault" subtitle="Enter your password to open the secure vault.">
        <template #icon>
            <img src="/carmentis-logo.png" alt="Carmentis" class="mx-auto mb-3 h-12 w-auto" />
        </template>

        <form class="flex flex-col gap-5" @submit.prevent="handleSubmit">
            <div>
                <FieldNameAndDescription name="Password" input-id="login-password" />
                <Password
                    v-model="password"
                    input-id="login-password"
                    :input-props="{ autocomplete: 'current-password', autofocus: true }"
                    placeholder="Your vault password"
                    :feedback="false"
                    toggleMask
                    fluid
                />
            </div>

            <Message v-if="errorMessage" severity="error" :closable="false" role="alert">
                {{ errorMessage }}
            </Message>

            <Button
                type="submit"
                label="Unlock"
                icon="pi pi-unlock"
                class="w-full"
                :loading="isLoading"
                :disabled="!password"
            />
        </form>
    </AuthLayout>
</template>
