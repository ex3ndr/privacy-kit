import { Point } from "@/modules/algebraic/math/point";
import { Sigma } from "@/modules/algebraic/sigma/Sigma";
import { encodeBigInt32 } from "../formats/bigint";
import { encodeUsername } from "./utils/encodeUsername";
import { concatBytes } from "../formats/bytes";
import { deriveScalar } from "../algebraic/math/scalar";

/**
 * Hashes and proofs knowledge of a username using Signal's algorithm.
 * 
 * @param nickname - The username nickname (case-insensitive, 1-20 characters)
 * @param discriminator - The numeric discriminator
 * @returns The proof with hash in it
 */
export function zkUsernameProof(nickname: string, discriminator: number): Uint8Array {

    // Validate inputs
    if (!nickname || nickname.length === 0) {
        throw new Error("Nickname cannot be empty");
    }
    if (discriminator < 0 || !Number.isSafeInteger(discriminator)) {
        throw new Error("Discriminator must be a safe positive integer");
    }

    // Calculate sclars
    const nicknameScalar = encodeUsername(nickname);
    const discriminatorScalar = BigInt(discriminator);
    const hashScalar = deriveScalar(concatBytes(encodeBigInt32(nicknameScalar), encodeBigInt32(discriminatorScalar)), 'signal_username_hash');

    // Calculate nonce
    // NOTE: We dont really need nonce since all scalars are already included in entropy anyway
    //       but lets keep it for consistency and original signal implementation
    const nonce = encodeBigInt32(hashScalar);

    // Calculate proof
    const { proof } = PROTOCOL.prove({
        nonce,
        variables: {
            h: hashScalar,
            n: nicknameScalar,
            d: discriminatorScalar
        }
    });

    return proof;
}

/**
 * Verifies a zero-knowledge proof of username knowledge.
 * 
 * @param proof - The serialized proof bytes
 * @param usernameHash - The claimed username hash
 * @param nonce - The nonce used to create the proof
 * @returns Stable hash of the username
 */
export function zkUsernameVerify(proof: Uint8Array): Uint8Array | null {
    const ok = PROTOCOL.verify({ proof });
    if (!ok) {
        return null;
    }
    return ok.computed.H.toBytes();
}

//
// Sigma Protocol for proving knowledge of username hash
// This protocol proves:
// 1) I know the scalars h, n, d such that H = G1^h + G2^n + G3^d
// 2) All usernames can be encoded as scalars (n) modulo the order of the group
// 3) Discriminator is a safe positive integer (d)
//

const PROTOCOL = Sigma.create("H = G1^h + G2^n + G3^d")
    .withUsage("signal_username_proof_v1")
    .withValue("G1", Point.fromHash("signal_username_hash_g1", "signal_username_v1"))
    .withValue("G2", Point.fromHash("signal_username_hash_g2", "signal_username_v1"))
    .withValue("G3", Point.fromHash("signal_username_hash_g3", "signal_username_v1"));