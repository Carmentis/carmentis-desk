<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useRouter } from 'vue-router';
import WalletPasswordDialog from '../../components/wallet/WalletPasswordDialog.vue';
import { useWalletFileTransfer } from '../../composables/useWalletFileTransfer.ts';
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import { useAppStore } from '../../stores/appStore.ts';
import { useNavigation } from '../../composables/useNavigation.ts';
import PageHeader from '../../components/ui/PageHeader.vue';
import EmptyState from '../../components/ui/EmptyState.vue';
import NetworkBadge from '../../components/ui/NetworkBadge.vue';

const { wallets } = useAppStore();
const navigation = useNavigation();

// ---- import (encrypted .ecw file): the file is chosen first, then its password is asked ----
const toast = useToast();
const router = useRouter();
const { pickWalletFile, importWallets } = useWalletFileTransfer();
const showImportDialog = ref(false);
const isImporting = ref(false);
const importError = ref('');
const pickedFile = ref<Uint8Array>();

async function chooseWalletFile() {
    try {
        const bytes = await pickWalletFile();
        if (!bytes) return;
        pickedFile.value = bytes;
        importError.value = '';
        showImportDialog.value = true;
    } catch (e) {
        console.error('Failed to read wallet file:', e);
        toast.add({ severity: 'error', summary: 'Import failed', detail: 'The file could not be read.', life: 5000 });
    }
}

async function importFromFile(password: string) {
    if (!pickedFile.value) return;
    isImporting.value = true;
    importError.value = '';
    try {
        const ids = await importWallets(pickedFile.value, password);
        showImportDialog.value = false;
        pickedFile.value = undefined;
        toast.add({ severity: 'success', summary: 'Wallet imported', detail: `${ids.length} wallet(s) imported`, life: 3000 });
        if (ids.length === 1) await router.push(`/wallet/${ids[0]}`);
    } catch (e) {
        console.error('Failed to import wallet:', e);
        importError.value = 'The wallet could not be imported: the password is wrong or the file is invalid.';
    } finally {
        isImporting.value = false;
    }
}

// Shown under the wallet name as secondary, technical information.
const hostOf = (url: string | undefined) => url?.replace(/^https?:\/\//, '') ?? '';
</script>

<template>
    <div class="space-y-6">
        <PageHeader title="Wallets" subtitle="Choose a wallet to manage your tokens.">
            <template #actions>
                <Button label="Import" icon="pi pi-upload" severity="secondary" outlined @click="chooseWalletFile" />
                <Button label="New wallet" icon="pi pi-plus" @click="navigation.goToNewWallet()" />
            </template>
        </PageHeader>

        <div
            v-if="wallets.length === 0"
            class="rounded-card border border-line bg-surface shadow-card"
        >
            <EmptyState
                icon="pi-wallet"
                title="No wallet yet"
                description="Create a wallet to hold tokens and sign on the Carmentis blockchain."
            >
                <Button label="Create a wallet" icon="pi pi-plus" @click="navigation.goToNewWallet()" />
                <Button label="Import a wallet" icon="pi pi-upload" severity="secondary" outlined @click="chooseWalletFile" />
            </EmptyState>
        </div>

        <ul v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <li v-for="wallet in wallets" :key="wallet.id" class="min-w-0">
                <RouterLink
                    :to="`/wallet/${wallet.id}`"
                    class="group flex min-h-11 items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card transition-colors hover:border-accent"
                >
                    <span class="flex size-12 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
                        <i class="pi pi-wallet text-xl" aria-hidden="true" />
                    </span>
                    <span class="min-w-0 flex-1 space-y-1">
                        <span class="block truncate text-base font-semibold text-fg">{{ wallet.name }}</span>
                        <NetworkBadge :network-name="wallet.network.networkName" />
                        <span class="block truncate font-mono text-xs text-fg-muted">{{ hostOf(wallet.network.node) }}</span>
                    </span>
                    <i
                        class="pi pi-angle-right text-fg-muted transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                    />
                </RouterLink>
            </li>
        </ul>

        <WalletPasswordDialog
            v-model:visible="showImportDialog"
            mode="import"
            :loading="isImporting"
            :error="importError"
            @submit="importFromFile"
        />
    </div>
</template>
