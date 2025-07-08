import { Point } from '../math/point';
import { generateRandomScalar, deriveScalar } from '../math/scalar';
import { concatBytes } from '@/modules/formats/bytes';
import { encodeUTF8 } from '@/modules/formats/text';
import { encodeBigInt, exportBigInt } from '../encoding/bigint';
import {
    ProtocolVariables,
    ProtocolInputVariables,
    ProtocolVerificationVariables,
    SigmaProtocol,
    ExtractProtocolScalars,
    ExtractProtocolPoints,
    ExtractProtocolCommitments
} from "./sigmaDefinition";

// Sigma proof structure following the commit-challenge-response pattern
export type SigmaProof<TScalars extends string = string> = {
    // Commitments: random values for each secret scalar (needed for verification)
    commitments: { [K in TScalars]: Point };
    // Challenge: derived from protocol, commitment points, and context
    challenge: bigint;
    // Responses: challenge * secret + randomness for each scalar
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
    commitmentPoints: { [K in ExtractProtocolCommitments<T>]: Point };
} {

    // Step 1: Derive initial seed from protocol, nonce, usage, and all scalar values
    const scalarBytes = protocol.scalars.map(scalarName => {
        const scalarValue = variables[scalarName as keyof typeof variables] as bigint;
        return addToTranscript(exportBigInt(scalarValue));
    });
    const randomnessSeed = concatBytes(
        addToTranscript(encodeUTF8('commitment_randomness')),
        addToTranscript(encodeUTF8(usage)),
        addToTranscript(protocol.descriptor),
        addToTranscript(nonce),
        ...scalarBytes,
    );

    // Step 2: First calculate commitment points (left side values) for the protocol
    const commitmentPoints: { [key: string]: Point } = {};
    const allVariables = { ...variables } as any;
    
    // Process statements in order to allow using previous commitments
    for (const statement of protocol.statements) {
        let commitmentPoint = Point.ZERO;
        
        for (const term of statement.parsed.terms) {
            const scalar = allVariables[term.scalarName] as bigint;
            let point: Point;
            
            if (term.pointName === 'G') {
                point = Point.BASE;
            } else if (term.pointName in allVariables) {
                point = allVariables[term.pointName] as Point;
            } else {
                throw new Error(`Point ${term.pointName} not found in variables`);
            }
            
            if (scalar === 0n) {
                // Skip zero scalar terms
                continue;
            }
            commitmentPoint = commitmentPoint.add(point.multiply(scalar));
        }
        
        // Store the commitment point for future statements to use
        commitmentPoints[statement.parsed.left] = commitmentPoint;
        allVariables[statement.parsed.left] = commitmentPoint;
    }
    
    // Step 3: Now generate random commitments for each secret scalar
    const commitmentRandomness: { [key: string]: bigint } = {};
    const commitments: { [key: string]: Point } = {};
    
    for (const scalarName of protocol.scalars) {
        
        // Derive randomness for this scalar from the randomness seed and scalar name
        const scalarSeed = concatBytes(
            addToTranscript(randomnessSeed),
            addToTranscript(encodeUTF8(scalarName))
        );
        const randomness = deriveScalar(scalarSeed, 'scalar_randomness');
        commitmentRandomness[scalarName] = randomness;

        // Compute commitment: sum of all generator points that use this scalar
        let commitment = Point.ZERO;

        for (const statement of protocol.statements) {
            for (const term of statement.parsed.terms) {
                if (term.scalarName === scalarName) {
                    // Get the generator point for this term
                    let generatorPoint: Point;
                    if (term.pointName === 'G') {
                        generatorPoint = Point.BASE;
                    } else if (term.pointName in allVariables) {
                        generatorPoint = allVariables[term.pointName] as Point;
                    } else {
                        throw new Error(`Point ${term.pointName} not found`);
                    }
                    // Add generator^randomness to the commitment
                    if (randomness !== 0n) {
                        commitment = commitment.add(generatorPoint.multiply(randomness));
                    }
                }
            }
        }

        commitments[scalarName] = commitment;
    }
    
    // Step 4: Generate challenge using Fiat-Shamir heuristic
    const generatorPointsArray = protocol.points.map(pointName => {
        const point = variables[pointName as keyof typeof variables] as Point;
        if (!point) {
            throw new Error(`Missing generator point: ${pointName}`);
        }
        return point;
    });
    
    const commitmentPointsArray = protocol.commitments.map(commitmentName => {
        return commitmentPoints[commitmentName];
    });
    
    const challenge = generateChallenge({
        protocol,
        commitmentPoints: commitmentPointsArray,
        generatorPoints: generatorPointsArray,
        nonce,
        usage
    });

    // Step 5: Generate responses: response = challenge * secret + randomness
    const responses: { [key: string]: bigint } = {};

    for (const scalarName of protocol.scalars) {
        const secret = variables[scalarName as keyof ProtocolInputVariables<T>] as bigint;
        const randomness = commitmentRandomness[scalarName];

        // response = challenge * secret + randomness (mod curve order)
        const response = (challenge * secret + randomness) % Point.ORDER;
        responses[scalarName] = response;
    }

    return {
        proof: {
            commitments: commitments as { [K in ExtractProtocolScalars<T>]: Point },
            challenge,
            responses: responses as { [K in ExtractProtocolScalars<T>]: bigint }
        },
        commitmentPoints: commitmentPoints as { [K in ExtractProtocolCommitments<T>]: Point }
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
        const { commitments, challenge, responses } = proof;

        // Step 1: Extract generator points from verification variables
        const generatorPointsArray = protocol.points.map(pointName => {
            const point = variables[pointName as keyof typeof variables] as Point;
            if (!point) {
                throw new Error(`Missing generator point: ${pointName}`);
            }
            return point;
        });
        
        // Extract commitment points from verification variables
        const commitmentPointsArray = protocol.commitments.map(commitmentName => {
            const point = variables[commitmentName as keyof typeof variables] as Point;
            if (!point) {
                throw new Error(`Missing commitment point: ${commitmentName}`);
            }
            return point;
        });

        // Step 2: Recompute the challenge
        const expectedChallenge = generateChallenge({
            protocol,
            commitmentPoints: commitmentPointsArray,
            generatorPoints: generatorPointsArray,
            nonce,
            usage
        });

        if (challenge !== expectedChallenge) {
            return { isValid: false, error: 'Challenge verification failed' };
        }

        // Step 2: Verify the sigma protocol equation
        // The equation is: commitment + challenge * leftSide = generator^response
        // Or rearranged: commitments + challenge * leftSides = generator^responses
        
        let totalCommitments = Point.ZERO;
        let totalChallengeTimesLeftSides = Point.ZERO;
        let totalGeneratorResponses = Point.ZERO;

        // Add all scalar commitments
        for (const scalarName of protocol.scalars) {
            const commitment = commitments[scalarName as TScalars];
            if (!commitment) {
                return { isValid: false, error: `Missing commitment for scalar ${scalarName}` };
            }
            totalCommitments = totalCommitments.add(commitment);
        }

        // Add challenge * leftSide for each statement
        for (const statement of protocol.statements) {
            const leftSidePoint = variables[statement.parsed.left as keyof ProtocolVerificationVariables<SigmaProtocol<TScalars, TPoints, TCommitments>>];
            if (!leftSidePoint) {
                return { isValid: false, error: `Left side point ${statement.parsed.left} not found` };
            }
            totalChallengeTimesLeftSides = totalChallengeTimesLeftSides.add(leftSidePoint.multiply(challenge));
        }

        // Add all generator^response terms
        for (const statement of protocol.statements) {
            for (const term of statement.parsed.terms) {
                let generatorPoint: Point;
                if (term.pointName === 'G') {
                    generatorPoint = Point.BASE;
                } else {
                    const point = variables[term.pointName as keyof ProtocolVerificationVariables<SigmaProtocol<TScalars, TPoints, TCommitments>>];
                    if (!point) {
                        return { isValid: false, error: `Missing point ${term.pointName}` };
                    }
                    generatorPoint = point;
                }
                
                const response = responses[term.scalarName as TScalars];
                if (response === undefined) {
                    return { isValid: false, error: `Missing response for scalar ${term.scalarName}` };
                }

                if (response !== 0n) {
                    totalGeneratorResponses = totalGeneratorResponses.add(generatorPoint.multiply(response));
                }
            }
        }

        // Verify the equation: commitments + challenge * leftSides = generator^responses
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
function generateChallenge(opts: {
    protocol: SigmaProtocol<any, any, any>;
    commitmentPoints: Point[];
    generatorPoints: Point[];
    nonce: Uint8Array;
    usage: string;
}): bigint {
    const { protocol, commitmentPoints, generatorPoints, nonce, usage } = opts;

    // Build transcript for Fiat-Shamir with length prefixing
    const transcriptParts: Uint8Array[] = [
        addToTranscript(encodeUTF8(usage)), // Usage provides domain separation
        addToTranscript(nonce),
        addToTranscript(protocol.descriptor) // Use binary descriptor
    ];

    // Add generator points to transcript (in order of appearance)
    for (const point of generatorPoints) {
        transcriptParts.push(addToTranscript(point.toBytes()));
    }

    // Add commitment points to transcript (in order of appearance)
    for (const point of commitmentPoints) {
        transcriptParts.push(addToTranscript(point.toBytes()));
    }

    // Derive challenge from transcript
    const transcript = concatBytes(...transcriptParts);
    return deriveScalar(transcript, 'fiat_shamir_challenge');
}

// Extract public points (generators) from the input variable set
function extractPublicPoints<T extends SigmaProtocol<any, any, any>>(
    protocol: T,
    variables: ProtocolInputVariables<T>
): { [K in ExtractProtocolPoints<T>]: Point } {
    const publicVars: any = {};

    for (const pointName of protocol.points) {
        publicVars[pointName] = variables[pointName as keyof ProtocolInputVariables<T>];
    }

    return publicVars;
}

