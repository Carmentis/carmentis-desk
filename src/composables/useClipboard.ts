import {useToast} from "primevue/usetoast";

export function useClipboard() {
    const toast = useToast();


    async function copyToClipboard(text: string | undefined, label: string) {
        if (!text) {
            toast.add({
                severity: 'error',
                summary: 'Copy failed',
                detail: `${label} not available`,
                life: 3000,
            });
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            toast.add({
                severity: 'success',
                summary: 'Copied',
                detail: `${label} copied to clipboard`,
                life: 3000,
            });
        } catch (e) {
            console.error('Failed to copy:', e);
            toast.add({
                severity: 'error',
                summary: 'Copy failed',
                detail: 'Failed to copy to clipboard',
                life: 3000,
            });
        }
    }

    return { copyToClipboard }
}