import { exportBigInt } from '../encoding/bigint';
import { Point } from '../math/point';
import {
    sigmaProtocol,
    type SigmaProtocol,
    type ProtocolInputVariables,
    type ProtocolVerificationVariables,
    type ExtractProtocolScalars,
    type ExtractProtocolPoints,
    type ExtractProtocolCommitments,
    type MergeScalars,
    type MergeGeneratorPoints,
    type MergeCommitments
} from './sigmaDefinition';
import {
    createSigmaProof,
    verifySigmaProof,
    type SigmaProof
} from './sigmaProof';

/**
 * Sigma class provides a high-level interface for creating and working with sigma protocols.
 * It encapsulates the complexity of sigma protocol operations behind a clean API.
 * 
 * @example
 * ```typescript
 * // Create a sigma protocol for proving knowledge of discrete logarithm
 * const sigma = Sigma.create('P = G^a');
 * 
 * // Create a proof
 * const { proof, commitments } = sigma.prove({ a }, nonce);
 * 
 * // Verify the proof
 * const isValid = sigma.verify(proof, commitments, nonce);
 * ```
 */
export class Sigma<
    TScalars extends string = string,
    TPoints extends string = string,
    TCommitments extends string = string
> {

    /**
     * Creates a new Sigma protocol instance.
     * 
     * @param statements - Sigma protocol statements
     * 
     * @example
     * ```typescript
     * // Single statement
     * const sigma1 = Sigma.create('P = G^a');
     * 
     * // Multiple statements
     * const sigma2 = Sigma.create('P = G^a + H^b', 'Q = G^c');
     * ```
     */
    static create<T extends readonly string[]>(
        ...statements: T
    ): Sigma<MergeScalars<T>, MergeGeneratorPoints<T>, MergeCommitments<T>> {
        if (statements.length === 0) {
            throw new Error('At least one statement is required');
        }

        const protocol = sigmaProtocol(...statements);
        return new Sigma(protocol, 'sigma_proof');
    }


    //
    // Description
    // 

    private readonly protocol: SigmaProtocol<TScalars, TPoints, TCommitments>;
    private readonly usage: string;

    //
    // Private constructor
    //

    private constructor(
        protocol: SigmaProtocol<TScalars, TPoints, TCommitments>,
        usage: string
    ) {
        this.protocol = protocol;
        this.usage = usage;
        Object.freeze(this);
    }

    /**
     * Gets the list of scalar variables in this protocol.
     */
    get scalars(): string[] {
        return this.protocol.scalars;
    }

    /**
     * Gets the list of generator points in this protocol (excluding G and commitments).
     */
    get points(): string[] {
        return this.protocol.points;
    }

    /**
     * Gets the list of commitment points in this protocol.
     */
    get commitments(): string[] {
        return this.protocol.commitments;
    }

    /**
     * Creates a proof for this sigma protocol.
     * 
     * @param variables - The secret scalars and generator points
     * @param nonce - A unique nonce for this proof
     * @param customUsage - Optional custom usage string (overrides the default)
     * @returns The proof and commitment points
     * 
     * @example
     * ```typescript
     * const sigma = new Sigma('P = G^a + H^b');
     * const { proof, commitments } = sigma.prove(
     *     { H: generatorH, a: secretA, b: secretB },
     *     nonce
     * );
     * ```
     */
    prove(
        variables: ProtocolInputVariables<typeof this.protocol>,
        nonce: Uint8Array
    ) {
        const { proof, commitmentPoints } = createSigmaProof(
            this.protocol,
            variables,
            nonce,
            this.usage
        );

        const proofSize = this.scalars.length * 32 + 32;
        const output = new Uint8Array(proofSize);
        output.set(exportBigInt(proof.challenge), 0);
        let offset = 32;
        for(let s of this.scalars) {
            output.set(exportBigInt(proof.responses[s as TScalars]), offset);
            offset += 32;
        }

        return {
            proof: proof as SigmaProof<TScalars>,
            commitments: commitmentPoints as { [K in TCommitments]: Point }
        };
    }

    /**
     * Verifies a proof for this sigma protocol.
     * 
     * @param proof - The proof to verify
     * @param publicVariables - The public generator points and commitment points
     * @param nonce - The nonce used to create the proof
     * @param customUsage - Optional custom usage string (must match what was used in prove)
     * @returns True if the proof is valid, false otherwise
     * 
     * @example
     * ```typescript
     * const isValid = sigma.verify(
     *     proof,
     *     { H: generatorH, ...commitments },
     *     nonce
     * );
     * ```
     */
    verify(
        proof: SigmaProof<TScalars>,
        variables: ProtocolVerificationVariables<typeof this.protocol>,
        nonce: Uint8Array
    ): boolean {
        const result = verifySigmaProof(
            this.protocol,
            proof,
            variables,
            nonce,
            this.usage
        );

        return result.isValid;
    }

    /**
     * Creates a new Sigma instance with the same statements but different usage.
     * 
     * @param usage - The new usage string
     * @returns A new Sigma instance
     */
    withUsage(usage: string): Sigma<TScalars, TPoints, TCommitments> {
        return new Sigma(this.protocol, usage);
    }

    /**
     * Gets a string representation of this sigma protocol.
     */
    toString(): string {
        return `Sigma(${this.usage}:${this.protocol.statements.map(s => s.statement).join(', ')})`;
    }
}

// Export commonly used sigma protocols as static methods
export namespace Sigma {
    /**
     * Creates a sigma protocol for proving knowledge of a discrete logarithm.
     * Proves: I know x such that P = G^x
     */
    export function discreteLog() {
        return Sigma.create(`P = G^secret`);
    }

    /**
     * Creates a sigma protocol for proving knowledge of a Pedersen commitment opening.
     * Proves: I know value and randomness such that P = G^value + H^randomness
     */
    export function pedersenCommitment() {
        return Sigma.create(`C = G^value + H^blinding`);
    }

    /**
     * Creates a sigma protocol for proving equality of discrete logarithms.
     * Proves: I know x such that P = G^x AND Q = H^x
     */
    export function equalDiscreteLog() {
        return Sigma.create(`P = G^x`, `Q = H^x`);
    }
}