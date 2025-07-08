import { Point } from '../math/point';
import { deriveScalar } from '../math/scalar';
import { concatBytes } from '@/modules/formats/bytes';
import { encodeUTF8 } from '@/modules/formats/text';
import { encodeBigInt } from '../encoding/bigint';
import {
    ProtocolInputVariables,
    ProtocolVerificationVariables,
    SigmaProtocol,
    ExtractProtocolScalars,
    ExtractProtocolCommitments
} from "./sigmaDefinition";

// Sigma proof structure following the commit-challenge-response pattern
export type SigmaProof<TScalars extends string = string> = {
    challenge: bigint;
    responses: { [K in TScalars]: bigint };
};

// Create a sigma proof for a given protocol and secret variables
export function createSigmaProof<T extends SigmaProtocol<any, any, any>>(
    protocol: T,
    variables: ProtocolInputVariables<T>,
    nonce: Uint8Array,
    usage: string
): {
    proof: SigmaProof<ExtractProtocolScalars<T>>;
    computed: { [K in ExtractProtocolCommitments<T>]: Point };
} {

    //
    // Step 1: Calculate computed points (left side values) for the protocol
    // These are the public commitments that we're proving knowledge of
    //

    let allVariables: { [key: string]: Point | bigint } = { ...variables };
    let computed: { [K in ExtractProtocolCommitments<T>]: Point } = {} as { [K in ExtractProtocolCommitments<T>]: Point };

    // Process statements in order to allow using previous computed values
    for (const statement of protocol.statements) {
        let computedPoint = Point.ZERO;

        for (const term of statement.parsed.terms) {
            const scalar = variables[term.scalarName as keyof typeof variables] as bigint;
            if (scalar === undefined) {
                throw new Error(`Missing scalar: ${term.scalarName}`);
            }

            let point: Point;
            if (term.pointName === 'G') {
                point = Point.BASE;
            } else if (term.pointName in allVariables) {
                point = allVariables[term.pointName as keyof typeof allVariables] as Point;
            } else {
                throw new Error(`Point ${term.pointName} not found in variables`);
            }

            if (scalar !== 0n) {
                computedPoint = computedPoint.add(point.multiply(scalar));
            }
        }

        // Store the computed point for future statements to use
        computed[statement.parsed.left as keyof typeof computed] = computedPoint;
        allVariables[statement.parsed.left] = computedPoint;
    }

    //
    // Step 2: Create initial SHO state by absorbing protocol, computed values, and generator points
    //

    const transcript: Uint8Array[] = [
        addToTranscript(encodeUTF8(usage)),
        addToTranscript(protocol.descriptor),
    ];

    // Add generator points (excluding G which is implicit)
    for (const pointName of protocol.points) {
        const point = variables[pointName as keyof typeof variables] as Point;
        if (!point) {
            throw new Error(`Missing generator point: ${pointName}`);
        }
        transcript.push(addToTranscript(point.toBytes()));
    }

    // Add computed points
    for (const commitmentName of protocol.commitments) {
        const point = computed[commitmentName as keyof typeof computed];
        transcript.push(addToTranscript(point.toBytes()));
    }

    //
    // Step 3: Generate synthetic nonce by hashing randomness, witness (secret scalars), and nonce
    // This ensures the randomness appears random but is deterministic for the same inputs
    //

    const nonceTranscriptParts = [
        addToTranscript(encodeUTF8('nonce_generation')),
        addToTranscript(nonce),
        ...transcript,
    ];

    // Add all secret scalars to nonce generation
    for (const scalarName of protocol.scalars) {
        const scalar = variables[scalarName as keyof typeof variables] as bigint;
        if (scalar === undefined) {
            throw new Error(`Missing scalar: ${scalarName}`);
        }
        nonceTranscriptParts.push(addToTranscript(encodeBigInt(scalar)));
    }

    // Generate one random value per scalar
    const randomnessValues: { [key: string]: bigint } = {};
    const nonceSeed = concatBytes(...nonceTranscriptParts);
    
    for (let i = 0; i < protocol.scalars.length; i++) {
        const scalarName = protocol.scalars[i];
        randomnessValues[scalarName] = deriveScalar(
            concatBytes(nonceSeed, encodeBigInt(BigInt(i))), 
            'nonce'
        );
    }

    //
    // Step 4: Compute randomness commitments (this is what makes it a proper sigma protocol)
    // For each statement: R = sum(generator_i^randomness_i)
    //

    const randomnessCommitments: Point[] = [];
    allVariables = { ...variables }; // Reset to original variables
    
    for (const statement of protocol.statements) {
        let randomnessCommitment = Point.ZERO;

        for (const term of statement.parsed.terms) {
            const randomness = randomnessValues[term.scalarName];
            
            let point: Point;
            if (term.pointName === 'G') {
                point = Point.BASE;
            } else if (term.pointName in allVariables) {
                point = allVariables[term.pointName as keyof typeof allVariables] as Point;
            } else {
                throw new Error(`Point ${term.pointName} not found in variables`);
            }

            if (randomness !== 0n) {
                randomnessCommitment = randomnessCommitment.add(point.multiply(randomness));
            }
        }

        randomnessCommitments.push(randomnessCommitment);
        
        // Store the computed value for this statement (for use in subsequent statements)
        allVariables[statement.parsed.left] = computed[statement.parsed.left as keyof typeof computed];
    }

    //
    // Step 5: Generate challenge using Fiat-Shamir heuristic
    // Include the randomness commitments (this is crucial!)
    //

    const challengeTranscriptParts = [
        addToTranscript(encodeUTF8('challenge_generation')),
        ...transcript,
    ];

    // Add randomness commitments to challenge
    for (const commitment of randomnessCommitments) {
        challengeTranscriptParts.push(addToTranscript(commitment.toBytes()));
    }
    
    // Add nonce to challenge (important for preventing replay attacks)
    challengeTranscriptParts.push(addToTranscript(nonce));

    const challenge = deriveScalar(concatBytes(...challengeTranscriptParts), 'challenge');

    //
    // Step 6: Compute responses
    // For each scalar: response = scalar * challenge + randomness
    //

    const responses: { [K in ExtractProtocolScalars<T>]: bigint } = {} as { [K in ExtractProtocolScalars<T>]: bigint };
    
    for (const scalarName of protocol.scalars) {
        const scalar = variables[scalarName as keyof typeof variables] as bigint;
        const randomness = randomnessValues[scalarName];
        
        // response = scalar * challenge + randomness (mod order)
        responses[scalarName as keyof typeof responses] = (scalar * challenge + randomness) % Point.ORDER;
    }

    return {
        proof: {
            challenge,
            responses
        },
        computed
    };
}

