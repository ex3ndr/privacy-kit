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
export type SigmaProof<
  TScalars extends string = string,
  TPoints extends string = string
> = {
  // Commitments: random values for each secret scalar
  commitments: { [K in TScalars]: Point };
  // Challenge: derived from protocol, commitments, and context
  challenge: bigint;
  // Responses: challenge * secret + randomness for each scalar
  responses: { [K in TScalars]: bigint };
  // Protocol being proven
  protocol: SigmaProtocol<TScalars, TPoints>;
  // Public context used in proof generation
  context: {
    nonce: Uint8Array;
    usage: string;
  };
};

// Create a sigma proof for a given protocol and secret variables
export function createSigmaProof<T extends SigmaProtocol<any, any>>(opts: {
  protocol: T;
  variables: ProtocolVariables<T>;
  nonce: Uint8Array;
  usage: string;
}): SigmaProof<ExtractProtocolScalars<T>, ExtractProtocolPoints<T>> {
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
    responses: responses as { [K in ExtractProtocolScalars<T>]: bigint },
    protocol,
    context: { nonce, usage }
  };
}

// Verify a sigma proof
export function verifySigmaProof<
  TScalars extends string,
  TPoints extends string
>(
  proof: SigmaProof<TScalars, TPoints>,
  publicVariables: { [K in TPoints]: Point }
): { isValid: boolean; error?: string } {
  try {
    const { protocol, commitments, challenge, responses, context } = proof;

    // Step 1: Recompute the challenge
    const expectedChallenge = generateChallenge({
      protocol,
      commitments,
      nonce: context.nonce,
      usage: context.usage,
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
  // Only normalize statements to prevent formatting malleability
  const normalizeStatement = (str: string) => str.replace(/\s+/g, '').toLowerCase();
  
  const transcriptParts: Uint8Array[] = [
    addToTranscript(encodeUTF8(usage)), // Usage is NOT normalized - it provides domain separation
    addToTranscript(nonce)
  ];

  // Add protocol statements to transcript (deterministic order)
  // Normalize statements to prevent malleability from whitespace/case differences
  const sortedStatements = [...protocol.statements]
    .map(stmt => ({ ...stmt, normalized: normalizeStatement(stmt.statement) }))
    .sort((a, b) => a.normalized.localeCompare(b.normalized));
  
  for (const statement of sortedStatements) {
    transcriptParts.push(addToTranscript(encodeUTF8(statement.normalized)));
  }

  // Add public variables to transcript (deterministic order)
  // Variable names are NOT normalized - they are part of the protocol definition
  const sortedPublicKeys = Object.keys(publicVariables).sort();
  for (const key of sortedPublicKeys) {
    transcriptParts.push(addToTranscript(encodeUTF8(key)));
    transcriptParts.push(addToTranscript(publicVariables[key as TPoints].toBytes()));
  }

  // Add commitments to transcript (deterministic order)
  // Commitment variable names are NOT normalized
  const sortedCommitmentKeys = Object.keys(commitments).sort();
  for (const key of sortedCommitmentKeys) {
    transcriptParts.push(addToTranscript(encodeUTF8(key)));
    transcriptParts.push(addToTranscript(commitments[key as TScalars].toBytes()));
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
  proof: SigmaProof<ExtractProtocolScalars<T>, ExtractProtocolPoints<T>>;
  publicVariables: { [K in ExtractProtocolPoints<T>]: Point };
} {
  const proof = createSigmaProof(opts);
  const publicVariables = extractPublicVariables(opts.protocol, opts.variables);
  
  return { proof, publicVariables };
}