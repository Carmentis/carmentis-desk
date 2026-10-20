<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { useOnChainActions } from '../../../../composables/useOnChainActions.ts';
import { useCurrentOrganization } from '../../../../composables/useCurrentOrganization.ts';
import { useCurrentWallet } from '../../../../composables/useCurrentWallet.ts';
import FieldNameAndDescription from '../../../../components/utils/FieldNameAndDescription.vue';
import UiCard from '../../../../components/ui/UiCard.vue';
import StatusBadge from '../../../../components/ui/StatusBadge.vue';
import StickyActionBar from '../../../../components/ui/StickyActionBar.vue';
import ConfirmActionDialog from '../../../../components/ui/ConfirmActionDialog.vue';
import type { OrganizationDto } from '../../../../api/indexer/model';

const props = defineProps<{
    /** The organization as found on the blockchain, if any. */
    onlineOrganization?: OrganizationDto;
}>();

const route = useRoute();
const toast = useToast();
const onChainStore = useOnChainActions();
const { isPublishingOrganization } = onChainStore;

const { organization, updateOrganization } = useCurrentOrganization();
const { useHasAccountOnChainQuery } = useCurrentWallet();
const hasAccountOnChain = useHasAccountOnChainQuery();
const orgId = computed(() => Number(route.params.orgId));

// Organization Details Form
const orgName = ref('');
const orgCountryCode = ref('');
const orgCity = ref('');
const orgWebsite = ref('');

const savedForm = reactive({ name: '', countryCode: '', city: '', website: '' });

const isFormDirty = computed(
    () =>
        orgName.value.trim() !== savedForm.name ||
        orgCountryCode.value.trim() !== savedForm.countryCode ||
        orgCity.value.trim() !== savedForm.city ||
        orgWebsite.value.trim() !== savedForm.website,
);

// Publish confirmation dialog
const showPublishConfirmDialog = ref(false);

// Initialize form values when organization loads
function initializeForm() {
    if (organization.value) {
        orgName.value = organization.value.name;
        orgCountryCode.value = organization.value.countryCode || '';
        orgCity.value = organization.value.city || '';
        orgWebsite.value = organization.value.website || '';
        savedForm.name = orgName.value;
        savedForm.countryCode = orgCountryCode.value;
        savedForm.city = orgCity.value;
        savedForm.website = orgWebsite.value;
    }
}

// Watch for organization changes to initialize form
watch(
    organization,
    () => {
        if (organization.value) {
            initializeForm();
        }
    },
    { immediate: true },
);

// inline validation, shown once the user tried to save
const submitted = ref(false);
const nameError = computed(() => submitted.value && !orgName.value.trim() ? 'Enter the name of the organization.' : '');
const countryCodeError = computed(() =>
    submitted.value && !orgCountryCode.value.trim() ? 'Enter the country code, for example FR or US.' : '',
);

async function updateOrganizationLocally() {
    submitted.value = true;
    if (nameError.value || countryCodeError.value) return;

    await updateOrganization({
        name: orgName.value.trim(),
        countryCode: orgCountryCode.value.trim() || undefined,
        city: orgCity.value.trim() || undefined,
        website: orgWebsite.value.trim() || undefined,
    })

    savedForm.name = orgName.value.trim();
    savedForm.countryCode = orgCountryCode.value.trim();
    savedForm.city = orgCity.value.trim();
    savedForm.website = orgWebsite.value.trim();
    submitted.value = false;

    toast.add({
        severity: 'success',
        summary: 'Organization updated',
        detail: 'Organization details updated successfully',
        life: 3000,
    });
}

async function confirmPublishOrganization() {
    showPublishConfirmDialog.value = false;
    // publish information on-chain
    await onChainStore.publishOrganization({
        orgId: orgId.value,
    });
}

// Fields whose saved value differs from the published one
const online = computed(() => props.onlineOrganization);
const differs = (typed: string, published: string | undefined) => !!online.value && typed.trim() !== (published ?? '');
</script>

