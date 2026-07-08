/**
 * Request type for the `/v1/auth/pk` JSON-RPC method.
 *
 * The wallet signs `b64Challenge` with the Ed25519 key derived from the chosen
 *
 * Registered in: rpcMethodRegistry.ts → '/v1/auth/pk'
 * Handler component: AuthByPublicKey.vue
 */
import * as v from 'valibot';

export enum AuthMethod {
    CanonicalJson = 'canonical-json',
}

export const SharedAuthParams = v.object({
    /** Indicates the public key to help desk to choose the correct wallet **/
    publicKey: v.nullish(v.string()),

    /** Name of the entity requesting authentication — displayed to the user */
    origin: v.string(),

    /** Name of the entity requesting authentication — displayed to the user */
    title: v.nullish(v.string()),

    /**
     * The challenge to be signed by the user's private key.
     */
    challenge: v.string(),
})

export const CanonicalJsonAuthMethod = v.object({
    ...SharedAuthParams.entries,

    sigMethod: v.literal(AuthMethod.CanonicalJson),


    /**
     * Format of the returned public key:
     * - `'cmts'` → Default Carmentis-encoded public key string (default)
     */
    pkFormat: v.optional(v.picklist(['cmts']), 'cmts'),

    /**
     * ''
     */
    sigEncoding: v.optional(v.picklist(['b64', 'base64', 'hex', 'hexa']), 'base64'),
})

export const AuthByPublicKeyParamsSchema = v.variant(
    'sigMethod',
    [ CanonicalJsonAuthMethod ]
)

export type AuthByPublicKeyParams = v.InferOutput<typeof AuthByPublicKeyParamsSchema>;
