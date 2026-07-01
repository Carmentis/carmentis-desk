/**
 * Request type for the `/v1/auth/pk` JSON-RPC method.
 *
 * The wallet signs `b64Challenge` with the Ed25519 key derived from the chosen
 *
 * Registered in: rpcMethodRegistry.ts → '/v1/auth/pk'
 * Handler component: AuthByPublicKey.vue
 */
import * as v from 'valibot';

export const AuthByPublicKeyParamsSchema = v.object({
    /** Name of the entity requesting authentication — displayed to the user */
    origin: v.string(),

    /**
     * The challenge to be signed by the user's private key.
     */
    challenge: v.string(),


    /**
     * Format of the returned public key:
     * - `'cmts'` → Default Carmentis-encoded public key string (default)
     */
    pkFormat: v.optional(v.picklist(['cmts']), 'cmts'),

    /**
     * ''
     */
    sigEncoding: v.optional(v.picklist(['base64', 'hex']), 'base64'),

    /**
     * Signature format: 'canonical-json'
     */
    sigFormat: v.optional(v.picklist(['canonical-json']), 'canonical-json'),
});

export type AuthByPublicKeyParams = v.InferOutput<typeof AuthByPublicKeyParamsSchema>;
