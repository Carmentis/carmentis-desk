<script setup lang="ts">
import {
  ApplicationLedgerVb,
  BytesToBase64Encoder,
  CryptoEncoderFactory, EncoderFactory, HCVPkeEncoder, Microblock, ProviderFactory,
  PublicKeyEncryptionSchemeId,
  SectionLabel,
  SeedEncoder,
  SignatureSchemeId,
  WalletCrypto, WalletInteractiveAnchoringRequestType, WalletInteractiveAnchoringResponseApprovalData,
  WalletInteractiveAnchoringResponseType,
  WalletInteractiveAnchoringValidation,
  WalletRequestDataApproval
} from "@cmts-dev/carmentis-sdk/client";
import axios from "axios";
import Card from "primevue/card";
import Button from "primevue/button";
import Skeleton from "primevue/skeleton";
import Divider from "primevue/divider";
import Accordion from "primevue/accordion";
import AccordionPanel from "primevue/accordionpanel";
import AccordionHeader from "primevue/accordionheader";
import AccordionContent from "primevue/accordioncontent";
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
const isLoading = ref(true);
const loadError = ref<string | null>(null);
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

    isLoading.value = false;
  } catch (e) {
    console.error("Error obtaining approval data:", e);
    loadError.value = e instanceof Error ? e.message : String(e);
    isLoading.value = false;
  }
})
</script>