// Verify a sigma proof
export function verifySigmaProof<
    TScalars extends string,
    TPoints extends string,
    TCommitments extends string
>(
    protocol: SigmaProtocol<TScalars, TPoints, TCommitments>,
    proof: SigmaProof<TScalars>,
    variables: ProtocolVerificationVariables<SigmaProtocol<TScalars, TPoints, TCommitments>>,
    nonce: Uint8Array,
    usage: string
): { isValid: boolean; error?: string } {
    try {
        const { challenge, responses } = proof;

        //
        // Step 1: Create initial transcript exactly as the prover did
        //

        const transcript: Uint8Array[] = [
            addToTranscript(encodeUTF8(usage)),
            addToTranscript(protocol.descriptor),
        ];

        // Add generator points (excluding G)
        for (const pointName of protocol.points) {
            const point = variables[pointName as keyof typeof variables] as Point;
            if (!point) {
                throw new Error(`Missing generator point: ${pointName}`);
            }
            transcript.push(addToTranscript(point.toBytes()));
        }

        // Add computed points (public commitments)
        for (const commitmentName of protocol.commitments) {
            const point = variables[commitmentName as keyof typeof variables] as Point;
            if (!point) {
                throw new Error(`Missing commitment point: ${commitmentName}`);
            }
            transcript.push(addToTranscript(point.toBytes()));
        }

        //
        // Step 2: Reconstruct randomness commitments from responses and challenge
        // For each statement: R = sum(G_i^response_i) - commitment^challenge
        //

        const randomnessCommitments: Point[] = [];
        let allVariables: { [key: string]: Point | bigint } = { ...variables };
        
        for (const statement of protocol.statements) {
            // First compute sum(G_i^response_i)
            let responseCommitment = Point.ZERO;

            for (const term of statement.parsed.terms) {
                const response = responses[term.scalarName as TScalars];
                if (response === undefined) {
                    return { isValid: false, error: `Missing response for scalar ${term.scalarName}` };
                }

                let point: Point;
                if (term.pointName === 'G') {
                    point = Point.BASE;
                } else if (term.pointName in allVariables) {
                    point = allVariables[term.pointName as keyof typeof allVariables] as Point;
                } else {
                    return { isValid: false, error: `Missing point ${term.pointName}` };
                }

                if (response !== 0n) {
                    responseCommitment = responseCommitment.add(point.multiply(response));
                }
            }

            // Get the public commitment for this statement
            const commitmentName = statement.parsed.left as TCommitments;
            const publicCommitment = variables[commitmentName as keyof typeof variables] as Point;
            
            if (!publicCommitment) {
                return { isValid: false, error: `Missing commitment point: ${commitmentName}` };
            }

            // Compute randomness commitment: R = sum(G_i^response_i) - commitment^challenge
            // This is equivalent to: R = sum(G_i^response_i) + commitment^(-challenge)
            const randomnessCommitment = responseCommitment.add(
                publicCommitment.multiply((Point.ORDER - challenge) % Point.ORDER)
            );

            randomnessCommitments.push(randomnessCommitment);
            
            // Store computed value for use in subsequent statements
            allVariables[statement.parsed.left] = publicCommitment;
        }

        //
        // Step 3: Reconstruct challenge from randomness commitments
        //

        const challengeTranscriptParts = [
            addToTranscript(encodeUTF8('challenge_generation')),
            ...transcript,
        ];

        // Add randomness commitments
        for (const commitment of randomnessCommitments) {
            challengeTranscriptParts.push(addToTranscript(commitment.toBytes()));
        }
        
        // Add nonce to challenge
        challengeTranscriptParts.push(addToTranscript(nonce));

        const expectedChallenge = deriveScalar(concatBytes(...challengeTranscriptParts), 'challenge');

        //
        // Step 4: Verify the challenge matches
        //

        if (challenge !== expectedChallenge) {
            return { isValid: false, error: 'Challenge verification failed' };
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