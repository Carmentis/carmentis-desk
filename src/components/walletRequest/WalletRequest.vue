<script setup lang="ts">
import {onMounted, onUnmounted, ref} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import { useToast } from 'primevue/usetoast';
import * as v from 'valibot';
import { Responder } from '@cmts-dev/carmentis-relay-client';
import {
    WalletRequestAuthByPublicKey,
    WalletRequestAuthByPublicKeySchema,
    WalletRequestDataApproval,
    WalletRequestDataApprovalSchema,
    WalletRequestType,
} from '@cmts-dev/carmentis-sdk/client';
import {
  JsonRpc, JsonRpcErrorResponse,
  JsonRpcNotification,
  JsonRpcParams,
  JsonRpcRequest,
  JsonRpcSuccessResponse
} from '@cmts-dev/carmentis-sdk-json-rpc';

import WalletRequestDeprecatedAuthByPublicKey from './WalletRequestDeprecatedAuthByPublicKey.vue';
import WalletRequestV1AuthByPublicKey from '../deep-links/rpc/v1/auth/WalletRequestAuthByPublicKey.vue';
import WalletRequestEventApproval from './WalletRequestEventApproval.vue';
import * as timers from 'node:timers';
import {
    CredentialPresentation,
    CredentialPresentationSchema
} from "../deep-links/rpc/v1/credential/presentation/SdJwtPresentationRequestType.ts";
import SdJwtPresentation from "../deep-links/rpc/v1/credential/presentation/SdJwtPresentation.vue";

// ── Types ─────────────────────────────────────────────────────────────────────

type RequestId = number | string | null;

const V1AuthPkParamsSchema = v.object({
    origin: v.string(),
    b64Challenge: v.string(),
    pkFormat: v.optional(v.picklist(['did', 'cmts']), 'cmts'),
    sigFormat: v.optional(v.literal('jws'), 'jws'),
});
type V1AuthPkParams = v.InferOutput<typeof V1AuthPkParamsSchema>;

type ActiveRequest =
    | { kind: '/v1/auth/pk'; id: RequestId; params: V1AuthPkParams }
    | {
          kind: 'wr-auth-pk';
          id: RequestId;
          params: WalletRequestAuthByPublicKey;
      }
    | {
          kind: 'wr-data-approval';
          id: RequestId;
          params: WalletRequestDataApproval;
      }
    | {
            kind: '/v1/credential/presentation';
            id: RequestId;
            params: CredentialPresentation;
    };

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

// ── Method handler registry ───────────────────────────────────────────────────

type Handler = (id: RequestId, params: unknown) => ReturnType<typeof JsonRpc.success> | JsonRpcErrorResponse | JsonRpcSuccessResponse | void | undefined;

const methodHandlers: Record<string, Handler> = {
    ping: (id) => JsonRpc.success(id, { ts: Date.now() }),

    '/v1/auth/pk': (id, params) => {
        const result = v.safeParse(V1AuthPkParamsSchema, params);
        if (!result.success) return JsonRpc.invalidParams(id, 'Invalid parameters for /v1/auth/pk');
        activeRequest.value = {
            kind: '/v1/auth/pk',
            id,
            params: result.output,
        };
    },

    "/v1/credential/presentation": (id, params) => {
        const result = v.safeParse(CredentialPresentationSchema, params);
        if (!result.success) return JsonRpc.invalidParams(id, 'Invalid parameters for /v1/credential/presentation');
        activeRequest.value = {
            kind: '/v1/credential/presentation',
            id,
            params: result.output,
        };
    },

    'wr-auth-pk': (id, params) => {
        const result = v.safeParse(WalletRequestAuthByPublicKeySchema, {
            type: WalletRequestType.AUTH_BY_PUBLIC_KEY,
            ...(params as object),
        });
        if (!result.success) return JsonRpc.invalidParams(id, 'Invalid parameters for wr-auth-pk');
        activeRequest.value = { kind: 'wr-auth-pk', id, params: result.output };
    },

    'wr-data-approval': (id, params) => {
        const result = v.safeParse(WalletRequestDataApprovalSchema, {
            type: WalletRequestType.DATA_APPROVAL,
            ...(params as object),
        });
        if (!result.success) return JsonRpc.invalidParams(id, 'Invalid parameters for wr-data-approval');
        activeRequest.value = {
            kind: 'wr-data-approval',
            id,
            params: result.output,
        };
    },
};

