<script setup lang="ts">
import Button from 'primevue/button';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import {useRoute} from "vue-router";
import {computed} from "vue";
import OperatorDetailDashboardWalletsList from "./OperatorDetailDashboardWalletsList.vue";
import OperatorDetailDashboardUsersListTable from "./OperatorDetailDashboardUsersListTable.vue";
import OperatorDetailDashboardApplicationsList from "./OperatorDetailDashboardApplicationsList.vue";
import OperatorDetailDashboardApiKeysList from "./OperatorDetailDashboardApiKeysList.vue";

const route = useRoute();
const operatorId = computed(() => Number(route.params.operatorId));
</script>
<template>
  <div class="space-y-6">
    <!-- Dashboard Content with Tabs -->
    <TabView class="dashboard-tabs">
      <TabPanel>
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-users"></i>
            <span>Users</span>
          </div>
        </template>
        <OperatorDetailDashboardUsersListTable />
      </TabPanel>

      <TabPanel>
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-wallet"></i>
            <span>Wallets</span>
          </div>
        </template>
        <OperatorDetailDashboardWalletsList />
      </TabPanel>

      <TabPanel>
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-box"></i>
            <span>Applications</span>
          </div>
        </template>
        <OperatorDetailDashboardApplicationsList />
      </TabPanel>

      <TabPanel>
        <template #header>
          <div class="flex items-center gap-2">
            <i class="pi pi-key"></i>
            <span>API Keys</span>
          </div>
        </template>
        <OperatorDetailDashboardApiKeysList />
      </TabPanel>
    </TabView>
  </div>
</template>

<style scoped>
:deep(.dashboard-tabs .p-tabview-nav) {
  background: var(--surface-0);
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  padding: 0.25rem;
}

:deep(.dashboard-tabs .p-tabview-nav-link) {
  border: none;
  border-radius: 6px;
  transition: all 0.2s;
}

:deep(.dashboard-tabs .p-tabview-nav-link:not(.p-highlight):hover) {
  background: var(--surface-100);
}

:deep(.dashboard-tabs .p-tabview-panels) {
  padding: 1.5rem 0 0 0;
  background: transparent;
}
</style>