<script setup lang="ts">
import {
    ApplicationLedgerVb,
    BytesToBase64Encoder,
    CryptoEncoderFactory,
    EncoderFactory,
    HCVPkeEncoder,
    Microblock,
    ProviderFactory,
    PublicKeyEncryptionSchemeId,
    SectionLabel,
    SeedEncoder,
    SignatureSchemeId,
    WalletCrypto,
    WalletInteractiveAnchoringRequestType, WalletInteractiveAnchoringResponse,
    WalletInteractiveAnchoringResponseApprovalData,
    WalletInteractiveAnchoringResponseType,
    WalletInteractiveAnchoringValidation,
} from '@cmts-dev/carmentis-sdk-core';
import axios from 'axios';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Skeleton from 'primevue/skeleton';
import Divider from 'primevue/divider';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import { useToast } from 'primevue/usetoast';
import {computed, onMounted, ref, shallowRef, watch} from 'vue';
import {useStorageStore, WalletStub} from '../../../../stores/storage.ts';
import { useSessionStore } from '../../../../stores/sessionStore.ts';
import { computedAsync } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import VirtualBlockchainRecordNavigator from '../../VirtualBlockchainRecordNavigator.vue';
import type { DataApprovalParams } from './DataApprovalRequestType.ts';
import * as participationRepo from '../../../../db/repositories/participationRepository.ts';
import * as virtualBlockchainRepo from '../../../../db/repositories/virtualBlockchainRepository.ts';
import * as microblockRepo from '../../../../db/repositories/microblockRepository.ts';
import Dropdown from "primevue/dropdown";
import FieldNameAndDescription from "../../../utils/FieldNameAndDescription.vue";
import {match} from "ts-pattern";

interface ApplicationDescription {
    name: string;
    logoUrl: string;
    homepageUrl: string;
    description: string;
}

interface OrganizationDescription {
    name: string;
    countryCode: string;
    city: string;
    website: string;
}

const props = defineProps<{ params: DataApprovalParams }>();
const emit = defineEmits<{
    done: [result: Record<string, unknown>];
    reject: [];
}>();

const toast = useToast();
const store = useStorageStore();
const sessionStore = useSessionStore();
const { wallets } = storeToRefs(store);
const chosenWallet = ref<WalletStub | null>();
const accountCrypto = computedAsync(async () => {
    if (!chosenWallet.value) return null;
    const rawSeed = await sessionStore.getWalletSeed(chosenWallet.value.id);
    return WalletCrypto.fromSeed(new SeedEncoder().decode(rawSeed)).getDefaultAccountCrypto();
}, null);


const isLoading = ref(false);
const loadError = ref<string | null>(null);
const isProcessing = ref(false);
const approvalData = ref<WalletInteractiveAnchoringResponseApprovalData | null>(null);
const microblockToApprove = shallowRef<Microblock | null>(null);
const virtualBlockchainContainingMicroblock = shallowRef<ApplicationLedgerVb | null>(null);
const applicationDescription = ref<ApplicationDescription | null>(null);
const organizationDescription = ref<OrganizationDescription | null>(null);
const showAdvanced = ref(false);

watch(chosenWallet, async (newWallet, oldWallet) => {
    await initiateDataApproval()
})

