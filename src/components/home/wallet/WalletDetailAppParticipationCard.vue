<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ApplicationParticipation } from '../../../stores/storage.ts';
import { Hash, ProviderFactory } from '@cmts-dev/carmentis-sdk-core';

const props = defineProps<{
    participation: ApplicationParticipation;
    nodeEndpoint: string;
    walletId: number;
}>();

const router = useRouter();

interface AppDescription {
    name: string;
    logoUrl: string;
    homepageUrl: string;
    description: string;
}

const appDescription = ref<AppDescription | null>(null);
const isLoading = ref(true);

onMounted(async () => {
    try {
        const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(props.nodeEndpoint);
        const appVb = await provider.loadApplicationVirtualBlockchain(Hash.fromHex(props.participation.id));
        appDescription.value = (await appVb.getApplicationDescription()) as AppDescription;
    } catch (e) {
        console.warn('Could not load application description for', props.participation.id, e);
    } finally {
        isLoading.value = false;
    }
});
</script>

<template>
    <div
        class="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer transition-all hover:border-blue-300 hover:shadow-sm hover:bg-blue-50/30 flex flex-col gap-4"
        @click="router.push(`/wallet/${walletId}/participation/${participation.id}`)"
    >
        <!-- App identity -->
        <div class="flex items-start gap-3">
            <!-- Logo/Icon -->
            <div v-if="isLoading" class="w-10 h-10 rounded-lg bg-gray-200 flex-shrink-0 animate-pulse" />
            <img
                v-else-if="appDescription?.logoUrl"
                :src="appDescription.logoUrl"
                :alt="appDescription.name"
                class="w-10 h-10 rounded-lg object-contain border border-gray-200 p-1 flex-shrink-0"
            />
            <div v-else class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <i class="pi pi-box text-blue-600 text-sm" />
            </div>

            <!-- Name and URL -->
            <div class="min-w-0 flex-1">
                <div v-if="isLoading" class="space-y-1">
                    <div class="h-4 bg-gray-200 rounded animate-pulse" />
                    <div class="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                </div>
                <div v-else>
                    <p class="text-sm font-semibold text-gray-900 truncate">
                        {{ appDescription?.name ?? 'Unknown Application' }}
                    </p>
                    <a
                        v-if="appDescription?.homepageUrl"
                        :href="appDescription.homepageUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-xs text-blue-600 hover:underline truncate block"
                    >
                        {{ appDescription.homepageUrl }}
                    </a>
                </div>
            </div>
        </div>

        <!-- App ID -->
        <div class="bg-gray-50 rounded-lg px-3 py-2">
            <p class="text-xs text-gray-500 mb-0.5">Application ID</p>
            <p class="text-xs font-mono text-gray-600 truncate">
                {{ participation.id }}
            </p>
        </div>

        <!-- Ledger summary footer -->
        <div class="flex items-center justify-between pt-2 border-t border-gray-100">
            <div class="flex items-center gap-2">
                <i class="pi pi-database text-gray-400 text-sm" />
                <span class="text-sm text-gray-700">
                    <span class="font-semibold">{{ participation.appLedgers.length }}</span>
                    <span class="text-gray-500">
                        validated ledger{{ participation.appLedgers.length !== 1 ? 's' : '' }}
                    </span>
                </span>
            </div>
            <i class="pi pi-chevron-right text-gray-300 text-sm" />
        </div>
    </div>
</template>
