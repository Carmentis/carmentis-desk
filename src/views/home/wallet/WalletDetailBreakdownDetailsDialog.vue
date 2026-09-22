<script setup lang="ts">
import {useRoute} from "vue-router";
import {computed} from "vue";
import {CMTSToken, TokenUnit} from "@cmts-dev/carmentis-sdk-core";
import Dialog from "primevue/dialog";
import Tabs from "primevue/tabs";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import {useAccountStateQuery} from "../../../composables/useAccountBreakdown.ts";

const route = useRoute();
const walletId = computed(() => Number(route.params.walletId));
const isOpen = defineModel<boolean>('isOpen');

const accountStateQuery = useAccountStateQuery(walletId.value);
const accountState = computed(() => accountStateQuery.data.value);
const stakingLocks = computed(() => accountState.value ? accountState.value.stakingLocks : []);
const vestingLocks = computed(() => accountState.value ? accountState.value.vestingLocks : []);
const escrowLocks = computed(() => accountState.value ? accountState.value.escrowLocks : []);

function formatAtomics(amount: number): string {
    return CMTSToken.createAtomic(amount).toString(
        TokenUnit.TOKEN,
        {locale: "system", grouping: true, decimalPlaces: 2}
    );
}

function formatTimestamp(timestamp: number): string {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString();
}

function formatTimestampPlusDays(timestamp: number, days: number): string {
    if (!timestamp) return '-';
    return new Date((timestamp + days * 86400) * 1000).toLocaleString();
}
</script>
<template>
    <Dialog v-model:visible="isOpen" header="Breakdown Details" modal class="w-[95vw] h-[95vh]">
        <Tabs value="staking">
            <TabList>
                <Tab value="staking">Staking ({{ stakingLocks.length }})</Tab>
                <Tab value="vesting">Vesting ({{ vestingLocks.length }})</Tab>
                <Tab value="escrow">Escrow ({{ escrowLocks.length }})</Tab>
            </TabList>
            <TabPanels>
                <!-- Staking locks -->
                <TabPanel value="staking">
                    <DataTable :value="stakingLocks" stripedRows scroll-direction="vertical" scroll-height="400px" class="text-sm">
                        <template #empty>
                            <div class="text-center py-6 text-surface-500">No staking lock.</div>
                        </template>
                        <Column field="amount" header="Amount" sortable>
                            <template #body="{ data }">{{ formatAtomics(data.amount) }}</template>
                        </Column>
                        <Column field="validatorNodeId" header="Validator Node ID">
                            <template #body="{ data }">
                                <span class="font-mono text-xs">{{ data.validatorNodeId }}</span>
                            </template>
                        </Column>
                        <Column field="slashed" header="Slashed" sortable>
                            <template #body="{ data }">
                                <i :class="data.slashed ? 'pi pi-check text-red-500' : 'pi pi-times text-surface-400'"></i>
                            </template>
                        </Column>
                        <Column field="plannedUnlockAmountInAtomics" header="Planned Unlock" sortable>
                            <template #body="{ data }">{{ formatAtomics(data.plannedUnlockAmountInAtomics) }}</template>
                        </Column>
                        <Column field="plannedUnlockTimestamp" header="Unlock Date" sortable>
                            <template #body="{ data }">{{ formatTimestamp(data.plannedUnlockTimestamp) }}</template>
                        </Column>
                    </DataTable>
                </TabPanel>

                <!-- Vesting locks -->
                <TabPanel value="vesting">
                    <DataTable :value="vestingLocks" stripedRows scroll-direction="vertical" scroll-height="400px" class="text-sm">
                        <template #empty>
                            <div class="text-center py-6 text-surface-500">No vesting lock.</div>
                        </template>
                        <Column field="amount" header="Amount" sortable>
                            <template #body="{ data }">{{ formatAtomics(data.amount) }}</template>
                        </Column>
                        <Column field="initialVestedAmountInAtomics" header="Initial Vested" sortable>
                            <template #body="{ data }">{{ formatAtomics(data.initialVestedAmountInAtomics) }}</template>
                        </Column>
                        <Column field="cliffStartTimestamp" header="Cliff Start" sortable>
                            <template #body="{ data }">{{ formatTimestamp(data.cliffStartTimestamp) }}</template>
                        </Column>
                        <Column field="cliffDurationDays" header="Cliff (days)" sortable></Column>
                        <Column field="vestingDurationDays" header="Vesting (days)" sortable></Column>
                        <Column header="Vesting Start">
                            <template #body="{ data }">
                                {{ formatTimestampPlusDays(data.cliffStartTimestamp, data.cliffDurationDays) }}
                            </template>
                        </Column>
                        <Column header="Vesting End">
                            <template #body="{ data }">
                                {{ formatTimestampPlusDays(data.cliffStartTimestamp, data.cliffDurationDays + data.vestingDurationDays) }}
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>

                <!-- Escrow locks -->
                <TabPanel value="escrow">
                    <DataTable :value="escrowLocks" stripedRows scroll-direction="vertical" scroll-height="400px" class="text-sm">
                        <template #empty>
                            <div class="text-center py-6 text-surface-500">No escrow lock.</div>
                        </template>
                        <Column field="amount" header="Amount" sortable>
                            <template #body="{ data }">{{ formatAtomics(data.amount) }}</template>
                        </Column>
                        <Column field="escrowIdentifier" header="Escrow ID">
                            <template #body="{ data }">
                                <span class="font-mono text-xs">{{ data.escrowIdentifier }}</span>
                            </template>
                        </Column>
                        <Column field="fundEmitterAccountId" header="Emitter">
                            <template #body="{ data }">
                                <span class="font-mono text-xs">{{ data.fundEmitterAccountId }}</span>
                            </template>
                        </Column>
                        <Column field="transferAuthorizerAccountId" header="Authorizer">
                            <template #body="{ data }">
                                <span class="font-mono text-xs">{{ data.transferAuthorizerAccountId }}</span>
                            </template>
                        </Column>
                        <Column field="startTimestamp" header="Start" sortable>
                            <template #body="{ data }">{{ formatTimestamp(data.startTimestamp) }}</template>
                        </Column>
                        <Column field="durationDays" header="Duration (days)" sortable></Column>
                        <Column header="Limit Date">
                            <template #body="{ data }">
                                {{ formatTimestampPlusDays(data.startTimestamp, data.durationDays) }}
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>
            </TabPanels>
        </Tabs>
    </Dialog>
</template>
