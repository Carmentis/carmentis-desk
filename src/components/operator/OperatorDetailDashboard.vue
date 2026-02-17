<script setup lang="ts">
import Button from 'primevue/button';
import {useRoute} from "vue-router";
import {computed} from "vue";
import {useOperatorAuthStore} from "./operatorAuthStore.ts";
import OperatorDetailDashboardWalletsList from "./OperatorDetailDashboardWalletsList.vue";
import OperatorDetailDashboardUsersListTable from "./OperatorDetailDashboardUsersListTable.vue";

const route = useRoute();
const operatorId = computed(() => Number(route.params.operatorId));
const {disconnectFromOperator} = useOperatorAuthStore();

function disconnect() {
  disconnectFromOperator(operatorId.value);
}
</script>
<template>
  Operator Dashboard

  <Button @click="disconnect" label="Disconnect"/>

  <div class="space-y-4">
    <OperatorDetailDashboardUsersListTable />
    <OperatorDetailDashboardWalletsList />
  </div>
</template>