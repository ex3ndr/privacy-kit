import { Point } from '../math/point';

// Parsed term structure
export type ParsedTerm = {
    scalarName: string;
    pointName: string;
};

// Template string type for parsing sigma protocol statements
type ParseStatement<T extends string> =
    T extends `${infer Left} = ${infer Right}`
    ? { left: Left; right: Right; terms: ParsedTerm[] }
    : never;

// Extract variable names from the right side of the equation
type ExtractVariables<T extends string> =
    T extends `${infer First}^${infer Var}${infer Rest}`
    ? First extends `${string}${infer PointName}`
    ? Var extends ` ${infer VarName} `
    ? PointName | VarName | ExtractVariables<Rest>
    : never
    : never
    : T extends `${infer VarName}`
    ? VarName extends ` ${infer CleanVar} `
    ? CleanVar
    : VarName
    : never;

// Helper type to extract all variables from a statement
type ExtractAllVariables<T extends string> =
    T extends `${infer Left} = ${infer Right}`
    ? ExtractVariables<Left> | ExtractVariables<Right>
    : never;

// Helper to trim whitespace from type level strings
type Trim<T extends string> = T extends ` ${infer R}` ? Trim<R> : T extends `${infer L} ` ? Trim<L> : T;

// Extract scalars and points separately for better type safety
export type ExtractScalars<T extends string> = T extends `${infer Left}=${infer Right}`
    ? ExtractScalarsFromExpression<Trim<Right>>
    : T extends `${infer Left} = ${infer Right}`
    ? ExtractScalarsFromExpression<Trim<Right>>
    : never;

// Extract all points (both commitments and generators)
type ExtractAllPoints<T extends string> = T extends `${infer Left}=${infer Right}`
    ? Trim<Left> | ExtractPointsFromExpression<Trim<Right>>
    : T extends `${infer Left} = ${infer Right}`
    ? Trim<Left> | ExtractPointsFromExpression<Trim<Right>>
    : never;

// Extract only generator points (right side, excluding G)
export type ExtractGeneratorPoints<T extends string> = T extends `${infer Left}=${infer Right}`
    ? Exclude<ExtractPointsFromExpression<Trim<Right>>, 'G'>
    : T extends `${infer Left} = ${infer Right}`
    ? Exclude<ExtractPointsFromExpression<Trim<Right>>, 'G'>
    : never;

// For backward compatibility
type ExtractPoints<T extends string> = ExtractAllPoints<T>;

type ExtractScalarsFromExpression<T extends string> =
    T extends `${infer Point}^${infer Scalar}+${infer Rest}`
    ? Trim<Scalar> | ExtractScalarsFromExpression<Trim<Rest>>
    : T extends `${infer Point}^${infer Scalar} + ${infer Rest}`
    ? Trim<Scalar> | ExtractScalarsFromExpression<Trim<Rest>>
    : T extends `${infer Point}^${infer Scalar}`
    ? Trim<Scalar>
    : never;

type ExtractPointsFromExpression<T extends string> =
    T extends `${infer Point}^${infer Scalar}+${infer Rest}`
    ? Trim<Point> | ExtractPointsFromExpression<Trim<Rest>>
    : T extends `${infer Point}^${infer Scalar} + ${infer Rest}`
    ? Trim<Point> | ExtractPointsFromExpression<Trim<Rest>>
    : T extends `${infer Point}^${infer Scalar}`
    ? Trim<Point>
    : never;

// Create specific record types for scalars and points
type ScalarRecord<T extends string> = {
    [K in ExtractScalars<T>]: bigint;
};

// Exclude G from points since it's implicit
type PointRecord<T extends string> = {
    [K in Exclude<ExtractPoints<T>, 'G'>]: Point;
};

export type VariableRecord<T extends string> = ScalarRecord<T> & PointRecord<T>;

// Main statement type that enforces structure
export type Statement<T extends string> = {
    statement: T;
    scalars: ExtractScalars<T>[];
    points: ExtractPoints<T>[];
    parsed: {
        left: string;
        right: string;
        terms: ParsedTerm[];
    };
};

// Type guard to check if a string is a valid sigma statement
export function isValidSigmaStatement(statement: string): boolean {
    const trimmed = statement.trim();
    const parts = trimmed.split('=');

    if (parts.length !== 2) return false;

    const left = parts[0].trim();
    const right = parts[1].trim();

    // Check if left side is a single variable (point)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(left)) return false;

    // Check if right side has the correct format (point^scalar + point^scalar + ...)
    const rightPattern = /^([a-zA-Z_][a-zA-Z0-9_]*\s*\^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*(\+\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*)*)$/;

    return rightPattern.test(right);
}

