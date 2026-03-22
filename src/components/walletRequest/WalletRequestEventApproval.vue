<script setup lang="ts">
import {
  ApplicationLedgerVb,
  CryptoEncoderFactory, EncoderFactory, Microblock, ProviderFactory,
  SeedEncoder,
  WalletCrypto, WalletInteractiveAnchoringResponseApprovalData,
  WalletRequestDataApproval, wiExtensionWallet
} from "@cmts-dev/carmentis-sdk/client";
import Card from "primevue/card";
import {onMounted, ref} from "vue";
import {useStorageStore} from "../../stores/storage.ts";
import {storeToRefs} from "pinia";
import WalletRequestEventApprovalWallet from "./WalletRequestEventApprovalWallet.vue";

// load all wallets
const store = useStorageStore();
const {wallets} = storeToRefs(store);
const chosenWallet = ref(wallets.value[0]);

// define the prop for the vue
const props = defineProps<{
  walletRequest: WalletRequestDataApproval
}>();


// we use two emits here: approve and reject.
const emit = defineEmits<{
  approve: []
  reject: []
}>();

// we instantiate the wallet extension
const wiWallet = new wiExtensionWallet();


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

onMounted(async () => {
  try {


    // we obtain the approval data from the server
    const walletCrypto = WalletCrypto.generateWallet();
    const accountCrypto = walletCrypto.getDefaultAccountCrypto();
    const { serverUrl, anchorRequestId } = props.walletRequest;
    approvalData.value = await wiWallet.getApprovalData(
        accountCrypto,
        {serverUrl, anchorRequestId}
    );
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
  <div class="flex items-center justify-center h-full p-4">
    Event approval
  </div>
  <p>{{props.walletRequest.serverUrl}}</p>
  <p>{{props.walletRequest.anchorRequestId}}</p>


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
        <template #content>
          <h1>Virtual blockchain</h1>
          {{virtualBlockchainContainingMicroblock.getId()}}
        </template>
      </Card>
    </div>
  </div>
</template>