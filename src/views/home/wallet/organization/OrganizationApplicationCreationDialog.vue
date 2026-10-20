<script setup lang="ts">
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import {computed, ref, watch} from "vue";
import {useToast} from "primevue/usetoast";
import {useRoute, useRouter} from "vue-router";
import {useCurrentOrganization} from "../../../../composables/useCurrentOrganization.ts";
import ResponsiveDialog from "../../../../components/ui/ResponsiveDialog.vue";
import FieldNameAndDescription from "../../../../components/utils/FieldNameAndDescription.vue";

const toast = useToast();
const showAppDialog = defineModel<boolean>('showAppDialog', { default: false });
const appName = ref('');
const route = useRoute();
const router = useRouter();

const {createApplication} = useCurrentOrganization();
const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));

// inline validation, shown once the user tried to create the application
const submitted = ref(false);
const isCreating = ref(false);
const nameError = computed(() => submitted.value && !appName.value ? 'Enter a name for the application.' : '');
watch(showAppDialog, (open) => {
    if (open) submitted.value = false;
});

async function submitAppDialog() {
    submitted.value = true;
    if (nameError.value) return;

    isCreating.value = true;
    try {
        const createdAppId = await createApplication(appName.value)
        toast.add({
            severity: 'success',
            summary: 'Application created',
            detail: `Application "${appName.value}" created successfully`,
            life: 3000,
        });
        showAppDialog.value = false;

        visitApplication(createdAppId);
    } finally {
        isCreating.value = false;
    }
}

function visitApplication(appId: number) {
    router.push(`/wallet/${walletId.value}/organization/${orgId.value}/application/${appId}`);
}
</script>

<template>
    <ResponsiveDialog v-model:visible="showAppDialog" header="New application" :closable="!isCreating">
        <form id="create-app-form" novalidate @submit.prevent="submitAppDialog">
            <FieldNameAndDescription name="Application name" input-id="app-name" required />
            <InputText
                id="app-name"
                v-model="appName"
                fluid
                autocomplete="off"
                placeholder="e.g. Customer portal"
                :invalid="!!nameError"
                :aria-invalid="!!nameError"
                aria-describedby="app-name-error"
            />
            <p v-if="nameError" id="app-name-error" class="mt-1 text-sm text-danger">{{ nameError }}</p>
        </form>
        <template #footer>
            <Button label="Cancel" severity="secondary" outlined :disabled="isCreating" @click="showAppDialog = false" />
            <Button type="submit" form="create-app-form" label="Create" icon="pi pi-check" :loading="isCreating" />
        </template>
    </ResponsiveDialog>
</template>
