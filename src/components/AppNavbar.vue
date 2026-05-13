<script setup lang="ts">
import Menubar from 'primevue/menubar';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import type { MenuItem } from 'primevue/menuitem';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { storeToRefs } from 'pinia';
import { useStorageStore } from '../stores/storage.ts';

const router = useRouter();
const confirm = useConfirm();
const toast = useToast();
const store = useStorageStore();
const { organizations, operators } = storeToRefs(store);

const showOperatorDialog = ref(false);
const newOperatorName = ref('');
const newOperatorEndpoint = ref('');

function confirmClearAllOrganizations() {
    confirm.require({
        message: 'Are you sure you want to clear all wallets? This action cannot be undone.',
        header: 'Clear All Wallets',
        icon: 'pi pi-exclamation-triangle',
        rejectClass: 'p-button-secondary p-button-outlined',
        rejectLabel: 'Cancel',
        acceptLabel: 'Clear All',
        acceptClass: 'p-button-danger',
        accept: () => store.clearOrganizations(),
    });
}

function openOperatorDialog() {
    newOperatorName.value = '';
    newOperatorEndpoint.value = '';
    showOperatorDialog.value = true;
}

async function createOperator() {
    if (!newOperatorName.value.trim() || !newOperatorEndpoint.value.trim()) {
        toast.add({ severity: 'error', summary: 'Validation Error', detail: 'Please fill in all fields', life: 3000 });
        return;
    }
    try {
        await store.addOperator({
            name: newOperatorName.value.trim(),
            httpEndpoint: newOperatorEndpoint.value.trim(),
        });
        toast.add({ severity: 'success', summary: 'Success', detail: 'Operator created successfully', life: 3000 });
        showOperatorDialog.value = false;
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create operator', life: 3000 });
    }
}

function confirmClearAllOperators() {
    confirm.require({
        message: 'Are you sure you want to clear all operators? This action cannot be undone.',
        header: 'Clear All Operators',
        icon: 'pi pi-exclamation-triangle',
        rejectClass: 'p-button-secondary p-button-outlined',
        rejectLabel: 'Cancel',
        acceptLabel: 'Clear All',
        acceptClass: 'p-button-danger',
        accept: () => store.clearOperators(),
    });
}

const menuItems = computed<MenuItem[]>(() => [
    {
        label: 'Wallets',
        icon: 'pi pi-wallet',
        items: [
            { label: 'Create Wallet', icon: 'pi pi-plus', command: () => router.push('/wallet/new') },
            { separator: true, visible: organizations.value.length > 0 },
            ...organizations.value.map((wallet) => ({
                label: wallet.name,
                icon: 'pi pi-wallet',
                command: () => router.push(`/wallet/${wallet.id}`),
                items: [
                    {
                        label: 'Credentials',
                        icon: 'pi pi-shield',
                        command: () => router.push(`/wallet/${wallet.id}/credentials`),
                    },
                    ...wallet.organizations.map((org) => ({
                        label: org.name,
                        icon: 'pi pi-building',
                        command: () => router.push(`/wallet/${wallet.id}/organization/${org.id}`),
                        items: [
                            ...org.applications.map((app) => ({
                                label: app.name,
                                icon: 'pi pi-desktop',
                                command: () => router.push(`/wallet/${wallet.id}/organization/${org.id}/application/${app.id}`),
                            })),
                            ...org.nodes.map((node) => ({
                                label: node.name,
                                icon: 'pi pi-sitemap',
                                command: () => router.push(`/wallet/${wallet.id}/organization/${org.id}/node/${node.id}`),
                            })),
                        ],
                    })),
                ],
            })),
            { separator: true, visible: organizations.value.length > 0 },
            {
                label: 'Clear All Wallets',
                icon: 'pi pi-trash',
                command: () => confirmClearAllOrganizations(),
                visible: organizations.value.length > 0,
            },
        ],
    },
    {
        label: 'Operators',
        icon: 'pi pi-server',
        items: [
            { label: 'Add Operator', icon: 'pi pi-plus', command: () => openOperatorDialog() },
            { separator: true, visible: operators.value.length > 0 },
            ...operators.value.map((op) => ({
                label: op.name,
                icon: 'pi pi-server',
                command: () => router.push(`/operator/${op.id}`),
            })),
            { separator: true, visible: operators.value.length > 0 },
            {
                label: 'Clear All Operators',
                icon: 'pi pi-trash',
                command: () => confirmClearAllOperators(),
                visible: operators.value.length > 0,
            },
        ],
    },
    //{ label: 'Proof Checker', icon: 'pi pi-verified', command: () => open('https://proof-checker.testnet.carmentis.io') },
    { label: 'Settings', icon: 'pi pi-cog', command: () => router.push('/settings') },
    { label: 'Help', icon: 'pi pi-question-circle', command: () => router.push('/help') },
]);
</script>

<template>
    <div class="p-4 w-full">
      <Menubar :model="menuItems">
        <template #start>
          <div class="flex items-center gap-2 cursor-pointer" @click="router.push('/')">
            <i class="pi pi-home text-2xl text-primary"></i>
            <span class="text-xl font-bold text-gray-900">Carmentis Desk</span>
          </div>
        </template>
      </Menubar>
    </div>

    <Dialog v-model:visible="showOperatorDialog" modal header="Add Operator" :style="{ width: '450px' }">
        <div class="space-y-4 py-4">
            <div>
                <label for="operatorName" class="block text-sm font-semibold text-gray-700 mb-2">Operator Name</label>
                <InputText
                    id="operatorName"
                    v-model="newOperatorName"
                    placeholder="Enter operator name"
                    class="w-full"
                    @keyup.enter="createOperator"
                />
            </div>
            <div>
                <label for="operatorEndpoint" class="block text-sm font-semibold text-gray-700 mb-2">
                    HTTP Endpoint
                </label>
                <InputText
                    id="operatorEndpoint"
                    v-model="newOperatorEndpoint"
                    placeholder="https://example.com/api"
                    class="w-full"
                    @keyup.enter="createOperator"
                />
            </div>
        </div>
        <template #footer>
            <Button label="Cancel" text @click="showOperatorDialog = false" />
            <Button label="Create" @click="createOperator" />
        </template>
    </Dialog>
</template>
