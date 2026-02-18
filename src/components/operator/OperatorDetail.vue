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
const operatorAuthStore = useOperatorAuthStore();
const { isAuthenticatedToOperator } = operatorAuthStore;
const authenticated = computed(() => isAuthenticatedToOperator(operatorId.value));

const disconnectFromOperator = () => {
  confirm.require({
    message: 'Are you sure you want to disconnect from this operator?',
    header: 'Disconnect',
    icon: 'pi pi-sign-out',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Disconnect',
    acceptClass: 'p-button-secondary',
    accept: () => {
      operatorAuthStore.disconnectFromOperator(operatorId.value);
    }
  });
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header with Back Button -->
    <div class="flex items-center gap-4 mb-4">
      <Button icon="pi pi-arrow-left" text rounded @click="goBack" />
      <div>
        <h1 class="text-3xl font-bold text-gray-900">{{ operator?.name }}</h1>
        <p class="text-sm text-gray-500 mt-1">Operator Management</p>
      </div>
    </div>

    <!-- Operator Info Bar -->
    <Card class="operator-info-card">
      <template #content>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-6 flex-1">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <i class="pi pi-server text-xl text-primary-500"></i>
              </div>
              <div>
                <p class="text-xs text-surface-500 uppercase font-semibold">Operator</p>
                <p class="text-base font-semibold text-surface-900">{{ operator?.name }}</p>
              </div>
            </div>

            <div class="h-8 w-px bg-surface-200"></div>

            <div>
              <p class="text-xs text-surface-500 uppercase font-semibold">Endpoint</p>
              <p class="text-sm font-mono text-surface-700">{{ operator?.httpEndpoint }}</p>
            </div>

            <div class="h-8 w-px bg-surface-200"></div>

            <div>
              <p class="text-xs text-surface-500 uppercase font-semibold">ID</p>
              <p class="text-sm font-mono text-surface-700">{{ operator?.id }}</p>
            </div>
          </div>

          <div class="flex gap-2">
            <Button
              v-if="authenticated"
              label="Disconnect"
              icon="pi pi-sign-out"
              severity="secondary"
              outlined
              size="small"
              @click="disconnectFromOperator"
            />
            <Button
              label="Delete"
              icon="pi pi-trash"
              severity="danger"
              outlined
              size="small"
              @click="deleteOperator"
            />
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

<style scoped>
:deep(.operator-info-card .p-card-body) {
  padding: 1rem;
}

:deep(.operator-info-card .p-card-content) {
  padding: 0;
}
</style>