// Helper function to parse variables from a statement
export function parseVariables(statement: string): { scalars: string[]; points: string[] } {
    const trimmed = statement.trim();
    const parts = trimmed.split('=');

    if (parts.length !== 2) {
        throw new Error('Invalid statement format');
    }

    const left = parts[0].trim();
    const right = parts[1].trim();

    // Validate left side is a single variable name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(left)) {
        throw new Error('Invalid statement format');
    }

    const points = new Set<string>();
    const scalars = new Set<string>();

    // Left side is always a point
    points.add(left);

    // Parse right side for point^scalar terms
    const terms = right.split('+').map(term => term.trim());

    for (const term of terms) {
        const match = term.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\^\s*([a-zA-Z_][a-zA-Z0-9_]*)$/);
        if (match) {
            const [, point, scalar] = match;
            points.add(point);
            scalars.add(scalar);
        }
    }

    return {
        scalars: Array.from(scalars),
        points: Array.from(points)
    };
}

// Helper function to parse terms from a statement
export function parseTerms(statement: string): ParsedTerm[] {
    const trimmed = statement.trim();
    const parts = trimmed.split('=');

    if (parts.length !== 2) {
        throw new Error('Invalid statement format');
    }

    const left = parts[0].trim();
    const right = parts[1].trim();

    // Validate left side is a single variable name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(left)) {
        throw new Error('Invalid statement format');
    }

    const terms: ParsedTerm[] = [];

    // Parse right side for point^scalar terms
    const termStrings = right.split('+').map(term => term.trim());

    for (const term of termStrings) {
        const match = term.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\^\s*([a-zA-Z_][a-zA-Z0-9_]*)$/);
        if (match) {
            const [, pointName, scalarName] = match;
            terms.push({ scalarName, pointName });
        }
    }

    return terms;
}

// Helper function to create a statement with type safety
export function statement<T extends string>(
    stmt: T
): Statement<T> {
    if (!isValidSigmaStatement(stmt)) {
        throw new Error(`Invalid sigma statement format: ${stmt}`);
    }

    const { scalars, points } = parseVariables(stmt);
    const parsed = stmt.split('=').map(s => s.trim());
    const terms = parseTerms(stmt);

    return {
        statement: stmt,
        scalars: scalars as ExtractScalars<T>[],
        points: points as ExtractPoints<T>[],
        parsed: {
            left: parsed[0],
            right: parsed[1],
            terms
        }
    };
}

// Helper function to evaluate a statement
export function evaluateStatement<T extends string>(
    stmt: Statement<T>,
    variables: VariableRecord<T>
): { leftSide: Point; rightSide: Point; isValid: boolean } {
    const { parsed } = stmt;

    // Get left side point
    const leftSide = variables[parsed.left as keyof VariableRecord<T>] as Point;

    // Calculate right side using pre-parsed terms
    let rightSide = Point.ZERO;

    for (const term of parsed.terms) {
        const scalar = variables[term.scalarName as keyof VariableRecord<T>] as bigint;
        let point: Point;
        
        // Handle G specially since it's implicit
        if (term.pointName === 'G') {
            point = Point.BASE;
        } else {
            point = variables[term.pointName as keyof VariableRecord<T>] as Point;
        }

        // Handle zero scalar case - multiplying by zero gives the identity point
        if (scalar === 0n) {
            rightSide = rightSide.add(Point.ZERO);
        } else {
            rightSide = rightSide.add(point.multiply(scalar));
        }
    }

    return {
        leftSide,
        rightSide,
        isValid: leftSide.equals(rightSide)
    };
}

// Types for merging multiple statements
export type MergeScalars<T extends readonly string[]> = T extends readonly []
    ? never
    : T extends readonly [infer First]
    ? First extends string
    ? ExtractScalars<First>
    : never
    : T extends readonly [infer First, ...infer Rest]
    ? First extends string
    ? Rest extends readonly string[]
    ? ExtractScalars<First> | MergeScalars<Rest>
    : ExtractScalars<First>
    : never
    : never;

// Merge all points (for backward compatibility)
type MergePoints<T extends readonly string[]> = T extends readonly [infer First, ...infer Rest]
    ? First extends string
    ? Rest extends readonly string[]
    ? Exclude<ExtractPoints<First>, 'G'> | MergePoints<Rest>
    : Exclude<ExtractPoints<First>, 'G'>
    : never
    : never;

// Helper to collect all commitments from statements
type CollectCommitments<T extends readonly string[], Acc extends string = never> = 
    T extends readonly [infer First, ...infer Rest]
    ? First extends string
    ? Rest extends readonly string[]
    ? CollectCommitments<Rest, Acc | ExtractCommitmentPoint<First>>
    : Acc | ExtractCommitmentPoint<First>
    : never
    : Acc;

