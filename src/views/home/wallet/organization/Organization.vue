<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import { useTimeoutFn } from '@vueuse/core';
import { useQuery } from '@tanstack/vue-query';
import { useToast } from 'primevue/usetoast';
import * as orgRepo from '../../../../db/repositories/organizationRepository.ts';
import { useCurrentOrganization } from '../../../../composables/useCurrentOrganization.ts';
import { useCurrentWallet } from '../../../../composables/useCurrentWallet.ts';
import { useAppStore } from '../../../../stores/appStore.ts';
import OrganizationDetailsForm from './OrganizationDetailsForm.vue';
import OrganizationNodes from './OrganizationNodes.vue';
import OrganizationApplications from './OrganizationApplications.vue';
import OrganizationJwtKeyCertification from './OrganizationJwtKeyCertification.vue';
import OrganizationX509Certificate from './OrganizationX509Certificate.vue';
import OrganizationCustomData from './OrganizationCustomData.vue';
import PageHeader from '../../../../components/ui/PageHeader.vue';
import UiCard from '../../../../components/ui/UiCard.vue';
import StatusBadge from '../../../../components/ui/StatusBadge.vue';
import CopyableValue from '../../../../components/ui/CopyableValue.vue';
import SectionTabs from '../../../../components/ui/SectionTabs.vue';
import EmptyState from '../../../../components/ui/EmptyState.vue';
import SkeletonBlock from '../../../../components/ui/SkeletonBlock.vue';
import ConfirmActionDialog from '../../../../components/ui/ConfirmActionDialog.vue';
import type { StatusTone, TabItem } from '../../../../components/ui/types.ts';

const toast = useToast();
const route = useRoute();
const router = useRouter();
const { shouldDisplayNodes, shouldDisplayApplications, hasDeveloperRole } = useAppStore();

const { organization, organizationVbId } = useCurrentOrganization();
const { walletId, indexer } = useCurrentWallet();
const orgId = computed(() => Number(route.params.orgId));
const walletPath = computed(() => `/wallet/${walletId.value}`);

// The organization arrives asynchronously and a missing one looks the same as a loading one:
// show a skeleton for a moment before concluding that it does not exist.
const hasWaited = ref(false);
useTimeoutFn(() => hasWaited.value = true, 1000);

// fetch the organization online using the indexer
const { data: organizationFetchedOnline, isLoading: isFetchingOrganizationFromChain } = useQuery({
    enabled: computed(() => !!organizationVbId.value && !!indexer),
    queryKey: ['organization-online', organizationVbId],
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
    queryFn: async () => {
        const vbId = organizationVbId.value;
        if (!vbId || !indexer.value) {
            console.log('Organization not found online: vbId or indexer is undefined');
            return undefined;
        }
        const foundsOrgs = await indexer.value.getOrganizations({ vb_id: vbId });
        if (foundsOrgs.items.length !== 1) return undefined;
        return foundsOrgs.items[0];
    }
})

// define some computed properties based on the fetched organization
const isOrganizationFoundOnChain = computed(() => !!organizationFetchedOnline.value);

// ---- publication status: always an icon and a text, never color alone ----
interface PublicationStatus { tone: StatusTone; label: string; icon: string; hint: string }
const publication = computed<PublicationStatus>(() => {
    if (!organization.value?.organizationVbId) {
        return { tone: 'warning', label: 'Draft', icon: 'pi-file-edit', hint: 'This organization is not published on the blockchain yet.' };
    }
    if (isFetchingOrganizationFromChain.value) {
        return { tone: 'neutral', label: 'Checking…', icon: 'pi-spin pi-spinner', hint: 'Checking the blockchain…' };
    }
    if (isOrganizationFoundOnChain.value) {
        return { tone: 'success', label: 'Published', icon: 'pi-check-circle', hint: 'This organization is published on the blockchain.' };
    }
    return {
        tone: 'warning',
        label: 'Not found on-chain',
        icon: 'pi-exclamation-triangle',
        hint: 'This organization was not found on the blockchain. This may be due to network transaction processing delays.',
    };
});

// ---- tabs: a single level; Local/On-chain are filters inside the tabs ----
const tab = ref('details');
const tabs = computed<TabItem[]>(() => [
    { value: 'details', label: 'Details', icon: 'pi-pencil' },
    { value: 'nodes', label: 'Nodes', icon: 'pi-sitemap', hidden: !shouldDisplayNodes.value },
    { value: 'applications', label: 'Applications', icon: 'pi-box', hidden: !shouldDisplayApplications.value },
    { value: 'attestation', label: 'Key attestation (JWT)', icon: 'pi-key' },
    { value: 'x509', label: 'X509 certificates', icon: 'pi-id-card' },
    { value: 'custom-data', label: 'Custom data', icon: 'pi-database', hidden: !hasDeveloperRole.value },
]);

