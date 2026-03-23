<template>
    <div class="mt-8">
        <h3 class="text-xl font-semibold text-gray-800 mb-6">Proof Data Visualization</h3>

        <div class="relative">
            <!-- Timeline line -->
            <div class="absolute left-6 top-0 bottom-0 w-0.5 bg-blue-200"></div>

            <div class="space-y-8">
                <div
                    v-for="(record, index) in records"
                    :key="index"
                    class="relative pl-16"
                >
                    <!-- Timeline dot -->
                    <div
                        class="absolute left-4 top-0 transform -translate-x-1/2 w-5 h-5 rounded-full bg-blue-500 border-4 border-blue-100 z-10"
                    ></div>

                    <!-- Content card -->
                    <div
                        class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-md"
                    >
                        <div class="p-6">
                            <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                <span
                                    class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm font-semibold"
                                >
                                    {{ index + 1 }}
                                </span>
                                Block {{ record.height }}
                            </h4>
                            <BlockViewer :data="record.data" :initial-path="[]" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { type ImportedProof } from '@cmts-dev/carmentis-sdk/client'
import BlockViewer from './BlockViewer.vue'

defineProps<{
    records: ImportedProof[]
}>()
</script>
