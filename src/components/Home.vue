<script setup lang="ts">
import { useStorageStore } from '../stores/storage.ts';
import { storeToRefs } from 'pinia';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import router from '../router';
import { computed, ref } from 'vue';

const store = useStorageStore();
await store.initStorage();

const { organizations, operators } = storeToRefs(store);
const searchQuery = ref('');

const filteredOrganizations = computed(() => {
    if (!searchQuery.value.trim()) return organizations.value;
    const query = searchQuery.value.toLowerCase();
    return organizations.value.filter((org) => org.name.toLowerCase().includes(query));
});

const filteredOperators = computed(() => {
    if (!searchQuery.value.trim()) return operators.value;
    const query = searchQuery.value.toLowerCase();
    return operators.value.filter((op) => op.name.toLowerCase().includes(query));
});

function visitWallet(orgId: number) {
    router.push(`/wallet/${orgId}`);
}

function visitOperator(operatorId: number) {
    router.push(`/operator/${operatorId}`);
}
</script>

<template>
    <div class="space-y-6">
        <!-- Search -->
        <div class="flex items-center justify-between">
            <p class="text-sm text-gray-500">Manage your wallets and operators</p>
            <InputText v-model="searchQuery" placeholder="Search..." size="small" class="w-64" />
        </div>

        <!-- Empty State -->
        <div v-if="organizations.length === 0 && operators.length === 0" class="text-center py-12">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <i class="pi pi-wallet text-3xl text-gray-400"></i>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No information to display</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Wallets Grid -->
            <Card
                v-for="org in filteredOrganizations"
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
                                WALLET
                            </span>
                        </div>
                        <div class="space-y-2.5 text-sm border-t border-surface-100 pt-4">
                            <div class="flex items-center gap-2.5 text-surface-600">
                                <i class="pi pi-server text-surface-400 text-xs"></i>
                                <span class="truncate text-xs">{{ org.nodeEndpoint }}</span>
                            </div>
                            <div class="flex items-center gap-2.5 text-surface-600">
                                <i class="pi pi-building text-surface-400 text-xs"></i>
                                <span class="text-xs">{{ org.organizations?.length || 0 }} organizations</span>
                            </div>
                        </div>
                        <div class="pt-2 flex items-center justify-between text-surface-500 hover:text-primary-600 transition-colors text-sm font-medium">
                            <span>View details</span>
                            <i class="pi pi-arrow-right text-xs"></i>
                        </div>
                    </div>
                </template>
            </Card>

            <!-- Operators Grid -->
            <Card
                v-for="operator in filteredOperators"
                :key="operator.id"
                class="border-0 shadow-sm hover:shadow-xl transition-all cursor-pointer bg-surface-0"
                @click="visitOperator(operator.id)"
            >
                <template #content>
                    <div class="p-2 space-y-4">
                        <div class="flex items-start justify-between">
                            <div class="flex items-center gap-3">
                                <div
                                    class="w-12 h-12 rounded-xl bg-gradient-to-br bg-gray-100 from-surface-100 to-surface-50 flex items-center justify-center"
                                >
                                    <i class="pi pi-server text-2xl text-surface-600"></i>
                                </div>
                                <div>
                                    <h3 class="text-base font-semibold text-surface-900 truncate">
                                        {{ operator.name }}
                                    </h3>
                                    <span class="text-xs text-surface-400 font-mono">ID: {{ operator.id }}</span>
                                </div>
                            </div>
                            <span class="px-2 py-1 text-xs font-semibold text-green-600 bg-green-100 rounded-md">
                                OPERATOR
                            </span>
                        </div>
                        <div class="space-y-2.5 text-sm border-t border-surface-100 pt-4">
                            <div class="flex items-center gap-2.5 text-surface-600">
                                <i class="pi pi-globe text-surface-400 text-xs"></i>
                                <span class="truncate text-xs">{{ operator.httpEndpoint }}</span>
                            </div>
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