async function initiateDataApproval() {
    if (!chosenWallet.value) return;
    const wallet = chosenWallet.value;
    try {
        const rawSeed = await sessionStore.getWalletSeed(wallet.id);
        const localAccountCrypto = WalletCrypto.fromSeed(
            new SeedEncoder().decode(rawSeed),
        ).getDefaultAccountCrypto();
        console.log('Wallet request:', props.params);

        const anchorRequestId = props.params.anchorRequestId;
        const handshakeResponse = await sendRequestToOperator(props.params.serverUrl, {
            type: WalletInteractiveAnchoringRequestType.APPROVAL_HANDSHAKE,
            anchorRequestId,
        });
        console.log(`Received getApprovalData response:`, JSON.stringify(handshakeResponse));


        /*
        match(handshakeResponse)
            .with({ type: WalletInteractiveAnchoringResponseType.ACTOR_KEY_REQUIRED }, async (response) => {
                console.debug('Operator asking for actor key: proceeding to the actor key generation');

                const actorKeyRequiredResponse = response;
                const genesisSeed = BytesToBase64Encoder.decode(actorKeyRequiredResponse.b64GenesisSeed);

                console.log(`Event approval: Genesis seed: ${genesisSeed}`);
                const actorCrypto = localAccountCrypto.deriveActorFromVbSeed(genesisSeed);

                const signatureSchemeId = SignatureSchemeId.SECP256K1;
                const actorSignaturePublicKey = await actorCrypto.getPublicSignatureKey(signatureSchemeId);

                const pkeSchemeId = PublicKeyEncryptionSchemeId.ML_KEM_768_AES_256_GCM;
                const actorPublicEncryptionKey = await actorCrypto.getPublicEncryptionKey(pkeSchemeId);

                const signatureEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
                const pkeEncoder = HCVPkeEncoder.createBase64HCVPkeEncoder();
                const encodedPk = await signatureEncoder.encodePublicKey(actorSignaturePublicKey);
                const actorKeyResponse = await sendRequestToOperator(props.params.serverUrl, {
                    type: WalletInteractiveAnchoringRequestType.ACTOR_KEY,
                    anchorRequestId: props.params.anchorRequestId,
                    actorSignaturePublicKey: encodedPk,
                    actorPkePublicKey: await pkeEncoder.encodePublicEncryptionKey(actorPublicEncryptionKey),
                });

                match(actorKeyResponse)
                    .with({type: WalletInteractiveAnchoringResponseType.APPROVAL_DATA}, async (response) => {
                        console.debug('Operator accepted actor key');
                        //approvalData.value = actorKeyResponse as WalletInteractiveAnchoringResponseApprovalData;
                        approvalData.value = response;
                    })
                    .with({type:WalletInteractiveAnchoringResponseType.ERROR}, async (response) => {
                        console.debug('Operator rejected actor key');
                        throw new Error('An error occurred while getting the approval data: ' + response.errorMessage);
                    })
            })
            .with({ type: WalletInteractiveAnchoringResponseType.APPROVAL_DATA }, async (response) => {
                approvalData.value = response //handshakeResponse as WalletInteractiveAnchoringResponseApprovalData;
            })
            .with({ type: WalletInteractiveAnchoringResponseType.ERROR }, async (response) => {
                throw new Error('An error occurred while getting the approval data: ' + response.errorMessage);
            })
            .otherwise(() => {
                throw new Error(`Unexpected handshake response type: ${handshakeResponse.type}`);
            })
            */





        if (handshakeResponse.type == WalletInteractiveAnchoringResponseType.ACTOR_KEY_REQUIRED) {
            console.debug('Operator asking for actor key: proceeding to the actor key generation');

            const actorKeyRequiredResponse = handshakeResponse as {
                type: string;
                b64GenesisSeed: string;
            };
            const genesisSeed = BytesToBase64Encoder.decode(actorKeyRequiredResponse.b64GenesisSeed);

            console.log(`Event approval: Genesis seed: ${genesisSeed}`);
            const signatureSchemeId = wallet.schemeId;
            const actorCrypto = localAccountCrypto.deriveActorFromVbSeed(genesisSeed);
            actorCrypto.setSignatureSchemeId(signatureSchemeId);
            const actorSignaturePublicKey = await actorCrypto.getPublicSignatureKey(signatureSchemeId);

            const pkeSchemeId = PublicKeyEncryptionSchemeId.ML_KEM_768_AES_256_GCM;
            const actorPublicEncryptionKey = await actorCrypto.getPublicEncryptionKey(pkeSchemeId);

            const signatureEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
            const pkeEncoder = HCVPkeEncoder.createBase64HCVPkeEncoder();
            const encodedPk = await signatureEncoder.encodePublicKey(actorSignaturePublicKey);
            const actorKeyResponse = await sendRequestToOperator(props.params.serverUrl, {
                type: WalletInteractiveAnchoringRequestType.ACTOR_KEY,
                anchorRequestId: props.params.anchorRequestId,
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
            throw new Error('An error occurred while getting the approval data: ' + handshakeResponse.errorMessage);
        } else {
            throw new Error(`Unexpected handshake response type: ${handshakeResponse.type}`);
        }

        const encodedMicroblock = approvalData.value.b64SerializedMicroblock;
        const rawMicroblock = EncoderFactory.bytesToBase64Encoder().decode(encodedMicroblock);
        const mb = Microblock.loadFromSerializedMicroblock(rawMicroblock);
        microblockToApprove.value = mb;
        console.log('Approval data:', approvalData.value);

        const nodeUrl = wallet.nodeEndpoint;
        const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(nodeUrl);
        let applicationLedger =
            mb.getHeight() === 1
                ? ApplicationLedgerVb.createApplicationLedgerVirtualBlockchain(provider)
                : await provider.loadApplicationLedgerVirtualBlockchain(
                    await provider.getVirtualBlockchainIdContainingMicroblock(
                        mb.getPreviousHash(),
                    ),
                );
        applicationLedger.enableDraftMode();
        await applicationLedger.appendMicroBlock(mb);
        virtualBlockchainContainingMicroblock.value = applicationLedger;

        try {
            const appVb = await provider.loadApplicationVirtualBlockchain(applicationLedger.getApplicationId());
            applicationDescription.value = (await appVb.getApplicationDescription()) as ApplicationDescription;

            // Load organization description
            try {
                const orgId = appVb.getOrganizationId();
                const orgVb = await provider.loadOrganizationVirtualBlockchain(orgId);
                organizationDescription.value = await orgVb.getDescription() as OrganizationDescription;
            } catch (e) {
                console.warn('Could not load organization description:', e);
            }
        } catch (e) {
            console.warn('Could not load application description:', e);
        }

        isLoading.value = false;
    } catch (e) {
        console.error('Error obtaining approval data:', e);
        loadError.value = e instanceof Error ? e.message : String(e);
        isLoading.value = false;
    }
}

async function approve() {
    if (!microblockToApprove.value || !virtualBlockchainContainingMicroblock.value || !chosenWallet.value) return;
    isProcessing.value = true;
    try {
        if (!accountCrypto.value) return;
        const signatureSchemeId = chosenWallet.value.schemeId;
        const genesisSeed = await virtualBlockchainContainingMicroblock.value.getGenesisSeed();
        const actorCrypto = accountCrypto.value.deriveActorFromVbSeed(genesisSeed.toBytes());
        actorCrypto.setSignatureSchemeId(signatureSchemeId);
        const actorPrivateSignatureKey = await actorCrypto.getPrivateSignatureKey(signatureSchemeId);

        const signature = await microblockToApprove.value.sign(actorPrivateSignatureKey, false);

        const b64Encoder = EncoderFactory.bytesToBase64Encoder();
        const approvalSignatureResponse = await sendRequestToOperator(props.params.serverUrl, {
            type: WalletInteractiveAnchoringRequestType.APPROVAL_SIGNATURE,
            anchorRequestId: props.params.anchorRequestId,
            b64Signature: b64Encoder.encode(signature),
        });

        if (approvalSignatureResponse.type === WalletInteractiveAnchoringResponseType.ERROR) {
            throw new Error("Unknown error (unable to parse the error");
        } else if (approvalSignatureResponse.type !== WalletInteractiveAnchoringResponseType.APPROVAL_SIGNATURE) {
            throw new Error(`Unexpected response type: ${approvalSignatureResponse.type}`);
        }

        const sigResponse = approvalSignatureResponse;

        // decode the virtual blockchain id and re-encode it in hex
        const hexEncoder = EncoderFactory.bytesToHexEncoder();
        const vbId = hexEncoder.encode(b64Encoder.decode(sigResponse.b64VbHash));

        // decode the microblock hash an
        const microblockHash = hexEncoder.encode(b64Encoder.decode(sigResponse.b64MbHash));

        // create a virtual blockchain in the db if not already done
        console.log(`Checking if virtual blockchain ${vbId} exists`)
        const vb = await virtualBlockchainRepo.getVirtualBlockchainById(vbId)
        if (!vb) {
            console.log("Virtual blockchain does not exist, creating it")
            // create it
            await virtualBlockchainRepo.insertVirtualBlockchain({
               vbId,
               vbType: virtualBlockchainContainingMicroblock.value.getType(),
               walletId: chosenWallet.value.id
            })
        } else {
            console.log("Virtual blockchain exists, no new entry to create")
        }

        // create the microblock
        const operatorEndpoint = props.params.serverUrl;
        const encodedMicroblock = approvalData.value!.b64SerializedMicroblock;
        const microblockHeight = virtualBlockchainContainingMicroblock.value.getHeight();
        await microblockRepo.insertMicroblock({
            height: microblockHeight,
            microblockHash,
            publishedByMe: 0, // published by operator
            vbId,
            b64EncodedMicroblock: encodedMicroblock, // microblock not complete
            publishedToOperator: operatorEndpoint
        })


        const appId = virtualBlockchainContainingMicroblock.value.getApplicationId().encode();
        await participationRepo.insertAppLedger(chosenWallet.value.id, appId, {
            id: vbId,
            operatorEndpoint: props.params.serverUrl,
            b64EncodedMicroblock: approvalData.value!.b64SerializedMicroblock,
        });
        console.log(`Stored app ledger participation: app=${appId}, vb=${vbId}`);

        toast.add({
            severity: 'success',
            summary: 'Event approved',
            detail: 'The event has been approved and signed',
            life: 3000,
        });
        emit('done', { b64VbHash: sigResponse.b64VbHash, b64MbHash: sigResponse.b64MbHash, height: sigResponse.height });
    } catch (e) {
        console.error('Error during approval:', e);
        loadError.value = e instanceof Error ? e.message : String(e);
        console.error(loadError.value);
    } finally {
        isProcessing.value = false;
    }
}

async function sendRequestToOperator(serverUrl: string, request: object): Promise<WalletInteractiveAnchoringResponse> {
    const endpoint = `${serverUrl}/api/protocols/wiap/v1`;
    console.log(`Sending request to operator at ${endpoint}: `, request);
    try {
        const httpResponse = await axios.post(
            endpoint,
            { data: request },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            },
        );
        const unverifiedResponse = httpResponse.data;
        console.log(`Received response:`, JSON.stringify(unverifiedResponse));
        return WalletInteractiveAnchoringValidation.validateResponse(unverifiedResponse);
    } catch (error: unknown) {
        let errorMessage = 'Unspecified error occurred while communicating with the operator';
        if (axios.isAxiosError(error)) {
            errorMessage = error.message;
        } else if (error instanceof Error) {
            errorMessage = error.stack || error.message;
        }
        return {
            type: WalletInteractiveAnchoringResponseType.ERROR,
            errorMessage,
        };
    }
}

</script>

<template>
    <div class="min-h-screen bg-gray-50 flex flex-col">
        <!-- Top bar -->
        <div class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <i class="pi pi-file-check text-blue-600"></i>
                </div>
                <div class="min-w-0">
                    <h1 class="text-lg font-semibold text-gray-900">Data Approval Required</h1>
                    <p class="text-xs text-gray-500 mt-0.5">Approve data for {{ params.serverUrl }}</p>
                </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
                <Button
                    label="Reject"
                    icon="pi pi-times"
                    severity="secondary"
                    size="small"
                    outlined
                    :disabled="isProcessing || isLoading"
                    @click="emit('reject')"
                />
                <Button
                    label="Approve"
                    icon="pi pi-check"
                    size="small"
                    :loading="isProcessing"
                    :disabled="!microblockToApprove || !!loadError"
                    @click="approve"
                />
            </div>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-auto p-6">
            <!-- Wallet Selector -->
            <div class="max-w-4xl mx-auto mb-6">
                <div class="bg-white rounded-lg border border-gray-200 p-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Select Wallet to Approve</label>
                    <Dropdown
                        id="walletSelect"
                        v-model="chosenWallet"
                        :options="wallets"
                        optionLabel="name"
                        placeholder="Choose a wallet"
                        class="w-full"
                    >
                        <template #value="slotProps">
                            <div v-if="slotProps.value" class="flex items-center gap-2">
                                <i class="pi pi-wallet text-gray-600"></i>
                                <span>{{ slotProps.value.name }}</span>
                            </div>
                            <span v-else class="text-gray-500">{{ slotProps.placeholder }}</span>
                        </template>
                        <template #option="slotProps">
                            <div class="flex items-center gap-2">
                                <i class="pi pi-wallet text-gray-600"></i>
                                <div>
                                    <div class="font-semibold">{{ slotProps.option.name }}</div>
                                    <div class="text-xs text-gray-500">{{ slotProps.option.nodeEndpoint }}</div>
                                </div>
                            </div>
                        </template>
                    </Dropdown>
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="isLoading" class="max-w-4xl mx-auto space-y-4">
                <div class="bg-white rounded-lg border border-gray-200 p-6">
                    <div class="flex items-center gap-2 mb-4">
                        <i class="pi pi-spin pi-spinner text-blue-600 text-sm"></i>
                        <span class="text-sm text-gray-600">Loading approval data…</span>
                    </div>
                </div>
            </div>

            <!-- Error State -->
            <div v-else-if="loadError" class="max-w-4xl mx-auto">
                <div class="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <i class="pi pi-times-circle text-2xl text-red-600 flex-shrink-0"></i>
                    <div>
                        <p class="font-semibold text-sm text-red-900">Failed to load approval data</p>
                        <p class="text-xs text-red-700 mt-1 font-mono break-all">{{ loadError }}</p>
                    </div>
                </div>
            </div>

            <!-- Main Content -->
            <div v-else-if="microblockToApprove" class="max-w-4xl mx-auto space-y-6">
                <!-- What's happening section -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div class="flex gap-3">
                        <i class="pi pi-info-circle text-blue-600 text-lg flex-shrink-0 mt-0.5"></i>
                        <div class="text-sm text-blue-900">
                            <p class="font-semibold mb-1">What you're approving</p>
                            <p class="leading-relaxed">
                                A new data block needs to be anchored to the blockchain. You are authorizing {{ applicationDescription?.name || 'this application' }}
                                to add this block. Your approval will be cryptographically signed and recorded.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Application Information -->
                <div class="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 class="text-lg font-semibold text-gray-900 mb-4">Application</h2>
                    <div class="flex items-start gap-4 mb-6">
                        <img
                            v-if="applicationDescription?.logoUrl"
                            :src="applicationDescription.logoUrl"
                            :alt="applicationDescription.name"
                            class="w-16 h-16 rounded-lg object-contain flex-shrink-0 border border-gray-200 p-1"
                        />
                        <div v-else class="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <i class="pi pi-box text-gray-400 text-2xl"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="text-base font-semibold text-gray-900">{{ applicationDescription?.name }}</h3>
                            <a
                                v-if="applicationDescription?.homepageUrl"
                                :href="applicationDescription.homepageUrl"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-sm text-blue-600 hover:underline block mt-1 break-all"
                            >
                                {{ applicationDescription.homepageUrl }}
                                <i class="pi pi-external-link text-xs ml-1"></i>
                            </a>
                            <p v-if="applicationDescription?.description" class="text-sm text-gray-600 mt-2 leading-relaxed">
                                {{ applicationDescription.description }}
                            </p>
                        </div>
                    </div>

                    <!-- Organization Information -->
                    <div v-if="organizationDescription" class="border-t border-gray-200 pt-6">
                        <p class="text-xs uppercase text-gray-500 font-semibold mb-3">Operating Organization</p>
                        <div class="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div>
                                <p class="text-sm font-semibold text-gray-900">{{ organizationDescription.name }}</p>
                            </div>
                            <div v-if="organizationDescription.website" class="flex items-start gap-2">
                                <i class="pi pi-globe text-gray-400 text-sm flex-shrink-0 mt-0.5"></i>
                                <a
                                    :href="organizationDescription.website"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-sm text-blue-600 hover:underline break-all"
                                >
                                    {{ organizationDescription.website }}
                                    <i class="pi pi-external-link text-xs ml-1"></i>
                                </a>
                            </div>
                            <div v-if="organizationDescription.city || organizationDescription.countryCode" class="flex items-center gap-2">
                                <i class="pi pi-map-marker text-gray-400 text-sm flex-shrink-0"></i>
                                <p class="text-sm text-gray-700">
                                    <span v-if="organizationDescription.city">{{ organizationDescription.city }}, </span>
                                    <span v-if="organizationDescription.countryCode">{{ organizationDescription.countryCode }}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- History / Timeline -->
                <div class="bg-white rounded-lg border border-gray-200 p-6" v-if="virtualBlockchainContainingMicroblock">
                    <h2 class="text-lg font-semibold text-gray-900 mb-4">Data Timeline</h2>
                    <p class="text-sm text-gray-600 mb-4">
                        This shows all data blocks in this ledger. The new block (height {{ microblockToApprove.getHeight() }}) will be added after the previous ones.
                    </p>
                    <VirtualBlockchainRecordNavigator
                        v-if="accountCrypto"
                        :application-ledger="virtualBlockchainContainingMicroblock"
                        :account-crypto="accountCrypto"
                    />
                </div>

                <!-- Participants & Channels -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6" v-if="virtualBlockchainContainingMicroblock">
                    <!-- Participants -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 class="text-lg font-semibold text-gray-900 mb-4">Participants</h2>
                        <p class="text-xs text-gray-500 mb-4">Organizations involved in this data ledger</p>
                        <div v-if="virtualBlockchainContainingMicroblock.getAllActors().length === 0" class="text-sm text-gray-500 italic">
                            No participants defined
                        </div>
                        <div v-else class="space-y-2">
                            <div
                                v-for="(actor, idx) of virtualBlockchainContainingMicroblock.getAllActors()"
                                :key="idx"
                                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                            >
                                <div class="flex items-center gap-2">
                                    <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold flex-shrink-0">
                                        {{ String(actor.name).charAt(0).toUpperCase() }}
                                    </div>
                                    <span class="text-sm font-medium text-gray-900">{{ actor.name }}</span>
                                </div>
                                <span
                                    class="text-xs px-2 py-1 rounded-full"
                                    :class="
                                        actor.subscribed
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-600'
                                    "
                                >
                                    {{ actor.subscribed ? 'Active' : 'Inactive' }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Channels -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 class="text-lg font-semibold text-gray-900 mb-4">Channels</h2>
                        <p class="text-xs text-gray-500 mb-4">Communication channels in this ledger</p>
                        <div v-if="virtualBlockchainContainingMicroblock.getAllChannels().length === 0" class="text-sm text-gray-500 italic">
                            No channels defined
                        </div>
                        <div v-else class="space-y-2">
                            <div
                                v-for="(channel, idx) of virtualBlockchainContainingMicroblock.getAllChannels()"
                                :key="idx"
                                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                            >
                                <div class="flex items-center gap-2">
                                    <i
                                        class="pi text-lg"
                                        :class="
                                            channel.isPrivate
                                                ? 'pi-lock text-amber-600'
                                                : 'pi-lock-open text-green-600'
                                        "
                                    ></i>
                                    <span class="text-sm font-medium text-gray-900">{{ channel.name }}</span>
                                </div>
                                <span
                                    class="text-xs px-2 py-1 rounded-full"
                                    :class="
                                        channel.isPrivate
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-green-100 text-green-700'
                                    "
                                >
                                    {{ channel.isPrivate ? 'Private' : 'Public' }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Advanced Details (Microblock) - Hidden by default -->
                <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <button
                        @click="showAdvanced = !showAdvanced"
                        class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                        <h2 class="text-lg font-semibold text-gray-900">Technical Details</h2>
                        <i :class="['pi', showAdvanced ? 'pi-chevron-down' : 'pi-chevron-right']" class="text-gray-600"></i>
                    </button>
                    <div v-if="showAdvanced" class="border-t border-gray-200 p-6 bg-gray-50 space-y-4">
                        <p class="text-xs text-gray-600">
                            Advanced information for developers and technical users.
                        </p>

                        <!-- Microblock Info -->
                        <div class="bg-white rounded-lg border border-gray-200 p-4">
                            <h3 class="text-sm font-semibold text-gray-900 mb-3">Data Block (Microblock)</h3>
                            <div class="space-y-2">
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">Height:</span>
                                    <span class="font-mono text-gray-900">{{ microblockToApprove.getHeight() }}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">Hash:</span>
                                    <span class="font-mono text-xs text-gray-700 break-all text-right ml-2">{{ microblockToApprove.getHash().encode() }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Sections -->
                        <div class="bg-white rounded-lg border border-gray-200 p-4">
                            <h3 class="text-sm font-semibold text-gray-900 mb-3">Data Sections ({{ microblockToApprove.getAllSections().length }})</h3>
                            <Accordion>
                                <AccordionPanel
                                    v-for="(section, i) of microblockToApprove.getAllSections()"
                                    :key="i"
                                    :value="String(i)"
                                >
                                    <AccordionHeader>
                                        <div class="flex items-center gap-2 text-sm">
                                            <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-semibold">
                                                {{ i + 1 }}
                                            </span>
                                            <span class="font-medium text-gray-900">
                                                {{ SectionLabel.getSectionLabelFromSection(section) }}
                                            </span>
                                            <span class="ml-auto text-xs text-gray-500 font-mono">type {{ section.type }}</span>
                                        </div>
                                    </AccordionHeader>
                                    <AccordionContent>
                                        <pre class="text-xs font-mono text-gray-700 whitespace-pre-wrap break-all bg-gray-100 rounded p-3 overflow-auto max-h-96">{{ JSON.stringify(section, null, 2) }}</pre>
                                    </AccordionContent>
                                </AccordionPanel>
                            </Accordion>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
