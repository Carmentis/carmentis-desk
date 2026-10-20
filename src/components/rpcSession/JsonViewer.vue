<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {useClipboard} from '../../composables/useClipboard.ts';

const props = withDefaults(defineProps<{
    /** Any JSON-serializable value. */
    data: unknown;
    /** @deprecated Ignored: the viewer follows the application theme. */
    theme?: 'dark' | 'light';
    /** Levels expanded on first display (0 = fully collapsed, Infinity = everything). */
    expandDepth?: number;
    /** Maximum height of the viewer (any CSS length), content scrolls beyond it. `none` disables it. */
    maxHeight?: string;
    /** Strings longer than this are truncated with a "show more" link. */
    maxStringLength?: number;
    /** Number of children rendered at once in large arrays/objects. */
    pageSize?: number;
    /** Show the toolbar (expand all, collapse all, copy). */
    toolbar?: boolean;
    /** Show a copy button on hover for each value. */
    copyable?: boolean;
    /** Show array indexes in front of array items. */
    showIndexes?: boolean;
}>(), {
    theme: 'dark',
    expandDepth: 2,
    maxHeight: '24rem',
    maxStringLength: 120,
    pageSize: 50,
    toolbar: true,
    copyable: true,
    showIndexes: true,
});

type JsonType = 'string' | 'number' | 'boolean' | 'null' | 'array' | 'object';

interface Row {
    id: string;
    kind: 'node' | 'close' | 'more';
    depth: number;
    key: string | null;
    type: JsonType;
    value: unknown;
    childCount: number;
    comma: boolean;
    parentId?: string;
    remaining?: number;
}

const {copyToClipboard} = useClipboard();

const collapsed = ref(new Set<string>());
const fullStrings = ref(new Set<string>());
const pageLimits = ref(new Map<string, number>());

function typeOf(v: unknown): JsonType {
    if (v === null || v === undefined) return 'null';
    if (Array.isArray(v)) return 'array';
    if (typeof v === 'object') return 'object';
    if (typeof v === 'number') return 'number';
    if (typeof v === 'boolean') return 'boolean';
    return 'string'; // string, bigint, symbol, ...
}

const isContainer = (t: JsonType) => t === 'array' || t === 'object';
const entriesOf = (v: unknown, t: JsonType): [string, unknown][] =>
    t === 'array' ? (v as unknown[]).map((x, i) => [String(i), x]) : Object.entries(v as object);

/** Ids of every non-empty container below `depth >= from`, used to compute the default collapsed state. */
function collectContainers(value: unknown, id: string, depth: number, out: {id: string; depth: number}[]) {
    const t = typeOf(value);
    if (!isContainer(t)) return;
    const entries = entriesOf(value, t);
    if (entries.length === 0) return;
    out.push({id, depth});
    for (const [k, v] of entries) collectContainers(v, `${id}/${encodeURIComponent(k)}`, depth + 1, out);
}

const containers = computed(() => {
    const out: {id: string; depth: number}[] = [];
    collectContainers(props.data, 'root', 0, out);
    return out;
});

function resetCollapsed() {
    collapsed.value = new Set(containers.value.filter(c => c.depth >= props.expandDepth).map(c => c.id));
    pageLimits.value = new Map();
    fullStrings.value = new Set();
}

watch(() => [props.data, props.expandDepth], resetCollapsed, {immediate: true});

const expandAll = () => (collapsed.value = new Set());
const collapseAll = () => (collapsed.value = new Set(containers.value.map(c => c.id)));

function toggle(id: string) {
    const s = new Set(collapsed.value);
    s.has(id) ? s.delete(id) : s.add(id);
    collapsed.value = s;
}

function toggleString(id: string) {
    const s = new Set(fullStrings.value);
    s.has(id) ? s.delete(id) : s.add(id);
    fullStrings.value = s;
}

function showMore(parentId: string, total: number) {
    const current = pageLimits.value.get(parentId) ?? props.pageSize;
    pageLimits.value = new Map(pageLimits.value).set(parentId, Math.min(current + props.pageSize, total));
}

