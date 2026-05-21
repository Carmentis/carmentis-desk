<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { marked } from 'marked';
import Card from 'primevue/card';

const apiDocsHtml = ref('');

onMounted(async () => {
    const raw = await import('./rpcSession/walletRequestDocumentation.md?raw');
    apiDocsHtml.value = await marked(raw.default);
});
</script>

<template>
    <div class="space-y-6">
        <div class="flex items-center gap-2">
            <i class="pi pi-question-circle text-xl text-primary"></i>
            <h1 class="text-xl font-bold text-surface-900">Help</h1>
        </div>

        <!-- About -->
        <Card>
            <template #title>
                <div class="flex items-center gap-2">
                    <i class="pi pi-info-circle text-primary"></i>
                    <span>About Carmentis Desk</span>
                </div>
            </template>
            <template #content>
                <div class="space-y-6">
                    <div>
                        <h3 class="text-base font-semibold text-surface-800 mb-2 flex items-center gap-2">
                            <i class="pi pi-wallet text-primary"></i>
                            Wallets
                        </h3>
                        <p class="text-sm text-surface-600 leading-relaxed">
                            A wallet is derived from a secret seed phrase and holds your cryptographic key pair. It stores
                            your token balance on-chain and groups the organizations you manage. You can create multiple
                            wallets for different purposes or import an existing one from its seed.
                        </p>
                    </div>

                    <div>
                        <h3 class="text-base font-semibold text-surface-800 mb-2 flex items-center gap-2">
                            <i class="pi pi-building text-primary"></i>
                            Organizations
                        </h3>
                        <p class="text-sm text-surface-600 leading-relaxed">
                            Organizations represent legal entities registered on the Carmentis network. Each organization
                            can operate validator nodes and deploy decentralized applications. You can create a new
                            organization or import an existing one using its Virtual Blockchain ID.
                        </p>
                    </div>

                    <div>
                        <h3 class="text-base font-semibold text-surface-800 mb-2 flex items-center gap-2">
                            <i class="pi pi-server text-primary"></i>
                            Operators
                        </h3>
                        <p class="text-sm text-surface-600 leading-relaxed">
                            Operators are HTTP services that coordinate the anchoring protocol between applications and the
                            Carmentis network. You can add one or more operator endpoints here and monitor their status from
                            their detail page.
                        </p>
                    </div>

                    <div>
                        <h3 class="text-base font-semibold text-surface-800 mb-2 flex items-center gap-2">
                            <i class="pi pi-box text-primary"></i>
                            Application Ledgers
                        </h3>
                        <p class="text-sm text-surface-600 leading-relaxed">
                            When a decentralized application requests your approval through the Wallet Interactive Anchoring
                            Protocol (WIAP), Carmentis Desk lets you review and sign the microblock. Approved interactions
                            are recorded as Application Ledger entries on your wallet, giving you a full audit trail of
                            every transaction you have validated.
                        </p>
                    </div>

                    <div>
                        <h3 class="text-base font-semibold text-surface-800 mb-2 flex items-center gap-2">
                            <i class="pi pi-link text-primary"></i>
                            Deep linking
                        </h3>
                        <p class="text-sm text-surface-600 leading-relaxed">
                            Applications can open Carmentis Desk directly via a
                            <code class="text-xs bg-surface-100 px-1 py-0.5 rounded font-mono">carmentis://</code>
                            deep link. This triggers the wallet request flow automatically so you can approve or reject the
                            anchoring request without leaving the application context.
                        </p>
                    </div>

                    <div class="pt-2">
                        <a
                            href="https://docs.carmentis.io"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                            <i class="pi pi-external-link"></i>
                            Read the documentation
                        </a>
                    </div>
                </div>
            </template>
        </Card>

        <!-- API Docs -->
        <Card>
            <template #title>
                <div class="flex items-center gap-2">
                    <i class="pi pi-book text-primary"></i>
                    <span>Wallet Request API Documentation</span>
                </div>
            </template>
            <template #content>
                <div class="prose max-w-none" v-html="apiDocsHtml" />
            </template>
        </Card>
    </div>
</template>

<style scoped>
.prose :deep(h1) {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: var(--p-surface-900);
    border-bottom: 2px solid var(--p-surface-200);
    padding-bottom: 0.5rem;
}
.prose :deep(h2) {
    font-size: 1.35rem;
    font-weight: 600;
    margin-top: 2rem;
    margin-bottom: 0.75rem;
    color: var(--p-surface-800);
}
.prose :deep(h3) {
    font-size: 1.1rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    color: var(--p-primary-color);
}
.prose :deep(p) {
    margin-bottom: 0.75rem;
    color: var(--p-surface-700);
    line-height: 1.6;
}
.prose :deep(ul),
.prose :deep(ol) {
    margin-left: 1.5rem;
    margin-bottom: 0.75rem;
    color: var(--p-surface-700);
}
.prose :deep(li) {
    margin-bottom: 0.25rem;
}
.prose :deep(code) {
    background-color: var(--p-surface-100);
    color: var(--p-primary-color);
    padding: 0.15rem 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
}
.prose :deep(pre) {
    background-color: var(--p-surface-900);
    color: var(--p-surface-0);
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin-bottom: 1rem;
}
.prose :deep(pre code) {
    background: none;
    color: inherit;
    padding: 0;
    font-size: 0.85em;
}
.prose :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
    font-size: 0.9rem;
}
.prose :deep(th) {
    background-color: var(--p-surface-100);
    color: var(--p-surface-700);
    font-weight: 600;
    padding: 0.6rem 0.75rem;
    text-align: left;
    border: 1px solid var(--p-surface-200);
}
.prose :deep(td) {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--p-surface-200);
    color: var(--p-surface-700);
    vertical-align: top;
}
.prose :deep(tr:nth-child(even)) {
    background-color: var(--p-surface-50);
}
.prose :deep(hr) {
    border: none;
    border-top: 1px solid var(--p-surface-200);
    margin: 1.5rem 0;
}
.prose :deep(a) {
    color: var(--p-primary-color);
    text-decoration: underline;
}
.prose :deep(blockquote) {
    border-left: 4px solid var(--p-primary-color);
    padding-left: 1rem;
    margin-left: 0;
    color: var(--p-surface-600);
    font-style: italic;
}
</style>
