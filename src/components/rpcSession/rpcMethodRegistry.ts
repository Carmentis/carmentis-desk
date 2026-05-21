import type { Component } from 'vue';
import type { GenericSchema } from 'valibot';

import AuthByPublicKey from './methods/AuthByPublicKey/AuthByPublicKey.vue';
import { AuthByPublicKeyParamsSchema } from './methods/AuthByPublicKey/AuthByPublicKeyRequestType.ts';

import AuthByPublicKeyDeprecated from './methods/AuthByPublicKeyDeprecated/AuthByPublicKeyDeprecated.vue';
import { AuthByPublicKeyDeprecatedParamsSchema } from './methods/AuthByPublicKeyDeprecated/AuthByPublicKeyDeprecatedRequestType.ts';

import DataApproval from './methods/DataApproval/DataApproval.vue';
import { DataApprovalParamsSchema } from './methods/DataApproval/DataApprovalRequestType.ts';

import CredentialPresentation from './methods/CredentialPresentation/CredentialPresentation.vue';
import { CredentialPresentationSchema } from './methods/CredentialPresentation/CredentialPresentationRequestType.ts';

export interface RpcMethodDefinition {
    schema: GenericSchema;
    component: Component;
}

export const rpcMethodRegistry: Record<string, RpcMethodDefinition> = {
    '/v1/auth/pk': {
        schema: AuthByPublicKeyParamsSchema,
        component: AuthByPublicKey,
    },
    '/v1/credential/presentation': {
        schema: CredentialPresentationSchema,
        component: CredentialPresentation,
    },
    'wr-auth-pk': {
        schema: AuthByPublicKeyDeprecatedParamsSchema,
        component: AuthByPublicKeyDeprecated,
    },
    'wr-data-approval': {
        schema: DataApprovalParamsSchema,
        component: DataApproval,
    },
};