// Merge only generator points (right side, excluding G and excluding commitments)
export type MergeGeneratorPoints<T extends readonly string[]> = 
    Exclude<MergeGeneratorPointsRaw<T>, CollectCommitments<T>>;

// Raw merge without excluding commitments
type MergeGeneratorPointsRaw<T extends readonly string[]> = T extends readonly []
    ? never
    : T extends readonly [infer First]
    ? First extends string
    ? ExtractGeneratorPoints<First>
    : never
    : T extends readonly [infer First, ...infer Rest]
    ? First extends string
    ? Rest extends readonly string[]
    ? ExtractGeneratorPoints<First> | MergeGeneratorPointsRaw<Rest>
    : ExtractGeneratorPoints<First>
    : never
    : never;

type MergedVariableRecord<T extends readonly string[]> = {
    [K in MergeScalars<T>]: bigint;
} & {
    [K in MergePoints<T>]: Point;
};

// Extract commitment points (left side) from a statement
export type ExtractCommitmentPoint<T extends string> = T extends `${infer Left}=${infer Right}`
    ? Trim<Left>
    : T extends `${infer Left} = ${infer Right}`
    ? Trim<Left>
    : never;

// Types for merging commitments from multiple statements
export type MergeCommitments<T extends readonly string[]> = T extends readonly []
    ? never
    : T extends readonly [infer First]
    ? First extends string
    ? ExtractCommitmentPoint<First>
    : never
    : T extends readonly [infer First, ...infer Rest]
    ? First extends string
    ? Rest extends readonly string[]
    ? ExtractCommitmentPoint<First> | MergeCommitments<Rest>
    : ExtractCommitmentPoint<First>
    : never
    : never;

// Extract scalar types from a SigmaProtocol
export type ExtractProtocolScalars<T> = T extends SigmaProtocol<infer S, any, any> ? S : never;

// Extract point types from a SigmaProtocol
export type ExtractProtocolPoints<T> = T extends SigmaProtocol<any, infer P, any> ? P : never;

// Extract commitment types from a SigmaProtocol
export type ExtractProtocolCommitments<T> = T extends SigmaProtocol<any, any, infer C> ? C : never;

// Extract complete variable record from a SigmaProtocol (all variables)
export type ProtocolVariables<T extends SigmaProtocol<any, any, any>> = T extends SigmaProtocol<infer S, infer P, infer C>
    ? { [K in S]: bigint } & { [K in P | C]: Point }
    : never;

// Extract only input variables needed for proof creation (scalars and points)
export type ProtocolInputVariables<T extends SigmaProtocol<any, any, any>> = T extends SigmaProtocol<infer S, infer P, any>
    ? { [K in S]: bigint } & { [K in P]: Point }
    : never;

// Extract variables needed for verification (points and commitments)
export type ProtocolVerificationVariables<T extends SigmaProtocol<any, any, any>> = T extends SigmaProtocol<any, infer P, infer C>
    ? { [K in P | C]: Point }
    : never;

// Sigma protocol type with inferred scalar, point, and commitment types
export type SigmaProtocol<
    TScalars extends string = string,
    TPoints extends string = string,
    TCommitments extends string = string
> = {
    statements: Statement<string>[];
    scalars: TScalars[];
    points: TPoints[]; // Generator points (right side)
    commitments: TCommitments[]; // Result points (left side)
    descriptor: Uint8Array;
};

// Helper function to create binary descriptor
function createBinaryDescriptor(
    statements: Statement<string>[],
    points: string[],
    scalars: string[]
): Uint8Array {
    // Use the order as provided (no sorting)
    // Create index maps based on order of appearance
    const pointIndexMap = new Map<string, number>();
    const scalarIndexMap = new Map<string, number>();

    // Map points to indices, offsetting by 1 since G is always at index 0
    points.forEach((point, index) => {
        pointIndexMap.set(point, index + 1);
    });

    scalars.forEach((scalar, index) => {
        scalarIndexMap.set(scalar, index);
    });

    // Build binary descriptor
    const parts: number[] = [];

    // First byte: number of statements
    parts.push(statements.length);

    // For each statement
    for (const stmt of statements) {
        // Byte: index of left point
        const leftPointIndex = pointIndexMap.get(stmt.parsed.left);
        if (leftPointIndex === undefined) {
            throw new Error(`Point ${stmt.parsed.left} not found`);
        }
        parts.push(leftPointIndex);

        // Byte: number of terms on the right
        parts.push(stmt.parsed.terms.length);

        // For each term: pair of point and scalar indices
        for (const term of stmt.parsed.terms) {
            let pointIndex: number;
            
            // G is always at index 0
            if (term.pointName === 'G') {
                pointIndex = 0;
            } else {
                const idx = pointIndexMap.get(term.pointName);
                if (idx === undefined) {
                    throw new Error(`Point ${term.pointName} not found`);
                }
                pointIndex = idx;
            }
            
            const scalarIndex = scalarIndexMap.get(term.scalarName);
            if (scalarIndex === undefined) {
                throw new Error(`Scalar ${term.scalarName} not found`);
            }

            parts.push(pointIndex);
            parts.push(scalarIndex);
        }
    }

    return new Uint8Array(parts);
}

