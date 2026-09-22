<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { attachConsole } from '@tauri-apps/plugin-log';
import Button from 'primevue/button';
import Tag from 'primevue/tag';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    id: number;
    level: LogLevel;
    message: string;
    timestamp: Date;
}

let idCounter = 0;
const entries = ref<LogEntry[]>([]);
let detach: (() => void) | null = null;

const originalMethods = {
    debug: console.debug.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
};

function intercept(method: LogLevel) {
    const original = originalMethods[method];
    console[method] = (...args: unknown[]) => {
        original(...args);
        entries.value.push({
            id: idCounter++,
            level: method,
            message: args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '),
            timestamp: new Date(),
        });
    };
}

function restore() {
    console.debug = originalMethods.debug;
    console.info = originalMethods.info;
    console.warn = originalMethods.warn;
    console.error = originalMethods.error;
}

onMounted(async () => {
    intercept('debug');
    intercept('info');
    intercept('warn');
    intercept('error');
    detach = await attachConsole();
});

onUnmounted(() => {
    restore();
    detach?.();
});

function clear() {
    entries.value = [];
}

function exportLogs() {
    const lines = entries.value.map(
        (e) => `[${e.timestamp.toISOString()}] [${e.level.toUpperCase()}] ${e.message}`,
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

const levelSeverity: Record<LogLevel, string> = {
    debug: 'secondary',
    info: 'info',
    warn: 'warn',
    error: 'danger',
};
</script>

<template>
    <div class="flex flex-col gap-3">
        <!-- Toolbar -->
        <div class="flex items-center justify-between">
            <span class="text-sm text-surface-500">{{ entries.length }} entries</span>
            <div class="flex gap-2">
                <Button icon="pi pi-download" label="Export" size="small" outlined @click="exportLogs" :disabled="entries.length === 0" />
                <Button icon="pi pi-trash" label="Clear" size="small" severity="danger" outlined @click="clear" :disabled="entries.length === 0" />
            </div>
        </div>

        <!-- Log list -->
        <div class="border border-surface-200 rounded-lg overflow-auto max-h-[60vh] font-mono text-xs bg-surface-50">
            <div v-if="entries.length === 0" class="flex flex-col items-center justify-center py-16 text-surface-400">
                <i class="pi pi-list text-3xl mb-2"></i>
                <p>No logs yet</p>
            </div>
            <div
                v-for="entry in entries"
                :key="entry.id"
                class="flex items-start gap-3 px-3 py-1.5 border-b border-surface-100 last:border-0 hover:bg-surface-100"
            >
                <span class="text-surface-400 flex-shrink-0 pt-0.5">{{ entry.timestamp.toISOString().slice(11, 23) }}</span>
                <Tag :value="entry.level.toUpperCase()" :severity="levelSeverity[entry.level]" class="flex-shrink-0 text-xs" />
                <span class="break-all text-surface-800 leading-relaxed">{{ entry.message }}</span>
            </div>
        </div>
    </div>
</template>
