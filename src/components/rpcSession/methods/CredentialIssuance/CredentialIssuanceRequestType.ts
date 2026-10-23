/**
 * Request type for the `/v1/credential/issue` JSON-RPC method.
 *
 * An issuer hands a credential over to the user's wallet. Desk shows it and, only if the user
 * accepts, stores it in the chosen wallet.
 *
 * Registered in: rpcMethodRegistry.ts → '/v1/credential/issue'
 * Handler component: CredentialIssuance.vue
 */
import * as v from 'valibot';

export const CredentialIssuanceSchema = v.object({
    /** Indicates the public key to allow Desk to identify the wallet to use. */
    publicKey: v.nullish(v.string()),

    /** Format of the credential. Only IETF SD-JWT is supported for now. */
    credentialType: v.literal('sdjwt_ietf'),

    /** The credential, in the compact SD-JWT serialization (`jwt~disclosure~...~`). */
    credential: v.pipe(v.string(), v.nonEmpty()),
});

export type CredentialIssuance = v.InferOutput<typeof CredentialIssuanceSchema>;
