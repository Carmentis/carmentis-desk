<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useSessionStore } from '../stores/sessionStore';
import Button from 'primevue/button';
import Password from 'primevue/password';
import Card from 'primevue/card';
import Message from 'primevue/message';
import { storeToRefs } from 'pinia';

const router = useRouter();
const route = useRoute();
const sessionStore = useSessionStore();
const { pseudo } = storeToRefs(sessionStore);

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
    <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card class="w-full max-w-sm">
            <template #header>
                <div class="px-6 pt-6 text-center">
                    <i class="pi pi-lock-open text-4xl text-primary mb-3"></i>
                    <h1 class="text-2xl font-bold text-gray-900">Unlock vault</h1>
                    <p v-if="pseudo" class="text-sm text-gray-500 mt-1">Welcome back, {{ pseudo }}</p>
                </div>
            </template>
            <template #content>
                <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <Password
                            v-model="password"
                            placeholder="Enter your vault password"
                            :feedback="false"
                            toggleMask
                            class="w-full"
                            input-class="w-full"
                            autofocus
                        />
                    </div>

                    <Message v-if="errorMessage" severity="error" :closable="false">
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
            </template>
        </Card>
    </div>
</template>
