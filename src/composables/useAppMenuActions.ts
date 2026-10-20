import { invoke } from '@tauri-apps/api/core';
import { useToast } from 'primevue/usetoast';
import type { MenuItem } from 'primevue/menuitem';
import { useSessionStore } from '../stores/sessionStore.ts';
import { buildExportData } from './useNavbarData.ts';
import { useNavigation } from './useNavigation.ts';

/**
 * Entries of the application overflow menu (help, data export, debug, logout).
 * The behaviors are those of the former AppNavbar, moved here unchanged.
 */
export function useAppMenuActions() {
    const toast = useToast();
    const sessionStore = useSessionStore();
    const navigation = useNavigation();

    async function openDebug() {
        try {
            await invoke('open_devtools');
        } catch (e) {
            console.error('Failed to open devtools:', e);
            toast.add({ severity: 'error', summary: 'Debug', detail: 'Could not open the developer tools.', life: 4000 });
        }
    }

    function importData() {
        toast.add({
            severity: 'warn',
            summary: 'Import not available',
            detail: 'The import feature is not available in this version.',
            life: 4000,
        });
    }

    async function exportData() {
        try {
            const payload = await buildExportData();
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `carmentis-desk-export-${new Date().toISOString().slice(0, 10)}.json`;
            anchor.click();
            URL.revokeObjectURL(url);

            toast.add({ severity: 'success', summary: 'Export done', detail: `Export available in your download folder at ${anchor.download}`, life: 4000 });
        } catch {
            toast.add({ severity: 'error', summary: 'Export failed', detail: 'Could not export data.', life: 4000 });
        }
    }

    function logout() {
        sessionStore.lock();
        navigation.goToLogin();
    }

    const menuItems: MenuItem[] = [
        { label: 'Help', icon: 'pi pi-question-circle', command: () => navigation.goToHelp() },
        { separator: true },
        { label: 'Export data', icon: 'pi pi-download', command: exportData },
        { label: 'Import data', icon: 'pi pi-upload', command: importData },
        { label: 'Open debug tools', icon: 'pi pi-code', command: openDebug },
        { separator: true },
        { label: 'Log out', icon: 'pi pi-sign-out', class: 'text-danger', command: logout },
    ];

    return { menuItems, exportData };
}