function handleJsonRpcRequest(request: JsonRpcRequest<JsonRpcParams> | JsonRpcNotification<JsonRpcParams>) {
    const id: RequestId = 'id' in request ? request.id : null;
    const handler = methodHandlers[request.method];
    if (!handler) return JsonRpc.methodNotFound(id, 'Method not found');
    return handler(id, request.params);
}

responder.onMessage((message) => {
    const parsed = JsonRpc.parseRequest(message);
    if (!parsed.ok) {
        console.warn('Invalid JSON-RPC request received:', message, parsed.error);
        return;
    }
    const response = handleJsonRpcRequest(parsed.value);
    if (response) responder.send(response).then(closeConnect);
});

// ── Approve / reject handlers ─────────────────────────────────────────────────

async function onApproveV1AuthPk(pk: string | object, signature: string) {
    if (activeRequest.value?.kind !== '/v1/auth/pk') return;
    await responder.send(JsonRpc.success(activeRequest.value.id, { pk, signature }));
    toast.add({
        severity: 'success',
        summary: 'Authentication successful',
        detail: 'You are authenticated',
        life: 3000,
    });
    closeConnect();
}

async function onApproveWrAuthPk(publicKey: string, challenge: string, signature: string) {
    if (activeRequest.value?.kind !== 'wr-auth-pk') return;
    await responder.send(JsonRpc.success(activeRequest.value.id, { publicKey, signature }));
    toast.add({
        severity: 'success',
        summary: 'Authentication successful',
        detail: 'You are authenticated',
        life: 3000,
    });
    closeConnect();
}

async function onApproveDataApproval(b64VbHash: string, b64MbHash: string, height: number) {
    if (activeRequest.value?.kind !== 'wr-data-approval') return;
    await responder.send(
        JsonRpc.success(activeRequest.value.id, {
            b64VbHash,
            b64MbHash,
            height,
        }),
    );
    toast.add({
        severity: 'success',
        summary: 'Event approved',
        detail: 'The event has been approved and signed',
        life: 3000,
    });
    closeConnect();
}

async function onApproveCredentialPresentation(vpToken: string) {
    if (activeRequest.value?.kind !== '/v1/credential/presentation') return;
    await responder.send(JsonRpc.success(activeRequest.value.id, { vp_token: vpToken }));
    toast.add({
        severity: 'success',
        summary: 'Presentation successful',
        detail: 'The credential has been presented',
        life: 3000,
    });
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
        <WalletRequestV1AuthByPublicKey
            v-if="activeRequest.kind === '/v1/auth/pk'"
            :origin="activeRequest.params.origin"
            :b64-challenge="activeRequest.params.b64Challenge"
            :pk-format="activeRequest.params.pkFormat"
            :sig-format="activeRequest.params.sigFormat"
            @approve="onApproveV1AuthPk"
            @reject="closeConnect"
        />
        <WalletRequestDeprecatedAuthByPublicKey
            v-else-if="activeRequest.kind === 'wr-auth-pk'"
            :wallet-request="activeRequest.params"
            @approve="(pk, sig, chal) => onApproveWrAuthPk(pk, chal, sig)"
            @reject="closeConnect"
        />
        <WalletRequestEventApproval
            v-else-if="activeRequest.kind === 'wr-data-approval'"
            :wallet-request="activeRequest.params"
            @approve="onApproveDataApproval"
            @reject="closeConnect"
        />
        <SdJwtPresentation
            v-else-if="activeRequest.kind === '/v1/credential/presentation'"
            :credential-presentation-request="activeRequest.params"
            @present="onApproveCredentialPresentation"
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
