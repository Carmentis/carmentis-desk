<script setup lang="ts">
/**
 * Composant de développement OID4VP (wallet / holder).
 *
 * Le protocole est réellement joué contre le verifier distant :
 * parse -> resolve (JAR / request_uri) -> construction du vp_token -> réponse
 * (JARM si direct_post.jwt) -> POST sur le response_uri.
 *
 * Seule concession : le lien `openid4vp://...` est collé à la main dans l'input
 * plutôt que reçu via un deep link.
 */
import { ref } from 'vue';
import * as jose from 'jose';
import { Openid4vpClient } from '@openid4vc/openid4vp';
import { Button, InputText, Message } from 'primevue';

// ─── Wallet en dur ────────────────────────────────────────────────────────────

const HOLDER_PRIVATE_JWK: jose.JWK = {
    kty: 'EC',
    crv: 'P-256',
    x: 'mTBJJTP09stpT9HUG1XRQMYKp2jkLELnI6kNmA9ikSg',
    y: 'KnX4YCVlJUjiGQntLQuvbHt8NxdCZnOT9OFjFqiK1a4',
    d: '6hewJdwDwgWdyUk0AvjqrBMtCdAs8T3nZmPen7FvQOI',
};
const HOLDER_PUBLIC_JWK: jose.JWK = { ...HOLDER_PRIVATE_JWK, d: undefined };
const HOLDER_DID =
    'did:jwk:eyJrdHkiOiJFQyIsIngiOiJtVEJKSlRQMDlzdHBUOUhVRzFYUlFNWUtwMmprTEVMbkk2a05tQTlpa1NnIiwieSI6IktuWDRZQ1ZsSlVqaUdRbnRMUXV2Ykh0OE54ZENabk9UOU9GakZxaUsxYTQiLCJjcnYiOiJQLTI1NiJ9';

