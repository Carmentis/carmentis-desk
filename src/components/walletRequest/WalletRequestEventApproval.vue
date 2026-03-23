<script setup lang="ts">
import {
  ApplicationLedgerVb,
  BytesToBase64Encoder,
  CryptoEncoderFactory, EncoderFactory, HCVPkeEncoder, Microblock, ProviderFactory,
  PublicKeyEncryptionSchemeId,
  SeedEncoder,
  SignatureSchemeId,
  WalletCrypto, WalletInteractiveAnchoringRequestType, WalletInteractiveAnchoringResponseApprovalData,
  WalletInteractiveAnchoringResponseType,
  WalletInteractiveAnchoringValidation,
  WalletRequestDataApproval
} from "@cmts-dev/carmentis-sdk/client";
import axios from "axios";
import Card from "primevue/card";
import {computed, onMounted, ref} from "vue";
import {useStorageStore} from "../../stores/storage.ts";
import {storeToRefs} from "pinia";
import WalletRequestEventApprovalWallet from "./WalletRequestEventApprovalWallet.vue";
import VirtualBlockchainRecordNavigator from "./VirtualBlockchainRecordNavigator.vue";

// load all wallets
const store = useStorageStore();
const {wallets} = storeToRefs(store);
const chosenWallet = ref(wallets.value[0]);
const accountCrypto = computed(() =>  WalletCrypto.fromSeed(
    new SeedEncoder().decode(chosenWallet.value.seed)
).getDefaultAccountCrypto())

// define the prop for the vue
const props = defineProps<{
  walletRequest: WalletRequestDataApproval
}>();


// we use two emits here: approve and reject.
const emit = defineEmits<{
  approve: []
  reject: []
}>();

// we define below the state of the component
const isProcessing = ref(false);
const approvalData = ref<WalletInteractiveAnchoringResponseApprovalData | null>(null);
const microblockToApprove = ref<Microblock | null>(null);
const virtualBlockchainContainingMicroblock = ref<ApplicationLedgerVb | null>(null);

async function approve() {

}

function reject() {
  emit('reject');
}

async function sendRequestToOperator(serverUrl: string, request: object) {
  const endpoint = `${serverUrl}/api/protocols/wiap/v1`;
  console.log(`Sending request to operator at ${endpoint}: `, request);
  try {
    const httpResponse = await axios.post(endpoint, { data: request }, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      }
    });
    const unverifiedResponse = httpResponse.data;
    console.log(`Received response:`, JSON.stringify(unverifiedResponse));
    return WalletInteractiveAnchoringValidation.validateResponse(unverifiedResponse);
  } catch (error: unknown) {
    let errorMessage = "Unspecified error occurred while communicating with the operator";
    if (axios.isAxiosError(error)) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.stack || error.message;
    }
    return { type: WalletInteractiveAnchoringResponseType.ERROR, errorMessage };
  }
}

