/**
 * RPC Method Registry
 *
 * Central registry mapping JSON-RPC method names to their handler definition.
 * Each definition contains:
 *   - `schema`    : Valibot schema used to validate incoming `params`
 *   - `component` : Vue component rendered to the user for approval/rejection
 *
 * The handler component contract:
 *   - Props  : `params` (typed by the method's schema output)
 *   - Emits  : `done(result: Record<string, unknown>)` — user approved
 *              `reject()`                               — user declined
 *
 * Adding a new method
 * ───────────────────
 * 1. Create `methods/MyMethod/MyMethodRequestType.ts`
 *    → export a Valibot schema + its inferred type
 * 2. Create `methods/MyMethod/MyMethod.vue`
 *    → defineProps<{ params: MyMethodParams }>()
 *    → defineEmits<{ done: [result: Record<string, unknown>]; reject: [] }>()
 *    → show a toast on success before emitting `done`
 * 3. Add an entry below — no other file needs to change.
 */

import type { Component } from 'vue';
import type { GenericSchema } from 'valibot';

import AuthByPublicKey from './methods/AuthByPublicKey/AuthByPublicKey.vue';
import { AuthByPublicKeyParamsSchema } from './methods/AuthByPublicKey/AuthByPublicKeyRequestType.ts';

import DataApproval from './methods/DataApproval/DataApproval.vue';
import { DataApprovalParamsSchema } from './methods/DataApproval/DataApprovalRequestType.ts';

import CredentialPresentation from './methods/CredentialPresentation/CredentialPresentation.vue';
import { CredentialPresentationSchema } from './methods/CredentialPresentation/CredentialPresentationRequestType.ts';

export interface RpcMethodDefinition {
    /** Valibot schema — validates and parses incoming JSON-RPC `params` */
    schema: GenericSchema;
    /** Vue component displayed to the user for this method's approval flow */
    component: Component;
}

export const rpcMethodRegistry: Record<string, RpcMethodDefinition> = {
    // Public key authentication (v1)
    '/v1/auth/pk': {
        schema: AuthByPublicKeyParamsSchema,
        component: AuthByPublicKey,
    },

    // SD-JWT credential presentation via DCQL query
    '/v1/credential/presentation': {
        schema: CredentialPresentationSchema,
        component: CredentialPresentation,
    },

    // Microblock approval via WIAP protocol
    'wr-data-approval': {
        schema: DataApprovalParamsSchema,
        component: DataApproval,
    },
};
