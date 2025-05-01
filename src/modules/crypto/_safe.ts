import { hmac_sha512 } from "./hmac_sha512";
import { pbkdf2_sha512 } from "./pbkdf2_sha512";
import { sha512 } from "./sha512";
import { deriveSecureKey } from "./deriveSecureKey";
import { randomUUID } from "./randomUUID";
import { randomKey } from "./randomKey";
import { randomKeySimple } from "./randomKeySimple";
import { sha256 } from "./sha256";

export const safeCrypto = {
    // Primitives
    hmac_sha512: hmac_sha512,
    pbkdf2_sha512: pbkdf2_sha512,
    sha512: sha512,
    sha256: sha256,

    // Derivations
    deriveSecureKey: deriveSecureKey,

    // Random
    randomUUID: randomUUID,
    randomKey: randomKey,
    randomKeySimple: randomKeySimple
}