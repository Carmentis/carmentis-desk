<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Card from 'primevue/card';
import Skeleton from 'primevue/skeleton';
import { ApplicationParticipation } from '../../stores/storage.ts';
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
    <Card
        class="h-full cursor-pointer transition-shadow hover:shadow-md"
        @click="router.push(`/wallet/${walletId}/participation/${participation.id}`)"
    >
        <template #content>
            <div class="flex flex-col gap-4">
                <!-- App identity -->
                <div class="flex items-start gap-3">
                    <div v-if="isLoading" class="w-10 h-10 rounded-xl bg-surface-100 flex-shrink-0 animate-pulse"></div>
                    <img
                        v-else-if="appDescription?.logoUrl"
                        :src="appDescription.logoUrl"
                        :alt="appDescription.name"
                        class="w-10 h-10 rounded-xl object-contain border border-surface-100 p-1 flex-shrink-0"
                    />
                    <div
                        v-else
                        class="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0"
                    >
                        <i class="pi pi-box text-primary"></i>
                    </div>

                    <div class="min-w-0 flex-1">
                        <div v-if="isLoading">
                            <Skeleton height="1rem" width="60%" class="mb-1" />
                            <Skeleton height="0.75rem" width="80%" />
                        </div>
                        <div v-else>
                            <p class="text-sm font-semibold text-surface-800 truncate">
                                {{ appDescription?.name ?? 'Unknown Application' }}
                            </p>
                            <a
                                v-if="appDescription?.homepageUrl"
                                :href="appDescription.homepageUrl"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-xs text-primary hover:underline truncate block"
                            >
                                {{ appDescription.homepageUrl }}
                            </a>
                        </div>
                    </div>
                </div>

                <!-- App ID -->
                <div class="bg-surface-50 rounded-lg px-3 py-2">
                    <p class="text-xs text-surface-400 mb-0.5">Application ID</p>
                    <p class="text-xs font-mono text-surface-600 truncate">
                        {{ participation.id }}
                    </p>
                </div>

                <!-- Ledger summary -->
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <i class="pi pi-database text-surface-400 text-sm"></i>
                        <span class="text-sm text-surface-600">
                            <span class="font-semibold text-surface-800">
                                {{ participation.appLedgers.length }}
                            </span>
                            validated ledger{{ participation.appLedgers.length !== 1 ? 's' : '' }}
                        </span>
                    </div>
                    <i class="pi pi-chevron-right text-surface-300 text-sm"></i>
                </div>
            </div>
        </template>
    </Card>
</template>
