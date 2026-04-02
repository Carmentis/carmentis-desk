import { SDJwt } from '@sd-jwt/core';
import { digest } from '@sd-jwt/crypto-browser';
import type { SdJwtCredential } from './useCredentialType';

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class SdJwtParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SdJwtParseError';
  }
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parses a compact SD-JWT-VC token (format: `header.payload.signature~d1~d2~`)
 * into the internal `SdJwtCredential` JSON structure stored in credentials.
 *
 * Throws `SdJwtParseError` on any validation or decoding failure.
 */
export async function parseCompactSdJwt(token: string): Promise<SdJwtCredential> {
  const trimmed = token.trim();

  if (!trimmed.includes('~')) {
    throw new SdJwtParseError(
      'Not a valid SD-JWT compact token: missing "~" separator between JWT and disclosures.',
    );
  }

  let sdJwt: Awaited<ReturnType<typeof SDJwt.fromEncode>>;
  try {
    sdJwt = await SDJwt.fromEncode(trimmed, digest);
  } catch (err) {
    throw new SdJwtParseError(
      `Failed to decode SD-JWT token: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const { jwt, disclosures } = sdJwt;

  if (!jwt?.header || !jwt?.payload) {
    throw new SdJwtParseError('Decoded SD-JWT is missing header or payload.');
  }

  const header = jwt.header as Record<string, unknown>;
  const payload = jwt.payload as Record<string, unknown>;

  // Validate the token is actually an SD-JWT
  if (typeof header.typ !== 'string' || !header.typ.toLowerCase().includes('sd-jwt')) {
    throw new SdJwtParseError(
      `Unexpected token type "${header.typ ?? '(none)'}". ` +
        'Expected an SD-JWT (typ must contain "sd-jwt").',
    );
  }
  if (typeof payload._sd_alg !== 'string') {
    throw new SdJwtParseError(
      'Missing "_sd_alg" in payload — this does not appear to be an SD-JWT.',
    );
  }

  const mappedDisclosures = (disclosures ?? []).map((d) => ({
    _digest: d._digest ?? '',
    // encode() re-serialises [salt, key?, value] to base64url — identical to the
    // original encoded string since JSON serialisation is deterministic here.
    _encoded: d.encode(),
    salt: d.salt,
    key: d.key,
    value: d.value as unknown,
  }));

  return {
    jwt: {
      header: {
        typ: header.typ as string,
        alg: typeof header.alg === 'string' ? header.alg : '',
      },
      payload: payload as SdJwtCredential['jwt']['payload'],
      signature: jwt.signature ?? '',
      // jwt.encoded holds the bare JWT (header.payload.signature), identical to
      // the first segment before the first "~".
      // @ts-ignore encoded is private but is accessed
      encoded: jwt.encoded ?? trimmed.split('~')[0],
    },
    disclosures: mappedDisclosures,
  };
}