// Helper function to create a sigma protocol with multiple statements
export function sigmaProtocol<T extends readonly string[]>(
    ...statements: T
): SigmaProtocol<MergeScalars<T>, MergeGeneratorPoints<T>, MergeCommitments<T>> {
    const stmts = statements.map(stmt => statement(stmt));
    
    // Validate statements
    validateStatements(stmts);

    // Merge all scalars, points, and commitments from all statements
    // Preserve order of first appearance
    const allScalars: string[] = [];
    const allPoints: string[] = [];
    const allCommitments: string[] = [];
    const seenScalars = new Set<string>();
    const seenPoints = new Set<string>();
    const seenCommitments = new Set<string>();

    for (const stmt of stmts) {
        // Add commitment (left side) if not seen
        if (!seenCommitments.has(stmt.parsed.left)) {
            allCommitments.push(stmt.parsed.left);
            seenCommitments.add(stmt.parsed.left);
        }
        
        // Add points from terms in order (these are the generators)
        // But skip points that are already commitments from previous statements
        for (const term of stmt.parsed.terms) {
            // Skip G as it's implicit and always available
            // Skip points that are already commitments
            if (term.pointName !== 'G' && 
                !seenPoints.has(term.pointName) && 
                !seenCommitments.has(term.pointName)) {
                allPoints.push(term.pointName);
                seenPoints.add(term.pointName);
            }
        }
        
        // Add scalars in order they appear in terms
        for (const term of stmt.parsed.terms) {
            if (!seenScalars.has(term.scalarName)) {
                allScalars.push(term.scalarName);
                seenScalars.add(term.scalarName);
            }
        }
    }

    const scalarsArray = allScalars as MergeScalars<T>[];
    const pointsArray = allPoints as MergePoints<T>[];
    const commitmentsArray = allCommitments as MergeCommitments<T>[];

    // Create binary descriptor - we need to include all points (generators + commitments)
    const allPointsForDescriptor = [...allCommitments, ...allPoints];
    const descriptor = createBinaryDescriptor(stmts, allPointsForDescriptor, scalarsArray);

    return {
        statements: stmts,
        scalars: scalarsArray,
        points: pointsArray,
        commitments: commitmentsArray,
        descriptor
    };
}

// Helper function to evaluate a sigma protocol
export function evaluateProtocol<
    TScalars extends string,
    TPoints extends string,
    TCommitments extends string
>(
    protocol: SigmaProtocol<TScalars, TPoints, TCommitments>,
    variables: { [K in TScalars]: bigint } & { [K in TPoints | TCommitments]: Point }
): { results: { leftSide: Point; rightSide: Point; isValid: boolean }[]; allValid: boolean } {
    const results = protocol.statements.map(stmt =>
        evaluateStatement(stmt, variables as any)
    );

    const allValid = results.every(result => result.isValid);

    return {
        results,
        allValid
    };
}

// Validate that statements follow the rules:
// 1. Variables on right side must not be used on left side of the same statement
// 2. Can use commitments from previous statements on the right side
function validateStatements(statements: Statement<string>[]): void {
    const definedCommitments = new Set<string>();
    
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        const leftVar = stmt.parsed.left;
        
        // Check that left side variable is not used on right side of same statement
        for (const term of stmt.parsed.terms) {
            if (term.pointName === leftVar) {
                throw new Error(
                    `Invalid statement at index ${i}: Variable '${leftVar}' cannot appear on both left and right side of the same statement`
                );
            }
        }
        
        // Check that right side only uses previously defined commitments or generator points
        for (const term of stmt.parsed.terms) {
            const pointName = term.pointName;
            
            // G is always allowed
            if (pointName === 'G') continue;
            
            // Check if it's a commitment from a future statement
            let isCommitmentFromFuture = false;
            for (let j = i + 1; j < statements.length; j++) {
                if (statements[j].parsed.left === pointName) {
                    isCommitmentFromFuture = true;
                    break;
                }
            }
            
            if (isCommitmentFromFuture) {
                throw new Error(
                    `Invalid statement at index ${i}: Cannot use commitment '${pointName}' before it is defined`
                );
            }
        }
        
        // Add this statement's commitment to the set of defined commitments
        definedCommitments.add(leftVar);
    }
}