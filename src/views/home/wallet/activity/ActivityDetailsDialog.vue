<script setup lang="ts">
import {computed, ref} from 'vue';
import {useRouter} from 'vue-router';
import Button from 'primevue/button';
import {useVModel} from '@vueuse/core';
import type {ReadActivity} from '../../../../types/activity.ts';
import {detailsOf, presenterOf, unknownActivityPresenter} from './activityPresenters.ts';
import ResponsiveDialog from '../../../../components/ui/ResponsiveDialog.vue';
import ConfirmActionDialog from '../../../../components/ui/ConfirmActionDialog.vue';
import CopyableValue from '../../../../components/ui/CopyableValue.vue';
import JsonBlock from '../../../../components/ui/JsonBlock.vue';
import StatusBadge from '../../../../components/ui/StatusBadge.vue';

const props = defineProps<{
    visible: boolean;
    activity: ReadActivity | null;
    walletId: number;
    isDeleting: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
    (e: 'delete', activity: ReadActivity): void;
}>();

const open = useVModel(props, 'visible', emit);
const router = useRouter();

const event = computed(() => props.activity?.event ?? null);
const presenter = computed(() => event.value ? presenterOf(event.value) : unknownActivityPresenter);
const details = computed(() => event.value ? detailsOf(event.value) : []);
const target = computed(() =>
    event.value ? presenter.value.route?.(event.value as never, props.walletId) : undefined,
);

const showConfirm = ref(false);

function goToTarget() {
    if (!target.value) return;
    open.value = false;
    void router.push(target.value);
}

function confirmDelete() {
    if (props.activity) emit('delete', props.activity);
    showConfirm.value = false;
}
</script>

<template>
    <ResponsiveDialog
        v-model:visible="open"
        :header="event?.title ?? 'Unknown activity'"
        :closable="!props.isDeleting"
    >
        <div v-if="props.activity" class="space-y-4">
            <StatusBadge :tone="presenter.tone" :icon="presenter.icon" :label="presenter.label" />

            <p v-if="event?.description" class="text-sm text-fg-muted">{{ event.description }}</p>
            <p v-else-if="!event" class="text-sm text-fg-muted">
                This activity was recorded by another version of Desk and cannot be displayed.
            </p>

            <dl class="space-y-3 text-sm">
                <div class="flex items-baseline justify-between gap-4">
                    <dt class="text-fg-muted">When</dt>
                    <dd class="text-right text-fg">
                        <time :datetime="props.activity.date.toISOString()">
                            {{ props.activity.date.toLocaleString(undefined, {dateStyle: 'full', timeStyle: 'medium'}) }}
                        </time>
                    </dd>
                </div>
                <div v-for="detail in details.filter((d) => !d.json)" :key="detail.label" :class="detail.copyable ? '' : 'flex items-baseline justify-between gap-4'">
                    <dt class="text-fg-muted" :class="detail.copyable ? 'mb-1' : ''">{{ detail.label }}</dt>
                    <dd v-if="detail.copyable"><CopyableValue :value="detail.value" :label="detail.label.toLowerCase()" :head="14" :tail="10" /></dd>
                    <dd v-else class="min-w-0 break-words text-right text-fg">{{ detail.value }}</dd>
                </div>
            </dl>

            <JsonBlock v-for="detail in details.filter((d) => d.json)" :key="detail.label" :title="detail.label" :value="detail.value" default-open />

            <p class="text-xs text-fg-muted">
                This is only an entry of the history kept on this device: deleting it does not undo the action.
            </p>
        </div>

        <template #footer>
            <Button
                label="Delete"
                icon="pi pi-trash"
                severity="danger"
                text
                class="mr-auto"
                :disabled="props.isDeleting"
                @click="showConfirm = true"
            />
            <Button label="Close" severity="secondary" outlined :disabled="props.isDeleting" @click="open = false" />
            <Button
                v-if="target"
                :label="presenter.routeLabel ?? 'Open'"
                icon="pi pi-arrow-right"
                icon-pos="right"
                @click="goToTarget"
            />
        </template>
    </ResponsiveDialog>

    <ConfirmActionDialog
        v-model:visible="showConfirm"
        title="Delete activity"
        :item-name="event?.title ?? 'Unknown activity'"
        message="It will be removed from the history of this wallet. The action itself is not undone."
        :loading="props.isDeleting"
        @confirm="confirmDelete"
    />
</template>
