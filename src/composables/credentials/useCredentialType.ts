import * as v from 'valibot';
import { parseCompactSdJwt } from './parseSdJwtToken';

// ---------------------------------------------------------------------------
// Shared primitive — a single SD-JWT disclosure entry.
// `key` is absent for array-element disclosures.
// ---------------------------------------------------------------------------

export const DisclosureSchema = v.looseObject({
    _digest: v.string(),
    _encoded: v.string(),
    salt: v.string(),
    key: v.optional(v.string()),
    value: v.optional(v.unknown()),
});

export type Disclosure = v.InferOutput<typeof DisclosureSchema>;

// ---------------------------------------------------------------------------
// SD-JWT (classic — IETF draft)
//
// Discriminating fields: `iss` (issuer string) + `iat` (issued-at timestamp).
// `exp` and `sub` are part of the spec but are optional in practice.
// ---------------------------------------------------------------------------

export const SdJwtPayloadSchema = v.looseObject({
    iss: v.string(),
    iat: v.number(),
    vct: v.string(),
    _sd_alg: v.string(),
    // Optional standard JWT claims
    exp: v.optional(v.number()),
    sub: v.optional(v.string()),
});

export const SdJwtSchema = v.looseObject({
    jwt: v.looseObject({
        header: v.looseObject({ typ: v.optional(v.string()), alg: v.string() }),
        payload: SdJwtPayloadSchema,
        signature: v.string(),
        encoded: v.string(),
    }),
    disclosures: v.array(DisclosureSchema),
});

export type SdJwtCredential = v.InferOutput<typeof SdJwtSchema>;

// ---------------------------------------------------------------------------
// Shared envelope — the minimum structure needed by the presentation dialog.
// Both SD-JWT and SD-JWT-VC share this exact envelope; only the payload
// content differs. Adding a new SD-JWT variant never requires changing the
// presentation logic.
// ---------------------------------------------------------------------------

export const SdJwtEnvelopeSchema = v.looseObject({
    jwt: v.looseObject({
        header: v.looseObject({ typ: v.optional(v.string()), alg: v.string() }),
        payload: v.looseObject({ _sd_alg: v.string() }),
        signature: v.string(),
        encoded: v.string(),
    }),
    disclosures: v.array(DisclosureSchema),
});

export type SdJwtEnvelope = v.InferOutput<typeof SdJwtEnvelopeSchema>;

export type CredentialType = 'sd-jwt' | 'unrecognized';

export function detectCredentialType(data: string): CredentialType {
    // Compact SD-JWT token: first segment is a JWT (3 dot-separated parts), followed by ~
    const tildeIdx = data.indexOf('~');
    if (tildeIdx > 0) {
        const jwtPart = data.slice(0, tildeIdx);
        if (jwtPart.split('.').length === 3) return 'sd-jwt';
    }

    // Legacy: JSON-encoded SdJwtCredential
    let parsed: unknown;
    try {
        parsed = JSON.parse(data);
    } catch {
        return 'unrecognized';
    }

    const jwtResult = v.safeParse(SdJwtSchema, parsed);
    if (jwtResult.success) return 'sd-jwt';

    return 'unrecognized';
}

// ---------------------------------------------------------------------------
// Parse helpers
// ---------------------------------------------------------------------------

export async function parseSdJwt(data: string): Promise<SdJwtCredential | null> {
    // Compact token format
    if (data.includes('~')) {
        try {
            return await parseCompactSdJwt(data);
        } catch {
            return null;
        }
    }
    // Legacy JSON format
    try {
        const result = v.safeParse(SdJwtSchema, JSON.parse(data));
        return result.success ? result.output : null;
    } catch {
        return null;
    }
}

/**
 * Parses an SD-JWT credential into the shared envelope type.
 * Use this in contexts that only need `jwt.encoded` + `disclosures`
 * (e.g. the presentation dialog).
 */
export async function parseSdJwtEnvelope(data: string): Promise<SdJwtEnvelope | null> {
    // Compact token format
    if (data.includes('~')) {
        try {
            return await parseCompactSdJwt(data);
        } catch {
            return null;
        }
    }
    // Legacy JSON format
    try {
        const result = v.safeParse(SdJwtEnvelopeSchema, JSON.parse(data));
        return result.success ? result.output : null;
    } catch {
        return null;
    }
}
