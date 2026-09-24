<script setup lang="ts">
import { storeToRefs } from 'pinia';
import Card from 'primevue/card';
import router from '../../router';
import {useAppStore} from "../../stores/appStore.ts";
import { capitalize } from 'vue';

const store = useAppStore();

const { wallets } = storeToRefs(store);


function visitWallet(orgId: number) {
    router.push(`/wallet/${orgId}`);
}
</script>

<template>
    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <p class="text-sm text-gray-500">Manage your wallets</p>
            </div>

        <!-- Empty State -->
        <div v-if="wallets.length === 0" class="text-center py-12">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <i class="pi pi-wallet text-3xl text-gray-400"></i>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No information to display</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Wallets Grid -->
            <Card
                v-for="org in wallets"
                :key="org.id"
                class="border-0 shadow-sm hover:shadow-xl transition-all cursor-pointer bg-surface-0"
                @click="visitWallet(org.id)"
            >
                <template #content>
                    <div class="p-2 space-y-4">
                        <div class="flex items-start justify-between">
                            <div class="flex items-center gap-3">
                                <div
                                    class="w-12 h-12 rounded-xl bg-gradient-to-br bg-gray-100 from-surface-100 to-surface-50 flex items-center justify-center"
                                >
                                    <i class="pi pi-wallet text-2xl text-surface-600"></i>
                                </div>
                                <div>
                                    <h3 class="text-base font-semibold text-surface-900 truncate">{{ org.name }}</h3>
                                    <span class="text-xs text-surface-400 font-mono">ID: {{ org.id }}</span>
                                </div>
                            </div>
                            <span class="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded-md">
                                {{ capitalize(org.network.networkName)  }}
                            </span>
                        </div>
                        <div class="pt-2 flex items-center justify-between text-surface-500 hover:text-primary-600 transition-colors text-sm font-medium">
                            <span>View details</span>
                            <i class="pi pi-arrow-right text-xs"></i>
                        </div>
                    </div>
                </template>
            </Card>
        </div>
    </div>
</template>
