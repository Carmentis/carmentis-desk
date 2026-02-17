<script setup lang="ts">
import {computed} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import {useStorageStore} from '../../stores/storage.ts';
import {useConfirm} from 'primevue/useconfirm';
import {useIsOperatorInitialized} from "../../composables/operator.ts";
import OperatorDetailSetup from "./OperatorDetailSetup.vue";
import {useOperatorAuthStore} from "./operatorAuthStore.ts";
import OperatorDetailLogin from "./OperatorDetailLogin.vue";
import OperatorDetailDashboard from "./OperatorDetailDashboard.vue";

const route = useRoute();
const router = useRouter();
const storageStore = useStorageStore();
const confirm = useConfirm();

const goBack = () => {
  router.push('/');
};

const operatorId = computed(() => Number(route.params.operatorId));
const operator = computed(() =>
  storageStore.operators.find(op => op.id === operatorId.value)
);

const deleteOperator = () => {
  confirm.require({
    message: `Are you sure you want to delete operator "${operator.value?.name}"? This action cannot be undone.`,
    header: 'Delete Operator',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    acceptClass: 'p-button-danger',
    accept: async () => {
      await storageStore.deleteOperatorById(operatorId.value);
      await router.push('/');
    }
  });
};

const isInitializedQuery = useIsOperatorInitialized(operatorId.value)
const { isAuthenticatedToOperator } = useOperatorAuthStore();
const authenticated = computed(() => isAuthenticatedToOperator(operatorId.value));
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-4">
        <Button icon="pi pi-arrow-left" text rounded @click="goBack" />
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{{ operator?.name }}</h1>
          <p class="text-sm text-gray-500 mt-1">Operator Details</p>
        </div>
      </div>
      <Button label="Delete Operator" icon="pi pi-trash" severity="danger" outlined @click="deleteOperator" />
    </div>

    <!-- Operator Info Card -->
    <Card>
      <template #title>
        <div class="flex items-center gap-3">
          <i class="pi pi-server text-2xl text-primary-500"></i>
          <span>Operator Information</span>
        </div>
      </template>
      <template #content>
        <div class="space-y-4">
          <div>
            <label class="text-sm font-semibold text-gray-700 block mb-2">Name</label>
            <p class="text-gray-900">{{ operator?.name }}</p>
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-700 block mb-2">HTTP Endpoint</label>
            <p class="text-gray-900 font-mono text-sm">{{ operator?.httpEndpoint }}</p>
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-700 block mb-2">ID</label>
            <p class="text-gray-900 font-mono">{{ operator?.id }}</p>
          </div>
        </div>
      </template>
    </Card>



    <OperatorDetailSetup v-if="isInitializedQuery.data.value === false"/>
    <div v-if="isInitializedQuery.data.value === true">
      <OperatorDetailLogin v-if="!authenticated"/>
      <OperatorDetailDashboard v-else/>
    </div>

    <!-- Not Found State -->
    <div v-if="!operator" class="text-center py-12">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
        <i class="pi pi-exclamation-triangle text-3xl text-gray-400"></i>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">Operator not found</h3>
      <p class="text-gray-500 mb-6">The operator you're looking for doesn't exist.</p>
      <Button label="Go Back" icon="pi pi-arrow-left" @click="goBack" />
    </div>
  </div>
</template>