onMounted(async () => {
  try {
    // we obtain the approval data from the server
    const localAccountCrypto = WalletCrypto.fromSeed(
        new SeedEncoder().decode(chosenWallet.value.seed)
    ).getDefaultAccountCrypto();
    console.log("Wallet request:", props.walletRequest)

    // send an initial message approval handshake containing the anchorRequestId provided by the web client.
    const anchorRequestId = props.walletRequest.anchorRequestId;
    const handshakeResponse = await sendRequestToOperator(props.walletRequest.serverUrl, {
      type: WalletInteractiveAnchoringRequestType.APPROVAL_HANDSHAKE,
      anchorRequestId,
    });
    console.log(`Received getApprovalData response:`, JSON.stringify(handshakeResponse));

    // In case where the actor public key is required for this interaction, the user provides a derived key
    if (handshakeResponse.type == WalletInteractiveAnchoringResponseType.ACTOR_KEY_REQUIRED) {
      console.debug("Operator asking for actor key: proceeding to the actor key generation");

      // asserts that the genesisSeed is provided by the operator
      const actorKeyRequiredResponse = handshakeResponse as { type: string; b64GenesisSeed: string };
      const genesisSeed = BytesToBase64Encoder.decode(actorKeyRequiredResponse.b64GenesisSeed);

      // derive the actor key from the private key and the genesis seed
      console.log(`Event approval: Genesis seed: ${genesisSeed}`);
      const actorCrypto = localAccountCrypto.deriveActorFromVbSeed(genesisSeed);

      // derive the actor public signature key
      const signatureSchemeId = SignatureSchemeId.SECP256K1;
      const actorSignaturePublicKey = await actorCrypto.getPublicSignatureKey(signatureSchemeId);

      // derive the actor public encryption key
      const pkeSchemeId = PublicKeyEncryptionSchemeId.ML_KEM_768_AES_256_GCM;
      const actorPublicEncryptionKey = await actorCrypto.getPublicEncryptionKey(pkeSchemeId);

      // send the actor key to the operator and awaits for the response
      const signatureEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
      const pkeEncoder = HCVPkeEncoder.createBase64HCVPkeEncoder();
      const encodedPk = await signatureEncoder.encodePublicKey(actorSignaturePublicKey);
      const b64 = EncoderFactory.bytesToBase64Encoder();
      //console.log(`Generated signature public key for genesisSeed ${b64.encode(genesisSeed)}: ${encodedPk}`);
      const actorKeyResponse = await sendRequestToOperator(props.walletRequest.serverUrl, {
        type: WalletInteractiveAnchoringRequestType.ACTOR_KEY,
        anchorRequestId: props.walletRequest.anchorRequestId,
        actorSignaturePublicKey: encodedPk,
        actorPkePublicKey: await pkeEncoder.encodePublicEncryptionKey(actorPublicEncryptionKey),
      });

      if (actorKeyResponse.type === WalletInteractiveAnchoringResponseType.APPROVAL_DATA) {
        approvalData.value = actorKeyResponse as WalletInteractiveAnchoringResponseApprovalData;
      } else if (actorKeyResponse.type === WalletInteractiveAnchoringResponseType.ERROR) {
        throw new Error(actorKeyResponse.errorMessage);
      } else {
        throw new Error(`Unexpected response type: ${actorKeyResponse.type}`);
      }
    } else if (handshakeResponse.type == WalletInteractiveAnchoringResponseType.APPROVAL_DATA) {
      approvalData.value = handshakeResponse as WalletInteractiveAnchoringResponseApprovalData;
    } else if (handshakeResponse.type === WalletInteractiveAnchoringResponseType.ERROR) {
      throw new Error("An error occurred while getting the approval data: " + handshakeResponse.errorMessage);
    } else {
      throw new Error(`Unexpected handshake response type: ${handshakeResponse.type}`);
    }
    const encodedMicroblock = approvalData.value.b64SerializedMicroblock;
    const rawMicroblock = EncoderFactory.bytesToBase64Encoder().decode(encodedMicroblock);
    const mb = Microblock.loadFromSerializedMicroblock(rawMicroblock);
    microblockToApprove.value = mb;
    console.log("Approval data:", approvalData.value);



    // we compute the application ledger
    const nodeUrl = 'https://ares.testnet.carmentis.io'
    const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(nodeUrl);
    let applicationLedger = mb.getHeight() === 1 ?
        ApplicationLedgerVb.createApplicationLedgerVirtualBlockchain(provider) :
        await provider.loadApplicationLedgerVirtualBlockchain(
            await provider.getVirtualBlockchainIdContainingMicroblock(
                // we are looking for the previous microblock hash, the received one is not anchored yet
                mb.getPreviousHash()
            )
        );
    applicationLedger.enableDraftMode();
    await applicationLedger.appendMicroBlock(mb);
    virtualBlockchainContainingMicroblock.value = applicationLedger;

  } catch (e) {
    console.error("Error obtaining approval data:", e);
    reject()
  }
})
</script>

<template>
  <Card>
    <template #content>
      <h1>Event approval request</h1>
      <p>You have received an event approval request {{props.walletRequest.serverUrl}}</p>
      <p>{{props.walletRequest.anchorRequestId}}</p>
    </template>
  </Card>



  <div class="flex flex-col gap-2">
    <div>
      <WalletRequestEventApprovalWallet/>
    </div>

    <div v-if="microblockToApprove">
      <Card>
        <template #content >
          <div class="flex gap-4 flex-col">
            <div>
              <h1 class="text-xl font-bold">Microblock to approve</h1>
              <p>Below is presented the microblock the application wants you to approve.</p>
            </div>

            <div>
              <h2 class="text-lg font-bold">Microblock Header</h2>
              <p>Hash: {{microblockToApprove.getHash().encode()}}</p>
              <p>Height: {{microblockToApprove.getHeight()}}</p>
            </div>

            <div>
              <h2 class="text-lg font-bold">Microblock Body</h2>
              <div class="flex flex-col gap-2">
                <div v-for="section of microblockToApprove.getAllSections()">
                  <code class="block p-2 bg-gray-100 rounded-md overflow-hidden">
                    {{JSON.stringify(section)}}
                  </code>
                </div>
              </div>
            </div>
          </div>

        </template>
      </Card>

    </div>

    <div v-if="virtualBlockchainContainingMicroblock">
      <Card>
        <template #title>
          <h1 class="text-xl font-bold">Virtual Blockchain</h1>
        </template>
        <template #subtitle>
          <p class="text-sm text-gray-600">ID: {{ virtualBlockchainContainingMicroblock.getId() }}</p>
        </template>
        <template #content>
          <div class="flex flex-col gap-4">
            <div>
              <h2 class="text-lg font-bold mb-2">Records</h2>
              <p class="text-sm text-gray-600 mb-4">
                Navigate through the microblocks to view the records stored in this virtual blockchain.
              </p>
            </div>
            <VirtualBlockchainRecordNavigator
              :application-ledger="virtualBlockchainContainingMicroblock"
              :account-crypto="accountCrypto"
            />
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>