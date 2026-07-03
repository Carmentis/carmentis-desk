<script setup lang="ts">
import Card from 'primevue/card';
import {useStorageStore, WalletStub} from '../../../../stores/storage.ts';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import DropdownWalletSelection from '../../../home/wallet/DropdownWalletSelection.vue';
import Dropdown from "primevue/dropdown";
import FieldNameAndDescription from "../../../utils/FieldNameAndDescription.vue";

const store = useStorageStore();
const { wallets } = storeToRefs(store);
const chosenWallet = ref< | null>();
</script>

<template>

</template>
