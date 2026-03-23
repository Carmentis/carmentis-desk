<script setup lang="ts">
import {useRoute, useRouter} from "vue-router";
import Button from 'primevue/button';
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
  <Button label="Home" @click="closeConnect" />

  <div v-if="walletRequest">
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
</template>