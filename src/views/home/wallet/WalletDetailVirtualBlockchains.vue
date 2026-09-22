<script lang="ts" setup>

import {useRoute} from "vue-router";
import {computed, ref} from "vue";
import {computedAsync, useAsyncState} from "@vueuse/core";
import * as walletRepo from "../../../db/repositories/walletRepository.ts";
import * as virtualBlockchainRepo from "../../../db/repositories/virtualBlockchainRepository.ts";
import {createIndexerClient} from "../../../api/indexer/client.ts";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Card from "primevue/card";

const route = useRoute();
const walletId = computed(() => Number(route.params.walletId));


const { state: wallet } = useAsyncState(
    () => walletRepo.getWalletById(walletId.value),
    null,
    { immediate: true },
);


const first = ref(0)
const { state: virtualBlockchains, isLoading } = useAsyncState(
    async () => {
        console.log(`Fetching virtual blockchains stored locally and completing with indexer data online: ${wallet.value}`)
        if (!wallet.value) return []
        const vbs = await virtualBlockchainRepo.getVirtualBlockchainsByWalletId(walletId.value);
        console.log(`Found ${vbs.length} virtual blockchains in local storage`)
        const indexer = createIndexerClient(wallet.value?.indexer);
        const res = [];
        for (const vb of vbs) {
            const obtainedVb = await indexer.getVirtualBlockchains({
                vb_id: vb.vbId.toUpperCase(),
            });
            const obtainedVbItems = obtainedVb.items;
            if (obtainedVbItems.length !== 0) {
                res.push({ ...vb, ...obtainedVbItems[0] });
            }
        }
        return res;
    },
    [],
    { immediate: true }
)


</script>
<template>
    <Card>
       <template #content>
           <p class="text-xl ">Virtual Blockchains ({{virtualBlockchains.length}})</p>
           <p class="mb-4 text-gray-500">Below is listed all the virtual blockchains registered inside this wallet.</p>
           <DataTable
               :value="virtualBlockchains"
               stripedRows
               showGridlines
               :rows="10"
               paginator
               :rowsPerPageOptions="[5, 10, 20, 50]"
               responsiveLayout="scroll"
               class="text-sm"
               :loading="isLoading"
               :first="first"
           >
               <Column field="virtualBlockchainId" header="Virtual Blockchain ID" sortable style="min-width: 150px"/>
               <Column field="height" header="Height" sortable />
               <Column field="lastMicroblockHash" header="Last microblock hash" sortable />
               <Column field="publishedByMe" header="Publish by me" sortable />
               <Column field="creationTimestamp" header="Created At" sortable>
                   <template #body="slotProps">
                       {{ new Date(slotProps.data.creationTimestamp).toLocaleString() }}
                   </template>
               </Column>

               <Column field="expirationTimestamp" header="Expire At" sortable>
                   <template #body="slotProps">
                       <div v-if="slotProps.data.expirationTimestamp">
                           {{ new Date(slotProps.data.expirationTimestamp).toLocaleString() }}
                       </div>
                       <div v-else>-</div>
                   </template>
               </Column>
           </DataTable>
       </template>
    </Card>
</template>