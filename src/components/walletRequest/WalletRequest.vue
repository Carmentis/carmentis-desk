<script setup lang="ts">
import {useRoute, useRouter} from "vue-router";
import Button from 'primevue/button';
import Card from 'primevue/card';
import {onMounted, ref} from "vue";
import {Responder} from "@cmts-dev/carmentis-relay-client";
import * as v from 'valibot';
import {
  WalletRequest,
  WalletRequestSchema,
  WalletRequestType,
  WalletResponseAuthByPublicKey,
  WalletResponseType
} from "@cmts-dev/carmentis-sdk/client";
import WalletRequestAuthByPublicKey from "./WalletRequestAuthByPublicKey.vue";
import {useToast} from "primevue/usetoast";
import WalletRequestEventApproval from "./WalletRequestEventApproval.vue";

const toast = useToast();
const route = useRoute();
const router = useRouter();
const query = route.query;
const symKey: string = query.symKey as string;
const relay: string = query.relay as string;
const sessionId: string = query.sessionId as string;
const wantsToClose = ref(false);


const responder = Responder.create(
    relay,
    sessionId,
    symKey
);

function closeConnect() {
  wantsToClose.value = true;
  responder.close();
  router.push('/')
}


const walletRequest = ref<WalletRequest | null>(null);
responder.onClose(() => {
  // we want to display a particular message if the connection with the relay is broken due to unexpected reasons.
  if (!wantsToClose.value) {
    toast.add({severity: 'error', summary: 'Connection with relay lost', detail: "The connection with the "});
  }
  router.push('/')
})

responder.onMessage((message) => {
  console.log("Received message:", message);
  const parseRequest = v.safeParse(WalletRequestSchema, message);
  if (parseRequest.success) {
    walletRequest.value = parseRequest.output;
  }
})



async function approveAuthenticationRequest(publicKey: string, challenge: string, signature: string) {
  // we construct the response
  console.log("Approving authentication request for public key:", publicKey, challenge, signature);
  const walletAuthenticationResponse: WalletResponseAuthByPublicKey = {
    type: WalletResponseType.AUTH_BY_PUBLIC_KEY,
    publicKey,
    signature
  }
  console.log("Sending response:", walletAuthenticationResponse);
  await responder.send(walletAuthenticationResponse)

  // notify the authentication
  toast.add({severity:'success', summary:'Authentication successful', detail:'You are authenticated', life: 3000});

  // close the response
  closeConnect()
}


onMounted(async () => {
  // we join the session when mounted
  console.log("Responder created");
  await responder.join();
})
</script>
<template>
  <!-- Full-page layout when a request is active -->
  <div v-if="walletRequest" class="min-h-screen">
    <WalletRequestAuthByPublicKey
        @approve="(pk, sig, chal) => approveAuthenticationRequest(pk, chal, sig)"
        :wallet-request="walletRequest"
        v-if="walletRequest.type === WalletRequestType.AUTH_BY_PUBLIC_KEY"
    />
    <WalletRequestEventApproval
        :wallet-request="walletRequest"
        v-else-if="walletRequest.type === WalletRequestType.DATA_APPROVAL"
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