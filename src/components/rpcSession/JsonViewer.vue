<script setup lang="ts">
import { ref, computed } from 'vue';
import { useClipboard } from '../../composables/useClipboard.ts';

const props = defineProps<{ data: any }>();

type JsonType = 'string' | 'number' | 'boolean' | 'null' | 'array' | 'object';

interface VisibleNode {
    id: string;
    depth: number;
    displayKey: string;
    value: any;
    type: JsonType;
    isExpandable: boolean;
    childCount: number;
    isTruncation?: boolean;
    truncParentId?: string;
    truncTotal?: number;
    truncShown?: number;
}

const PAGE_SIZE = 50;
const MAX_STRING_LENGTH = 150;

const collapsed = ref(new Set<string>());
const pageLimits = ref(new Map<string, number>());
const { copyToClipboard } = useClipboard();

function getType(v: any): JsonType {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v as JsonType;
}

function limit(id: string, total: number): number {
    return pageLimits.value.get(id) ?? Math.min(PAGE_SIZE, total);
}

function showMore(parentId: string, total: number) {
    const cur = limit(parentId, total);
    const next = Math.min(cur + PAGE_SIZE, total);
    pageLimits.value = new Map(pageLimits.value).set(parentId, next);
}

function toggle(id: string) {
    const s = new Set(collapsed.value);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    collapsed.value = s;
}

function walk(value: any, id: string, depth: number, displayKey: string, out: VisibleNode[]) {
    const type = getType(value);
    const isExpandable = type === 'object' || type === 'array';
    const childCount = isExpandable ? (type === 'array' ? value.length : Object.keys(value).length) : 0;

    out.push({ id, depth, displayKey, value, type, isExpandable, childCount });

    if (!isExpandable || collapsed.value.has(id)) return;

    if (type === 'array') {
        const shown = limit(id, value.length);
        for (let i = 0; i < shown; i++) {
            walk(value[i], `${id}[${i}]`, depth + 1, String(i), out);
        }
        if (shown < value.length) {
            out.push({
                id: `${id}.__trunc__`,
                depth: depth + 1,
                displayKey: '',
                value: null,
                type: 'null',
                isExpandable: false,
                childCount: 0,
                isTruncation: true,
                truncParentId: id,
                truncTotal: value.length,
                truncShown: shown,
            });
        }
    } else {
        for (const [k, v] of Object.entries(value)) {
            walk(v, `${id}.${k}`, depth + 1, k, out);
        }
    }
}

const nodes = computed<VisibleNode[]>(() => {
    if (props.data == null && typeof props.data !== 'boolean' && typeof props.data !== 'number') return [];
    const out: VisibleNode[] = [];
    walk(props.data, 'root', 0, '', out);
    // skip the synthetic root wrapper — show its children directly
    return out.slice(1);
});

// Track expanded long strings
const expandedStrings = ref(new Set<string>());
</script>

<template>
    <div class="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
        <template v-if="nodes.length === 0">
            <span class="block px-4 py-3 text-gray-400 italic text-sm">empty</span>
        </template>

        <div v-else class="font-mono text-xs overflow-auto max-h-96">
            <div
                v-for="node in nodes"
                :key="node.id"
                class="flex items-start py-1 px-4 hover:bg-gray-800 transition-colors group"
                :style="{ paddingLeft: `${node.depth * 16 + 16}px` }"
            >
                <!-- Toggle chevron -->
                <button
                    v-if="node.isExpandable"
                    class="flex-shrink-0 w-4 text-gray-400 hover:text-gray-200 focus:outline-none mr-1"
                    @click="toggle(node.id)"
                >
                    <i
                        :class="collapsed.has(node.id) ? 'pi pi-chevron-right' : 'pi pi-chevron-down'"
                        class="text-[9px]"
                    />
                </button>
                <span v-else class="flex-shrink-0 w-4 mr-1" />

                <!-- Key label -->
                <span v-if="node.displayKey" class="text-blue-400 mr-2 flex-shrink-0">{{ node.displayKey }}</span>
                <span v-if="node.displayKey" class="text-gray-500 mr-1 flex-shrink-0">:</span>

                <!-- Value -->
                <template v-if="node.isExpandable">
                    <span v-if="collapsed.has(node.id)" class="text-gray-400">
                        <span v-if="node.type === 'array'">[<span class="text-gray-300">{{ node.childCount }}</span>]</span>
                        <span v-else>{<span class="text-gray-300">{{ node.childCount }}</span>}</span>
                    </span>
                    <span v-else class="text-gray-400">
                        {{ node.type === 'array' ? '[' : '{' }}
                    </span>
                </template>

                <template v-else-if="node.type === 'string'">
                    <span class="text-green-400 flex items-center gap-1">
                        <span class="break-words whitespace-normal">
                            "{{ node.value.length <= MAX_STRING_LENGTH && !expandedStrings.has(node.id) ? node.value.slice(0, MAX_STRING_LENGTH) : node.value }}"
                        </span>
                        <button
                            v-if="node.value.length > MAX_STRING_LENGTH && !expandedStrings.has(node.id)"
                            class="text-gray-400 hover:text-gray-200 flex-shrink-0 text-[9px] opacity-0 group-hover:opacity-100"
                            @click="expandedStrings.add(node.id)"
                            title="Expand full value"
                        >
                            <i class="pi pi-arrow-right-arrow-left" />
                        </button>
                        <button
                            class="text-gray-400 hover:text-gray-200 flex-shrink-0 text-[9px] opacity-0 group-hover:opacity-100"
                            @click="copyToClipboard(node.value, 'Value copied')"
                            title="Copy value"
                        >
                            <i class="pi pi-copy" />
                        </button>
                    </span>
                </template>

                <span v-else-if="node.type === 'number'" class="text-yellow-300 flex items-center gap-1">
                    {{ node.value }}
                    <button
                        class="text-gray-400 hover:text-gray-200 flex-shrink-0 text-[9px] opacity-0 group-hover:opacity-100"
                        @click="copyToClipboard(String(node.value), 'Value copied')"
                        title="Copy value"
                    >
                        <i class="pi pi-copy" />
                    </button>
                </span>

                <span v-else-if="node.type === 'boolean'" class="text-purple-400">{{ node.value }}</span>
                <span v-else class="text-gray-500 italic">null</span>

                <!-- Truncation / load-more row -->
                <template v-if="node.isTruncation">
                    <button
                        class="text-blue-400 hover:underline text-[9px] ml-2"
                        @click="showMore(node.truncParentId!, node.truncTotal!)"
                    >
                        +{{ node.truncTotal! - node.truncShown! }} more
                    </button>
                </template>
            </div>
        </div>
    </div>
</template>
