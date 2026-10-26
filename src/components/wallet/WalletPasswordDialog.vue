<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import Button from 'primevue/button';
import Password from 'primevue/password';
import ResponsiveDialog from '../ui/ResponsiveDialog.vue';
import FieldNameAndDescription from '../utils/FieldNameAndDescription.vue';

const props = defineProps<{
    mode: 'export' | 'import';
    loading?: boolean;
    error?: string;
}>();

const visible = defineModel<boolean>('visible', {default: false});
const emit = defineEmits<{ (e: 'submit', password: string): void }>();

const password = ref('');
const confirmation = ref('');
const isExport = computed(() => props.mode === 'export');

// The password is never kept: clear it whenever the dialog closes.
watch(visible, (isVisible) => {
    if (!isVisible) {
        password.value = '';
        confirmation.value = '';
    }
});

const canSubmit = computed(() =>
    password.value.length > 0 && (!isExport.value || password.value === confirmation.value),
);

function submit() {
    if (canSubmit.value && !props.loading) emit('submit', password.value);
}
</script>

<template>
    <ResponsiveDialog
        v-model:visible="visible"
        :header="isExport ? 'Export wallet' : 'Import wallet'"
        :closable="!loading"
    >
        <form class="space-y-4" novalidate @submit.prevent="submit">
            <p class="text-sm text-fg-muted">
                <template v-if="isExport">
                    The wallet is encrypted with this password. It is not saved: you will need it to import the file,
                    and it cannot be recovered.
                </template>
                <template v-else>Enter the password that was used to encrypt this wallet file.</template>
            </p>

            <div>
                <FieldNameAndDescription name="Password" input-id="wallet-file-password" required />
                <Password
                    v-model="password"
                    input-id="wallet-file-password"
                    :input-props="{autocomplete: 'off', spellcheck: false}"
                    :feedback="false"
                    toggle-mask
                    fluid
                />
            </div>

            <div v-if="isExport">
                <FieldNameAndDescription name="Confirm password" input-id="wallet-file-password-confirm" required />
                <Password
                    v-model="confirmation"
                    input-id="wallet-file-password-confirm"
                    :input-props="{autocomplete: 'off', spellcheck: false}"
                    :feedback="false"
                    toggle-mask
                    fluid
                />
                <p v-if="confirmation && password !== confirmation" class="mt-1 text-sm text-danger" role="alert">
                    The passwords do not match.
                </p>
            </div>

            <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
        </form>

        <template #footer>
            <Button label="Cancel" severity="secondary" outlined :disabled="loading" @click="visible = false" />
            <Button
                :label="isExport ? 'Export' : 'Import'"
                :icon="isExport ? 'pi pi-download' : 'pi pi-upload'"
                :loading="loading"
                :disabled="!canSubmit"
                @click="submit"
            />
        </template>
    </ResponsiveDialog>
</template>
