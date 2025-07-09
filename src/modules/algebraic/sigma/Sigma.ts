import { encodeBigInt32, decodeBigInt32 } from '../../formats/bigint';
import { Point } from '../math/point';
import {
    sigmaProtocol,
    type SigmaProtocol,
    type ProtocolInputVariables,
    type ProtocolVerificationVariables,
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
 * const proofBytes = sigma.prove({ a }, nonce);
 * 
 * // Verify the proof
 * const isValid = sigma.verify(proofBytes, {}, nonce);
 * ```
 */
export class Sigma<
    TScalars extends string = string,
    TPoints extends string = string,
    TCommitments extends string = string,
    TPredefined extends string = never
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
    ): Sigma<MergeScalars<T>, MergeGeneratorPoints<T>, MergeCommitments<T>, never> {
        if (statements.length === 0) {
            throw new Error('At least one statement is required');
        }

        const protocol = sigmaProtocol(...statements);
        return new Sigma(protocol, 'sigma_proof', {});
    }


    //
    // Description
    // 

    private readonly protocol: SigmaProtocol<TScalars, TPoints, TCommitments>;
    private readonly usage: string;
    private readonly predefinedValues: { [K in TPredefined]: Point };

    //
    // Private constructor
    //

    private constructor(
        protocol: SigmaProtocol<TScalars, TPoints, TCommitments>,
        usage: string,
        predefinedValues: { [K in TPredefined]: Point }
    ) {
        this.protocol = protocol;
        this.usage = usage;
        this.predefinedValues = predefinedValues;
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
     * @param opts - Options for creating the proof
     * @param opts.nonce - A unique nonce for this proof
     * @param opts.message - The message to bind to the proof (optional)
     * @param opts.variables - The secret scalars and generator points
     * 
     * @returns Serialized proof bytes including computed points
     * 
     * @example
     * ```typescript
     * // With variables
     * const sigma = Sigma.create('P = G^a + H^b');
     * const proofBytes = sigma.prove({ 
     *     nonce, 
     *     message: null,
     *     variables: { H: generatorH, a: secretA, b: secretB }
     * });
     * 
     * // Without variables (when all points are predefined and only scalars needed)
     * const sigma = Sigma.create('P = G^a + H^b').withValue('H', H);
     * const proofBytes = sigma.prove({ 
     *     nonce, 
     *     variables: { a: secretA, b: secretB }
     * });
     * ```
     */
    prove = (opts: {
        nonce: Uint8Array;
        message?: Uint8Array | null;
    } & (Exclude<TScalars | Exclude<TPoints, TPredefined>, never> extends never
        ? { variables?: {} }
        : {
            variables:
            { [K in TScalars]: bigint } &
            { [K in Exclude<TPoints, TPredefined>]: Point }
        })
    ): { proof: Uint8Array, computed: { [K in TCommitments]: Point } } => {
        const { nonce, message = null } = opts;
        const variables = ('variables' in opts ? opts.variables : {}) as any;
        // Combine user-provided variables with predefined values
        const allVariables = {
            ...this.predefinedValues,
            ...(variables || {})
        } as unknown as ProtocolInputVariables<typeof this.protocol>;

        const { proof, computed } = createSigmaProof({
            protocol: this.protocol,
            variables: allVariables,
            nonce,
            message: message || new Uint8Array(),
            usage: this.usage
        });

        // Serialize the proof:
        // - challenge (32 bytes)
        // - responses (32 bytes each)
        // - computed points (32 bytes each, compressed)
        const proofSize = 32 + (this.scalars.length * 32) + (this.commitments.length * 32);
        const output = new Uint8Array(proofSize);
        let offset = 0;

        // Write challenge
        output.set(encodeBigInt32(proof.challenge), offset);
        offset += 32;

        // Write responses in order
        for (const scalarName of this.scalars) {
            output.set(encodeBigInt32(proof.responses[scalarName as TScalars]), offset);
            offset += 32;
        }

        // Write computed points in order
        for (const commitmentName of this.commitments) {
            const point = computed[commitmentName as TCommitments];
            output.set(point.toBytes(), offset);
            offset += 32;
        }

        return {
            proof: output,
            computed: computed as { [K in TCommitments]: Point }
        }
    }

    /**
     * Verifies a proof for this sigma protocol.
     * 
     * @param opts - Options for verifying the proof
     * @param opts.proofBytes - The serialized proof bytes
     * @param opts.nonce - The nonce used to create the proof
     * @param opts.message - The message bound to the proof (optional)
     * @param opts.publicVariables - Optional public generator points (not including computed points from proof)
     * @returns True if the proof is valid, false otherwise
     * 
     * @example
     * ```typescript
     * // With public variables
     * const isValid = sigma.verify({ 
     *     proofBytes, 
     *     nonce,
     *     message: null,
     *     publicVariables: { H: generatorH }
     * });
     * 
     * // Without public variables (when all points are predefined)
     * const isValid = sigma.verify({ 
     *     proofBytes, 
     *     nonce
     * });
     * ```
     */
    verify = (
        opts: {
            proof: Uint8Array;
            message?: Uint8Array | null;
        } & (Exclude<TPoints, TPredefined> extends never
            ? { variables?: {} }
            : { variables: Omit<{ [K in TPoints]: Point }, Extract<TPredefined, TPoints>> })
    ): { computed: { [K in TCommitments]: Point } } | null => {
        const { proof, message = null } = opts;
        const variables = ('variables' in opts ? opts.variables : {}) as Omit<{ [K in TPoints]: Point }, Extract<TPredefined, TPoints>> | undefined;
        // Deserialize the proof
        const expectedSize = 32 + (this.scalars.length * 32) + (this.commitments.length * 32);
        if (proof.length !== expectedSize) {
            return null;
        }

        let offset = 0;

        // Read challenge
        const challengeBytes = proof.slice(offset, offset + 32);
        const challenge = decodeBigInt32(challengeBytes);
        offset += 32;

        // Read responses
        const responses: { [key: string]: bigint } = {};
        for (const scalarName of this.scalars) {
            const responseBytes = proof.slice(offset, offset + 32);
            responses[scalarName] = decodeBigInt32(responseBytes);
            offset += 32;
        }

        // Read computed points
        const computedPoints: { [key: string]: Point } = {};
        for (const commitmentName of this.commitments) {
            const pointBytes = proof.slice(offset, offset + 32);
            try {
                computedPoints[commitmentName] = Point.fromBytes(pointBytes);
            } catch {
                return null;
            }
            offset += 32;
        }

        // Construct the proof object
        const proofObject: SigmaProof<TScalars> = {
            challenge,
            responses: responses as { [K in TScalars]: bigint }
        };

        // Combine predefined points, public variables, and computed points for verification
        const allVariables = {
            ...this.predefinedValues,
            ...(variables || {}),
            ...computedPoints
        } as unknown as ProtocolVerificationVariables<typeof this.protocol>;

        const result = verifySigmaProof({
            protocol: this.protocol,
            proof: proofObject,
            variables: allVariables,
            message: message || new Uint8Array(),
            usage: this.usage
        });

        if (result.isValid) {
            return { computed: computedPoints as { [K in TCommitments]: Point } };
        }

        return null;
    }

    /**
     * Creates a new Sigma instance with the same statements but different usage.
     * 
     * @param usage - The new usage string
     * @returns A new Sigma instance
     */
    withUsage = (usage: string): Sigma<TScalars, TPoints, TCommitments, TPredefined> => {
        return new Sigma(this.protocol, usage, this.predefinedValues);
    }

    /**
     * Creates a new Sigma instance with a predefined point value.
     * 
     * @param name - The name of the point variable to predefine
     * @param value - The Point value
     * @returns A new Sigma instance with the predefined value
     * 
     * @example
     * ```typescript
     * const sigma = Sigma.create('P = G^a + H^b')
     *     .withValue('H', generatorH);
     * 
     * // Now only 'a' and 'b' need to be provided
     * const proof = sigma.prove({ a, b }, nonce);
     * ```
     */
    withValue = <K extends TPoints>(
        name: K,
        value: Point
    ): Sigma<TScalars, TPoints, TCommitments, TPredefined | K> => {
        // Check if the variable exists in the protocol as a point
        const isPoint = this.protocol.points.includes(name as any);

        if (!isPoint) {
            throw new Error(`Point '${String(name)}' not found in protocol`);
        }

        // Type check the value
        if (!(value instanceof Point)) {
            throw new Error(`Value must be a Point`);
        }

        const newPredefinedValues = {
            ...this.predefinedValues,
            [name]: value
        } as { [P in (TPredefined | K)]: Point };

        return new Sigma(this.protocol, this.usage, newPredefinedValues as any);
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