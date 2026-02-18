<script setup lang="ts">

import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';

import OperatorDetailDashboardWalletsList from "./OperatorDetailDashboardWalletsList.vue";
import OperatorDetailDashboardUsersListTable from "./OperatorDetailDashboardUsersListTable.vue";
import OperatorDetailDashboardApplicationsList from "./OperatorDetailDashboardApplicationsList.vue";
import OperatorDetailDashboardApiKeysList from "./OperatorDetailDashboardApiKeysList.vue";


</script>
<template>
  <div class="space-y-6">
    <!-- Dashboard Content with Tabs -->
    <Tabs value="users">
      <TabList>

        <Tab value="users">
          <div class="flex items-center gap-2">
            <i class="pi pi-users"></i>
            <span>Users</span>
          </div>
        </Tab>

        <Tab value="wallets">
          <div class="flex items-center gap-2">
            <i class="pi pi-wallet"></i>
            <span>Wallets</span>
          </div>
        </Tab>

        <Tab value="applications">
          <div class="flex items-center gap-2">
            <i class="pi pi-box"></i>
            <span>Applications</span>
          </div>
        </Tab>

        <Tab value="keys">
          <div class="flex items-center gap-2">
            <i class="pi pi-key"></i>
            <span>API Keys</span>
          </div>
        </Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="users">
          <OperatorDetailDashboardUsersListTable />
        </TabPanel>

        <TabPanel value="wallets">
          <OperatorDetailDashboardWalletsList />
        </TabPanel>

        <TabPanel value="applications">
          <OperatorDetailDashboardApplicationsList />
        </TabPanel>

        <TabPanel value="keys">
          <OperatorDetailDashboardApiKeysList />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

