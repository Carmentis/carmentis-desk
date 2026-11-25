<script setup lang="ts">
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import Textarea from 'primevue/textarea';
import FieldNameAndDescription from '../../../components/utils/FieldNameAndDescription.vue';
import {useWalletCreationWizard} from '../../../composables/useWalletCreationWizard.ts';

/** Parameters of the selected plugin, generated from its `key/create` JSON Schema. */
const {paramsForm} = useWalletCreationWizard();
const {fields, isSupported, values, rawJson, isValid, isFieldValid} = paramsForm;

const fieldId = (name: string) => `kms-param-${name}`;
</script>

<template>
    <!-- Schema rendered as fields -->
    <div v-if="isSupported" class="space-y-4">
        <p v-if="fields.length === 0" class="text-sm text-fg-muted">This plugin takes no parameter.</p>

        <div v-for="field in fields" :key="field.name">
            <template v-if="field.kind === 'boolean'">
                <div class="flex min-h-11 items-center justify-between gap-4">
                    <label :for="fieldId(field.name)" class="min-w-0 flex-1">
                        <span class="block text-sm font-medium text-fg">{{ field.label }}</span>
                        <span v-if="field.description" class="block text-sm text-fg-muted">{{ field.description }}</span>
                    </label>
                    <ToggleSwitch
                        :model-value="values[field.name] === true"
                        :input-id="fieldId(field.name)"
                        @update:model-value="(value: boolean) => values[field.name] = value"
                    />
                </div>
            </template>

            <template v-else>
                <FieldNameAndDescription
                    :name="field.label"
                    :description="field.description"
                    :input-id="fieldId(field.name)"
                    :required="field.required"
                />
                <Select
                    v-if="field.kind === 'enum'"
                    v-model="values[field.name]"
                    :input-id="fieldId(field.name)"
                    :options="field.options"
                    fluid
                />
                <InputNumber
                    v-else-if="field.kind === 'number' || field.kind === 'integer'"
                    :model-value="typeof values[field.name] === 'number' ? values[field.name] as number : null"
                    :input-id="fieldId(field.name)"
                    @update:model-value="(value: number | null) => values[field.name] = value ?? undefined"
                    :min="field.minimum"
                    :max="field.maximum"
                    :max-fraction-digits="field.kind === 'integer' ? 0 : 10"
                    :use-grouping="false"
                    :invalid="!isFieldValid(field)"
                    fluid
                />
                <InputText
                    v-else
                    :id="fieldId(field.name)"
                    :model-value="values[field.name] === undefined ? '' : String(values[field.name])"
                    @update:model-value="(value: string | undefined) => values[field.name] = value || undefined"
                    :invalid="!isFieldValid(field)"
                    autocomplete="off"
                    fluid
                />
            </template>
        </div>
    </div>

    <!-- Schema too rich for the generated form: raw JSON -->
    <div v-else>
        <FieldNameAndDescription
            name="Parameters (JSON)"
            description="This plugin takes parameters that can't be shown as a form. Enter them as a JSON object."
            input-id="kms-params-json"
        />
        <Textarea
            id="kms-params-json"
            v-model="rawJson"
            rows="6"
            class="font-mono text-sm"
            spellcheck="false"
            :invalid="!isValid"
            fluid
        />
        <p v-if="!isValid" class="mt-1 text-sm text-danger">Enter a valid JSON object.</p>
    </div>
</template>
