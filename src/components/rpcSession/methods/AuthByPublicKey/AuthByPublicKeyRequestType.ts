/**
 * Request type for the `/v1/auth/pk` JSON-RPC method.
 *
 * The wallet signs `b64Challenge` with the Ed25519 key derived from the chosen
 * wallet seed and returns the public key (in `pkFormat`) + a JWS signature.
 *
 * Registered in: rpcMethodRegistry.ts → '/v1/auth/pk'
 * Handler component: AuthByPublicKey.vue
 */
import * as v from 'valibot';

export const AuthByPublicKeyParamsSchema = v.object({
    /** Name of the entity requesting authentication — displayed to the user */
    origin: v.string(),
    /** Base64-encoded challenge that the wallet must sign */
    b64Challenge: v.string(),
    /**
     * Format of the returned public key:
     * - `'did'`  → DID URL: `did:jwk:<base64url-jwk>`
     * - `'cmts'` → Default Carmentis-encoded public key string (default)
     */
    pkFormat: v.optional(v.picklist(['did', 'cmts']), 'cmts'),
    /** Signature format — only 'jws' is currently supported */
    sigFormat: v.optional(v.literal('jws'), 'jws'),
});

export type AuthByPublicKeyParams = v.InferOutput<typeof AuthByPublicKeyParamsSchema>;