<template>
  <div class="min-h-screen bg-surface-50 flex flex-col">

    <!-- Top bar -->
    <div class="bg-white border-b border-surface-200 px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
          <i class="pi pi-file-check text-primary"></i>
        </div>
        <div class="min-w-0">
          <h1 class="text-sm font-semibold text-surface-800">Event Approval Request</h1>
          <div class="flex items-center gap-3 mt-0.5">
            <span class="text-xs text-surface-500 font-mono truncate">{{ props.walletRequest.serverUrl }}</span>
            <span class="text-surface-300">·</span>
            <span class="text-xs text-surface-400 font-mono truncate">{{ props.walletRequest.anchorRequestId }}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <span class="hidden sm:inline-flex text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700">Pending</span>
        <Button label="Reject" icon="pi pi-times" severity="secondary" size="small" outlined :disabled="isProcessing || isLoading" @click="reject" />
        <Button label="Approve" icon="pi pi-check" size="small" :loading="isProcessing" :disabled="!microblockToApprove || !!loadError" @click="approve" />
      </div>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-auto p-6">

      <!-- Loading -->
      <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <template #content>
            <div class="flex items-center gap-2 mb-4">
              <i class="pi pi-spin pi-spinner text-primary text-sm"></i>
              <span class="text-sm text-surface-500">Fetching approval data…</span>
            </div>
            <div class="flex flex-col gap-2">
              <Skeleton height="1.5rem" width="50%" />
              <Skeleton height="1rem" width="80%" />
              <Skeleton height="1rem" width="65%" />
              <Skeleton height="4rem" class="mt-2" />
            </div>
          </template>
        </Card>
        <Card>
          <template #content>
            <div class="flex flex-col gap-2">
              <Skeleton height="1.5rem" width="40%" />
              <Skeleton height="1rem" width="70%" />
              <Skeleton height="1rem" width="55%" />
            </div>
          </template>
        </Card>
      </div>

      <!-- Error -->
      <Card v-else-if="loadError">
        <template #content>
          <div class="flex items-start gap-3 text-red-700 py-2">
            <i class="pi pi-times-circle text-xl flex-shrink-0 mt-0.5"></i>
            <div>
              <p class="font-semibold text-sm">Failed to load approval data</p>
              <p class="text-xs mt-1 text-red-600 font-mono break-all">{{ loadError }}</p>
            </div>
          </div>
        </template>
      </Card>

      <!-- Main content -->
      <div v-else-if="microblockToApprove" class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        <!-- Left column: wallet + microblock sections -->
        <div class="flex flex-col gap-4">

          <!-- Wallet selector -->
          <WalletRequestEventApprovalWallet />

          <!-- Microblock card -->
          <Card>
            <template #content>
              <div class="flex flex-col gap-4">

                <!-- Microblock metadata -->
                <div>
                  <p class="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-3">Microblock</p>
                  <div class="grid grid-cols-2 gap-2">
                    <div class="bg-surface-50 rounded-lg p-3">
                      <p class="text-xs text-surface-400 mb-1">Height</p>
                      <p class="text-sm font-bold text-surface-800">{{ microblockToApprove.getHeight() }}</p>
                    </div>
                    <div class="bg-surface-50 rounded-lg p-3 col-span-2">
                      <p class="text-xs text-surface-400 mb-1">Hash</p>
                      <p class="text-xs font-mono text-surface-600 break-all">{{ microblockToApprove.getHash().encode() }}</p>
                    </div>
                  </div>
                </div>

                <Divider class="my-0" />

                <!-- Sections accordion -->
                <div>
                  <p class="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-3">
                    Sections
                    <span class="ml-2 text-xs font-normal bg-surface-100 text-surface-600 px-1.5 py-0.5 rounded-full">
                      {{ microblockToApprove.getAllSections().length }}
                    </span>
                  </p>
                  <Accordion>
                    <AccordionPanel
                      v-for="(section, i) of microblockToApprove.getAllSections()"
                      :key="i"
                      :value="String(i)"
                    >
                      <AccordionHeader>
                        <div class="flex items-center gap-2">
                          <span class="w-5 h-5 rounded-full bg-primary-50 text-primary text-xs flex items-center justify-center font-semibold flex-shrink-0">
                            {{ i + 1 }}
                          </span>
                          <span class="text-sm font-medium text-surface-700">
                            {{ SectionLabel.getSectionLabelFromSection(section) }}
                          </span>
                          <span class="ml-auto text-xs text-surface-400 font-mono mr-2">type {{ section.type }}</span>
                        </div>
                      </AccordionHeader>
                      <AccordionContent>
                        <pre class="text-xs font-mono text-surface-600 whitespace-pre-wrap break-all bg-surface-50 rounded-lg p-3">{{ JSON.stringify(section, null, 2) }}</pre>
                      </AccordionContent>
                    </AccordionPanel>
                  </Accordion>
                </div>

              </div>
            </template>
          </Card>
        </div>

        <!-- Right column: virtual blockchain info + navigator -->
        <div class="flex flex-col gap-4" v-if="virtualBlockchainContainingMicroblock">

          <!-- VB identity card -->
          <Card>
            <template #content>
              <p class="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-3">Virtual Blockchain</p>
              <div class="bg-surface-50 rounded-lg p-3 mb-4">
                <p class="text-xs text-surface-400 mb-1">Identifier</p>
                <p class="text-xs font-mono text-surface-600 break-all">{{ virtualBlockchainContainingMicroblock.getId() }}</p>
              </div>

              <!-- Actors -->
              <div class="mb-4">
                <div class="flex items-center gap-2 mb-2">
                  <i class="pi pi-users text-surface-400 text-xs"></i>
                  <p class="text-xs font-semibold text-surface-600">
                    Actors
                    <span class="ml-1.5 text-xs font-normal bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded-full">
                      {{ virtualBlockchainContainingMicroblock.getAllActors().length }}
                    </span>
                  </p>
                </div>
                <div v-if="virtualBlockchainContainingMicroblock.getAllActors().length === 0" class="text-xs text-surface-400 italic pl-2">
                  No actors defined
                </div>
                <div v-else class="flex flex-col gap-1.5">
                  <div
                    v-for="(actor, idx) of virtualBlockchainContainingMicroblock.getAllActors()"
                    :key="idx"
                    class="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg border border-surface-100"
                  >
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-full bg-primary-100 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0">
                        {{ String(actor.name).charAt(0).toUpperCase() }}
                      </div>
                      <span class="text-sm font-medium text-surface-700">{{ actor.name }}</span>
                    </div>
                    <span
                      class="text-xs px-2 py-0.5 rounded-full"
                      :class="actor.subscribed ? 'bg-green-100 text-green-700' : 'bg-surface-100 text-surface-500'"
                    >
                      {{ actor.subscribed ? 'Subscribed' : 'Unsubscribed' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Channels -->
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <i class="pi pi-comments text-surface-400 text-xs"></i>
                  <p class="text-xs font-semibold text-surface-600">
                    Channels
                    <span class="ml-1.5 text-xs font-normal bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded-full">
                      {{ virtualBlockchainContainingMicroblock.getAllChannels().length }}
                    </span>
                  </p>
                </div>
                <div v-if="virtualBlockchainContainingMicroblock.getAllChannels().length === 0" class="text-xs text-surface-400 italic pl-2">
                  No channels defined
                </div>
                <div v-else class="flex flex-col gap-1.5">
                  <div
                    v-for="(channel, idx) of virtualBlockchainContainingMicroblock.getAllChannels()"
                    :key="idx"
                    class="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg border border-surface-100"
                  >
                    <div class="flex items-center gap-2">
                      <i class="pi text-sm" :class="channel.isPrivate ? 'pi-lock text-amber-500' : 'pi-lock-open text-green-500'"></i>
                      <span class="text-sm font-medium text-surface-700">{{ channel.name }}</span>
                    </div>
                    <span
                      class="text-xs px-2 py-0.5 rounded-full"
                      :class="channel.isPrivate ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'"
                    >
                      {{ channel.isPrivate ? 'Private' : 'Public' }}
                    </span>
                  </div>
                </div>
              </div>
            </template>
          </Card>

          <!-- Record navigator card -->
          <Card>
            <template #content>
              <p class="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-3">History</p>
              <VirtualBlockchainRecordNavigator
                :application-ledger="virtualBlockchainContainingMicroblock"
                :account-crypto="accountCrypto"
              />
            </template>
          </Card>
        </div>

      </div>
    </div>

  </div>
</template>
