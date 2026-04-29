<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { marked } from 'marked'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'

const router = useRouter()
const htmlContent = ref('')

onMounted(async () => {
  const raw = await import('./walletRequestDocumentation.md?raw')
  htmlContent.value = await marked(raw.default)
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" outlined size="small" @click="router.push('/')" />
      <div class="flex items-center gap-2">
        <i class="pi pi-book text-xl text-primary"></i>
        <h1 class="text-xl font-bold text-surface-900">Wallet Request Documentation</h1>
      </div>
    </div>

    <Card>
      <template #content>
        <div class="prose max-w-none" v-html="htmlContent" />
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
