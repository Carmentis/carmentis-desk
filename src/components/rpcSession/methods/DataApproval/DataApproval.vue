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
import Dropdown from "primevue/dropdown";
import FieldNameAndDescription from "../../../utils/FieldNameAndDescription.vue";
import {match} from "ts-pattern";

interface ApplicationDescription {
    name: string;
    logoUrl: string;
    homepageUrl: string;
    description: string;
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
            const actorCrypto = localAccountCrypto.deriveActorFromVbSeed(genesisSeed);

            const signatureSchemeId = wallet.schemeId;
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
        const genesisSeed = await virtualBlockchainContainingMicroblock.value.getGenesisSeed();
        const actorCrypto = accountCrypto.value.deriveActorFromVbSeed(genesisSeed.toBytes());
        const actorPrivateSignatureKey = await actorCrypto.getPrivateSignatureKey(SignatureSchemeId.SECP256K1);

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

        const sigResponse = approvalSignatureResponse as any;
        const hexEncoder = EncoderFactory.bytesToHexEncoder();
        const vbId = hexEncoder.encode(b64Encoder.decode(sigResponse.b64VbHash));
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
    <div class="min-h-screen bg-surface-50 flex flex-col">
        <!-- Top bar -->
        <div
            class="bg-white border-b border-surface-200 px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0"
        >
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <i class="pi pi-file-check text-primary"></i>
                </div>
                <div class="min-w-0">
                    <h1 class="text-sm font-semibold text-surface-800">Event Approval Request</h1>
                    <div class="flex items-center gap-3 mt-0.5">
                        <span class="text-xs text-surface-500 font-mono truncate">
                            Operator: {{ params.serverUrl }}
                        </span>
                        <span class="text-surface-300">·</span>
                        <span class="text-xs text-surface-400 font-mono truncate">
                            Anchor Request ID:{{ params.anchorRequestId }}
                        </span>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
                <span
                    class="hidden sm:inline-flex text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700"
                >
                    Pending
                </span>
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
            <Card>
                <template #content>
                    <FieldNameAndDescription name="Wallet Selection" description="Select a wallet first to initiate the data approval"/>
                    <Dropdown
                        id="walletSelect"
                        v-model="chosenWallet"
                        :options="wallets"
                        optionLabel="name"
                        placeholder="Choose a wallet for auth"
                        class="w-full"
                    >
                        <template #value="slotProps">
                            <div v-if="slotProps.value" class="flex items-center gap-2">
                                <i class="pi pi-wallet text-surface-500"></i>
                                <span>{{ slotProps.value.name }}</span>
                            </div>
                            <span v-else class="text-surface-500">
                                        {{ slotProps.placeholder }}
                                    </span>
                        </template>
                        <template #option="slotProps">
                            <div class="flex items-center gap-2">
                                <i class="pi pi-wallet text-surface-500"></i>
                                <div>
                                    <div class="font-semibold">{{ slotProps.option.name }}</div>
                                    <div class="text-xs text-surface-500">
                                        {{ slotProps.option.nodeEndpoint }}
                                    </div>
                                </div>
                            </div>
                        </template>
                    </Dropdown>
                </template>
            </Card>

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
                            <p class="text-xs mt-1 text-red-600 font-mono break-all">
                                {{ loadError }}
                            </p>
                        </div>
                    </div>
                </template>
            </Card>

            <!-- Main content -->
            <!-- Wallet selector -->

            <div v-else-if="microblockToApprove" class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <!-- Left column: wallet + microblock sections -->
                <div class="flex flex-col gap-4">


                    <!-- Microblock card -->
                    <Card>
                        <template #content>
                            <div class="flex flex-col gap-4">
                                <!-- Microblock metadata -->
                                <div>
                                    <p class="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-3">
                                        Microblock
                                    </p>
                                    <div class="grid grid-cols-2 gap-2">
                                        <div class="bg-surface-50 rounded-lg p-3">
                                            <p class="text-xs text-surface-400 mb-1">Height</p>
                                            <p class="text-sm font-bold text-surface-800">
                                                {{ microblockToApprove.getHeight() }}
                                            </p>
                                        </div>
                                        <div class="bg-surface-50 rounded-lg p-3 col-span-2">
                                            <p class="text-xs text-surface-400 mb-1">Hash</p>
                                            <p class="text-xs font-mono text-surface-600 break-all">
                                                {{ microblockToApprove.getHash().encode() }}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <Divider class="my-0" />

