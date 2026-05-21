<script setup lang="ts">
import { ref, computed } from 'vue';

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
const MAX_STRING_LENGTH = 200;

const collapsed = ref(new Set<string>());
const pageLimits = ref(new Map<string, number>());

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
    <div class="font-mono text-xs rounded-lg shadow border-surface-200 overflow-auto bg-surface-50">
        <template v-if="nodes.length === 0">
            <span class="block px-3 py-2 text-surface-400 italic">empty</span>
        </template>

        <div
            v-for="node in nodes"
            :key="node.id"
            class="flex items-start leading-6 hover:bg-surface-100 transition-colors"
            :style="{
                paddingLeft: `${node.depth * 14 + 10}px`,
                paddingRight: '10px',
            }"
        >
            <!-- Truncation / load-more row -->
            <template v-if="node.isTruncation">
                <button
                    class="text-primary hover:underline py-0.5 text-xs"
                    @click="showMore(node.truncParentId!, node.truncTotal!)"
                >
                    {{ node.truncTotal! - node.truncShown! }} more items — click to load
                </button>
            </template>

            <!-- Normal node -->
            <template v-else>
                <!-- Toggle chevron -->
                <button
                    v-if="node.isExpandable"
                    class="flex-shrink-0 w-4 mr-0.5 text-surface-400 hover:text-surface-700 focus:outline-none"
                    @click="toggle(node.id)"
                >
                    <i
                        :class="collapsed.has(node.id) ? 'pi pi-chevron-right' : 'pi pi-chevron-down'"
                        class="text-[10px]"
                    ></i>
                </button>
                <span v-else class="flex-shrink-0 w-4 mr-0.5"></span>

                <!-- Key label -->
                <span v-if="node.displayKey" class="text-surface-500 mr-1 flex-shrink-0">{{ node.displayKey }}:</span>

                <!-- Value -->
                <template v-if="node.isExpandable">
                    <span v-if="collapsed.has(node.id)" class="text-surface-400">
                        <span v-if="node.type === 'array'">
                            [
                            <span class="text-primary">
                                {{ node.childCount }}
                            </span>
                            ]
                        </span>
                        <span v-else>
                            {
                            <span class="text-primary">
                                {{ node.childCount }}
                            </span>
                            }
                        </span>
                    </span>
                    <span v-else class="text-surface-400">
                        {{ node.type === 'array' ? '[' : '{' }}
                    </span>
                </template>

                <template v-else-if="node.type === 'string'">
                    <span
                        v-if="node.value.length <= MAX_STRING_LENGTH || expandedStrings.has(node.id)"
                        class="text-emerald-700 break-all"
                    >
                        "{{ node.value }}"
                    </span>
                    <span v-else class="text-emerald-700">
                        "{{ node.value.slice(0, MAX_STRING_LENGTH) }}"
                        <button
                            class="ml-1 text-primary hover:underline text-[10px]"
                            @click="expandedStrings.add(node.id)"
                        >
                            +{{ node.value.length - MAX_STRING_LENGTH }} chars
                        </button>
                    </span>
                </template>

                <span v-else-if="node.type === 'number'" class="text-blue-600">
                    {{ node.value }}
                </span>
                <span v-else-if="node.type === 'boolean'" class="text-violet-600">
                    {{ node.value }}
                </span>
                <span v-else class="text-surface-400 italic">null</span>
            </template>
        </div>
    </div>
</template>
