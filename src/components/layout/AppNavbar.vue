<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { invoke } from '@tauri-apps/api/core';
import { useStorageStore } from '../../stores/storage.ts';
import { useUiStore } from '../../stores/uiStore.ts';
import { useSessionStore } from '../../stores/sessionStore.ts';
import { useNavbarData, buildExportData } from '../../composables/useNavbarData';

const router = useRouter();
const sessionStore = useSessionStore();
const confirm = useConfirm();
const toast = useToast();
const store = useStorageStore();
const uiStore = useUiStore();
const { navTree: organizations, operators } = useNavbarData();

const moreMenuOpen = ref(false);
const expandedWallets = ref<Set<number>>(new Set());
const expandedOrgs = ref<Set<number>>(new Set());
const showOperatorDialog = ref(false);
const newOperatorName = ref('');
const newOperatorEndpoint = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);

function toggleWallet(id: number) {
    const expanded = new Set(expandedWallets.value);
    if (expanded.has(id)) {
        expanded.delete(id);
    } else {
        expanded.add(id);
    }
    expandedWallets.value = expanded;
}

function toggleOrg(id: number) {
    const expanded = new Set(expandedOrgs.value);
    if (expanded.has(id)) {
        expanded.delete(id);
    } else {
        expanded.add(id);
    }
    expandedOrgs.value = expanded;
}

function navigate(path: string) {
    router.push(path);
    if (window.innerWidth < 768) {
        uiStore.sidebarOpen = false;
    }
}

function triggerImport() {
    fileInputRef.value?.click();
}

async function openDebug() {
    try {
        await invoke('open_devtools');
        moreMenuOpen.value = false;
    } catch (e) {
        console.error('Failed to open devtools:', e);
        toast.add({ severity: 'error', summary: 'Debug', detail: 'Could not open the developer tools.', life: 4000 });
    }
}

async function handleImportFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!fileInputRef.value) return;
    fileInputRef.value.value = '';
    if (!file) return;

    let parsed: { organizations: unknown; operators: unknown };
    try {
        parsed = JSON.parse(await file.text());
    } catch {
        toast.add({ severity: 'error', summary: 'Invalid file', detail: 'The file is not valid JSON.', life: 4000 });
        return;
    }

    if (!Array.isArray(parsed.organizations) || !Array.isArray(parsed.operators)) {
        toast.add({
            severity: 'error',
            summary: 'Invalid format',
            detail: 'The file must contain "organizations" and "operators" arrays.',
            life: 4000,
        });
        return;
    }

    confirm.require({
        message:
            'This will permanently replace all current wallets and operators with the imported data. This action cannot be undone.',
        header: 'Import Data',
        icon: 'pi pi-exclamation-triangle',
        rejectClass: 'p-button-secondary p-button-outlined',
        rejectLabel: 'Cancel',
        acceptLabel: 'Replace & Import',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await store.importAllData(parsed as { organizations: any[]; operators: any[] });
                toast.add({ severity: 'success', summary: 'Import successful', detail: 'Data imported successfully.', life: 3000 });
            } catch {
                toast.add({ severity: 'error', summary: 'Import failed', detail: 'An error occurred during import.', life: 4000 });
            }
        },
    });
}

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

