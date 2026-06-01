<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { invoke } from '@tauri-apps/api/core';
import type { AccountCrypto, ApplicationLedgerVb } from '@cmts-dev/carmentis-sdk-core';

const props = defineProps<{
    vb: ApplicationLedgerVb | null;
    accountCrypto: AccountCrypto;
    ledgerId: string;
    author: string;
}>();

const toast = useToast();
const isExporting = ref(false);

async function exportProof() {
    if (!props.vb) return;

    isExporting.value = true;
    try {
        const vbSeed = await props.vb.getGenesisSeed();
        const actorCrypto = props.accountCrypto.getActor(vbSeed.toBytes());
        const proof = await props.vb.exportProof({ author: props.author }, actorCrypto);

        const json = JSON.stringify(proof, null, 2);
        const savedPath = await invoke<string>('save_file', {
            filename: `proof-${props.ledgerId}.json`,
            content: json,
        });
        toast.add({
            severity: 'info',
            summary: 'Export done',
            detail: savedPath,
            life: 5000,
        });
    } catch (e) {
        toast.add({
            severity: 'error',
            summary: 'Export failed',
            detail: e instanceof Error ? e.message : String(e),
            life: 5000,
        });
    } finally {
        isExporting.value = false;
    }
}
</script>

<template>
    <Button
        label="Export Proof"
        icon="pi pi-download"
        size="small"
        severity="secondary"
        outlined
        :loading="isExporting"
        :disabled="!vb"
        @click="exportProof"
    />
</template>