/** Credentials W3C VC-JWT en dur, tous liés au holder ci-dessus (`sub`). */
const CREDENTIALS: { id: string; types: string[]; jwt: string }[] = [
    {
        id: 'university-degree',
        types: ['VerifiableCredential', 'UniversityDegreeCredential'],
        jwt: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRpZDpqd2s6ZXlKcmRIa2lPaUpGUXlJc0luZ2lPaUppT0ROUFEzQmpOSHBNVUdaaE0wUm9SRXBzUkhOemF6WnRkSFkzTUhaQ09USlJla015WWtFMmVUWlZJaXdpZVNJNklucFhSakYzUWxkUlpVSktRamhKYlZOQ1dVRlVOM0ZuWkZVMVRXWm5aVGs0YW1rMmMzVk5Za2R5YkZraUxDSmpjbllpT2lKUUxUSTFOaUo5IzAifQ.eyJpc3MiOiJkaWQ6andrOmV5SnJkSGtpT2lKRlF5SXNJbmdpT2lKaU9ETlBRM0JqTkhwTVVHWmhNMFJvUkVwc1JITnphelp0ZEhZM01IWkNPVEpSZWtNeVlrRTJlVFpWSWl3aWVTSTZJbnBYUmpGM1FsZFJaVUpLUWpoSmJWTkNXVUZVTjNGblpGVTFUV1puWlRrNGFtazJjM1ZOWWtkeWJGa2lMQ0pqY25ZaU9pSlFMVEkxTmlKOSIsInN1YiI6ImRpZDpqd2s6ZXlKcmRIa2lPaUpGUXlJc0luZ2lPaUp0VkVKS1NsUlFNRGx6ZEhCVU9VaFZSekZZVWxGTldVdHdNbXByVEVWTWJrazJhMDV0UVRscGExTm5JaXdpZVNJNklrdHVXRFJaUTFac1NsVnFhVWRSYm5STVVYVjJZa2gwT0U1NFpFTmFiazlVT1U5R2FrWnhhVXN4WVRRaUxDSmpjbllpT2lKUUxUSTFOaUo5IiwianRpIjoidXJuOnV1aWQ6MTExMTExMTEtMTExMS00MTExLTgxMTEtMTExMTExMTExMTExIiwibmJmIjoxNzU1MDAwMDAwLCJpYXQiOjE3NTUwMDAwMDAsImV4cCI6MjA3MDM2MDAwMCwidmMiOnsiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiXSwiaWQiOiJ1cm46dXVpZDoxMTExMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEiLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiVW5pdmVyc2l0eURlZ3JlZUNyZWRlbnRpYWwiXSwiaXNzdWVyIjoiZGlkOmp3azpleUpyZEhraU9pSkZReUlzSW5naU9pSmlPRE5QUTNCak5IcE1VR1poTTBSb1JFcHNSSE56YXpadGRIWTNNSFpDT1RKUmVrTXlZa0UyZVRaVklpd2llU0k2SW5wWFJqRjNRbGRSWlVKS1FqaEpiVk5DV1VGVU4zRm5aRlUxVFdablpUazRhbWsyYzNWTllrZHliRmtpTENKamNuWWlPaUpRTFRJMU5pSjkiLCJpc3N1YW5jZURhdGUiOiIyMDI1LTA4LTEyVDEyOjAwOjAwLjAwMFoiLCJjcmVkZW50aWFsU3ViamVjdCI6eyJpZCI6ImRpZDpqd2s6ZXlKcmRIa2lPaUpGUXlJc0luZ2lPaUp0VkVKS1NsUlFNRGx6ZEhCVU9VaFZSekZZVWxGTldVdHdNbXByVEVWTWJrazJhMDV0UVRscGExTm5JaXdpZVNJNklrdHVXRFJaUTFac1NsVnFhVWRSYm5STVVYVjJZa2gwT0U1NFpFTmFiazlVT1U5R2FrWnhhVXN4WVRRaUxDSmpjbllpT2lKUUxUSTFOaUo5IiwiZGVncmVlIjp7InR5cGUiOiJCYWNoZWxvckRlZ3JlZSIsIm5hbWUiOiJCYWNoZWxvciBvZiBTY2llbmNlIn0sIm5hbWUiOiJBbGljZSBEb2UifX19.SdRpZAqfpqnmC-QMhi-oaqMua7TGWK64RFHHLER6M0ahYdIbTtrjlFXVFHC1sYCe3urhFYPq9XoNkxg5WrnpSA',
    },
    {
        id: 'employee',
        types: ['VerifiableCredential', 'EmployeeCredential'],
        jwt: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRpZDpqd2s6ZXlKcmRIa2lPaUpGUXlJc0luZ2lPaUppT0ROUFEzQmpOSHBNVUdaaE0wUm9SRXBzUkhOemF6WnRkSFkzTUhaQ09USlJla015WWtFMmVUWlZJaXdpZVNJNklucFhSakYzUWxkUlpVSktRamhKYlZOQ1dVRlVOM0ZuWkZVMVRXWm5aVGs0YW1rMmMzVk5Za2R5YkZraUxDSmpjbllpT2lKUUxUSTFOaUo5IzAifQ.eyJpc3MiOiJkaWQ6andrOmV5SnJkSGtpT2lKRlF5SXNJbmdpT2lKaU9ETlBRM0JqTkhwTVVHWmhNMFJvUkVwc1JITnphelp0ZEhZM01IWkNPVEpSZWtNeVlrRTJlVFpWSWl3aWVTSTZJbnBYUmpGM1FsZFJaVUpLUWpoSmJWTkNXVUZVTjNGblpGVTFUV1puWlRrNGFtazJjM1ZOWWtkeWJGa2lMQ0pqY25ZaU9pSlFMVEkxTmlKOSIsInN1YiI6ImRpZDpqd2s6ZXlKcmRIa2lPaUpGUXlJc0luZ2lPaUp0VkVKS1NsUlFNRGx6ZEhCVU9VaFZSekZZVWxGTldVdHdNbXByVEVWTWJrazJhMDV0UVRscGExTm5JaXdpZVNJNklrdHVXRFJaUTFac1NsVnFhVWRSYm5STVVYVjJZa2gwT0U1NFpFTmFiazlVT1U5R2FrWnhhVXN4WVRRaUxDSmpjbllpT2lKUUxUSTFOaUo5IiwianRpIjoidXJuOnV1aWQ6MjIyMjIyMjItMjIyMi00MjIyLTgyMjItMjIyMjIyMjIyMjIyIiwibmJmIjoxNzU1MDAwMDAwLCJpYXQiOjE3NTUwMDAwMDAsImV4cCI6MjA3MDM2MDAwMCwidmMiOnsiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiXSwiaWQiOiJ1cm46dXVpZDoyMjIyMjIyMi0yMjIyLTQyMjItODIyMi0yMjIyMjIyMjIyMjIiLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiRW1wbG95ZWVDcmVkZW50aWFsIl0sImlzc3VlciI6ImRpZDpqd2s6ZXlKcmRIa2lPaUpGUXlJc0luZ2lPaUppT0ROUFEzQmpOSHBNVUdaaE0wUm9SRXBzUkhOemF6WnRkSFkzTUhaQ09USlJla015WWtFMmVUWlZJaXdpZVNJNklucFhSakYzUWxkUlpVSktRamhKYlZOQ1dVRlVOM0ZuWkZVMVRXWm5aVGs0YW1rMmMzVk5Za2R5YkZraUxDSmpjbllpT2lKUUxUSTFOaUo5IiwiaXNzdWFuY2VEYXRlIjoiMjAyNS0wOC0xMlQxMjowMDowMC4wMDBaIiwiY3JlZGVudGlhbFN1YmplY3QiOnsiaWQiOiJkaWQ6andrOmV5SnJkSGtpT2lKRlF5SXNJbmdpT2lKdFZFSktTbFJRTURsemRIQlVPVWhWUnpGWVVsRk5XVXR3TW1wclRFVk1ia2syYTA1dFFUbHBhMU5uSWl3aWVTSTZJa3R1V0RSWlExWnNTbFZxYVVkUmJuUk1VWFYyWWtoME9FNTRaRU5hYms5VU9VOUdha1p4YVVzeFlUUWlMQ0pqY25ZaU9pSlFMVEkxTmlKOSIsImVtcGxveWVyIjoiQ2FybWVudGlzIiwicm9sZSI6IkVuZ2luZWVyIiwibmFtZSI6IkFsaWNlIERvZSJ9fX0.OdpbQdtUVPWB-bN7Ym2qwX1StoujW9VcJb7A1h93Ou5e6G594-71hkFaoNeNskZzDoapHFGcP2fB8jUBhL5Uqw',
    },
];

