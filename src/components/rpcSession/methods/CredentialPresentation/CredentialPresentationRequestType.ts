/**
 * Request type for the `/v1/credential/presentation` JSON-RPC method.
 *
 * The wallet finds credentials in the user's wallet that satisfy the DCQL
 * query, presents the matching claims, and returns a key-bound SD-JWT
 * verifiable presentation token.
 *
 * Registered in: rpcMethodRegistry.ts → '/v1/credential/presentation'
 * Handler component: CredentialPresentation.vue
 */
import * as v from 'valibot';
import { DcqlQuery } from 'dcql';

export const CredentialPresentationSchema = v.object({
    /** Intended audience of the presentation (verifier URL or DID) */
    audience: v.string(),
    /** One-time nonce to bind the presentation and prevent replay attacks */
    nonce: v.string(),
    /**
     * DCQL query describing the credential type and claims to request.
     * See: https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0.html
     */
    query: v.unknown() as v.GenericSchema<DcqlQuery.Input>,
});

export type CredentialPresentation = v.InferOutput<typeof CredentialPresentationSchema>;
