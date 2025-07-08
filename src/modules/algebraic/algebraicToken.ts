import { concatBytes } from "../formats/bytes";
import { encodeUTF8 } from "../formats/text";
import { decodeBigInt, encodeBigInt, exportBigInt } from "./encoding/bigint";
import { Point } from "./math/point";
import { deriveScalar, generateRandomScalar } from "./math/scalar";

/*
 * This is an algebraic anonymous token system. 
 * Token requests are created by the client and sent to the server.
 * Requests is formed:
 * 1. Derive anonymous ID with sufficient entropy from seed (expect 32 bytes+ of entropy)
 * 2. Compute public points G1, G2 and H from service name
 * 3. 
 *
 */

export function createAlgebraicTokenRequest(
    opts: {
        seed: Uint8Array,
        service: string,
        challenge: Uint8Array,
        publicKey: Uint8Array,
    }
) {

    // Derive anonymous ID with sufficient entropy
    const anonymousIDScalar = deriveScalar(opts.seed, 'Anonymized ID For ' + opts.service);

    // Derive generator
    const g1 = Point.fromHash('G1', 'Generator for ' + opts.service);
    const g2 = Point.fromHash('G2', 'Generator for ' + opts.service);
    const h = Point.fromHash('H', 'Generator for ' + opts.service);

    // Blinded challenge
    const commitmentPoint = g1.multiply(anonymousIDScalar);

    // Create blinding factor
    const blindingFactor = generateRandomScalar(Point.ORDER);
    const blindingCommitment = g1.multiply(blindingFactor);

    // Derive challenge
    const challengeScalar = deriveScalar(
        concatBytes(
            opts.challenge,
            blindingCommitment.toBytes(),
            encodeUTF8(opts.service)
        ),
        'Challenge'
    );

    // Create proof
    const proofScalar = (blindingFactor + challengeScalar * anonymousIDScalar) % Point.ORDER;

    // Create blinded anon id with public key
    const blindA = generateRandomScalar(Point.ORDER);
    const blindB = generateRandomScalar(Point.ORDER);
    const blindedAnonID = commitmentPoint
        .add(g1.multiply(blindA))
        .add(Point.fromBytes(opts.publicKey).multiply(blindB));

    return {
        commitment: commitmentPoint.toBytes(),
        proof: concatBytes(blindingCommitment.toBytes(), exportBigInt(proofScalar)),
        blindedAnonID: blindedAnonID.toBytes(),
        blindA: exportBigInt(blindA),
        blindB: exportBigInt(blindB),
    }
}

export function createAlgebraicBlindedToken(
    opts: {
        commitment: Uint8Array,
        proof: Uint8Array,
        service: string,
        blindedAnonID: Uint8Array,
        challenge: Uint8Array,
        publicKey: Uint8Array,
        secretKey: Uint8Array,
    }
) {

    // Derive generator
    const g1 = Point.fromHash('G1', 'Generator for ' + opts.service);

    // Parse commitment
    const commitmentPoint = Point.fromBytes(opts.commitment);

    // Parse proof
    const blindingCommitment = Point.fromBytes(opts.proof.slice(0, 32));
    const proofScalar = decodeBigInt(opts.proof.slice(32));

    // Derive challenge
    const challengeScalar = deriveScalar(
        concatBytes(
            opts.challenge,
            blindingCommitment.toBytes(),
            encodeUTF8(opts.service)
        ),
        'Challenge'
    );

    // Verify proof
    const expectedCommitment = blindingCommitment.add(commitmentPoint.multiply(challengeScalar));
    const proofBlinded = g1.multiply(proofScalar);
    if (!proofBlinded.equals(expectedCommitment)) {
        return null;
    }

    // Sign
    const timestamp = Math.floor(Date.now() / 1000);
    const secretKey = decodeBigInt(opts.secretKey);
    const k = generateRandomScalar(Point.ORDER);
    const R = g1.multiply(k);
    const e = deriveScalar(
        concatBytes(R.toBytes(), opts.blindedAnonID, encodeUTF8(opts.service), encodeBigInt(BigInt(timestamp))),
        'Signature Challenge'
    );
    const sigma = (k + e * secretKey) % Point.ORDER;

    // Return result
    return {
        signature: concatBytes(R.toBytes(), exportBigInt(sigma)),
        timestamp
    };
}

export function unblindAlgebraicBlindedToken(opts: {
    seed: Uint8Array,
    service: string,
    timestamp: number,
    signature: Uint8Array,
    commitment: Uint8Array,
    blindA: bigint,
    blindB: bigint
}) {

    // Derive anonymous ID with sufficient entropy
    const anonymousIDScalar = deriveScalar(opts.seed, 'Anonymized ID For ' + opts.service);
    const g1 = Point.fromHash('G1', 'Generator for ' + opts.service);
    const commitmentPoint = g1.multiply(anonymousIDScalar);

    const R = Point.fromBytes(opts.signature.slice(0, 32));
    const sigma = decodeBigInt(opts.signature.slice(32));

    const e = deriveScalar(
        concatBytes(R.toBytes(), commitmentPoint.toBytes(), encodeUTF8(opts.service), encodeBigInt(BigInt(opts.timestamp))),
        'Signature Challenge'
    );
}