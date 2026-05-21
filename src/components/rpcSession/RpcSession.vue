<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import { useToast } from 'primevue/usetoast';
import * as v from 'valibot';
import { Responder } from '@cmts-dev/carmentis-relay-client';
import { JsonRpc } from '@cmts-dev/carmentis-sdk-json-rpc';
import type { Component } from 'vue';
import { rpcMethodRegistry } from './rpcMethodRegistry.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

type RequestId = number | string | null;
type ActiveRequest = { id: RequestId; component: Component; params: unknown };

// ── Setup ─────────────────────────────────────────────────────────────────────

const toast = useToast();
const route = useRoute();
const router = useRouter();

const symKey = route.query.symKey as string;
const relay = route.query.relay as string;
const sessionId = route.query.sessionId as string;

const responder = Responder.create(relay, sessionId, symKey);
const wantsToClose = ref(false);
const activeRequest = ref<ActiveRequest | null>(null);

function closeConnect() {
    setTimeout(() => {
        wantsToClose.value = true;
        responder.close();
        router.push('/');
    }, 300);
}

responder.onClose(() => {
    if (!wantsToClose.value) {
        toast.add({
            severity: 'error',
            summary: 'Connection with relay lost',
            detail: 'The connection with the relay was lost unexpectedly.',
        });
    }
    router.push('/');
});

// ── Message handling ───────────────────────────────────────────────────────────

responder.onMessage((message) => {
    const parsed = JsonRpc.parseRequest(message);
    if (!parsed.ok) {
        console.warn('Invalid JSON-RPC request received:', message, parsed.error);
        return;
    }

    const id: RequestId = 'id' in parsed.value ? parsed.value.id : null;
    const { method, params } = parsed.value;

    if (method === 'ping') {
        responder.send(JsonRpc.success(id, { ts: Date.now() })).then(closeConnect);
        return;
    }

    const methodDef = rpcMethodRegistry[method];
    if (!methodDef) {
        responder.send(JsonRpc.methodNotFound(id, 'Method not found'));
        return;
    }

    const result = v.safeParse(methodDef.schema, params);
    if (!result.success) {
        responder.send(JsonRpc.invalidParams(id, `Invalid params for ${method}`));
        return;
    }

    activeRequest.value = { id, component: methodDef.component, params: result.output };
});

// ── Response handler ───────────────────────────────────────────────────────────

async function onMethodDone(result: Record<string, unknown>) {
    if (!activeRequest.value) return;
    await responder.send(JsonRpc.success(activeRequest.value.id, result));
    closeConnect();
}

onMounted(async () => {
    wantsToClose.value = false;
    await responder.join();
});
</script>

<template>
    <!-- Active request view -->
    <div v-if="activeRequest" class="min-h-screen">
        <component
            :is="activeRequest.component"
            :params="activeRequest.params"
            @done="onMethodDone"
            @reject="closeConnect"
        />
    </div>

    <!-- Waiting state -->
    <div v-else class="min-h-screen bg-surface-50 p-4">
        <div class="max-w-2xl mx-auto flex flex-col gap-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span class="text-sm font-medium text-surface-600">Connected to relay</span>
                </div>
                <Button
                    label="Disconnect"
                    icon="pi pi-times"
                    severity="secondary"
                    size="small"
                    outlined
                    @click="closeConnect"
                />
            </div>

            <Card>
                <template #content>
                    <div class="flex flex-col items-center gap-6 py-8">
                        <div class="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center">
                            <i class="pi pi-spin pi-spinner text-primary text-2xl"></i>
                        </div>
                        <div class="text-center">
                            <h2 class="text-lg font-semibold text-surface-800 mb-1">Waiting for a request</h2>
                            <p class="text-sm text-surface-500">
                                Keep this window open. A request will appear here once the application sends one.
                            </p>
                        </div>
                        <div class="w-full border border-surface-200 rounded-lg p-3 bg-surface-50">
                            <div class="flex items-center gap-2 text-xs text-surface-500">
                                <i class="pi pi-server"></i>
                                <span class="font-mono truncate">
                                    {{ relay }}
                                </span>
                            </div>
                        </div>
                    </div>
                </template>
            </Card>
        </div>
    </div>
</template>
