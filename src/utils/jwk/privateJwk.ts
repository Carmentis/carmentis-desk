import { JwkPrivateSignatureKey, type JwkSignatureAlgorithmName, type SignatureJwk } from '@cmts-dev/carmentis-sdk-core';

export interface JwkAlgorithmOption {
    value: JwkSignatureAlgorithmName;
    label: string;
    /** One sentence for the user, shown under the picker. */
    hint: string;
}

export interface JwkAlgorithmGroup {
    label: string;
    items: JwkAlgorithmOption[];
}

/** The algorithms the SDK can generate a JWK for, by family. */
export const JWK_ALGORITHM_GROUPS: JwkAlgorithmGroup[] = [
    {
        label: 'EdDSA',
        items: [
            { value: 'Ed25519', label: 'Ed25519', hint: 'Modern and compact. Fast to sign and to verify.' },
            { value: 'Ed448', label: 'Ed448', hint: 'Larger, higher-security variant of EdDSA.' },
        ],
    },
    {
        label: 'Elliptic curve',
        items: [
            { value: 'ES256', label: 'ES256 · P-256', hint: 'NIST P-256 curve with SHA-256. Very widely supported.' },
            { value: 'ES384', label: 'ES384 · P-384', hint: 'NIST P-384 curve with SHA-384.' },
            { value: 'ES512', label: 'ES512 · P-521', hint: 'NIST P-521 curve with SHA-512.' },
            { value: 'ES256K', label: 'ES256K · secp256k1', hint: 'The secp256k1 curve, as used by Bitcoin and Ethereum.' },
        ],
    },
    {
        label: 'RSA',
        items: [
            { value: 'RS256', label: 'RS256', hint: 'RSA (PKCS#1 v1.5) with SHA-256. Large keys, slower to generate.' },
            { value: 'RS384', label: 'RS384', hint: 'RSA (PKCS#1 v1.5) with SHA-384. Large keys, slower to generate.' },
            { value: 'RS512', label: 'RS512', hint: 'RSA (PKCS#1 v1.5) with SHA-512. Large keys, slower to generate.' },
            { value: 'PS256', label: 'PS256', hint: 'RSA-PSS with SHA-256. Large keys, slower to generate.' },
            { value: 'PS384', label: 'PS384', hint: 'RSA-PSS with SHA-384. Large keys, slower to generate.' },
            { value: 'PS512', label: 'PS512', hint: 'RSA-PSS with SHA-512. Large keys, slower to generate.' },
        ],
    },
    {
        label: 'Post-quantum',
        items: [
            { value: 'ML-DSA-44', label: 'ML-DSA-44', hint: 'Post-quantum signature (NIST FIPS 204), security level 2.' },
            { value: 'ML-DSA-65', label: 'ML-DSA-65', hint: 'Post-quantum signature (NIST FIPS 204), security level 3.' },
            { value: 'ML-DSA-87', label: 'ML-DSA-87', hint: 'Post-quantum signature (NIST FIPS 204), security level 5.' },
        ],
    },
];

/** What the SDK generates when no algorithm is given. */
export const DEFAULT_JWK_ALGORITHM: JwkSignatureAlgorithmName = 'Ed25519';

export const RSA_MODULUS_LENGTHS = [2048, 3072, 4096] as const;
export const DEFAULT_RSA_MODULUS_LENGTH = 2048;

export const isRsaAlgorithm = (algorithm: JwkSignatureAlgorithmName): boolean => /^(RS|PS)\d{3}$/.test(algorithm);

export function findJwkAlgorithm(algorithm: JwkSignatureAlgorithmName): JwkAlgorithmOption | undefined {
    return JWK_ALGORITHM_GROUPS.flatMap((group) => group.items).find((item) => item.value === algorithm);
}

/** Generates a fresh private JWK. `modulusLength` only applies to RSA. */
export async function generatePrivateJwk(
    algorithm: JwkSignatureAlgorithmName,
    modulusLength: number = DEFAULT_RSA_MODULUS_LENGTH,
): Promise<SignatureJwk> {
    const key = await JwkPrivateSignatureKey.gen(algorithm, isRsaAlgorithm(algorithm) ? { modulusLength } : {});
    return key.getPrivateJwk();
}

/** A JWK as text, laid out for reading: one member per line. */
export function formatJwk(jwk: unknown): string {
    return JSON.stringify(jwk, null, 2);
}

export type PrivateJwkAnalysis =
    | { ok: true; algorithm: JwkSignatureAlgorithmName; kty: string; crv?: string }
    | { ok: false; error: string };

/**
 * Checks that a text is a JWK the wallet can sign with, and says what it is.
 * Returns `null` for an empty text, which is not an error.
 */
export async function analyzePrivateJwk(text: string): Promise<PrivateJwkAnalysis | null> {
    const trimmed = text.trim();
    if (!trimmed) return null;

    let parsed: unknown;
    try {
        parsed = JSON.parse(trimmed);
    } catch {
        return { ok: false, error: 'This is not valid JSON.' };
    }
    if (typeof parsed !== 'object' || parsed === null || typeof (parsed as { kty?: unknown }).kty !== 'string') {
        return { ok: false, error: "The 'kty' field is missing: this is not a valid JWK." };
    }
    if (!('d' in parsed) && !('priv' in parsed)) {
        return { ok: false, error: 'This JWK has no private part: it looks like a public key.' };
    }

    try {
        const key = await JwkPrivateSignatureKey.fromJwk(parsed as SignatureJwk);
        const publicJwk = key.getPublicJwk();
        return { ok: true, algorithm: key.getAlgorithm(), kty: String(publicJwk.kty), crv: publicJwk.crv };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'This JWK cannot be used to sign.' };
    }
}
