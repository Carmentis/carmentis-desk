<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  data: any;
  initialPath?: (string | number)[];
}>();

const path = ref<(string | number)[]>(props.initialPath || []);

/*
const currentData = computed(() => {
  return path.value.reduce((acc, key) => acc?.[key], props.data);
});

const isExpandable = (value: any): boolean => {
  return value !== null && typeof value === 'object';
};

const getValueType = (value: any): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

const navigateToKey = (key: string | number) => {
  path.value = [...path.value, key];
};

const navigateUp = () => {
  if (path.value.length > 0) {
    path.value = path.value.slice(0, -1);
  }
};

const resetPath = () => {
  path.value = [];
};

<template>
  <div class="json-viewer flex flex-col gap-2">
    <!-- Breadcrumb navigation -->
    <div v-if="path.length > 0" class="flex items-center gap-2 text-sm text-gray-600">
      <button
        @click="resetPath"
        class="px-2 py-1 hover:bg-gray-100 rounded"
      >
        root
      </button>
      <template v-for="(segment, index) in path" :key="index">
        <span>/</span>
        <button
          @click="path = path.slice(0, index + 1)"
          class="px-2 py-1 hover:bg-gray-100 rounded"
        >
          {{ segment }}
        </button>
      </template>
      <button
        v-if="path.length > 0"
        @click="navigateUp"
        class="ml-auto px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs"
      >
        ↑ Back
      </button>
    </div>

    <!-- JSON content -->
    <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-auto max-h-96">
      <div v-if="currentData === null" class="text-gray-500 italic">null</div>
      <div v-else-if="typeof currentData === 'string'" class="text-green-700">"{{ currentData }}"</div>
      <div v-else-if="typeof currentData === 'number'" class="text-blue-700">{{ currentData }}</div>
      <div v-else-if="typeof currentData === 'boolean'" class="text-purple-700">{{ currentData }}</div>
      <div v-else-if="Array.isArray(currentData)" class="flex flex-col gap-1">
        <div class="text-gray-500 mb-2">Array ({{ currentData.length }} items)</div>
        <div
          v-for="(item, index) in currentData"
          :key="index"
          class="flex items-start gap-2 pl-4 border-l-2 border-gray-300"
        >
          <span class="text-gray-600 font-mono text-sm">[{{ index }}]:</span>
          <button
            v-if="isExpandable(item)"
            @click="navigateToKey(index)"
            class="px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-sm"
          >
            {{ getValueType(item) }} →
          </button>
          <span v-else class="text-sm">{{ JSON.stringify(item) }}</span>
        </div>
      </div>
      <div v-else-if="typeof currentData === 'object'" class="flex flex-col gap-1">
        <div class="text-gray-500 mb-2">Object ({{ Object.keys(currentData).length }} keys)</div>
        <div
          v-for="[key, value] in Object.entries(currentData)"
          :key="key"
          class="flex items-start gap-2 pl-4 border-l-2 border-gray-300"
        >
          <span class="text-gray-600 font-mono text-sm">{{ key }}:</span>
          <button
            v-if="isExpandable(value)"
            @click="navigateToKey(key)"
            class="px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-sm"
          >
            {{ getValueType(value) }} →
          </button>
          <span v-else class="text-sm">{{ JSON.stringify(value) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.json-viewer {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
 */
</script>

<template>
  {{JSON.stringify(data, null, 2)}}
</template>