// ─── Callbacks cryptographiques (jose + WebCrypto) ────────────────────────────

const HASH_ALGS: Record<string, string> = {
    'sha-256': 'SHA-256',
    'sha-384': 'SHA-384',
    'sha-512': 'SHA-512',
};

/**
 * Verifiers pré-enregistrés, indexés par `client_id` (sans préfixe).
 *
 * Le préfixe `pre-registered` signifie que le wallet connaît la clé du verifier
 * hors-bande : l'URL du JWKS est donc configurée ici, jamais lue dans la requête.
 */
const PRE_REGISTERED_VERIFIERS: Record<string, { jwksUri: string }> = {
    'cmts': {
        jwksUri:
            'https://equal-engineering-heat-thumbzilla.trycloudflare.com/.well-known/jwks.json',
    },
};

/** Clé publique du signataire d'un JWT reçu (request object signé). */
async function resolveSignerJwk(signer: any, payload: any): Promise<jose.JWK> {
    if (signer.method === 'jwk') return signer.publicJwk;
    if (signer.method === 'x5c') {
        const pem = `-----BEGIN CERTIFICATE-----\n${signer.x5c[0].replace(/(.{64})/g, '$1\n')}\n-----END CERTIFICATE-----`;
        return await jose.exportJWK(await jose.importX509(pem, signer.alg));
    }
    if (signer.method === 'did' && signer.didUrl?.startsWith('did:jwk:')) {
        const [, encoded] = signer.didUrl.split('#')[0].split('did:jwk:');
        return JSON.parse(new TextDecoder().decode(jose.base64url.decode(encoded)));
    }
    // `custom` = signature identifiée par le seul `kid`, cas du client_id pré-enregistré
    if (signer.method === 'custom') {
        const verifier = PRE_REGISTERED_VERIFIERS[payload.client_id];
        if (!verifier)
            throw new Error(
                `Verifier "${payload.client_id}" absent de PRE_REGISTERED_VERIFIERS: sa clé doit être pré-enregistrée dans le wallet`,
            );
        const { keys } = (await (await fetch(verifier.jwksUri)).json()) as { keys: jose.JWK[] };
        const jwk = keys?.find((k) => k.kid === signer.kid) ?? keys?.[0];
        if (!jwk) throw new Error(`Aucune clé "${signer.kid}" dans ${verifier.jwksUri}`);
        return jwk;
    }
    throw new Error(`Signataire non supporté: ${signer.method}`);
}

