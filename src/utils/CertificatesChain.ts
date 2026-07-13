import * as x509 from "@peculiar/x509";

export class CertificatesChain {
    static async verifyX509Chain(pemChain: string[]): Promise<boolean> {
        // pemChain[0] = certificat feuille, ..., dernier = root auto-signé
        const certs = pemChain.map(pem => new x509.X509Certificate(pem));

        for (let i = 0; i < certs.length; i++) {
            const cert = certs[i];
            const issuerCert = i + 1 < certs.length ? certs[i + 1] : cert; // dernier -> auto-signé

            const isValid = await cert.verify({
                publicKey: await issuerCert.publicKey.export(),
            });

            if (!isValid) {
                console.error(`Signature invalide pour le certificat ${i} (issuer: ${issuerCert.subject})`);
                return false;
            }

            // vérifier aussi la cohérence issuer/subject
            if (cert.issuer !== issuerCert.subject) {
                console.error(`Issuer mismatch au niveau ${i}: attendu "${cert.issuer}", trouvé "${issuerCert.subject}"`);
                return false;
            }
        }

        // vérifier que le dernier certificat est bien auto-signé
        const root = certs[certs.length - 1];
        const rootSelfSigned = await root.verify({ publicKey: await root.publicKey.export() });
        if (!rootSelfSigned || root.issuer !== root.subject) {
            console.error('Le dernier certificat n\'est pas auto-signé');
            return false;
        }

        return true;
    }
}