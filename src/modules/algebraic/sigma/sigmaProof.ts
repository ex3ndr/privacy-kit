import { Point } from '../math/point';
import { generateRandomScalar, deriveScalar } from '../math/scalar';
import { concatBytes } from '@/modules/formats/bytes';
import { encodeUTF8 } from '@/modules/formats/text';
import { encodeBigInt } from '../encoding/bigint';
import {
    ProtocolVariables,
    SigmaProtocol,
    ExtractProtocolScalars,
    ExtractProtocolPoints
} from "./sigmaDefinition";

// Sigma proof structure following the commit-challenge-response pattern
export type SigmaProof<TScalars extends string = string> = {
    // Commitments: random values for each secret scalar
    commitments: { [K in TScalars]: Point };
    // Challenge: derived from protocol, commitments, and context
    challenge: bigint;
    // Responses: challenge * secret + randomness for each scalar
    responses: { [K in TScalars]: bigint };
};

// Create a sigma proof for a given protocol and secret variables
export function createSigmaProof<T extends SigmaProtocol<any, any>>(opts: {
    protocol: T;
    variables: ProtocolVariables<T>;
    nonce: Uint8Array;
    usage: string;
}): SigmaProof<ExtractProtocolScalars<T>> {
    const { protocol, variables, nonce, usage } = opts;

    // Step 1: Generate random commitments for each secret scalar
    const commitmentRandomness: { [key: string]: bigint } = {};
    const commitments: { [key: string]: Point } = {};

    for (const scalarName of protocol.scalars) {
        // Generate random value for this scalar
        const randomness = generateRandomScalar();
        commitmentRandomness[scalarName] = randomness;

        // Compute commitment: sum of all generator points that use this scalar
        let commitment = Point.ZERO;

        for (const statement of protocol.statements) {
            for (const term of statement.parsed.terms) {
                if (term.scalarName === scalarName) {
                    // Get the generator point for this term
                    const generatorPoint = variables[term.pointName as keyof ProtocolVariables<T>] as Point;
                    // Add generator^randomness to the commitment
                    commitment = commitment.add(generatorPoint.multiply(randomness));
                }
            }
        }

        commitments[scalarName] = commitment;
    }

    // Step 2: Generate challenge using Fiat-Shamir heuristic
    const challenge = generateChallenge({
        protocol,
        commitments,
        nonce,
        usage,
        publicVariables: extractPublicVariables(protocol, variables)
    });

    // Step 3: Generate responses: response = challenge * secret + randomness
    const responses: { [key: string]: bigint } = {};

    for (const scalarName of protocol.scalars) {
        const secret = variables[scalarName as keyof ProtocolVariables<T>] as bigint;
        const randomness = commitmentRandomness[scalarName];

        // response = challenge * secret + randomness (mod curve order)
        const response = (challenge * secret + randomness) % Point.ORDER;
        responses[scalarName] = response;
    }

    return {
        commitments: commitments as { [K in ExtractProtocolScalars<T>]: Point },
        challenge,
        responses: responses as { [K in ExtractProtocolScalars<T>]: bigint }
    };
}

// Verify a sigma proof
export function verifySigmaProof<
    TScalars extends string,
    TPoints extends string