function walk(value: unknown, id: string, depth: number, key: string | null, comma: boolean, out: Row[]) {
    const type = typeOf(value);
    const entries = isContainer(type) ? entriesOf(value, type) : [];
    out.push({id, kind: 'node', depth, key, type, value, childCount: entries.length, comma});

    if (entries.length === 0 || collapsed.value.has(id)) return;

    const shown = Math.min(pageLimits.value.get(id) ?? props.pageSize, entries.length);
    entries.slice(0, shown).forEach(([k, v], i) => {
        const last = i === entries.length - 1;
        walk(v, `${id}/${encodeURIComponent(k)}`, depth + 1, type === 'array' ? (props.showIndexes ? k : null) : k, !last, out);
    });
    if (shown < entries.length) {
        out.push({
            id: `${id}/__more__`, kind: 'more', depth: depth + 1, key: null, type: 'null', value: null,
            childCount: entries.length, comma: false, parentId: id, remaining: entries.length - shown,
        });
    }
    out.push({id: `${id}/__close__`, kind: 'close', depth, key: null, type, value: null, childCount: 0, comma});
}

const rows = computed(() => {
    const out: Row[] = [];
    walk(props.data, 'root', 0, null, false, out);
    return out;
});

const open = (t: JsonType) => (t === 'array' ? '[' : '{');
const close = (t: JsonType) => (t === 'array' ? ']' : '}');

/** One-line summary shown when a container is collapsed, e.g. `{ name, age, … }` or `[3 items]`. */
function preview(row: Row): string {
    if (row.type === 'array') return `${row.childCount} ${row.childCount === 1 ? 'item' : 'items'}`;
    const keys = Object.keys(row.value as object);
    const head = keys.slice(0, 4).join(', ');
    return keys.length > 4 ? `${head}, …` : head;
}

function displayString(row: Row): string {
    const s = String(row.value);
    return s.length > props.maxStringLength && !fullStrings.value.has(row.id)
        ? s.slice(0, props.maxStringLength)
        : s;
}
const isTruncated = (row: Row) => row.type === 'string' && String(row.value).length > props.maxStringLength;

function copyValue(row: Row) {
    const text = row.type === 'string' ? String(row.value) : JSON.stringify(row.value, null, 2);
    copyToClipboard(text, 'Value');
}
const copyAll = () => copyToClipboard(JSON.stringify(props.data, null, 2), 'JSON');
</script>

<template>
    <div class="jv">
        <div v-if="toolbar && containers.length > 0" class="jv__toolbar">
            <button type="button" title="Expand all" @click="expandAll"><i class="pi pi-plus-circle" /> Expand</button>
            <button type="button" title="Collapse all" @click="collapseAll"><i class="pi pi-minus-circle" /> Collapse</button>
            <button type="button" title="Copy JSON" class="jv__toolbar-end" @click="copyAll"><i class="pi pi-copy" /> Copy</button>
        </div>

        <div class="jv__body" :style="{maxHeight: maxHeight === 'none' ? undefined : maxHeight}">
            <div
                v-for="row in rows"
                :key="row.id"
                class="jv__row"
                :class="{'jv__row--clickable': row.kind === 'node' && row.childCount > 0}"
                :style="{paddingLeft: `${row.depth * 16 + 4}px`}"
                :tabindex="row.kind === 'node' && row.childCount > 0 ? 0 : undefined"
                :role="row.kind === 'node' && row.childCount > 0 ? 'button' : undefined"
                :aria-expanded="row.kind === 'node' && row.childCount > 0 ? !collapsed.has(row.id) : undefined"
                @click="row.kind === 'node' && row.childCount > 0 && toggle(row.id)"
                @keydown.enter.self.prevent="row.kind === 'node' && row.childCount > 0 && toggle(row.id)"
                @keydown.space.self.prevent="row.kind === 'node' && row.childCount > 0 && toggle(row.id)"
            >
                <!-- "N more" row -->
                <template v-if="row.kind === 'more'">
                    <span class="jv__gutter" />
                    <button type="button" class="jv__link" @click.stop="showMore(row.parentId!, row.childCount)">
                        Show {{ Math.min(row.remaining!, pageSize) }} more ({{ row.remaining }} hidden)
                    </button>
                </template>

                <!-- closing bracket -->
                <template v-else-if="row.kind === 'close'">
                    <span class="jv__gutter" />
                    <span class="jv__punct">{{ close(row.type) }}{{ row.comma ? ',' : '' }}</span>
                </template>

                <!-- key / value -->
                <template v-else>
                    <span class="jv__gutter">
                        <i
                            v-if="row.childCount > 0"
                            class="pi"
                            :class="collapsed.has(row.id) ? 'pi-chevron-right' : 'pi-chevron-down'"
                        />
                    </span>

                    <span v-if="row.key !== null" class="jv__key">{{ row.key }}</span>
                    <span v-if="row.key !== null" class="jv__punct jv__colon">:</span>

                    <!-- containers -->
                    <template v-if="row.type === 'array' || row.type === 'object'">
                        <span v-if="row.childCount === 0" class="jv__punct">{{ open(row.type) }}{{ close(row.type) }}{{ row.comma ? ',' : '' }}</span>
                        <template v-else-if="collapsed.has(row.id)">
                            <span class="jv__punct">{{ open(row.type) }}</span>
                            <span class="jv__preview">{{ preview(row) }}</span>
                            <span class="jv__punct">{{ close(row.type) }}{{ row.comma ? ',' : '' }}</span>
                        </template>
                        <template v-else>
                            <span class="jv__punct">{{ open(row.type) }}</span>
                            <span class="jv__count">{{ row.childCount }}</span>
                        </template>
                    </template>

                    <!-- primitives -->
                    <template v-else>
                        <span class="jv__value" :class="`jv__value--${row.type}`">
                            <template v-if="row.type === 'string'">"{{ displayString(row) }}<template v-if="isTruncated(row) && !fullStrings.has(row.id)">…</template>"</template>
                            <template v-else>{{ row.type === 'null' ? 'null' : String(row.value) }}</template>
                        </span>
                        <span v-if="row.comma" class="jv__punct">,</span>
                        <button
                            v-if="isTruncated(row)"
                            type="button"
                            class="jv__link"
                            @click.stop="toggleString(row.id)"
                        >{{ fullStrings.has(row.id) ? 'show less' : 'show more' }}</button>
                    </template>

                    <button
                        v-if="copyable"
                        type="button"
                        class="jv__copy"
                        title="Copy value"
                        aria-label="Copy value"
                        @click.stop="copyValue(row)"
                    ><i class="pi pi-copy" /></button>
                </template>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Syntax colors come from the semantic tokens, so the viewer follows the light and dark themes. */
