import {computed, ref, toValue, watch, type MaybeRefOrGetter} from 'vue';

type JsonSchema = Record<string, unknown>;
type Primitive = string | number | boolean;

/** One field of a form generated from a JSON Schema. */
export interface SchemaField {
    name: string;
    label: string;
    description?: string;
    kind: 'enum' | 'string' | 'number' | 'integer' | 'boolean';
    /** Allowed values, for `enum` fields. */
    options?: Primitive[];
    required: boolean;
    minimum?: number;
    maximum?: number;
}

const asRecord = (value: unknown): JsonSchema | undefined =>
    value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonSchema : undefined;

/** `fooBar` / `foo_bar` → `Foo bar`. */
function humanize(name: string): string {
    const words = name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
}

function toField(name: string, schema: JsonSchema, required: boolean): SchemaField | undefined {
    const base = {
        name,
        label: typeof schema.title === 'string' ? schema.title : humanize(name),
        description: typeof schema.description === 'string' ? schema.description : undefined,
        required,
    };
    if (Array.isArray(schema.enum) && schema.enum.every(v => ['string', 'number', 'boolean'].includes(typeof v))) {
        return {...base, kind: 'enum', options: schema.enum as Primitive[]};
    }
    switch (schema.type) {
        case 'string':
        case 'boolean':
            return {...base, kind: schema.type};
        case 'number':
        case 'integer':
            return {
                ...base,
                kind: schema.type,
                minimum: typeof schema.minimum === 'number' ? schema.minimum : undefined,
                maximum: typeof schema.maximum === 'number' ? schema.maximum : undefined,
            };
        default:
            return undefined;
    }
}

/**
 * Parses a flat object schema. Returns undefined when the schema uses something the generated form
 * can't render (nested objects, arrays, combinators…): the caller then falls back to raw JSON.
 */
function parseSchema(schema: JsonSchema | undefined): SchemaField[] | undefined {
    if (!schema) return [];
    const properties = asRecord(schema.properties);
    if (!properties) return schema.type === 'object' || schema.type === undefined ? [] : undefined;
    const required = Array.isArray(schema.required) ? schema.required as string[] : [];
    const fields: SchemaField[] = [];
    for (const [name, property] of Object.entries(properties)) {
        const propertySchema = asRecord(property);
        const field = propertySchema && toField(name, propertySchema, required.includes(name));
        if (!field) return undefined;
        fields.push(field);
    }
    return fields;
}

function defaultValues(schema: JsonSchema | undefined, fields: SchemaField[]): Record<string, Primitive | undefined> {
    const properties = asRecord(schema?.properties) ?? {};
    const values: Record<string, Primitive | undefined> = {};
    for (const field of fields) {
        const declared = asRecord(properties[field.name])?.default as Primitive | undefined;
        if (declared !== undefined) values[field.name] = declared;
        else if (field.kind === 'enum') values[field.name] = field.options?.[0];
        else if (field.kind === 'boolean') values[field.name] = false;
        else values[field.name] = undefined;
    }
    return values;
}

/**
 * State of a form generated from a JSON Schema, such as the `key/create` parameters of a KMS plugin.
 *
 * Flat object schemas with string, enum, number, integer and boolean properties get one field each;
 * any other schema is edited as raw JSON.
 */
export function useJsonSchemaForm(schema: MaybeRefOrGetter<JsonSchema | undefined>) {
    const parsed = computed(() => parseSchema(toValue(schema)));
    const isSupported = computed(() => parsed.value !== undefined);
    const fields = computed(() => parsed.value ?? []);

    const values = ref<Record<string, Primitive | undefined>>({});
    const rawJson = ref('{}');

    // a new schema (another plugin) starts from its defaults
    watch(() => toValue(schema), (current) => {
        values.value = defaultValues(current, fields.value);
        rawJson.value = '{}';
    }, {immediate: true});

    const rawParams = computed<Record<string, unknown> | undefined>(() => {
        try {
            return asRecord(JSON.parse(rawJson.value));
        } catch {
            return undefined;
        }
    });

    function isFieldValid(field: SchemaField): boolean {
        const value = values.value[field.name];
        if (value === undefined || value === '') return !field.required;
        if (field.kind === 'number' || field.kind === 'integer') {
            if (typeof value !== 'number' || Number.isNaN(value)) return false;
            if (field.kind === 'integer' && !Number.isInteger(value)) return false;
            if (field.minimum !== undefined && value < field.minimum) return false;
            if (field.maximum !== undefined && value > field.maximum) return false;
        }
        return true;
    }

    const isValid = computed(() => isSupported.value
        ? fields.value.every(isFieldValid)
        : rawParams.value !== undefined);

    /** The parameters to send, without the fields left empty. */
    const params = computed<Record<string, unknown>>(() => {
        if (!isSupported.value) return rawParams.value ?? {};
        const result: Record<string, unknown> = {};
        for (const [name, value] of Object.entries(values.value)) {
            if (value !== undefined && value !== '') result[name] = value;
        }
        return result;
    });

    return {fields, isSupported, values, rawJson, params, isValid, isFieldValid};
}