>(
    proof: SigmaProof<TScalars>,
    publicVariables: { [K in TPoints]: Point },
    protocol: SigmaProtocol<TScalars, TPoints>,
    nonce: Uint8Array,
    usage: string
): { isValid: boolean; error?: string } {
    try {
        const { commitments, challenge, responses } = proof;

        // Step 1: Recompute the challenge
        const expectedChallenge = generateChallenge({
            protocol,
            commitments,
            nonce,
            usage,
            publicVariables
        });

        if (challenge !== expectedChallenge) {
            return { isValid: false, error: 'Challenge verification failed' };
        }

        // Step 2: Verify the overall equation
        // The key insight: we verify that the sum of all commitments plus challenge times
        // all left sides equals the sum of all generator^response terms

        let totalCommitments = Point.ZERO;
        let totalChallengeTimesLeftSides = Point.ZERO;
        let totalGeneratorResponses = Point.ZERO;

        // Add all commitments
        for (const scalarName of protocol.scalars) {
            const commitment = commitments[scalarName as TScalars];
            if (!commitment) {
                return { isValid: false, error: `Missing commitment for scalar ${scalarName}` };
            }
            totalCommitments = totalCommitments.add(commitment);
        }

        // For each statement, add challenge * leftSide and subtract generator^response terms
        for (const statement of protocol.statements) {
            const leftSidePoint = publicVariables[statement.parsed.left as TPoints];
            if (!leftSidePoint) {
                return { isValid: false, error: `Left side point ${statement.parsed.left} not found` };
            }

            // Add challenge * leftSide
            totalChallengeTimesLeftSides = totalChallengeTimesLeftSides.add(leftSidePoint.multiply(challenge));

            // Add all generator^response terms for this statement
            for (const term of statement.parsed.terms) {
                const generatorPoint = publicVariables[term.pointName as TPoints];
                const response = responses[term.scalarName as TScalars];

                if (!generatorPoint || response === undefined) {
                    return { isValid: false, error: `Missing data for term ${term.pointName}^${term.scalarName}` };
                }

                totalGeneratorResponses = totalGeneratorResponses.add(generatorPoint.multiply(response));
            }
        }

        // Verify the global equation: commitments + challenge * leftSides = generator^responses
        const leftSide = totalCommitments.add(totalChallengeTimesLeftSides);

        if (!leftSide.equals(totalGeneratorResponses)) {
            return { isValid: false, error: 'Proof equation verification failed' };
        }

        return { isValid: true };
    } catch (error) {
        return { isValid: false, error: `Verification error: ${error}` };
    }
}

// Helper function to add length-prefixed data to transcript
function addToTranscript(data: Uint8Array): Uint8Array {
    const length = encodeBigInt(BigInt(data.length));
    return concatBytes(length, data);
}

// Generate challenge using Fiat-Shamir heuristic
function generateChallenge<TScalars extends string, TPoints extends string>(opts: {
    protocol: SigmaProtocol<TScalars, TPoints>;
    commitments: { [K in TScalars]: Point };
    nonce: Uint8Array;
    usage: string;
    publicVariables: { [K in TPoints]: Point };
}): bigint {
    const { protocol, commitments, nonce, usage, publicVariables } = opts;

    // Build transcript for Fiat-Shamir with length prefixing
    const transcriptParts: Uint8Array[] = [
        addToTranscript(encodeUTF8(usage)), // Usage provides domain separation
        addToTranscript(nonce),
        addToTranscript(protocol.descriptor) // Use binary descriptor instead of normalized statements
    ];

    // Add public variables to transcript (already sorted by protocol.points)
    for (const pointName of protocol.points.sort()) {
        const point = publicVariables[pointName as TPoints];
        if (!point) {
            throw new Error(`Missing public variable: ${pointName}`);
        }
        transcriptParts.push(addToTranscript(point.toBytes()));
    }

    // Add commitments to transcript (already sorted by protocol.scalars)
    for (const scalarName of protocol.scalars.sort()) {
        const commitment = commitments[scalarName as TScalars];
        if (!commitment) {
            throw new Error(`Missing commitment: ${scalarName}`);
        }
        transcriptParts.push(addToTranscript(commitment.toBytes()));
    }

    // Derive challenge from transcript
    const transcript = concatBytes(...transcriptParts);
    return deriveScalar(transcript, 'fiat_shamir_challenge');
}

// Extract public variables (points) from the complete variable set
function extractPublicVariables<T extends SigmaProtocol<any, any>>(
    protocol: T,
    variables: ProtocolVariables<T>
): { [K in ExtractProtocolPoints<T>]: Point } {
    const publicVars: any = {};

    for (const pointName of protocol.points) {
        publicVars[pointName] = variables[pointName as keyof ProtocolVariables<T>];
    }

    return publicVars;
}

// Utility function to create a proof and return only public data needed for verification
export function createPublicSigmaProof<T extends SigmaProtocol<any, any>>(opts: {
    protocol: T;
    variables: ProtocolVariables<T>;
    nonce: Uint8Array;
    usage: string;
}): {
    proof: SigmaProof<ExtractProtocolScalars<T>>;
    publicVariables: { [K in ExtractProtocolPoints<T>]: Point };
} {
    const proof = createSigmaProof(opts);
    const publicVariables = extractPublicVariables(opts.protocol, opts.variables);

    return { proof, publicVariables };
}