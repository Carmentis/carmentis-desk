<script setup lang="ts">
import Card from 'primevue/card';
import Button from 'primevue/button';
import Skeleton from 'primevue/skeleton';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import { AccountCrypto, ApplicationLedgerVb } from '@cmts-dev/carmentis-sdk-core';
import type { AppLedgerParticipation } from '../../../../stores/storage.ts';
import VirtualBlockchainRecordNavigator from '../../../rpcSession/VirtualBlockchainRecordNavigator.vue';
import ExportProofButton from '../../../checker/ExportProofButton.vue';
import { useClipboard } from '../../../../composables/useClipboard.ts';
import {computed} from "vue";

defineProps<{
    ledger: AppLedgerParticipation;
    selectedVb: ApplicationLedgerVb | null;
    isLoadingVb: boolean;
    vbError: string | null;
    accountCrypto: AccountCrypto | null;
    walletName: string;
    firstAndLastMicroblockAnchoringDate?: { firstAnchoringDate: Date; lastAnchoringDate: Date } | null | undefined;
}>();

const emit = defineEmits<{ (e: 'delete', vbId: string): void }>();

const activeTab = defineModel<string>('activeTab');
const usedActiveTab = computed(() => activeTab.value || 'overview');

const { copyToClipboard } = useClipboard();
</script>