                                <!-- Sections accordion -->
                                <div>
                                    <p class="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-3">
                                        Sections
                                        <span
                                            class="ml-2 text-xs font-normal bg-surface-100 text-surface-600 px-1.5 py-0.5 rounded-full"
                                        >
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
                                                    <span
                                                        class="w-5 h-5 rounded-full bg-primary-50 text-primary text-xs flex items-center justify-center font-semibold flex-shrink-0"
                                                    >
                                                        {{ i + 1 }}
                                                    </span>
                                                    <span class="text-sm font-medium text-surface-700">
                                                        {{ SectionLabel.getSectionLabelFromSection(section) }}
                                                    </span>
                                                    <span class="ml-auto text-xs text-surface-400 font-mono mr-2">
                                                        type {{ section.type }}
                                                    </span>
                                                </div>
                                            </AccordionHeader>
                                            <AccordionContent>
                                                <pre
                                                    class="text-xs font-mono text-surface-600 whitespace-pre-wrap break-all bg-surface-50 rounded-lg p-3"
                                                    >{{ JSON.stringify(section, null, 2) }}</pre
                                                >
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
                    <!-- Application description card -->
                    <Card v-if="applicationDescription">
                        <template #content>
                            <div class="flex items-start gap-4">
                                <img
                                    v-if="applicationDescription.logoUrl"
                                    :src="applicationDescription.logoUrl"
                                    :alt="applicationDescription.name"
                                    class="w-12 h-12 rounded-xl object-contain flex-shrink-0 border border-surface-100 p-1"
                                />
                                <div
                                    v-else
                                    class="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0"
                                >
                                    <i class="pi pi-box text-primary text-lg"></i>
                                </div>
                                <div class="min-w-0">
                                    <h3 class="text-sm font-semibold text-surface-800">
                                        {{ applicationDescription.name }}
                                    </h3>
                                    <a
                                        v-if="applicationDescription.homepageUrl"
                                        :href="applicationDescription.homepageUrl"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="text-xs text-primary hover:underline truncate block mt-0.5"
                                    >
                                        {{ applicationDescription.homepageUrl }}
                                    </a>
                                </div>
                            </div>
                            <p
                                v-if="applicationDescription.description"
                                class="text-xs text-surface-600 mt-3 leading-relaxed"
                            >
                                {{ applicationDescription.description }}
                            </p>
                            <div class="mt-3 bg-surface-50 rounded-lg p-2">
                                <p class="text-xs text-surface-400 mb-1">Application ID</p>
                                <p class="text-xs font-mono text-surface-600 break-all">
                                    {{ virtualBlockchainContainingMicroblock.getApplicationId().encode() }}
                                </p>
                            </div>
                        </template>
                    </Card>

                    <!-- VB identity card -->
                    <Card>
                        <template #content>
                            <p class="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-3">
                                Virtual Blockchain
                            </p>
                            <div class="bg-surface-50 rounded-lg p-3 mb-4">
                                <p class="text-xs text-surface-400 mb-1">Identifier</p>
                                <p class="text-xs font-mono text-surface-600 break-all">
                                    {{ virtualBlockchainContainingMicroblock.getId() }}
                                </p>
                            </div>

                            <!-- Actors -->
                            <div class="mb-4">
                                <div class="flex items-center gap-2 mb-2">
                                    <i class="pi pi-users text-surface-400 text-xs"></i>
                                    <p class="text-xs font-semibold text-surface-600">
                                        Actors
                                        <span
                                            class="ml-1.5 text-xs font-normal bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded-full"
                                        >
                                            {{ virtualBlockchainContainingMicroblock.getAllActors().length }}
                                        </span>
                                    </p>
                                </div>
                                <div
                                    v-if="virtualBlockchainContainingMicroblock.getAllActors().length === 0"
                                    class="text-xs text-surface-400 italic pl-2"
                                >
                                    No actors defined
                                </div>
                                <div v-else class="flex flex-col gap-1.5">
                                    <div
                                        v-for="(actor, idx) of virtualBlockchainContainingMicroblock.getAllActors()"
                                        :key="idx"
                                        class="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg border border-surface-100"
                                    >
                                        <div class="flex items-center gap-2">
                                            <div
                                                class="w-6 h-6 rounded-full bg-primary-100 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0"
                                            >
                                                {{ String(actor.name).charAt(0).toUpperCase() }}
                                            </div>
                                            <span class="text-sm font-medium text-surface-700">
                                                {{ actor.name }}
                                            </span>
                                        </div>
                                        <span
                                            class="text-xs px-2 py-0.5 rounded-full"
                                            :class="
                                                actor.subscribed
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-surface-100 text-surface-500'
                                            "
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
                                        <span
                                            class="ml-1.5 text-xs font-normal bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded-full"
                                        >
                                            {{ virtualBlockchainContainingMicroblock.getAllChannels().length }}
                                        </span>
                                    </p>
                                </div>
                                <div
                                    v-if="virtualBlockchainContainingMicroblock.getAllChannels().length === 0"
                                    class="text-xs text-surface-400 italic pl-2"
                                >
                                    No channels defined
                                </div>
                                <div v-else class="flex flex-col gap-1.5">
                                    <div
                                        v-for="(channel, idx) of virtualBlockchainContainingMicroblock.getAllChannels()"
                                        :key="idx"
                                        class="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg border border-surface-100"
                                    >
                                        <div class="flex items-center gap-2">
                                            <i
                                                class="pi text-sm"
                                                :class="
                                                    channel.isPrivate
                                                        ? 'pi-lock text-amber-500'
                                                        : 'pi-lock-open text-green-500'
                                                "
                                            ></i>
                                            <span class="text-sm font-medium text-surface-700">
                                                {{ channel.name }}
                                            </span>
                                        </div>
                                        <span
                                            class="text-xs px-2 py-0.5 rounded-full"
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
                        </template>
                    </Card>

                    <!-- Record navigator card -->
                    <Card>
                        <template #content>
                            <p class="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-3">History</p>
                            <VirtualBlockchainRecordNavigator
                                v-if="accountCrypto && virtualBlockchainContainingMicroblock"
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
