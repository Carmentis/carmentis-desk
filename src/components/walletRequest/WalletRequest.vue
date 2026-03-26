<script setup lang="ts">
import {useRoute, useRouter} from "vue-router";
import Button from 'primevue/button';
import Card from 'primevue/card';
import {onMounted, ref} from "vue";
import {Responder} from "@cmts-dev/carmentis-relay-client";
import * as v from 'valibot';
import {
  WalletRequestAuthByPublicKey,
  WalletRequestAuthByPublicKeySchema,
  WalletRequestDataApproval,
  WalletRequestDataApprovalSchema,
  WalletRequestType,
} from "@cmts-dev/carmentis-sdk/client";
import WalletRequestAuthByPublicKeyVue from "./WalletRequestAuthByPublicKey.vue";
import {useToast} from "primevue/usetoast";
import WalletRequestEventApproval from "./WalletRequestEventApproval.vue";
import {JsonRpc, JsonRpcNotification, JsonRpcParams, JsonRpcRequest} from "@cmts-dev/carmentis-sdk-json-rpc";

const toast = useToast();
const route = useRoute();
const router = useRouter();
const query = route.query;
const symKey: string = query.symKey as string;
const relay: string = query.relay as string;
const sessionId: string = query.sessionId as string;
const wantsToClose = ref(false);

const responder = Responder.create(relay, sessionId, symKey);

function closeConnect() {
  wantsToClose.value = true;
  responder.close();
  router.push('/')
}

const walletRequest = ref<WalletRequestAuthByPublicKey | WalletRequestDataApproval | null>(null);
const jsonRpcRequestId = ref<number | string | null>(null);

responder.onClose(() => {
  if (!wantsToClose.value) {
    toast.add({severity: 'error', summary: 'Connection with relay lost', detail: 'The connection with the relay was lost unexpectedly.'});
  }
  router.push('/')
})

function handleJsonRpcRequest(request: JsonRpcRequest<JsonRpcParams> | JsonRpcNotification<JsonRpcParams>) {
  const requestId = 'id' in request ? request.id : null;

  if (request.method === 'wr-auth-pk') {
    const authRequest = { type: WalletRequestType.AUTH_BY_PUBLIC_KEY, ...request.params };
    const result = v.safeParse(WalletRequestAuthByPublicKeySchema, authRequest);
    if (result.success) {
      jsonRpcRequestId.value = requestId;
      walletRequest.value = result.output;
    } else {
      console.warn("Invalid parameters received for authentication request")
      return JsonRpc.invalidParams(requestId, 'Invalid parameters for authentication request');
    }
  } else if (request.method === 'wr-data-approval') {
    const approvalRequest = { type: WalletRequestType.DATA_APPROVAL, ...request.params };
    const result = v.safeParse(WalletRequestDataApprovalSchema, approvalRequest);
    if (result.success) {
      jsonRpcRequestId.value = requestId;
      walletRequest.value = result.output;
    } else {
      return JsonRpc.invalidParams(requestId, 'Invalid parameters for data approval request');
    }
  } else if (request.method === 'ping') {
    return JsonRpc.success(requestId, { ts: Date.now() });
  } else {
    return JsonRpc.methodNotFound(requestId, 'Method not found');
  }
}

responder.onMessage((message) => {
  const jsonRpcParseResult = JsonRpc.parseRequest(message);
  if (jsonRpcParseResult.ok) {
    const response = handleJsonRpcRequest(jsonRpcParseResult.value);
    if (response) {
      responder.send(response)
          .then(closeConnect);
    }
  }
})

async function approveEventRequest(b64VbHash: string, b64MbHash: string, height: number) {
  await responder.send(JsonRpc.success(jsonRpcRequestId.value, { b64VbHash, b64MbHash, height }));
  toast.add({severity: 'success', summary: 'Event approved', detail: 'The event has been approved and signed', life: 3000});
  closeConnect();
}

async function approveAuthenticationRequest(publicKey: string, challenge: string, signature: string) {
  await responder.send(JsonRpc.success(jsonRpcRequestId.value, { publicKey, signature }));
  toast.add({severity: 'success', summary: 'Authentication successful', detail: 'You are authenticated', life: 3000});
  closeConnect();
}

onMounted(async () => {
  wantsToClose.value = false;
  await responder.join();
})
</script>
<template>
  <!-- Full-page layout when a request is active -->
  <div v-if="walletRequest" class="min-h-screen">
    <WalletRequestAuthByPublicKeyVue
        @approve="(pk, sig, chal) => approveAuthenticationRequest(pk, chal, sig)"
        :wallet-request="walletRequest"
        v-if="walletRequest.type === WalletRequestType.AUTH_BY_PUBLIC_KEY"
    />
    <WalletRequestEventApproval
        :wallet-request="walletRequest"
        v-else-if="walletRequest.type === WalletRequestType.DATA_APPROVAL"
        @approve="approveEventRequest"
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
        <Button label="Disconnect" icon="pi pi-times" severity="secondary" size="small" outlined @click="closeConnect" />
      </div>

      <Card>
        <template #content>
          <div class="flex flex-col items-center gap-6 py-8">
            <div class="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center">
              <i class="pi pi-spin pi-spinner text-primary text-2xl"></i>
            </div>
            <div class="text-center">
              <h2 class="text-lg font-semibold text-surface-800 mb-1">Waiting for a request</h2>
              <p class="text-sm text-surface-500">Keep this window open. A request will appear here once the application sends one.</p>
            </div>
            <div class="w-full border border-surface-200 rounded-lg p-3 bg-surface-50">
              <div class="flex items-center gap-2 text-xs text-surface-500">
                <i class="pi pi-server"></i>
                <span class="font-mono truncate">{{ relay }}</span>
              </div>
            </div>
          </div>
        </template>
      </Card>

    </div>
  </div>
</template>