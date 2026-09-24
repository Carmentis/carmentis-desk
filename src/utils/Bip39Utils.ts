import {generateMnemonic} from "@scure/bip39";
import {wordlist} from "@scure/bip39/wordlists/english.js";

export class Bip39Utils {
    static generateMnemonic(security: 128 | 256 = 128): string {
        return generateMnemonic(wordlist, security); // 128 bits = 12 words
    }
}