<template>
    <Card>
        <template #header>
            <div class="flex items-center justify-between gap-3 px-4 pt-4 pb-0">
                <!-- VB ID -->
                <div class="flex items-center gap-2 min-w-0">
                    <i class="pi pi-box text-primary-400 text-sm flex-shrink-0"></i>
                    <span class="text-xs font-mono text-surface-700 truncate">
                        {{ ledger.id }}
                    </span>
                    <Button
                        icon="pi pi-copy"
                        size="small"
                        text
                        rounded
                        @click="copyToClipboard(ledger.id, 'VB ID')"
                        v-tooltip="'Copy VB ID'"
                    />
                </div>
                <!-- Action buttons -->
                <div class="flex items-center gap-1 flex-shrink-0">
                    <ExportProofButton
                        v-if="accountCrypto"
                        :vb="selectedVb"
                        :account-crypto="accountCrypto"
                        :ledger-id="ledger.id"
                        :author="walletName"
                        size="small"
                    />
                    <Button
                        icon="pi pi-external-link"
                        label="Explorer"
                        size="small"
                        outlined
                        as="a"
                        :href="`https://explorer.testnet.carmentis.io/vb/${ledger.id}`"
                        target="_blank"
                        rel="noopener noreferrer"
                        v-tooltip="'Open in Carmentis Explorer'"
                    />
                    <Button
                        icon="pi pi-trash"
                        size="small"
                        severity="danger"
                        outlined
                        @click="emit('delete', ledger.id)"
                        v-tooltip="'Remove this ledger record'"
                    />
                </div>
            </div>
        </template>
        <template #content>
            <Tabs v-model:value="usedActiveTab">
                <TabList>
                    <Tab value="overview">VB Overview</Tab>
                    <Tab value="history">VB History</Tab>
                </TabList>
                <TabPanels>
                    <!-- VB Overview -->
                    <TabPanel value="overview">
                        <div class="flex flex-col gap-4">
                            <!-- Metadata grid -->
                            <div class="grid grid-cols-2 gap-2">
                                <!-- VB ID -->
                                <div class="bg-surface-50 rounded-lg p-3 col-span-2">
                                    <div class="flex items-center justify-between mb-1">
                                        <p class="text-xs text-surface-400">Virtual Blockchain ID</p>
                                        <Button
                                            icon="pi pi-copy"
                                            size="small"
                                            text
                                            rounded
                                            class="-mt-0.5 -mr-1.5"
                                            @click="copyToClipboard(ledger.id, 'VB ID')"
                                            v-tooltip="'Copy VB ID'"
                                        />
                                    </div>
                                    <p class="text-xs font-mono text-surface-700 break-all leading-relaxed">
                                        {{ ledger.id }}
                                    </p>
                                </div>

                                <!-- Operator URL -->
                                <div
                                    v-if="ledger.operatorEndpoint"
                                    class="bg-surface-50 rounded-lg p-3 col-span-2"
                                >
                                    <p class="text-xs text-surface-400 mb-1">Operator URL</p>
                                    <p class="text-xs text-surface-700 break-all">
                                        {{ ledger.operatorEndpoint }}
                                    </p>
                                </div>

                                <!-- Anchoring dates -->
                                <template v-if="firstAndLastMicroblockAnchoringDate">
                                    <div class="bg-surface-50 rounded-lg p-3">
                                        <p class="text-xs text-surface-400 mb-1">First anchoring</p>
                                        <p class="text-xs font-medium text-surface-700">
                                            {{ firstAndLastMicroblockAnchoringDate.firstAnchoringDate.toLocaleString() }}
                                        </p>
                                    </div>
                                    <div class="bg-surface-50 rounded-lg p-3">
                                        <p class="text-xs text-surface-400 mb-1">Last anchoring</p>
                                        <p class="text-xs font-medium text-surface-700">
                                            {{ firstAndLastMicroblockAnchoringDate.lastAnchoringDate.toLocaleString() }}
                                        </p>
                                    </div>
                                </template>
                            </div>

                            <!-- Actors -->
                            <div>
                                <div class="flex items-center gap-2 mb-2">
                                    <i class="pi pi-users text-surface-400 text-xs"></i>
                                    <p class="text-xs font-semibold text-surface-600">
                                        Actors
                                        <span
                                            v-if="selectedVb"
                                            class="ml-1.5 text-xs font-normal bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded-full"
                                        >
                                            {{ selectedVb.getAllActors().length }}
                                        </span>
                                    </p>
                                </div>
                                <div v-if="isLoadingVb" class="flex flex-col gap-1.5">
                                    <Skeleton height="2rem" />
                                    <Skeleton height="2rem" />
                                </div>
                                <div v-else-if="!selectedVb" class="text-xs text-surface-400 italic pl-2">
                                    Loading…
                                </div>
                                <div
                                    v-else-if="selectedVb.getAllActors().length === 0"
                                    class="text-xs text-surface-400 italic pl-2"
                                >
                                    No actors defined
                                </div>
                                <div v-else class="flex flex-col gap-1.5">
                                    <div
                                        v-for="(actor, idx) in selectedVb.getAllActors()"
                                        :key="idx"
                                        class="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg border border-surface-100"
                                    >
                                        <div class="flex items-center gap-2">
                                            <div
                                                class="w-6 h-6 rounded-full bg-primary-100 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0"
                                            >
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
                                        <span
                                            v-if="selectedVb"
                                            class="ml-1.5 text-xs font-normal bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded-full"
                                        >
                                            {{ selectedVb.getAllChannels().length }}
                                        </span>
                                    </p>
                                </div>
                                <div v-if="isLoadingVb" class="flex flex-col gap-1.5">
                                    <Skeleton height="2rem" />
                                    <Skeleton height="2rem" />
                                </div>
                                <div v-else-if="!selectedVb" class="text-xs text-surface-400 italic pl-2">
                                    Loading…
                                </div>
                                <div
                                    v-else-if="selectedVb.getAllChannels().length === 0"
                                    class="text-xs text-surface-400 italic pl-2"
                                >
                                    No channels defined
                                </div>
                                <div v-else class="flex flex-col gap-1.5">
                                    <div
                                        v-for="(channel, idx) in selectedVb.getAllChannels()"
                                        :key="idx"
                                        class="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg border border-surface-100"
                                    >
                                        <div class="flex items-center gap-2">
                                            <i
                                                class="pi text-sm"
                                                :class="channel.isPrivate ? 'pi-lock text-amber-500' : 'pi-lock-open text-green-500'"
                                            ></i>
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
                        </div>
                    </TabPanel>

                    <!-- VB History -->
                    <TabPanel value="history">
                        <div class="pt-1">
                            <div v-if="isLoadingVb" class="flex flex-col gap-2">
                                <Skeleton height="2.5rem" />
                                <Skeleton height="10rem" />
                            </div>
                            <div v-else-if="vbError" class="flex items-start gap-2 text-red-700">
                                <i class="pi pi-times-circle mt-0.5 flex-shrink-0"></i>
                                <span class="text-xs font-mono break-all">{{ vbError }}</span>
                            </div>
                            <div
                                v-else-if="!selectedVb"
                                class="flex flex-col items-center justify-center py-10 text-surface-400"
                            >
                                <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
                                <p class="text-sm">Loading virtual blockchain…</p>
                            </div>
                            <VirtualBlockchainRecordNavigator
                                v-else-if="accountCrypto"
                                :application-ledger="(selectedVb as any)"
                                :account-crypto="(accountCrypto as any)"
                            />
                        </div>
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </template>
    </Card>
</template>
