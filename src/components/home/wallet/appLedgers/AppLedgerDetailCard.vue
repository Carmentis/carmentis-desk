<script setup lang="ts">
import { computed } from "vue";
import { AccountCrypto, ApplicationLedgerVb } from '@cmts-dev/carmentis-sdk-core';
import type { AppLedgerParticipation } from '../../../../stores/storage.ts';
import VirtualBlockchainRecordNavigator from '../../../rpcSession/VirtualBlockchainRecordNavigator.vue';
import ExportProofButton from '../../../checker/ExportProofButton.vue';
import { useClipboard } from '../../../../composables/useClipboard.ts';

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

function setActiveTab(tab: string) {
    activeTab.value = tab;
}
</script>

<template>
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between gap-3 px-4 py-4 border-b border-gray-200">
            <!-- VB ID -->
            <div class="flex items-center gap-2 min-w-0">
                <i class="pi pi-box text-blue-500 text-sm flex-shrink-0" />
                <span class="text-xs font-mono text-gray-700 truncate">
                    {{ ledger.id }}
                </span>
                <button
                    class="p-1 hover:bg-gray-100 rounded transition-colors"
                    @click="copyToClipboard(ledger.id, 'VB ID')"
                    title="Copy VB ID"
                >
                    <i class="pi pi-copy text-xs text-gray-500 hover:text-gray-700" />
                </button>
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
                <a
                    class="inline-flex items-center gap-1 px-2 py-1 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors"
                    :href="`https://explorer.testnet.carmentis.io/vb/${ledger.id}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in Carmentis Explorer"
                >
                    <i class="pi pi-external-link text-xs" />
                    <span class="hidden sm:inline text-xs">Explorer</span>
                </a>
                <button
                    class="inline-flex items-center px-2 py-1 text-sm border border-red-300 rounded text-red-600 hover:bg-red-50 transition-colors"
                    @click="emit('delete', ledger.id)"
                    title="Remove this ledger record"
                >
                    <i class="pi pi-trash text-xs" />
                </button>
            </div>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-gray-200">
            <button
                class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
                :class="usedActiveTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-800'"
                @click="setActiveTab('overview')"
            >
                VB Overview
            </button>
            <button
                class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
                :class="usedActiveTab === 'history' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-800'"
                @click="setActiveTab('history')"
            >
                VB History
            </button>
        </div>

        <!-- Content -->
        <div class="p-4">
            <!-- VB Overview Tab -->
            <div v-if="usedActiveTab === 'overview'" class="flex flex-col gap-4">
                <!-- Metadata grid -->
                <div class="grid grid-cols-2 gap-2">
                    <!-- VB ID -->
                    <div class="bg-gray-50 rounded-lg p-3 col-span-2">
                        <div class="flex items-center justify-between mb-1">
                            <p class="text-xs text-gray-500">Virtual Blockchain ID</p>
                            <button
                                class="p-1 hover:bg-gray-200 rounded transition-colors"
                                @click="copyToClipboard(ledger.id, 'VB ID')"
                                title="Copy VB ID"
                            >
                                <i class="pi pi-copy text-xs text-gray-500" />
                            </button>
                        </div>
                        <p class="text-xs font-mono text-gray-700 break-all leading-relaxed">
                            {{ ledger.id }}
                        </p>
                    </div>

                    <!-- Operator URL -->
                    <div v-if="ledger.operatorEndpoint" class="bg-gray-50 rounded-lg p-3 col-span-2">
                        <p class="text-xs text-gray-500 mb-1">Operator URL</p>
                        <p class="text-xs text-gray-700 break-all">
                            {{ ledger.operatorEndpoint }}
                        </p>
                    </div>

                    <!-- Anchoring dates -->
                    <template v-if="firstAndLastMicroblockAnchoringDate">
                        <div class="bg-gray-50 rounded-lg p-3">
                            <p class="text-xs text-gray-500 mb-1">First anchoring</p>
                            <p class="text-xs font-medium text-gray-700">
                                {{ firstAndLastMicroblockAnchoringDate.firstAnchoringDate.toLocaleString() }}
                            </p>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-3">
                            <p class="text-xs text-gray-500 mb-1">Last anchoring</p>
                            <p class="text-xs font-medium text-gray-700">
                                {{ firstAndLastMicroblockAnchoringDate.lastAnchoringDate.toLocaleString() }}
                            </p>
                        </div>
                    </template>
                </div>

                <!-- Actors -->
                <div>
                    <div class="flex items-center gap-2 mb-2">
                        <i class="pi pi-users text-gray-400 text-xs" />
                        <p class="text-xs font-semibold text-gray-700">
                            Actors
                            <span v-if="selectedVb" class="ml-1.5 text-xs font-normal bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                                {{ selectedVb.getAllActors().length }}
                            </span>
                        </p>
                    </div>
                    <div v-if="isLoadingVb" class="flex flex-col gap-1.5">
                        <div class="h-8 bg-gray-200 rounded animate-pulse" />
                        <div class="h-8 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div v-else-if="!selectedVb" class="text-xs text-gray-400 italic pl-2">
                        Loading…
                    </div>
                    <div v-else-if="selectedVb.getAllActors().length === 0" class="text-xs text-gray-400 italic pl-2">
                        No actors defined
                    </div>
                    <div v-else class="flex flex-col gap-1.5">
                        <div v-for="(actor, idx) in selectedVb.getAllActors()" :key="idx" class="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                            <div class="flex items-center gap-2">
                                <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold flex-shrink-0">
                                    {{ String(actor.name).charAt(0).toUpperCase() }}
                                </div>
                                <span class="text-sm font-medium text-gray-800">{{ actor.name }}</span>
                            </div>
                            <span :class="['text-xs px-2 py-0.5 rounded-full', actor.subscribed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600']">
                                {{ actor.subscribed ? 'Subscribed' : 'Unsubscribed' }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Channels -->
                <div>
                    <div class="flex items-center gap-2 mb-2">
                        <i class="pi pi-comments text-gray-400 text-xs" />
                        <p class="text-xs font-semibold text-gray-700">
                            Channels
                            <span v-if="selectedVb" class="ml-1.5 text-xs font-normal bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                                {{ selectedVb.getAllChannels().length }}
                            </span>
                        </p>
                    </div>
                    <div v-if="isLoadingVb" class="flex flex-col gap-1.5">
                        <div class="h-8 bg-gray-200 rounded animate-pulse" />
                        <div class="h-8 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div v-else-if="!selectedVb" class="text-xs text-gray-400 italic pl-2">
                        Loading…
                    </div>
                    <div v-else-if="selectedVb.getAllChannels().length === 0" class="text-xs text-gray-400 italic pl-2">
                        No channels defined
                    </div>
                    <div v-else class="flex flex-col gap-1.5">
                        <div v-for="(channel, idx) in selectedVb.getAllChannels()" :key="idx" class="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                            <div class="flex items-center gap-2">
                                <i :class="['pi text-sm', channel.isPrivate ? 'pi-lock text-amber-500' : 'pi-lock-open text-green-500']" />
                                <span class="text-sm font-medium text-gray-800">{{ channel.name }}</span>
                            </div>
                            <span :class="['text-xs px-2 py-0.5 rounded-full', channel.isPrivate ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700']">
                                {{ channel.isPrivate ? 'Private' : 'Public' }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- VB History Tab -->
            <div v-if="usedActiveTab === 'history'">
                <div v-if="isLoadingVb" class="flex flex-col gap-2">
                    <div class="h-10 bg-gray-200 rounded animate-pulse" />
                    <div class="h-40 bg-gray-200 rounded animate-pulse" />
                </div>
                <div v-else-if="vbError" class="flex items-start gap-2 text-red-700">
                    <i class="pi pi-times-circle mt-0.5 flex-shrink-0" />
                    <span class="text-xs font-mono break-all">{{ vbError }}</span>
                </div>
                <div v-else-if="!selectedVb" class="flex flex-col items-center justify-center py-10 text-gray-400">
                    <i class="pi pi-spin pi-spinner text-2xl mb-2" />
                    <p class="text-sm">Loading virtual blockchain…</p>
                </div>
                <VirtualBlockchainRecordNavigator
                    v-else-if="accountCrypto"
                    :application-ledger="(selectedVb as any)"
                    :account-crypto="(accountCrypto as any)"
                />
            </div>
        </div>
    </div>
</template>
