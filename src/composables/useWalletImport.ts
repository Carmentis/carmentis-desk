import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useRouter } from 'vue-router';
import { useWalletFileTransfer } from './useWalletFileTransfer.ts';

/**
 * Import flow of an encrypted `.ecw` wallet file: the file is chosen first, then its password is asked.
 * Bind `showImportDialog`, `isImporting` and `importError` to a WalletPasswordDialog in import mode.
 */
export function useWalletImport() {
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

    return { showImportDialog, isImporting, importError, chooseWalletFile, importFromFile };
}
