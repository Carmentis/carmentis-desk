<script setup lang="ts">
import {useRoute} from "vue-router";
import {computed} from "vue";
import {useGetAllUsers, useGetAllWallets} from "../../composables/operator.ts";

const route = useRoute();
const operatorId = computed(() => Number(route.params.operatorId));
const getAllUsersRequest = useGetAllUsers(operatorId.value);
const getAllWalletsRequest = useGetAllWallets(operatorId.value)

</script>

<template>
  <div v-if="getAllUsersRequest.data.value">
    {{getAllUsersRequest.data.value.length}} users found
  </div>

  <div v-if="getAllWalletsRequest.data.value">
    {{getAllWalletsRequest.data.value.length}} wallets found
  </div>
</template>