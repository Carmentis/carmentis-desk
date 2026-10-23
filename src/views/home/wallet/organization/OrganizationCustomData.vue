<script setup lang="ts">
import Button from "primevue/button";
import {computed, ref} from "vue";
import Textarea from "primevue/textarea";
import {useRoute} from "vue-router";
import { useOnChainActions } from "../../../../composables/useOnChainActions.ts";
import {useOrganizationSections} from "../../../../composables/useOrganizationSections.ts";
import OrganizationSectionsList from "./OrganizationSectionsList.vue";
import ResponsiveDialog from "../../../../components/ui/ResponsiveDialog.vue";
import EmptyState from "../../../../components/ui/EmptyState.vue";

const route = useRoute();
const onChainStore = useOnChainActions();
const isOrganizationFoundOnChain = defineModel<boolean>('isOrganizationFoundOnChain');
const { isPublishingCustomJson } = onChainStore;

const orgId = computed(() => Number(route.params.orgId));


// Custom JSON publishing dialog
const showPublishCustomJsonDialog = ref(false);
const customJsonInput = ref('{\n  \n}');

const customJsonError = computed(() => {
    try {
        JSON.parse(customJsonInput.value);
        return '';
    } catch (e: unknown) {
        return e instanceof SyntaxError ? e.message : 'Invalid JSON';
    }
});

async function publishCustomJson() {
    if (customJsonError.value) return;
    await onChainStore.publishCustomJson({
        orgId: orgId.value,
        json: JSON.parse(customJsonInput.value),
    });
    showPublishCustomJsonDialog.value = false;
    await refetchCustomSections();
}
// Custom sections list
const {
    rows: customSections,
    isLoading: isLoadingCustomSections,
    sync,
    refetch: refetchCustomSections,
} = useOrganizationSections({
    queryKey: 'organization-custom-sections',
    isOrganizationFoundOnChain,
});
</script>
<template>
    <EmptyState
        v-if="isOrganizationFoundOnChain !== true"
        framed
        icon="pi-lock"
        title="Publish your organization first"
        description="Custom on-chain data is only available once the organization has been published on the Carmentis network."
    />

    <div v-else class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h2 class="text-lg font-semibold text-fg">Custom data</h2>
                <p class="text-sm text-fg-muted">JSON sections published on your organization's blockchain.</p>
            </div>
            <Button
                label="Publish custom data"
                icon="pi pi-file-edit"
                @click="showPublishCustomJsonDialog = true"
            />
        </div>

        <OrganizationSectionsList
            :rows="customSections"
            :is-loading="isLoadingCustomSections"
            :sync="sync"
            empty-title="No custom data published"
            empty-description="Sections you publish on-chain will be listed here."
            detail-title="Custom section"
        />
    </div>

    <!-- Publish Custom Data Dialog -->
    <ResponsiveDialog
        v-model:visible="showPublishCustomJsonDialog"
        header="Publish custom data"
        size="lg"
        :closable="!isPublishingCustomJson"
    >
        <p class="mb-4 text-sm text-fg-muted">
            Publish a custom JSON payload on-chain as a new microblock section of this organization's
            virtual blockchain. Published data is public and cannot be removed.
        </p>
        <label for="custom-json" class="mb-1 block text-sm font-medium text-fg">JSON payload</label>
        <Textarea
            id="custom-json"
            v-model="customJsonInput"
            rows="10"
            fluid
            spellcheck="false"
            autocomplete="off"
            class="font-mono text-sm"
            placeholder='{ "key": "value" }'
            :invalid="!!customJsonError"
            :aria-invalid="!!customJsonError"
            aria-describedby="custom-json-error"
        />
        <p v-if="customJsonError" id="custom-json-error" role="alert" class="mt-2 flex items-start gap-2 text-sm text-danger">
            <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
            {{ customJsonError }}
        </p>

        <template #footer>
            <Button
                label="Cancel"
                severity="secondary"
                outlined
                :disabled="isPublishingCustomJson"
                @click="showPublishCustomJsonDialog = false"
            />
            <Button
                label="Publish on-chain"
                icon="pi pi-cloud-upload"
                :loading="isPublishingCustomJson"
                :disabled="isPublishingCustomJson || !!customJsonError"
                @click="publishCustomJson"
            />
        </template>
    </ResponsiveDialog>
</template>
