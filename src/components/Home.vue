<script setup lang="ts">
  import {useStorageStore} from "../stores/storage.ts";
  import {storeToRefs} from "pinia";
  import Button from "primevue/button";
  import router from "../router";

  const store = useStorageStore();
  const {organizations} = storeToRefs(store);


  function visitOrg(orgId: number) {
    router.push(`/wallet/${orgId}`);
  }

  function clearAllOrganizations() {
    store.clearOrganizations();
  }

</script>

<template>
  <div>
    <router-link to="/wallet/new">
      <button>Create an organization</button>
    </router-link>
  </div>

  <div v-for="org in organizations">
      Wallet: {{ org.name }} (ID: {{org.id}})
    <Button @click="visitOrg(org.id)">Visit</Button>
  </div>

  <Button @click="clearAllOrganizations">Clear all organizations</Button>
</template>