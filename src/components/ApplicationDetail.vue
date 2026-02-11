<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Breadcrumb from 'primevue/breadcrumb';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import {useStorageStore} from '../stores/storage';
import {useOnChainStore} from '../stores/onchain';
import {storeToRefs} from 'pinia';
import {Hash, ProviderFactory} from "@cmts-dev/carmentis-sdk/client";
import {useToast} from 'primevue/usetoast';
import {useQuery} from "@tanstack/vue-query";

const toast = useToast();
const route = useRoute();
const router = useRouter();
const storageStore = useStorageStore();
const onchainStore = useOnChainStore();
const {isPublishingApplication} = storeToRefs(onchainStore);

const walletId = computed(() => Number(route.params.walletId));
const orgId = computed(() => Number(route.params.orgId));
const appId = computed(() => Number(route.params.appId));

const wallet = computed(() =>
  storageStore.organizations.find(w => w.id === walletId.value)
);

const organization = computed(() =>
  wallet.value?.organizations.find(org => org.id === orgId.value)
);

const application = computed(() =>
  organization.value?.applications.find(app => app.id === appId.value)
);

const goBack = () => {
  router.push(`/wallet/${walletId.value}/organization/${orgId.value}`);
};

// Breadcrumb
const breadcrumbHome = ref({
  icon: 'pi pi-home',
  command: () => router.push('/')
});

const breadcrumbItems = computed(() => {
  if (!wallet.value || !organization.value || !application.value) return [];
  return [
    {
      label: wallet.value.name,
      command: () => router.push(`/wallet/${walletId.value}`)
    },
    {
      label: organization.value.name,
      command: () => router.push(`/wallet/${walletId.value}/organization/${orgId.value}`)
    },
    {
      label: application.value.name
    }
  ];
});

// Application Details Form
const appName = ref('');
const appDescription = ref('');
const appWebsite = ref('');

// Publish confirmation dialog
const showPublishConfirmDialog = ref(false);

// Delete confirmation dialog
const showDeleteConfirmDialog = ref(false);

async function confirmDeleteApplication() {
  showDeleteConfirmDialog.value = false;
  await storageStore.deleteApplicationById(walletId.value, orgId.value, appId.value);
  toast.add({ severity: 'success', summary: 'Application deleted', detail: 'Application deleted successfully', life: 3000 });
  goBack();
}

// Initialize form values when application loads
function initializeForm() {
  if (application.value) {
    appName.value = application.value.name;
    appDescription.value = '';
    appWebsite.value = '';
  }
}

// Watch for application changes to initialize form
watch(application, () => {
  if (application.value) {
    initializeForm();
  }
}, { immediate: true });

async function updateApplicationDetails() {
  if (!appName.value.trim()) {
    toast.add({ severity: 'error', summary: 'Validation error', detail: 'Application name is required', life: 3000 });
    return;
  }

  await storageStore.updateApplication(walletId.value, orgId.value, appId.value, {
    name: appName.value.trim(),
  });

  toast.add({ severity: 'success', summary: 'Application updated', detail: 'Application details updated successfully', life: 3000 });
}

async function confirmPublishApplication() {
  showPublishConfirmDialog.value = false;

  if (!organization.value?.vbId) {
    toast.add({ severity: 'error', summary: 'Organization not published', detail: 'Organization must be published before publishing applications', life: 3000 });
    return;
  }

  await onchainStore.publishApplication({
    walletId: walletId.value,
    orgId: orgId.value,
    appId: appId.value,
    name: appName.value.trim(),
    description: appDescription.value.trim(),
    website: appWebsite.value.trim(),
  });
}

// query used to identify if the application is found online
const {data: isApplicationFoundOnChain, isLoading: isFetchingApplicationFromChain} = useQuery({
  queryKey: ['application-on-chain', appId],
  queryFn: async () => {
    if (!application.value || !application.value.vbId) return undefined;
    if (!wallet.value) return undefined;
    const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.value.nodeEndpoint);
    try {
      await provider.loadApplicationVirtualBlockchain(Hash.from(application.value.vbId));
      return true;
    } catch (e) {
      console.error(`Application not found online: ${e}`)
      return false;
    }
  }
})
</script>

