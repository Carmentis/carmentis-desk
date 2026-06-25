<script setup lang="ts">
 const props = defineProps<{name: string, description: string, required?: boolean}>();
 const name = props.name;
 const description = props.description;
 const isRequired = props.required ?? false;
</script>

<template>
    <label for="manual-node-name" class="block text-sm font-medium text-gray-700 mb-2" >
        {{name}}
        <span class="text-red-500" v-if="isRequired">*</span>
    </label>
    <label for="manual-node-name" class="block text-sm text-gray-400 font-medium mb-2" v-if="description">
        {{ description }}
    </label>
</template>