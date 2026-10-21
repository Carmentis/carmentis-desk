<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import UiCard from '../ui/UiCard.vue';
import StatusBadge from '../ui/StatusBadge.vue';
import { useToast } from 'primevue/usetoast';
import * as v from 'valibot';
import { Responder } from '@cmts-dev/carmentis-relay-client';
import { JsonRpc } from '@cmts-dev/carmentis-sdk-json-rpc';
import type { Component } from 'vue';
import { rpcMethodRegistry } from './rpcMethodRegistry.ts';
import {useNavigation} from "../../composables/useNavigation.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

type RequestId = number | string | null;

/**
 * Represents an in-flight JSON-RPC request waiting for user approval.
 * Once set, the matching handler component is rendered in the template.
 * Reset to null after the user approves or rejects.
 */
type ActiveRequest = { id: RequestId; component: Component; params: unknown };

// ── Setup ─────────────────────────────────────────────────────────────────────

const toast = useToast();
const route = useRoute();
const navigation = useNavigation();

// Session parameters come from the deep-link query string:
// cmts://connect/carmentis-relay?relay=...&sessionId=...&symKey=...
const symKey = route.query.symKey as string;
const relay = route.query.relay as string;
const sessionId = route.query.sessionId as string;

const responder = Responder.create(relay, sessionId, symKey);
const wantsToClose = ref(false);
const activeRequest = ref<ActiveRequest | null>(null);

/**
 * Gracefully closes the relay connection and navigates back to home.
 * The 300 ms delay lets the toast appear before the view unmounts.
 */
function closeConnect() {
    setTimeout(() => {
        wantsToClose.value = true;
        responder.close();
        navigation.goToHome()
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
    navigation.goToHome()
});

// ── Message handling ───────────────────────────────────────────────────────────

/**
 * Dispatch loop — every message received from the relay goes through here.
 *
 * Flow:
 *  1. Parse & validate the JSON-RPC 2.0 envelope
 *  2. Inline methods (ping) are handled immediately and close the session
 *  3. All other methods are looked up in rpcMethodRegistry:
 *       - Unknown method  → -32601 methodNotFound
 *       - Invalid params  → -32602 invalidParams (Valibot schema failure)
 *       - Valid request   → set activeRequest, render the handler component
 */
responder.onMessage((message) => {
    const parsed = JsonRpc.parseRequest(message);
    if (!parsed.ok) {
        console.warn('Invalid JSON-RPC request received:', message, parsed.error);
        return;
    }

    const id: RequestId = 'id' in parsed.value ? parsed.value.id : null;
    const { method, params } = parsed.value;

    // Inline method: no user interaction required
    if (method === 'ping') {
        responder.send(JsonRpc.success(id, { ts: Date.now() })).then(closeConnect);
        return;
    }

    // Inline method: discover available methods
    if (method === 'discover') {
        responder.send(JsonRpc.success(id, { methods: Object.keys(rpcMethodRegistry) }));
        return;
    }

    const methodDef = rpcMethodRegistry[method];
    if (!methodDef) {
        responder.send(JsonRpc.methodNotFound(id, 'Method not found'));
        return;
    }

    const result = v.safeParse(methodDef.schema, params);
    if (!result.success) {
        console.warn(`Invalid params for ${method}:`, result.issues);
        responder.send(JsonRpc.invalidParams(id, `Invalid params for ${method}`));
        return;
    } else {
        console.log(`Valid params for ${method}:`, result.output);
    }

    // Mount the handler component — the user will approve or reject from there
    activeRequest.value = { id, component: methodDef.component, params: result.output };
});

// ── Response handler ───────────────────────────────────────────────────────────

/**
 * Called by the active handler component when the user approves the request.
 * Sends a JSON-RPC success response with the method's result, then closes.
 */
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
    <component
        :is="activeRequest.component"
        v-if="activeRequest"
        :params="activeRequest.params"
        @done="onMethodDone"
        @reject="closeConnect"
    />

    <!-- Waiting state -->
    <div v-else class="mx-auto flex max-w-md flex-col gap-4">
        <UiCard>
            <div class="flex flex-col items-center gap-5 py-4 text-center" role="status">
                <StatusBadge tone="success" label="Connected to relay" />
                <span class="flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <i class="pi pi-spin pi-spinner text-2xl" aria-hidden="true" />
                </span>
                <div>
                    <h1 class="mb-1 text-lg font-semibold text-fg">Waiting for a request</h1>
                    <p class="text-sm text-fg-muted">
                        Keep this window open. A request will appear here once the application sends one.
                    </p>
                </div>
                <p class="flex w-full min-w-0 items-center gap-2 rounded-control bg-surface-muted px-3 py-2 text-xs text-fg-muted">
                    <i class="pi pi-server shrink-0" aria-hidden="true" />
                    <span class="truncate font-mono" :title="relay">{{ relay }}</span>
                </p>
            </div>
            <template #footer>
                <div class="flex justify-center">
                    <Button label="Disconnect" icon="pi pi-times" severity="secondary" outlined @click="closeConnect" />
                </div>
            </template>
        </UiCard>
    </div>
</template>