const client = new Openid4vpClient({
    callbacks: {
        fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
        hash: async (data, alg) =>
            new Uint8Array(await crypto.subtle.digest(HASH_ALGS[alg] ?? 'SHA-256', data)),
        signJwt: async (_signer, { header, payload }) => {
            const key = await jose.importJWK(HOLDER_PRIVATE_JWK, 'ES256');
            const jwt = await new jose.SignJWT(payload as jose.JWTPayload)
                .setProtectedHeader(header as jose.JWTHeaderParameters)
                .sign(key);
            return { jwt, signerJwk: HOLDER_PUBLIC_JWK as any };
        },
        verifyJwt: async (signer, jwt) => {
            const signerJwk = await resolveSignerJwk(signer, jwt.payload);
            try {
                await jose.jwtVerify(jwt.compact, await jose.importJWK(signerJwk, signer.alg));
                return { verified: true, signerJwk: signerJwk as any };
            } catch {
                return { verified: false, signerJwk: signerJwk as any };
            }
        },
        encryptJwe: async (encryptor, data) => {
            const key = await jose.importJWK(encryptor.publicJwk as jose.JWK, encryptor.alg);
            const jwe = await new jose.CompactEncrypt(new TextEncoder().encode(data))
                .setProtectedHeader({
                    alg: encryptor.alg,
                    enc: encryptor.enc,
                    kid: encryptor.publicJwk.kid,
                    apu: encryptor.apu,
                    apv: encryptor.apv,
                } as jose.CompactJWEHeaderParameters)
                .encrypt(key);
            return { jwe, encryptionJwk: encryptor.publicJwk };
        },
        decryptJwe: async () => {
            throw new Error('Requêtes chiffrées (JAR encrypted) non supportées');
        },
    },
});

// ─── Déroulement du protocole ─────────────────────────────────────────────────

const uri = ref('');
const running = ref(false);
const error = ref('');
const logs = ref<{ label: string; value: unknown }[]>([]);

const log = (label: string, value: unknown) => logs.value.push({ label, value });

/** VP JWT W3C signée par le holder, liée au nonce et au client_id du verifier. */
async function createVpJwt(credentialJwts: string[], nonce: string, audience: string) {
    const key = await jose.importJWK(HOLDER_PRIVATE_JWK, 'ES256');
    return await new jose.SignJWT({
        nonce,
        vp: {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            type: ['VerifiablePresentation'],
            holder: HOLDER_DID,
            verifiableCredential: credentialJwts,
        },
    })
        .setProtectedHeader({ alg: 'ES256', typ: 'JWT', kid: `${HOLDER_DID}#0` })
        .setIssuer(HOLDER_DID)
        .setAudience(audience)
        .setIssuedAt()
        .setJti(crypto.randomUUID())
        .sign(key);
}

/**
 * Types demandés par une query DCQL.
 *
 * `meta.type_values` est un tableau de tableaux (une alternative par entrée) dans
 * la spec, mais certains verifiers envoient un tableau plat de chaînes.
 */
function requestedTypes(query: any): string[] {
    return [query.meta?.type_values?.[0] ?? []].flat().filter((t) => typeof t === 'string');
}

/** Sélection naïve : premier credential dont les types couvrent ceux demandés. */
function pickCredential(types: string[]) {
    const matched = CREDENTIALS.find((c) => types.every((t) => c.types.includes(t)));
    const credential = matched ?? CREDENTIALS[0];
    if (!credential) throw new Error('Aucun credential en dur dans le wallet');
    return { credential, matched: Boolean(matched) };
}

/** Libellé de log rendant explicite un repli sur un credential non conforme. */
function describePick(pick: ReturnType<typeof pickCredential>, types: string[]) {
    return pick.matched
        ? pick.credential.id
        : `${pick.credential.id} (aucun match pour [${types.join(', ')}], fallback)`;
}

