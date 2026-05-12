<template>
    <div class="p-6 space-y-6">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-3xl font-bold text-gray-900 mb-2">
                    Proof Checker
                </h1>
                <p class="text-gray-600">
                    Verify the authenticity of your proof documents
                </p>
            </div>
            <Button
                icon="pi pi-home"
                label="Home"
                outlined
                @click="router.push('/')"
            />
        </div>

        <!-- Node endpoint selector -->
        <Card>
            <template #content>
                <div class="flex flex-col gap-3">
                    <label class="text-sm font-medium text-surface-700">
                        Node endpoint used for verification
                    </label>
                    <div class="flex gap-2 flex-wrap">
                        <button
                            v-for="wallet in wallets"
                            :key="wallet.id"
                            :class="[
                                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                                nodeEndpoint === wallet.nodeEndpoint
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-surface-50 text-surface-700 border-surface-200 hover:border-primary hover:text-primary',
                            ]"
                            @click="nodeEndpoint = wallet.nodeEndpoint"
                        >
                            <i class="pi pi-wallet mr-1"></i>
                            {{ wallet.name }}
                        </button>
                    </div>
                    <InputText
                        v-model="nodeEndpoint"
                        placeholder="https://node.carmentis.io"
                        class="w-full font-mono text-sm"
                    />
                </div>
            </template>
        </Card>

        <!-- Proof upload / viewer -->
        <div v-if="proof && nodeEndpoint" class="space-y-6">
            <ProofViewer
                :proof="proof"
                :node-endpoint="nodeEndpoint"
                @reset="proof = undefined"
            />
        </div>
        <div
            v-else-if="!nodeEndpoint"
            class="text-center py-8 text-surface-500"
        >
            <i class="pi pi-server text-3xl mb-3 block text-surface-300"></i>
            Please enter or select a node endpoint above before uploading a
            proof.
        </div>
        <div v-else>
            <ProofCheckerUpload @upload="onUpload" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ProofDocument } from '@cmts-dev/carmentis-sdk/client';
import Card from 'primevue/card';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { useRouter } from 'vue-router';
import { useStorageStore } from '../../stores/storage';

const router = useRouter();
import ProofCheckerUpload from './ProofCheckerUpload.vue';
import ProofViewer from './ProofViewer.vue';

const store = useStorageStore();
const wallets = computed(() => store.organizations);

const nodeEndpoint = ref(store.organizations[0]?.nodeEndpoint ?? '');
const proof = ref<ProofDocument | undefined>();

const onUpload = (uploadedProof: ProofDocument) => {
    proof.value = uploadedProof;
};
</script>
