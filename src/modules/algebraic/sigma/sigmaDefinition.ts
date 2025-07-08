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
type ExtractScalars<T extends string> = T extends `${infer Left}=${infer Right}`
    ? ExtractScalarsFromExpression<Trim<Right>>
    : T extends `${infer Left} = ${infer Right}`
    ? ExtractScalarsFromExpression<Trim<Right>>
    : never;

type ExtractPoints<T extends string> = T extends `${infer Left}=${infer Right}`
    ? Trim<Left> | ExtractPointsFromExpression<Trim<Right>>
    : T extends `${infer Left} = ${infer Right}`
    ? Trim<Left> | ExtractPointsFromExpression<Trim<Right>>
    : never;

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

type PointRecord<T extends string> = {
    [K in ExtractPoints<T>]: Point;
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
        const point = variables[term.pointName as keyof VariableRecord<T>] as Point;

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
type MergeScalars<T extends readonly string[]> = T extends readonly [infer First, ...infer Rest]
    ? First extends string
    ? Rest extends readonly string[]
    ? ExtractScalars<First> | MergeScalars<Rest>
    : ExtractScalars<First>
    : never
    : never;

type MergePoints<T extends readonly string[]> = T extends readonly [infer First, ...infer Rest]
    ? First extends string
    ? Rest extends readonly string[]
    ? ExtractPoints<First> | MergePoints<Rest>
    : ExtractPoints<First>
    : never
    : never;

type MergedVariableRecord<T extends readonly string[]> = {
    [K in MergeScalars<T>]: bigint;
} & {
    [K in MergePoints<T>]: Point;
};

// Extract scalar types from a SigmaProtocol
export type ExtractProtocolScalars<T> = T extends SigmaProtocol<infer S, any> ? S : never;

// Extract point types from a SigmaProtocol
export type ExtractProtocolPoints<T> = T extends SigmaProtocol<any, infer P> ? P : never;

// Extract complete variable record from a SigmaProtocol
export type ProtocolVariables<T extends SigmaProtocol<any, any>> = T extends SigmaProtocol<infer S, infer P>
    ? { [K in S]: bigint } & { [K in P]: Point }
    : never;

// Sigma protocol type with inferred scalar and point types
export type SigmaProtocol<
    TScalars extends string = string,
    TPoints extends string = string
> = {
    statements: Statement<string>[];
    scalars: TScalars[];
    points: TPoints[];
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

    points.forEach((point, index) => {
        pointIndexMap.set(point, index);
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
            const pointIndex = pointIndexMap.get(term.pointName);
            const scalarIndex = scalarIndexMap.get(term.scalarName);

            if (pointIndex === undefined) {
                throw new Error(`Point ${term.pointName} not found`);
            }
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
): SigmaProtocol<MergeScalars<T>, MergePoints<T>> {
    const stmts = statements.map(stmt => statement(stmt));

    // Merge all scalars and points from all statements
    // Preserve order of first appearance
    const allScalars: string[] = [];
    const allPoints: string[] = [];
    const seenScalars = new Set<string>();
    const seenPoints = new Set<string>();

    for (const stmt of stmts) {
        // Add points in order they appear (left side first)
        if (!seenPoints.has(stmt.parsed.left)) {
            allPoints.push(stmt.parsed.left);
            seenPoints.add(stmt.parsed.left);
        }
        
        // Add points from terms in order
        for (const term of stmt.parsed.terms) {
            if (!seenPoints.has(term.pointName)) {
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

    // Create binary descriptor
    const descriptor = createBinaryDescriptor(stmts, pointsArray, scalarsArray);

    return {
        statements: stmts,
        scalars: scalarsArray,
        points: pointsArray,
        descriptor
    };
}

// Helper function to evaluate a sigma protocol
export function evaluateProtocol<
    TScalars extends string,
    TPoints extends string
>(
    protocol: SigmaProtocol<TScalars, TPoints>,
    variables: { [K in TScalars]: bigint } & { [K in TPoints]: Point }
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