async function run() {
    running.value = true;
    error.value = '';
    logs.value = [];

    try {
        // 1. Parse du lien fourni par le développeur
        const parsed = client.parseOpenid4vpAuthorizationRequest({
            authorizationRequest: uri.value.trim(),
        });
        log(`request parsée (${parsed.type}, via ${parsed.provided})`, parsed.params);

        // 2. Résolution : récupération du request_uri, vérification du JAR et du client_id
        const resolved = await client.resolveOpenId4vpAuthorizationRequest({
            authorizationRequestPayload: parsed.params,
            responseMode: { type: 'direct_post' },
        });
        const request = resolved.authorizationRequestPayload as any;
        log(`request résolue (OID4VP v${resolved.version}, client ${request.client_id})`, request);

        // 3. Construction du vp_token (DCQL en priorité, sinon Presentation Exchange)
        const audience = request.client_id;
        let vpTokenPayload: Record<string, unknown>;

        if (resolved.dcql) {
            const queries = (resolved.dcql.query as any).credentials ?? [];
            const vpToken: Record<string, unknown> = {};
            for (const query of queries) {
                const types = requestedTypes(query);
                const pick = pickCredential(types);
                const vpJwt = await createVpJwt([pick.credential.jwt], request.nonce, audience);
                // OID4VP 1.0 attend un tableau, les drafts antérieurs une chaîne
                vpToken[query.id] = resolved.version >= 100 ? [vpJwt] : vpJwt;
                log(`credential présenté pour "${query.id}"`, describePick(pick, types));
            }
            vpTokenPayload = { vp_token: vpToken };
        } else {
            const definition = resolved.pex?.presentation_definition;
            if (!definition) throw new Error('Ni dcql_query ni presentation_definition dans la requête');
            const descriptors = definition.input_descriptors ?? [];
            const selected = descriptors.map((d: any) => {
                const types = (d.constraints?.fields ?? [])
                    .filter((f: any) => f.path?.includes('$.vc.type') || f.path?.includes('$.type'))
                    .flatMap((f: any) => f.filter?.contains?.const ?? []);
                const requested = [types].flat().filter(Boolean) as string[];
                const pick = pickCredential(requested);
                log(`credential présenté pour "${d.id}"`, describePick(pick, requested));
                return pick.credential;
            });
            const vpJwt = await createVpJwt(
                selected.map((c: { jwt: string }) => c.jwt),
                request.nonce,
                audience,
            );
            vpTokenPayload = {
                vp_token: vpJwt,
                presentation_submission: {
                    id: crypto.randomUUID(),
                    definition_id: definition.id,
                    descriptor_map: descriptors.map((d: any, i: number) => ({
                        id: d.id,
                        format: 'jwt_vp_json',
                        path: '$',
                        path_nested: {
                            format: 'jwt_vc_json',
                            path: `$.vp.verifiableCredential[${i}]`,
                        },
                    })),
                },
            };
        }

        // 4. Réponse d'autorisation, chiffrée en JARM si le verifier l'exige
        const created = await client.createOpenid4vpAuthorizationResponse({
            authorizationRequestPayload: request,
            authorizationResponsePayload: vpTokenPayload as any,
            jarm:
                request.response_mode === 'direct_post.jwt'
                    ? {
                          encryption: { nonce: request.nonce },
                          serverMetadata: {
                              authorization_signing_alg_values_supported: ['ES256'],
                              authorization_encryption_alg_values_supported: ['ECDH-ES'],
                              authorization_encryption_enc_values_supported: [
                                  'A128GCM',
                                  'A256GCM',
                                  'A128CBC-HS256',
                              ],
                          },
                      }
                    : undefined,
        });
        log(
            created.jarm ? 'réponse créée (JARM chiffrée)' : 'réponse créée',
            created.authorizationResponsePayload,
        );

        // 5. Envoi au response_uri du verifier
        const { response } = await client.submitOpenid4vpAuthorizationResponse({
            authorizationRequestPayload: request,
            authorizationResponsePayload: created.authorizationResponsePayload,
            jarm: created.jarm ? { responseJwt: created.jarm.responseJwt } : undefined,
        });
        const body = await response.text();
        log(`réponse du verifier (HTTP ${response.status})`, body || '<vide>');
        if (!response.ok) throw new Error(`Le verifier a rejeté la présentation: ${body}`);
    } catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        running.value = false;
    }
}

const format = (value: unknown) =>
    typeof value === 'string' ? value : JSON.stringify(value, null, 2);
</script>

<template>
    <div class="flex flex-col gap-3">
        <div class="flex gap-2">
            <InputText
                v-model="uri"
                class="flex-1"
                placeholder="openid4vp://?client_id=...&request_uri=..."
                @keyup.enter="run"
            />
            <Button label="Présenter" icon="pi pi-send" :loading="running" :disabled="!uri" @click="run" />
        </div>

        <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

        <div v-for="(entry, i) in logs" :key="i" class="text-sm">
            <div class="font-semibold">{{ i + 1 }}. {{ entry.label }}</div>
            <pre class="m-0 overflow-x-auto whitespace-pre-wrap break-all text-xs opacity-70">{{
                format(entry.value)
            }}</pre>
        </div>
    </div>
</template>