<template>
    <form novalidate class="space-y-4" @submit.prevent="updateOrganizationLocally">
        <UiCard
            title="Organization details"
            subtitle="How your organization is presented to partners and users on the Carmentis network."
        >
            <template v-if="isFormDirty" #header-actions>
                <StatusBadge tone="warning" label="Unsaved changes" icon="pi-exclamation-circle" />
            </template>

            <div class="space-y-5">
                <div>
                    <FieldNameAndDescription name="Organization name" input-id="org-name" required />
                    <InputText
                        id="org-name"
                        v-model="orgName"
                        fluid
                        autocomplete="organization"
                        placeholder="e.g. Acme Corp"
                        :invalid="!!nameError"
                        :aria-invalid="!!nameError"
                        aria-describedby="org-name-error"
                    />
                    <p v-if="nameError" id="org-name-error" class="mt-1 text-sm text-danger">{{ nameError }}</p>
                    <Message v-if="differs(orgName, online?.name)" class="mt-2" severity="info" size="small">
                        The name published on the blockchain is different: {{ online?.name }}
                    </Message>
                </div>

                <div class="grid gap-5 sm:grid-cols-2">
                    <div>
                        <FieldNameAndDescription name="Country code" input-id="org-country-code" required />
                        <InputText
                            id="org-country-code"
                            v-model="orgCountryCode"
                            fluid
                            autocomplete="country"
                            autocapitalize="characters"
                            placeholder="e.g. FR, US, DE"
                            :invalid="!!countryCodeError"
                            :aria-invalid="!!countryCodeError"
                            aria-describedby="org-country-code-error"
                        />
                        <p v-if="countryCodeError" id="org-country-code-error" class="mt-1 text-sm text-danger">
                            {{ countryCodeError }}
                        </p>
                        <Message v-if="differs(orgCountryCode, online?.countryCode)" class="mt-2" severity="info" size="small">
                            The country code published on the blockchain is different: {{ online?.countryCode }}
                        </Message>
                    </div>
                    <div>
                        <FieldNameAndDescription name="City" input-id="org-city" />
                        <InputText
                            id="org-city"
                            v-model="orgCity"
                            fluid
                            autocomplete="address-level2"
                            placeholder="e.g. Paris"
                        />
                        <Message v-if="differs(orgCity, online?.city)" class="mt-2" severity="info" size="small">
                            The city published on the blockchain is different: {{ online?.city }}
                        </Message>
                    </div>
                </div>

                <div>
                    <FieldNameAndDescription name="Website" input-id="org-website" />
                    <InputText
                        id="org-website"
                        v-model="orgWebsite"
                        fluid
                        inputmode="url"
                        autocomplete="url"
                        autocapitalize="off"
                        spellcheck="false"
                        placeholder="https://example.com"
                    />
                    <Message v-if="differs(orgWebsite, online?.website)" class="mt-2" severity="info" size="small">
                        The website published on the blockchain is different: {{ online?.website }}
                    </Message>
                </div>

                <p v-if="!hasAccountOnChain && !isFormDirty" class="text-sm text-fg-muted">
                    Publishing needs an account on the blockchain. Receive tokens on this wallet first.
                </p>
            </div>
        </UiCard>

        <!-- Other sections of the page that must stay above the pinned action bar (e.g. the danger zone) -->
        <slot />

        <StickyActionBar v-if="isFormDirty || hasAccountOnChain">
            <template v-if="isFormDirty">
                <Button type="button" label="Discard changes" severity="secondary" outlined @click="initializeForm" />
                <Button type="submit" label="Save details" icon="pi pi-check" />
            </template>
            <Button
                v-else
                type="button"
                label="Publish"
                icon="pi pi-cloud-upload"
                :loading="isPublishingOrganization"
                :disabled="isPublishingOrganization"
                @click="showPublishConfirmDialog = true"
            />
        </StickyActionBar>

        <ConfirmActionDialog
            v-model:visible="showPublishConfirmDialog"
            title="Publish organization"
            action="publish"
            tone="primary"
            confirm-label="Publish"
            :item-name="orgName"
            message="This creates a virtual blockchain for your organization on-chain and cannot be undone."
            @confirm="confirmPublishOrganization"
        />
    </form>
</template>
