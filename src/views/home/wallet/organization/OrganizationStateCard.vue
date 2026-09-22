<script setup lang="ts">
import Card from "primevue/card";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import OrganizationNodes from "./OrganizationNodes.vue";
import TabPanel from "primevue/tabpanel";
import Tab from "primevue/tab";
import OrganizationCustomData from "./OrganizationCustomData.vue";
import TabPanels from "primevue/tabpanels";
import OrganizationApplications from "./OrganizationApplications.vue";
import {useToast} from "primevue/usetoast";
import {useRoute, useRouter} from "vue-router";
import {useOnChainStore} from "../../../../stores/onchain.ts";
import {storeToRefs} from "pinia";
import {computed} from "vue";
import {useAsyncState} from "@vueuse/core";
import * as walletRepo from "../../../../db/repositories/walletRepository.ts";
import * as orgRepo from "../../../../db/repositories/organizationRepository.ts";
import {useQuery} from "@tanstack/vue-query";
import OrganizationCertificate from "./OrganizationCertificate.vue";
import { useStorage } from '@vueuse/core'

const route = useRoute();

const orgId = computed(() => Number(route.params.orgId));

const { data: organization } = useQuery({
    queryKey: ['organization', orgId.value],
    queryFn: () => orgRepo.getOrganizationById(orgId.value),
})

const activeTab = useStorage('activeOrganizationTab', '0', sessionStorage)
const isOrganizationFoundOnChain = defineModel<boolean>('isOrganizationFoundOnChain');
</script>
<template>
    <Card>
        <template #title>
            <div class="flex items-center gap-2">
                <i class="pi pi-info-circle text-xl"></i>
                <span>Organization State</span>
            </div>
        </template>
        <template #subtitle>
            On-chain status of this organization and its associated nodes and applications.
        </template>
        <template #content>
            <div v-if="organization && organization.vbId">
                <label class="block text-sm font-medium text-gray-700 mb-2">Virtual Blockchain ID</label>
                <code class="bg-gray-100 px-3 py-2 rounded text-sm block">
                    {{ organization.vbId }}
                </code>

                <div
                    v-if="isOrganizationFoundOnChain === true"
                    class="mt-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg"
                >
                    <i class="pi pi-check-circle text-green-600"></i>
                    <span class="text-sm text-green-800">Organization confirmed on-chain</span>
                </div>
                <div
                    v-else-if="isOrganizationFoundOnChain === false"
                    class="mt-4 flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg"
                >
                    <i class="pi pi-exclamation-triangle text-amber-600 mt-0.5"></i>
                    <span class="text-sm text-amber-800">
                                    Organization not found on-chain. This may be due to network transaction processing
                                    delays.
                                </span>
                </div>
                <div
                    v-else
                    class="mt-4 flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg"
                >
                    <i class="pi pi-spin pi-spinner text-blue-600"></i>
                    <span class="text-sm text-blue-800">Checking on-chain status...</span>
                </div>
            </div>
            <div v-else class="text-center py-4">
                <i class="pi pi-exclamation-circle text-3xl text-amber-500 mb-2"></i>
                <p class="text-gray-600 text-sm">
                    Publish first your organization on-chain to show information.
                </p>
            </div>

            <!-- Nodes, Applications & Custom Data Tabs -->
            <div class="mt-6">
                <Tabs v-model:value="activeTab">
                    <TabList>
                        <Tab value="0">Nodes</Tab>
                        <Tab value="1">Applications</Tab>
                        <Tab value="2">Certificate</Tab>
                        <Tab value="3">Custom Data</Tab>
                    </TabList>
                    <TabPanels>
                        <TabPanel value="0">
                            <OrganizationNodes v-model:is-organization-found-on-chain="isOrganizationFoundOnChain"/>
                        </TabPanel>

                        <TabPanel value="1">
                            <OrganizationApplications
                                v-model:is-organization-found-on-chain="isOrganizationFoundOnChain"/>
                        </TabPanel>
                        <TabPanel value="2">
                            <OrganizationCertificate
                                v-model:is-organization-found-on-chain="isOrganizationFoundOnChain"/>
                        </TabPanel>
                        <TabPanel value="3">
                            <OrganizationCustomData
                                v-model:is-organization-found-on-chain="isOrganizationFoundOnChain"/>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </div>
        </template>
    </Card>

</template>