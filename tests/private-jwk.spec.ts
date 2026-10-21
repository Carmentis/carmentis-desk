import {describe, expect, it} from "vitest";
import {
    analyzePrivateJwk,
    findJwkAlgorithm,
    formatJwk,
    generatePrivateJwk,
    isRsaAlgorithm,
    JWK_ALGORITHM_GROUPS,
} from "../src/utils/jwk/privateJwk";

const ALL_ALGORITHMS = JWK_ALGORITHM_GROUPS.flatMap((group) => group.items.map((item) => item.value));

describe("JWK algorithm catalog", () => {
    it("offers every algorithm the SDK supports, once", () => {
        expect([...ALL_ALGORITHMS].sort()).toEqual([
            "ES256", "ES256K", "ES384", "ES512", "Ed25519", "Ed448",
            "ML-DSA-44", "ML-DSA-65", "ML-DSA-87",
            "PS256", "PS384", "PS512", "RS256", "RS384", "RS512",
        ].sort());
    });

    it("knows which algorithms are RSA", () => {
        expect(ALL_ALGORITHMS.filter(isRsaAlgorithm).sort()).toEqual(["PS256", "PS384", "PS512", "RS256", "RS384", "RS512"]);
        expect(isRsaAlgorithm("ES256")).toBe(false);
        expect(findJwkAlgorithm("Ed25519")?.label).toBe("Ed25519");
    });
});

describe("JWK generation", () => {
    it.each(ALL_ALGORITHMS)("generates a private JWK for %s that the wallet accepts", async (algorithm) => {
        const jwk = await generatePrivateJwk(algorithm);
        const analysis = await analyzePrivateJwk(formatJwk(jwk));
        expect(analysis).toMatchObject({ok: true, algorithm});
    }, 30_000);

    it("generates RSA keys of the requested size", async () => {
        const jwk = await generatePrivateJwk("RS256", 3072);
        // n is the base64url modulus: 3072 bits = 384 bytes = 512 characters
        expect((jwk.n as string).length).toBe(512);
    }, 30_000);

    it("lays the JWK out on several lines", () => {
        expect(formatJwk({kty: "OKP", crv: "Ed25519"})).toBe('{\n  "kty": "OKP",\n  "crv": "Ed25519"\n}');
    });
});

describe("JWK analysis", () => {
    it("ignores an empty text", async () => {
        expect(await analyzePrivateJwk("   ")).toBeNull();
    });

    it("explains what is wrong", async () => {
        expect(await analyzePrivateJwk("{nope")).toEqual({ok: false, error: "This is not valid JSON."});
        expect(await analyzePrivateJwk('{"crv":"P-256"}')).toMatchObject({ok: false, error: expect.stringContaining("'kty'")});
    });

    it("refuses a public key, which cannot sign", async () => {
        const jwk = await generatePrivateJwk("ES256");
        const {d: _d, ...publicOnly} = jwk;
        expect(await analyzePrivateJwk(JSON.stringify(publicOnly))).toMatchObject({
            ok: false,
            error: expect.stringContaining("no private part"),
        });
    });

    it("tells the kind of key", async () => {
        const jwk = await generatePrivateJwk("ES256");
        expect(await analyzePrivateJwk(JSON.stringify(jwk))).toEqual({ok: true, algorithm: "ES256", kty: "EC", crv: "P-256"});
    });
});
