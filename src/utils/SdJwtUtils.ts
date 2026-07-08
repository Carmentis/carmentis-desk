import {digest, ES256, generateSalt} from "@sd-jwt/crypto-browser";
import {SDJwtVcInstance} from "@sd-jwt/sd-jwt-vc";
import {SDJwt} from "@sd-jwt/core";
import {PrivateSignatureKey, PublicSignatureKey} from "@cmts-dev/carmentis-sdk-core";
import {base64url} from "jose";
import {OrPromise, Signer, Verifier} from "@sd-jwt/types";
import {DeskLogger} from "./DeskLogger.ts";

interface SdJwtParserHandler {
    getHandlerName(): string;
    tryToParse(credential: unknown): Promise<SDJwt | null>;
}

const parserLogger = DeskLogger.getLogger().getChild("sd-jwt").getChild('parser')

class JSONSdJwtParser implements SdJwtParserHandler {
    private static logger = parserLogger.getChild("json")

    getHandlerName(): string {
        return 'JSONSdJwtParser'
    }

    async tryToParse(credential: unknown): Promise<SDJwt | null> {

        try {
            let formattedCredential: object = {};
            if (typeof credential === 'string') {
                formattedCredential = JSON.parse(credential);
            } else if (typeof credential === 'object') {
                formattedCredential = credential as object;
            }

            const json = formattedCredential as object;
            if (typeof json !== 'object' || json === null) {
                return null;
            }
            const obj = new SDJwt(json);
            // @ts-ignore we want to access the private field
            const encoded = obj.jwt?.encoded;
            const sdjwt = await SdJwtUtils.getRandomSdJwtInstance();
            return await sdjwt.decode(encoded)

        } catch (e) {
            JSONSdJwtParser.logger.debug(`Unable to decode credential ${credential}: ${e}`)
            return null;
        }
    }
}

class CompactSdJwtParser implements SdJwtParserHandler {
    private static logger = parserLogger.getChild("compact")
    getHandlerName(): string {
        return 'CompactSdJwtParser'
    }


    async tryToParse(credential: unknown): Promise<SDJwt | null> {
        if (typeof credential !== 'string') {
            return null;
        }
        try {
            const sdjwt = await SdJwtUtils.getRandomSdJwtInstance();
            return sdjwt.decode(credential);
        } catch (e) {
            CompactSdJwtParser.logger.debug(`Unable to decode sd-jwt: ${e}`)
            return null;
        }
    }
}

class SdJwtParserManager {
    private logger = parserLogger;
    private readonly handlers: SdJwtParserHandler[] = [
        new JSONSdJwtParser(),
        new CompactSdJwtParser(),
    ];

    async tryToParse(credential: unknown): Promise<SDJwt | null> {
        for (const handler of this.handlers) {
            this.logger.debug(`Trying to parse with ${handler.getHandlerName()}`)
            const parsed = await handler.tryToParse(credential);
            if (parsed) {
                this.logger.debug(`Parsed with ${handler.getHandlerName()}`)
                return parsed;
            }
        }
        return null;
    }
}

export class SdJwtUtils {
    static async isSdJwt(credential: unknown): Promise<boolean> {
        const parser = new SdJwtParserManager();
        const result = await parser.tryToParse(credential);
        return result !== null;
    }

    static async parseSdJWt(credential: unknown): Promise<SDJwt> {
        const parser = new SdJwtParserManager();
        const result = await parser.tryToParse(credential);
        if (result === null) throw new Error("Invalid SD-JWT format");
        return result
    }


    static async encodeSdJwt(sdJwt: SDJwt): Promise<string> {
        const instance = await SdJwtUtils.getRandomSdJwtInstance();
        return instance.encode(sdJwt);
    }

    static async getRandomSdJwtInstance() {
        const {privateKey, publicKey} = await ES256.generateKeyPair();
        const signer = await ES256.getSigner(privateKey);
        const verifier = await ES256.getVerifier(publicKey);
        const sdjwt = new SDJwtVcInstance({
            signer,
            signAlg: ES256.alg,
            verifier,
            hasher: digest,
            saltGenerator: generateSalt,
        });
        return sdjwt
    }

    static createSdJwtSignerFromPrivateKey(privateKey: PrivateSignatureKey): Signer {
        // create the Carmentis signer
        return async (data: string) => {
            const bytes = new TextEncoder().encode(data);
            const signature = await privateKey.sign(bytes);
            return base64url.encode(signature as any);
        };
    }

    static createSdJwtVerifierFromPublicKey(publicKey: PublicSignatureKey): Verifier {
        // create the Carmentis verifier
        return async (data: string, signature: string) => {
            const message = new TextEncoder().encode(data);
            const sig = base64url.decode(signature);

            return await publicKey.verify(message, sig);
        };
    }
}