.jv {
    --jv-bg: var(--surface-muted);
    --jv-border: var(--line);
    --jv-hover: var(--surface);
    --jv-key: var(--info);
    --jv-string: var(--success);
    --jv-number: var(--warning);
    --jv-boolean: var(--accent);
    --jv-null: var(--fg-muted);
    --jv-punct: var(--fg-muted);
    --jv-muted: var(--fg-muted);
    --jv-link: var(--info);
    border: 1px solid var(--jv-border);
    background: var(--jv-bg);
    border-radius: var(--radius-control);
    overflow: hidden;
    font-size: 0.75rem;
}
.jv__toolbar {
    display: flex;
    gap: 0.25rem;
    padding: 0 0.25rem;
    border-bottom: 1px solid var(--jv-border);
    color: var(--jv-punct);
}
.jv__toolbar button {
    min-height: 2.75rem;
    padding: 0 0.75rem;
    border-radius: 0.25rem;
    color: inherit;
}
.jv__toolbar button:hover { background: var(--jv-hover); }
.jv__toolbar-end { margin-left: auto; }
.jv__body {
    overflow: auto;
    padding: 0.25rem 0;
    font-family: var(--font-mono), monospace;
    line-height: 1.5;
}
.jv__row {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
    padding-right: 0.5rem;
    min-width: max-content;
}
.jv__row:hover { background: var(--jv-hover); }
.jv__row--clickable { cursor: pointer; }
.jv__gutter {
    flex: none;
    width: 1rem;
    text-align: center;
    color: var(--jv-muted);
    font-size: 0.6rem;
}
.jv__key { color: var(--jv-key); }
.jv__colon { margin-right: 0.125rem; }
.jv__punct { color: var(--jv-punct); }
.jv__preview { color: var(--jv-muted); font-style: italic; margin: 0 0.25rem; }
.jv__count {
    color: var(--jv-muted);
    font-size: 0.65rem;
    margin-left: 0.25rem;
}
.jv__value { white-space: pre-wrap; word-break: break-all; }
.jv__value--string { color: var(--jv-string); }
.jv__value--number { color: var(--jv-number); }
.jv__value--boolean { color: var(--jv-boolean); }
.jv__value--null { color: var(--jv-null); font-style: italic; }
.jv__link {
    color: var(--jv-link);
    margin-left: 0.5rem;
    font-size: 0.65rem;
    white-space: nowrap;
}
.jv__link:hover { text-decoration: underline; }
.jv__copy {
    margin-left: 0.5rem;
    color: var(--jv-muted);
    font-size: 0.65rem;
    opacity: 0;
    transition: opacity 0.1s;
}
.jv__row:hover .jv__copy,
.jv__copy:focus-visible { opacity: 1; }
.jv__copy:hover { color: var(--jv-link); }
/* No hover on touch screens: keep the copy button visible. */
@media (hover: none) {
    .jv__copy { opacity: 0.7; }
}
</style>
