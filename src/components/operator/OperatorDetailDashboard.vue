<script setup lang="ts">
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import OperatorDetailDashboardWalletsList from "./OperatorDetailDashboardWalletsList.vue";
import OperatorDetailDashboardUsersListTable from "./OperatorDetailDashboardUsersListTable.vue";
import OperatorDetailDashboardApplicationsList from "./OperatorDetailDashboardApplicationsList.vue";
import OperatorDetailDashboardApiKeysList from "./OperatorDetailDashboardApiKeysList.vue";


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

