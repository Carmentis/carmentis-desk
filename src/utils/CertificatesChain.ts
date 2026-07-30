import * as x509 from "@peculiar/x509";

export type ChainValidationResult =
    | { status: 'valid' }
    | { status: 'incomplete'; reason: string } // e.g. root missing, otherwise consistent
    | { status: 'invalid'; reason: string };   // genuine cryptographic/logic break

    export class CertificatesChain {
    static async verifyX509Chain(pemChain: string[]): Promise<ChainValidationResult> {
        const certs = pemChain.map(pem => new x509.X509Certificate(pem));

        for (let i = 0; i < certs.length - 1; i++) {
            const cert = certs[i];
            const issuerCert = certs[i + 1];

            const isValid = await cert.verify({ publicKey: await issuerCert.publicKey.export() });
            if (!isValid || cert.issuer !== issuerCert.subject) {
                return { status: 'invalid', reason: `Certificate ${i} does not chain to certificate ${i + 1}` };
            }
        }

        const root = certs[certs.length - 1];
        const rootSelfSigned = await root.verify({ publicKey: await root.publicKey.export() });

        if (!rootSelfSigned || root.issuer !== root.subject) {
            return { status: 'incomplete', reason: 'Last certificate is not self-signed (root may be missing)' };
        }

        return { status: 'valid' };
    }
}