async function exportData() {
    try {
        const fullWallets = await buildExportData();
        const payload = { organizations: fullWallets, operators: operators.value };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `carmentis-desk-export-${new Date().toISOString().slice(0, 10)}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        moreMenuOpen.value = false;
    } catch {
        toast.add({ severity: 'error', summary: 'Export failed', detail: 'Could not export data.', life: 4000 });
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

function logout() {
    sessionStore.lock();
    moreMenuOpen.value = false;
    router.push('/login');
}
</script>

<template>
    <!-- Overlay mobile -->
    <div
        v-if="uiStore.sidebarOpen"
        class="fixed inset-0 bg-black/40 z-30 md:hidden"
        @click="uiStore.sidebarOpen = false"
    />

    <!-- Top Bar -->
    <header class="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 z-50 gap-3">
        <!-- Hamburger menu (mobile only) -->
        <button
            class="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            @click="uiStore.sidebarOpen = !uiStore.sidebarOpen"
            title="Toggle sidebar"
        >
            <i class="pi pi-bars text-gray-700" />
        </button>

        <!-- Sidebar toggle (desktop only) -->
        <button
            class="hidden md:inline-flex p-2 hover:bg-gray-100 rounded-lg transition-colors"
            @click="uiStore.toggleSidebar"
            title="Toggle sidebar"
        >
            <i :class="uiStore.sidebarOpen ? 'pi pi-chevron-left' : 'pi pi-chevron-right'" class="text-gray-700" />
        </button>

        <!-- Logo + Title -->
        <div class="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" @click="router.push('/')">
            <img src="/carmentis-logo.png" alt="Carmentis" class="h-8 w-auto" />
            <span class="hidden sm:inline text-xl font-bold text-gray-900">Carmentis Desk</span>
        </div>

        <!-- Spacer -->
        <div class="flex-1" />

        <!-- Settings button -->
        <button
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            @click="router.push('/settings')"
            title="Settings"
        >
            <i class="pi pi-cog text-gray-700" />
        </button>

        <!-- Help button -->
        <button
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            @click="router.push('/help')"
            title="Help"
        >
            <i class="pi pi-question-circle text-gray-700" />
        </button>

        <!-- More menu (dropdown) -->
        <div class="relative">
            <button
                class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                @click="moreMenuOpen = !moreMenuOpen"
                title="More options"
            >
                <i class="pi pi-ellipsis-v text-gray-700" />
            </button>

            <!-- Dropdown menu -->
            <div
                v-if="moreMenuOpen"
                class="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
                @click.stop
            >
                <button
                    class="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center gap-2 transition-colors"
                    @click="exportData"
                >
                    <i class="pi pi-download text-xs" />
                    Export Data
                </button>
                <button
                    class="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center gap-2 transition-colors"
                    @click="triggerImport; moreMenuOpen = false"
                >
                    <i class="pi pi-upload text-xs" />
                    Import Data
                </button>
                <div class="border-t border-gray-200 my-1" />
                <button
                    class="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center gap-2 transition-colors"
                    @click="openDebug"
                >
                    <i class="pi pi-code text-xs" />
                    Open Debug
                </button>
                <div class="border-t border-gray-200 my-1" />
                <button
                    class="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left flex items-center gap-2 transition-colors"
                    @click="logout"
                >
                    <i class="pi pi-sign-out text-xs" />
                    Logout
                </button>
            </div>
        </div>
    </header>

    <!-- Sidebar -->
    <aside
        :class="[
            'fixed top-14 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-40 flex flex-col overflow-y-auto',
            'transition-transform duration-200 ease-in-out',
            uiStore.sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ]"
    >
        <!-- Wallets Section -->
        <div class="p-3 border-b border-gray-200">
            <div class="flex items-center justify-between px-2 py-1 mb-2">
                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Wallets</span>
                <div class="flex items-center gap-0">
                    <!-- Delete all button -->
                    <div v-if="organizations.length > 0" class="relative group">
                        <button
                            class="p-1 hover:bg-red-100 rounded transition-colors"
                            @click="confirmClearAllOrganizations"
                        >
                            <i class="pi pi-trash text-gray-700 text-sm" />
                        </button>
                        <!-- Tooltip -->
                        <div class="absolute bottom-full right-0 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            Delete all wallets
                        </div>
                    </div>
                    <!-- Add button -->
                    <button
                        class="p-1 hover:bg-gray-100 rounded transition-colors"
                        @click="navigate('/wallet/new')"
                        title="Create Wallet"
                    >
                        <i class="pi pi-plus text-gray-400 hover:text-gray-700 text-sm" />
                    </button>
                </div>
            </div>

            <!-- Empty state -->
            <div v-if="organizations.length === 0" class="px-2 py-2 text-sm text-gray-500">
                <i class="pi pi-inbox mr-2" />
                No wallets yet
            </div>

            <!-- Wallets list -->
            <div v-for="wallet in organizations" :key="wallet.id" class="mb-1">
                <!-- Wallet item -->
                <div class="flex items-center gap-0">
                    <button
                        class="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-l hover:bg-gray-100 text-gray-700 text-sm transition-colors text-left"
                        @click="navigate(`/wallet/${wallet.id}`)"
                    >
                        <i class="pi pi-wallet text-sm flex-shrink-0" />
                        <span class="truncate">{{ wallet.name }}</span>
                    </button>
                    <button
                        class="px-2 py-1.5 rounded-r hover:bg-gray-100 text-gray-400 hover:text-gray-700 text-sm transition-colors flex-shrink-0"
                        @click.stop="toggleWallet(wallet.id)"
                    >
                        <i
                            :class="expandedWallets.has(wallet.id) ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                            class="text-xs"
                        />
                    </button>
                </div>

                <!-- Wallet submenu -->
                <div v-if="expandedWallets.has(wallet.id)" class="ml-4 border-l border-gray-200 pl-2 space-y-0.5">
                    <!-- Credentials -->
                    <button
                        class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 text-gray-700 text-sm transition-colors"
                        @click="navigate(`/wallet/${wallet.id}/credentials`)"
                    >
                        <i class="pi pi-shield text-sm flex-shrink-0" />
                        <span class="truncate text-left">Credentials</span>
                    </button>

                    <!-- Organizations -->
                    <div v-for="org in wallet.organizations" :key="org.id" class="space-y-0.5">
                        <div class="flex items-center gap-0">
                            <button
                                class="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-l hover:bg-gray-100 text-gray-700 text-sm transition-colors text-left"
                                @click="navigate(`/wallet/${wallet.id}/organization/${org.id}`)"
                            >
                                <i class="pi pi-building text-sm flex-shrink-0" />
                                <span class="truncate">{{ org.name }}</span>
                            </button>
                            <button
                                class="px-2 py-1.5 rounded-r hover:bg-gray-100 text-gray-400 hover:text-gray-700 text-sm transition-colors flex-shrink-0"
                                @click.stop="toggleOrg(org.id)"
                            >
                                <i
                                    :class="expandedOrgs.has(org.id) ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                                    class="text-xs"
                                />
                            </button>
                        </div>

                        <!-- Org submenu (apps + nodes) -->
                        <div v-if="expandedOrgs.has(org.id)" class="ml-4 border-l border-gray-200 pl-2 space-y-0.5">
                            <!-- Applications -->
                            <button
                                v-for="app in org.applications"
                                :key="app.id"
                                class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 text-gray-700 text-sm transition-colors"
                                @click="navigate(`/wallet/${wallet.id}/organization/${org.id}/application/${app.id}`)"
                            >
                                <i class="pi pi-desktop text-sm flex-shrink-0" />
                                <span class="truncate text-left">{{ app.name }}</span>
                            </button>

                            <!-- Nodes -->
                            <button
                                v-for="node in org.nodes"
                                :key="node.id"
                                class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 text-gray-700 text-sm transition-colors"
                                @click="navigate(`/wallet/${wallet.id}/organization/${org.id}/node/${node.id}`)"
                            >
                                <i class="pi pi-sitemap text-sm flex-shrink-0" />
                                <span class="truncate text-left">{{ node.name }}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Operators Section -->
        <div class="p-3">
            <div class="flex items-center justify-between px-2 py-1 mb-2">
                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Operators</span>
                <div class="flex items-center gap-0">
                    <!-- Delete all button -->
                    <div v-if="operators.length > 0" class="relative group">
                        <button
                            class="p-1 hover:bg-red-100 rounded transition-colors"
                            @click="confirmClearAllOperators"
                        >
                            <i class="pi pi-trash text-gray-700 text-sm" />
                        </button>
                        <!-- Tooltip -->
                        <div class="absolute bottom-full right-0 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            Delete all operators
                        </div>
                    </div>
                    <!-- Add button -->
                    <button
                        class="p-1 hover:bg-gray-100 rounded transition-colors"
                        @click="openOperatorDialog"
                        title="Add Operator"
                    >
                        <i class="pi pi-plus text-gray-400 hover:text-gray-700 text-sm" />
                    </button>
                </div>
            </div>

            <!-- Empty state -->
            <div v-if="operators.length === 0" class="px-2 py-2 text-sm text-gray-500">
                <i class="pi pi-inbox mr-2" />
                No operators yet
            </div>

            <!-- Operators list -->
            <button
                v-for="op in operators"
                :key="op.id"
                class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 text-gray-700 text-sm transition-colors mb-1"
                @click="navigate(`/operator/${op.id}`)"
            >
                <i class="pi pi-server text-sm flex-shrink-0" />
                <span class="truncate text-left">{{ op.name }}</span>
            </button>
        </div>
    </aside>

    <!-- Modal: Add Operator -->
    <div v-if="showOperatorDialog" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showOperatorDialog = false" />
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Add Operator</h2>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Operator Name</label>
                    <input
                        v-model="newOperatorName"
                        type="text"
                        placeholder="Enter operator name"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        @keyup.enter="createOperator"
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">HTTP Endpoint</label>
                    <input
                        v-model="newOperatorEndpoint"
                        type="text"
                        placeholder="https://example.com/api"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        @keyup.enter="createOperator"
                    />
                </div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
                <button
                    class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    @click="showOperatorDialog = false"
                >
                    Cancel
                </button>
                <button
                    class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    @click="createOperator"
                >
                    Create
                </button>
            </div>
        </div>
    </div>

    <!-- Hidden file input -->
    <input
        ref="fileInputRef"
        type="file"
        accept=".json,application/json"
        class="hidden"
        @change="handleImportFile"
    />
</template>