<template>
  <div class="space-y-6">
    <div v-if="wallet && organization && application">
      <!-- Breadcrumb -->
      <Breadcrumb :home="breadcrumbHome" :model="breadcrumbItems" class="mb-4" />

      <!-- Header -->
      <div class="flex justify-between items-start mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{{ application.name }}</h1>
        </div>
        <div class="flex gap-2">
          <Button @click="goBack" label="Back to Organization" icon="pi pi-arrow-left" text />
          <Button @click="showDeleteConfirmDialog = true" icon="pi pi-trash" severity="danger" text />
        </div>
      </div>

      <!-- Application Cards Side-by-Side -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
        <!-- Application Info Card -->
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-info-circle text-xl"></i>
              <span>Application Info</span>
            </div>
          </template>
          <template #content>
            <div v-if="application.vbId">
              <label class="block text-sm font-medium text-gray-700 mb-2">Virtual Blockchain ID</label>
              <code class="bg-gray-100 px-3 py-2 rounded text-sm block">{{ application.vbId }}</code>

              <div v-if="isApplicationFoundOnChain === true" class="mt-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                <i class="pi pi-check-circle text-green-600"></i>
                <span class="text-sm text-green-800">Application confirmed on-chain</span>
              </div>
              <div v-else-if="isApplicationFoundOnChain === false" class="mt-4 flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                <i class="pi pi-exclamation-triangle text-amber-600 mt-0.5"></i>
                <span class="text-sm text-amber-800">Application not found on-chain. This may be due to network transaction processing delays.</span>
              </div>
              <div v-else-if="isFetchingApplicationFromChain" class="mt-4 flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                <i class="pi pi-spin pi-spinner text-blue-600"></i>
                <span class="text-sm text-blue-800">Checking on-chain status...</span>
              </div>

            </div>
            <div v-else class="text-center py-4">
              <i class="pi pi-exclamation-circle text-3xl text-amber-500 mb-2"></i>
              <p class="text-gray-600 text-sm">Publish first your application on-chain to show information.</p>
            </div>
          </template>
        </Card>

        <!-- Application Details Form Card -->
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-pencil text-xl"></i>
              <span>Application Details</span>
            </div>
          </template>
          <template #content>
            <form @submit.prevent="updateApplicationDetails" class="space-y-4">
              <div>
                <label for="app-name" class="block text-sm font-medium text-gray-700 mb-2">
                  Name <span class="text-red-500">*</span>
                </label>
                <InputText id="app-name" v-model="appName" placeholder="Application name" class="w-full" required />
              </div>
              <div>
                <label for="app-description" class="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Textarea id="app-description" v-model="appDescription" placeholder="Application description" class="w-full" rows="3" />
              </div>
              <div>
                <label for="app-website" class="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <InputText id="app-website" v-model="appWebsite" placeholder="https://..." class="w-full" />
              </div>
              <div class="flex justify-end gap-2">
                <Button
                  type="button"
                  label="Publish"
                  icon="pi pi-cloud-upload"
                  @click="showPublishConfirmDialog = true"
                  :loading="isPublishingApplication"
                  :disabled="isPublishingApplication"
                  severity="secondary"
                />
                <Button type="submit" label="Update Details" icon="pi pi-check" />
              </div>
            </form>
          </template>
        </Card>
      </div>

      <!-- Publish Confirmation Dialog -->
      <Dialog v-model:visible="showPublishConfirmDialog" header="Publish Application" modal class="w-full max-w-md">
        <div class="space-y-4">
          <p class="text-gray-600">Are you sure you want to publish this application on-chain?</p>
          <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div class="flex gap-2">
              <i class="pi pi-info-circle text-amber-600 mt-0.5"></i>
              <p class="text-sm text-amber-800">This action will create a virtual blockchain for your application and cannot be undone.</p>
            </div>
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <Button label="Cancel" @click="showPublishConfirmDialog = false" severity="secondary" outlined />
            <Button label="Confirm Publish" @click="confirmPublishApplication" icon="pi pi-cloud-upload" :loading="isPublishingApplication" />
          </div>
        </template>
      </Dialog>

      <!-- Delete Confirmation Dialog -->
      <Dialog v-model:visible="showDeleteConfirmDialog" header="Delete Application" modal class="w-full max-w-md">
        <div class="space-y-4">
          <p class="text-gray-600">Are you sure you want to delete the application "{{ application.name }}"?</p>
          <div class="bg-red-50 border border-red-200 rounded-lg p-3">
            <div class="flex gap-2">
              <i class="pi pi-exclamation-triangle text-red-600 mt-0.5"></i>
              <p class="text-sm text-red-800">This action cannot be undone.</p>
            </div>
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <Button label="Cancel" @click="showDeleteConfirmDialog = false" severity="secondary" outlined />
            <Button label="Delete" @click="confirmDeleteApplication" icon="pi pi-trash" severity="danger" />
          </div>
        </template>
      </Dialog>
    </div>

    <!-- Not Found State -->
    <div v-else class="text-center py-12">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
        <i class="pi pi-exclamation-triangle text-3xl text-red-600"></i>
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Application Not Found</h1>
      <p class="text-gray-500 mb-6">The application you're looking for doesn't exist.</p>
      <Button @click="goBack" label="Back to Organization" icon="pi pi-arrow-left" />
    </div>
  </div>
</template>