// ---- delete (danger zone) ----
const showDeletionDialog = ref(false);
const isDeleting = ref(false);

async function confirmDeleteOrganization() {
    isDeleting.value = true;
    try {
        showDeletionDialog.value = false;
        await orgRepo.deleteOrganizationById(orgId.value);
        toast.add({
            severity: 'success',
            summary: 'Organization deleted',
            detail: 'Organization deleted successfully',
            life: 3000,
        });
        await router.push(walletPath.value);
    } finally {
        isDeleting.value = false;
    }
}
</script>

<template>
    <div v-if="organization" class="space-y-6">
        <PageHeader :title="organization.name" :back-to="walletPath">
            <template #meta>
                <StatusBadge :tone="publication.tone" :label="publication.label" :icon="publication.icon" />
            </template>
        </PageHeader>

        <SectionTabs
            v-model="tab"
            :tabs="tabs"
            ariaLabel="Organization sections"
            :persist-key="`organizationTab:${orgId}`"
        >
            <template #default="{ active }">
                <div v-if="active === 'details'" class="space-y-4">
                    <UiCard title="Identity">
                        <dl class="space-y-4">
                            <div>
                                <dt class="text-sm text-fg-muted">Status</dt>
                                <dd class="mt-1 space-y-1">
                                    <StatusBadge :tone="publication.tone" :label="publication.label" :icon="publication.icon" />
                                    <p class="text-sm text-fg-muted">{{ publication.hint }}</p>
                                </dd>
                            </div>
                            <div v-if="organization.organizationVbId">
                                <dt class="text-sm text-fg-muted">Organization ID</dt>
                                <dd>
                                    <CopyableValue
                                        :value="organization.organizationVbId"
                                        label="organization ID"
                                        :head="12"
                                        :tail="10"
                                    />
                                </dd>
                            </div>
                        </dl>
                    </UiCard>

                    <OrganizationDetailsForm :online-organization="organizationFetchedOnline">
                        <UiCard title="Danger zone" variant="danger">
                            <div class="flex flex-wrap items-center justify-between gap-3">
                                <p class="max-w-md text-sm text-fg-muted">
                                    Deleting this organization also deletes all its nodes. This cannot be undone.
                                </p>
                                <Button
                                    type="button"
                                    label="Delete organization"
                                    icon="pi pi-trash"
                                    severity="danger"
                                    outlined
                                    @click="showDeletionDialog = true"
                                />
                            </div>
                        </UiCard>
                    </OrganizationDetailsForm>
                </div>

                <OrganizationNodes
                    v-else-if="active === 'nodes'"
                    v-model:is-organization-found-on-chain="isOrganizationFoundOnChain"
                />
                <OrganizationApplications
                    v-else-if="active === 'applications'"
                    v-model:is-organization-found-on-chain="isOrganizationFoundOnChain"
                />
                <OrganizationJwtKeyCertification
                    v-else-if="active === 'attestation'"
                    v-model:is-organization-found-on-chain="isOrganizationFoundOnChain"
                />
                <OrganizationX509Certificate
                    v-else-if="active === 'x509'"
                    v-model:is-organization-found-on-chain="isOrganizationFoundOnChain"
                />
                <OrganizationCustomData
                    v-else-if="active === 'custom-data'"
                    v-model:is-organization-found-on-chain="isOrganizationFoundOnChain"
                />
            </template>
        </SectionTabs>

        <ConfirmActionDialog
            v-model:visible="showDeletionDialog"
            title="Delete organization"
            :item-name="organization.name"
            message="This will delete the organization and all its nodes. This cannot be undone."
            :loading="isDeleting"
            @confirm="confirmDeleteOrganization"
        />
    </div>

    <SkeletonBlock v-else-if="!hasWaited" :lines="4" />

    <!-- Not Found State -->
    <EmptyState
        v-else
        framed
        icon="pi-exclamation-triangle"
        title="Organization not found"
        description="The organization you are looking for does not exist."
    >
        <Button label="Back to wallet" icon="pi pi-arrow-left" @click="router.push(walletPath)" />
    </EmptyState>
</template>
