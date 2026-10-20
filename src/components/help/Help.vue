<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { marked } from 'marked';
import PageHeader from '../ui/PageHeader.vue';
import UiCard from '../ui/UiCard.vue';

const apiDocsHtml = ref('');
const showApiDocs = ref(false);

onMounted(async () => {
    const raw = await import('../rpcSession/walletRequestDocumentation.md?raw');
    apiDocsHtml.value = await marked(raw.default);
});
</script>

<template>
    <div class="mx-auto max-w-3xl space-y-4">
        <PageHeader title="Help" />

        <!-- About -->
        <UiCard title="About Carmentis Desk">
            <div class="space-y-6">
                <div>
                    <h3 class="mb-1 flex items-center gap-2 text-base font-semibold text-fg">
                        <i class="pi pi-wallet text-accent" aria-hidden="true" />
                        Wallets
                    </h3>
                    <p class="text-sm leading-relaxed text-fg-muted">
                        A wallet is derived from a secret seed phrase and holds your cryptographic key pair. It stores your token balance on-chain and groups the organizations you manage. You can create multiple wallets for different purposes or import an existing one from its seed.
                    </p>
                </div>

                <div>
                    <h3 class="mb-1 flex items-center gap-2 text-base font-semibold text-fg">
                        <i class="pi pi-building text-accent" aria-hidden="true" />
                        Organizations
                    </h3>
                    <p class="text-sm leading-relaxed text-fg-muted">
                        Organizations represent legal entities registered on the Carmentis network. Each organization can operate validator nodes and deploy decentralized applications. You can create a new organization or import an existing one using its Virtual Blockchain ID.
                    </p>
                </div>

                <div>
                    <h3 class="mb-1 flex items-center gap-2 text-base font-semibold text-fg">
                        <i class="pi pi-box text-accent" aria-hidden="true" />
                        Application Ledgers
                    </h3>
                    <p class="text-sm leading-relaxed text-fg-muted">
                        When a decentralized application requests your approval through the Wallet Interactive Anchoring Protocol (WIAP), Carmentis Desk lets you review and sign the microblock. Approved interactions are recorded as Application Ledger entries on your wallet, giving you a full audit trail of every transaction you have validated.
                    </p>
                </div>

                <div>
                    <h3 class="mb-1 flex items-center gap-2 text-base font-semibold text-fg">
                        <i class="pi pi-link text-accent" aria-hidden="true" />
                        Deep linking
                    </h3>
                    <p class="text-sm leading-relaxed text-fg-muted">
                        Applications can open Carmentis Desk directly via a
                        <code class="rounded bg-surface-muted px-1 py-0.5 font-mono text-xs">carmentis://</code>
                        deep link. This triggers the wallet request flow automatically so you can approve or reject the
                        anchoring request without leaving the application context.
                    </p>
                </div>

                <a
                    href="https://docs.carmentis.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent hover:underline"
                >
                    <i class="pi pi-external-link" aria-hidden="true" />
                    Read the documentation
                </a>
            </div>
        </UiCard>

        <!-- API Docs: technical, one step away -->
        <UiCard title="Wallet request API documentation" subtitle="For developers integrating with Carmentis Desk.">
            <template #header-actions>
                <button
                    type="button"
                    class="inline-flex min-h-11 items-center gap-2 rounded-control px-3 text-sm font-medium text-accent hover:bg-accent-soft"
                    :aria-expanded="showApiDocs"
                    aria-controls="api-docs"
                    @click="showApiDocs = !showApiDocs"
                >
                    {{ showApiDocs ? 'Hide' : 'Show' }}
                    <i class="pi text-xs" :class="showApiDocs ? 'pi-chevron-up' : 'pi-chevron-down'" aria-hidden="true" />
                </button>
            </template>
            <div v-if="showApiDocs" id="api-docs" class="prose max-w-none" v-html="apiDocsHtml" />
        </UiCard>
    </div>
</template>

<style scoped>
/* Markdown of the API documentation, on the design tokens (light and dark). */
.prose {
    overflow-wrap: anywhere;
}
.prose :deep(h1) {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: var(--fg);
    border-bottom: 2px solid var(--line);
    padding-bottom: 0.5rem;
}
.prose :deep(h2) {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 2rem;
    margin-bottom: 0.75rem;
    color: var(--fg);
}
.prose :deep(h3) {
    font-size: 1.05rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    color: var(--accent);
}
.prose :deep(p) {
    margin-bottom: 0.75rem;
    color: var(--fg-muted);
    line-height: 1.6;
}
.prose :deep(ul),
.prose :deep(ol) {
    margin-left: 1.5rem;
    margin-bottom: 0.75rem;
    color: var(--fg-muted);
}
.prose :deep(ul) {
    list-style: disc;
}
.prose :deep(ol) {
    list-style: decimal;
}
.prose :deep(li) {
    margin-bottom: 0.25rem;
}
.prose :deep(code) {
    background-color: var(--surface-muted);
    color: var(--accent);
    padding: 0.15rem 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
    font-family: var(--font-mono), monospace;
}
.prose :deep(pre) {
    background-color: var(--surface-muted);
    color: var(--fg);
    border: 1px solid var(--line);
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
/* Wide tables scroll inside the page instead of widening it. */
.prose :deep(table) {
    display: block;
    max-width: 100%;
    overflow-x: auto;
    border-collapse: collapse;
    margin-bottom: 1rem;
    font-size: 0.9rem;
}
.prose :deep(th) {
    background-color: var(--surface-muted);
    color: var(--fg);
    font-weight: 600;
    padding: 0.6rem 0.75rem;
    text-align: left;
    border: 1px solid var(--line);
}
.prose :deep(td) {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--line);
    color: var(--fg-muted);
    vertical-align: top;
}
.prose :deep(hr) {
    border: none;
    border-top: 1px solid var(--line);
    margin: 1.5rem 0;
}
.prose :deep(a) {
    color: var(--accent);
    text-decoration: underline;
}
.prose :deep(blockquote) {
    border-left: 4px solid var(--accent);
    padding-left: 1rem;
    margin-left: 0;
    color: var(--fg-muted);
    font-style: italic;
}
</style>
