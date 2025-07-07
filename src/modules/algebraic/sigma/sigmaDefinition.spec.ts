import { describe, expect, it, beforeEach } from 'vitest';
import { Point } from '../math/point';
import { generateRandomScalar } from '../math/scalar';
import {
  statement,
  evaluateStatement,
  isValidSigmaStatement,
  parseVariables,
  parseTerms,
  sigmaProtocol,
  evaluateProtocol,
  type ExtractProtocolScalars,
  type ExtractProtocolPoints,
  type ProtocolVariables,
  type SigmaProtocol
} from './sigmaDefinition';

describe('Sigma Statement Definition', () => {
  let G: Point;
  let H: Point;
  let P: Point;
  let Q: Point;
  let a: bigint;
  let b: bigint;
  let c: bigint;

  beforeEach(() => {
    // Generate test points and scalars
    G = Point.fromHash('generator_G', 'test_domain');
    H = Point.fromHash('generator_H', 'test_domain');
    a = generateRandomScalar();
    b = generateRandomScalar();
    c = generateRandomScalar();
    
    // Create some test points
    P = Point.add(G.multiply(a), H.multiply(b));
    Q = G.multiply(c);
  });

  describe('isValidSigmaStatement', () => {
    it('should validate correct statement format', () => {
      expect(isValidSigmaStatement('P = G^a + H^b')).toBe(true);
      expect(isValidSigmaStatement('Q = G^c')).toBe(true);
      expect(isValidSigmaStatement('R = P^x + Q^y + H^z')).toBe(true);
    });

    it('should reject invalid statement formats', () => {
      expect(isValidSigmaStatement('P = G*a + H*b')).toBe(false); // wrong operator
      expect(isValidSigmaStatement('P + Q = G^a')).toBe(false); // invalid left side
      expect(isValidSigmaStatement('P = G^a +')).toBe(false); // incomplete
      expect(isValidSigmaStatement('P = a + b')).toBe(false); // no exponentiation
      expect(isValidSigmaStatement('P = G^a ^ H^b')).toBe(false); // wrong format
      expect(isValidSigmaStatement('P')).toBe(false); // no equation
      expect(isValidSigmaStatement('P = = G^a')).toBe(false); // double equals
    });

    it('should handle whitespace correctly', () => {
      expect(isValidSigmaStatement('  P  =  G ^ a  +  H ^ b  ')).toBe(true);
      expect(isValidSigmaStatement('P=G^a+H^b')).toBe(true);
      expect(isValidSigmaStatement('P = G ^ a')).toBe(true);
    });
  });

  describe('parseVariables', () => {
    it('should correctly parse variables from statement', () => {
      const result = parseVariables('P = G^a + H^b');
      expect(result.points).toEqual(expect.arrayContaining(['P', 'G', 'H']));
      expect(result.scalars).toEqual(expect.arrayContaining(['a', 'b']));
    });

    it('should handle single term statements', () => {
      const result = parseVariables('Q = G^c');
      expect(result.points).toEqual(expect.arrayContaining(['Q', 'G']));
      expect(result.scalars).toEqual(expect.arrayContaining(['c']));
    });

    it('should handle multiple terms', () => {
      const result = parseVariables('R = P^x + Q^y + H^z');
      expect(result.points).toEqual(expect.arrayContaining(['R', 'P', 'Q', 'H']));
      expect(result.scalars).toEqual(expect.arrayContaining(['x', 'y', 'z']));
    });

    it('should throw error for invalid statements', () => {
      expect(() => parseVariables('P + Q = G^a')).toThrow('Invalid statement format');
      
      // This won't throw but will return empty arrays since no terms match
      const result = parseVariables('P = G*a');
      expect(result.scalars).toEqual([]);
      expect(result.points).toEqual(['P']); // Only left side point is parsed
    });
  });

  describe('parseTerms', () => {
    it('should correctly parse terms from statement', () => {
      const result = parseTerms('P = G^a + H^b');
      expect(result).toEqual([
        { scalarName: 'a', pointName: 'G' },
        { scalarName: 'b', pointName: 'H' }
      ]);
    });

    it('should handle single term statements', () => {
      const result = parseTerms('Q = G^c');
      expect(result).toEqual([
        { scalarName: 'c', pointName: 'G' }
      ]);
    });

    it('should handle multiple terms', () => {
      const result = parseTerms('R = P^x + Q^y + H^z');
      expect(result).toEqual([
        { scalarName: 'x', pointName: 'P' },
        { scalarName: 'y', pointName: 'Q' },
        { scalarName: 'z', pointName: 'H' }
      ]);
    });

    it('should return empty array for invalid terms', () => {
      const result = parseTerms('P = G*a'); // Wrong operator
      expect(result).toEqual([]);
    });

    it('should throw error for invalid statement format', () => {
      expect(() => parseTerms('P + Q = G^a')).toThrow('Invalid statement format');
    });
  });

  describe('statement', () => {
    it('should create valid statement', () => {
      const stmt = statement('P = G^a + H^b');
      
      expect(stmt.statement).toBe('P = G^a + H^b');
      expect(stmt.scalars).toEqual(expect.arrayContaining(['a', 'b']));
      expect(stmt.points).toEqual(expect.arrayContaining(['P', 'G', 'H']));
      expect(stmt.parsed.left).toBe('P');
      expect(stmt.parsed.right).toBe('G^a + H^b');
      expect(stmt.parsed.terms).toEqual([
        { scalarName: 'a', pointName: 'G' },
        { scalarName: 'b', pointName: 'H' }
      ]);
    });

    it('should throw error for invalid statement format', () => {
      expect(() => statement('P = G*a')).toThrow('Invalid sigma statement format');
    });

    it('should handle single term statements', () => {
      const stmt = statement('Q = G^c');
      
      expect(stmt.scalars).toEqual(['c']);
      expect(stmt.points).toEqual(expect.arrayContaining(['Q', 'G']));
      expect(stmt.parsed.terms).toEqual([
        { scalarName: 'c', pointName: 'G' }
      ]);
    });

    it('should handle multiple terms', () => {
      const stmt = statement('R = P^x + Q^y + H^z');
      
      expect(stmt.scalars).toEqual(expect.arrayContaining(['x', 'y', 'z']));
      expect(stmt.points).toEqual(expect.arrayContaining(['R', 'P', 'Q', 'H']));
      expect(stmt.parsed.terms).toHaveLength(3);
    });
  });

  describe('evaluateStatement', () => {
    it('should evaluate true statements correctly', () => {
      const stmt = statement('P = G^a + H^b');
      const variables = { P, G, H, a, b };
      const result = evaluateStatement(stmt, variables);
      
      expect(result.isValid).toBe(true);
      expect(result.leftSide.equals(P)).toBe(true);
      expect(result.rightSide.equals(P)).toBe(true);
    });

    it('should evaluate false statements correctly', () => {
      const wrongP = G.multiply(generateRandomScalar());
      const stmt = statement('P = G^a + H^b');
      const variables = { P: wrongP, G, H, a, b };
      const result = evaluateStatement(stmt, variables);
      
      expect(result.isValid).toBe(false);
      expect(result.leftSide.equals(wrongP)).toBe(true);
      expect(result.rightSide.equals(wrongP)).toBe(false);
    });

    it('should handle single term statements', () => {
      const stmt = statement('Q = G^c');
      const variables = { Q, G, c };
      const result = evaluateStatement(stmt, variables);
      
      expect(result.isValid).toBe(true);
      expect(result.leftSide.equals(Q)).toBe(true);
      expect(result.rightSide.equals(Q)).toBe(true);
    });

    it('should handle multiple terms', () => {
      const d = generateRandomScalar();
      const e = generateRandomScalar();
      const R = Point.add(Point.add(P.multiply(d), Q.multiply(e)), H.multiply(c));
      const stmt = statement('R = P^d + Q^e + H^c');
      const variables = { R, P, Q, H, d, e, c };
      const result = evaluateStatement(stmt, variables);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('sigmaProtocol', () => {
    it('should create protocol with multiple statements', () => {
      const protocol = sigmaProtocol('P = G^a + H^b', 'Q = G^c');
      
      expect(protocol.statements).toHaveLength(2);
      expect(protocol.statements[0].statement).toBe('P = G^a + H^b');
      expect(protocol.statements[1].statement).toBe('Q = G^c');
      
      // Should merge all scalars and points
      expect(protocol.scalars).toEqual(expect.arrayContaining(['a', 'b', 'c']));
      expect(protocol.points).toEqual(expect.arrayContaining(['P', 'G', 'H', 'Q']));
    });

    it('should maintain type safety for multiple statements', () => {
      const protocol = sigmaProtocol('P = G^a + H^b', 'Q = G^c');
      
      // Type checking - these should compile without errors
      const firstStatement = protocol.statements[0];
      const secondStatement = protocol.statements[1];
      
      expect(firstStatement.statement).toBe('P = G^a + H^b');
      expect(secondStatement.statement).toBe('Q = G^c');
      expect(firstStatement.scalars).toEqual(expect.arrayContaining(['a', 'b']));
      expect(secondStatement.scalars).toEqual(['c']);
    });

    it('should handle overlapping variables', () => {
      const protocol = sigmaProtocol('P = G^a + H^b', 'R = H^a + G^c');
      
      // Should deduplicate shared variables
      expect(protocol.scalars).toEqual(expect.arrayContaining(['a', 'b', 'c']));
      expect(protocol.points).toEqual(expect.arrayContaining(['P', 'G', 'H', 'R']));
      expect(protocol.scalars).toHaveLength(3); // a, b, c (no duplicates)
      expect(protocol.points).toHaveLength(4); // P, G, H, R (no duplicates)
    });
  });

  describe('evaluateProtocol', () => {
    it('should evaluate all statements in protocol', () => {
      const protocol = sigmaProtocol('P = G^a + H^b', 'Q = G^c');
      const variables = { P, G, H, Q, a, b, c };
      const result = evaluateProtocol(protocol, variables);
      
      expect(result.results).toHaveLength(2);
      expect(result.results[0].isValid).toBe(true);
      expect(result.results[1].isValid).toBe(true);
      expect(result.allValid).toBe(true);
    });

    it('should detect when some statements fail', () => {
      const wrongQ = G.multiply(generateRandomScalar());
      const protocol = sigmaProtocol('P = G^a + H^b', 'Q = G^c');
      const variables = { P, G, H, Q: wrongQ, a, b, c };
      const result = evaluateProtocol(protocol, variables);
      
      expect(result.results).toHaveLength(2);
      expect(result.results[0].isValid).toBe(true);
      expect(result.results[1].isValid).toBe(false);
      expect(result.allValid).toBe(false);
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct variable types at compile time', () => {
      const stmt = statement('P = G^a + H^b');
      
      // Valid variables - should compile
      const validVariables = { P, G, H, a, b };
      expect(() => evaluateStatement(stmt, validVariables)).not.toThrow();
      
      // TypeScript would catch these at compile time:
      // const invalidVariables = { P, G, H, a: 'not_a_scalar', b }; // Type error
      // evaluateStatement(stmt, invalidVariables);
    });

    it('should provide type-safe variable access', () => {
      const stmt = statement('P = G^a + H^b');
      
      // The statement should contain the correct variable lists
      expect(stmt.scalars).toEqual(expect.arrayContaining(['a', 'b']));
      expect(stmt.points).toEqual(expect.arrayContaining(['P', 'G', 'H']));
      
      // This ensures the variable record type matches
      const variables = { P, G, H, a, b };
      const result = evaluateStatement(stmt, variables);
      expect(result.isValid).toBe(true);
    });

    it('should demonstrate complete type safety workflow', () => {
      // 1. Create statements without variables - completely type-safe parsing
      const stmt1 = statement('P = G^a + H^b');
      const stmt2 = statement('Q = G^c');
      
      // 2. TypeScript knows exactly which variables are needed
      expect(stmt1.scalars).toEqual(expect.arrayContaining(['a', 'b']));
      expect(stmt1.points).toEqual(expect.arrayContaining(['P', 'G', 'H']));
      expect(stmt2.scalars).toEqual(['c']);
      expect(stmt2.points).toEqual(expect.arrayContaining(['Q', 'G']));
      
      // 3. Variables are only provided during evaluation with full type safety
      const variables1 = { P, G, H, a, b };
      const variables2 = { Q, G, c };
      
      const result1 = evaluateStatement(stmt1, variables1);
      const result2 = evaluateStatement(stmt2, variables2);
      
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    it('should provide type safety for sigma protocols', () => {
      // Create protocol with merged variables
      const protocol = sigmaProtocol('P = G^a + H^b', 'Q = G^c');
      
      // All variables are merged and type-checked
      expect(protocol.scalars).toEqual(expect.arrayContaining(['a', 'b', 'c']));
      expect(protocol.points).toEqual(expect.arrayContaining(['P', 'G', 'H', 'Q']));
      
      // Evaluation requires all merged variables with correct types
      const variables = { P, G, H, Q, a, b, c };
      const result = evaluateProtocol(protocol, variables);
      
      expect(result.allValid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle statements with same variable names', () => {
      const sameP = Point.add(G.multiply(a), H.multiply(b));
      const stmt = statement('P = G^a + H^b');
      const variables = { P: sameP, G, H, a, b };
      const result = evaluateStatement(stmt, variables);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle zero scalars', () => {
      const zero = 0n;
      const zeroP = H.multiply(b); // Since G^0 = ZERO, P = ZERO + H^b = H^b
      const stmt = statement('P = G^a + H^b');
      const variables = { P: zeroP, G, H, a: zero, b };
      const result = evaluateStatement(stmt, variables);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle identity point', () => {
      const identity = Point.ZERO;
      const zero = 0n;
      const stmt = statement('P = G^a');
      const variables = { P: identity, G, a: zero };
      const result = evaluateStatement(stmt, variables);
      
      expect(result.isValid).toBe(true);
      expect(result.leftSide.equals(Point.ZERO)).toBe(true);
      expect(result.rightSide.equals(Point.ZERO)).toBe(true);
    });

    it('should handle large numbers of terms', () => {
      const x = generateRandomScalar();
      const y = generateRandomScalar();
      const z = generateRandomScalar();
      const w = generateRandomScalar();
      
      const R = Point.add(
        Point.add(P.multiply(x), Q.multiply(y)),
        Point.add(G.multiply(z), H.multiply(w))
      );
      
      const stmt = statement('R = P^x + Q^y + G^z + H^w');
      const variables = { R, P, Q, G, H, x, y, z, w };
      const result = evaluateStatement(stmt, variables);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Variable Name Validation', () => {
    it('should accept valid variable names', () => {
      expect(isValidSigmaStatement('P1 = G1^a1 + H2^b2')).toBe(true);
      expect(isValidSigmaStatement('point_1 = generator_G^scalar_a')).toBe(true);
      expect(isValidSigmaStatement('_P = _G^_a')).toBe(true);
    });

    it('should reject invalid variable names', () => {
      expect(isValidSigmaStatement('1P = G^a')).toBe(false); // starts with number
      expect(isValidSigmaStatement('P-1 = G^a')).toBe(false); // contains dash
      expect(isValidSigmaStatement('P = G^a + H-1^b')).toBe(false); // contains dash
    });
  });

  describe('Complete API Example', () => {
    it('should demonstrate the complete workflow', () => {
      // 1. Create individual statements
      const stmt1 = statement('P = G^a + H^b');
      const stmt2 = statement('Q = G^c');
      
      // 2. Create a sigma protocol with multiple statements
      const protocol = sigmaProtocol('P = G^a + H^b', 'Q = G^c', 'R = P^d + Q^e');
      
      // 3. Protocol automatically merges all variables
      expect(protocol.scalars).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd', 'e']));
      expect(protocol.points).toEqual(expect.arrayContaining(['P', 'G', 'H', 'Q', 'R']));
      
      // 4. Evaluate with type-safe variable binding
      const d = generateRandomScalar();
      const e = generateRandomScalar();
      const R = Point.add(P.multiply(d), Q.multiply(e));
      
      const variables = { P, G, H, Q, R, a, b, c, d, e };
      const result = evaluateProtocol(protocol, variables);
      
      expect(result.allValid).toBe(true);
      expect(result.results).toHaveLength(3);
    });

    it('should demonstrate type inference for sigma protocols', () => {
      // Protocol type T now contains inferred scalar and point types
      const protocol = sigmaProtocol('P = G^a + H^b', 'Q = G^c');
      
      // TypeScript infers: SigmaProtocol<"a" | "b" | "c", "P" | "G" | "H" | "Q">
      // instead of: SigmaProtocol<["P = G^a + H^b", "Q = G^c"]>
      
      // This demonstrates the type contains the actual variable names
      expect(protocol.scalars).toEqual(expect.arrayContaining(['a', 'b', 'c']));
      expect(protocol.points).toEqual(expect.arrayContaining(['P', 'G', 'H', 'Q']));
      
      // Variables must exactly match the inferred types
      const variables = { P, G, H, Q, a, b, c };
      const result = evaluateProtocol(protocol, variables);
      
      expect(result.allValid).toBe(true);
    });
  });

  describe('Protocol Variable Extraction Types', () => {
    it('should extract scalar types from protocol', () => {
      const protocol = sigmaProtocol('P = G^a + H^b', 'Q = G^c');
      
      // Test type extraction at compile time with assertion functions
      function assertScalarType<T extends string>(scalars: T[]) {
        return scalars;
      }
      
      // This should compile without errors - ExtractProtocolScalars extracts the scalar union type
      type ProtocolScalars = ExtractProtocolScalars<typeof protocol>;
      const scalarNames = assertScalarType<ProtocolScalars>(['a', 'b', 'c']);
      
      expect(scalarNames).toEqual(['a', 'b', 'c']);
      expect(protocol.scalars).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    });

    it('should extract point types from protocol', () => {
      const protocol = sigmaProtocol('P = G^a + H^b', 'Q = G^c');
      
      // Test type extraction at compile time with assertion functions
      function assertPointType<T extends string>(points: T[]) {
        return points;
      }
      
      // This should compile without errors - ExtractProtocolPoints extracts the point union type
      type ProtocolPoints = ExtractProtocolPoints<typeof protocol>;
      const pointNames = assertPointType<ProtocolPoints>(['P', 'G', 'H', 'Q']);
      
      expect(pointNames).toEqual(['P', 'G', 'H', 'Q']);
      expect(protocol.points).toEqual(expect.arrayContaining(['P', 'G', 'H', 'Q']));
    });

    it('should create complete variable record type from protocol', () => {
      const protocol = sigmaProtocol('P = G^a + H^b', 'Q = G^c');
      
      // ProtocolVariables should create the exact type needed for evaluation
      type Variables = ProtocolVariables<typeof protocol>;
      
      // This should compile without errors - all required variables with correct types
      const variables: Variables = { P, G, H, Q, a, b, c };
      
      // Should work with evaluateProtocol
      const result = evaluateProtocol(protocol, variables);
      expect(result.allValid).toBe(true);
      
      // Verify the variables object has the correct structure
      expect(typeof variables.a).toBe('bigint');
      expect(typeof variables.b).toBe('bigint');
      expect(typeof variables.c).toBe('bigint');
      expect(variables.P).toBeInstanceOf(Point);
      expect(variables.G).toBeInstanceOf(Point);
      expect(variables.H).toBeInstanceOf(Point);
      expect(variables.Q).toBeInstanceOf(Point);
    });

    it('should work with complex protocols', () => {
      const protocol = sigmaProtocol(
        'P = G^a + H^b', 
        'Q = G^c', 
        'R = P^d + Q^e + H^f'
      );
      
      type ProtocolScalars = ExtractProtocolScalars<typeof protocol>;
      type ProtocolPoints = ExtractProtocolPoints<typeof protocol>;
      type Variables = ProtocolVariables<typeof protocol>;
      
      // Should extract all unique scalars and points
      expect(protocol.scalars).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd', 'e', 'f']));
      expect(protocol.points).toEqual(expect.arrayContaining(['P', 'G', 'H', 'Q', 'R']));
      
      // Create variables using the extracted types
      const d = generateRandomScalar();
      const e = generateRandomScalar();
      const f = generateRandomScalar();
      const R = Point.add(Point.add(P.multiply(d), Q.multiply(e)), H.multiply(f));
      
      const variables: Variables = { P, G, H, Q, R, a, b, c, d, e, f };
      const result = evaluateProtocol(protocol, variables);
      
      expect(result.allValid).toBe(true);
    });

    it('should demonstrate usage in external functions', () => {
      // Example of how these types can be used in other parts of the codebase
      const protocol = sigmaProtocol('P = G^a + H^b', 'Q = G^c');
      
      // Function that accepts variables matching a specific protocol
      function processProtocolVariables<T extends SigmaProtocol<any, any>>(
        protocol: T,
        variables: ProtocolVariables<T>
      ) {
        return evaluateProtocol(protocol, variables);
      }
      
      // Function that works with just the scalar types
      function generateScalars<T extends string>(scalarNames: T[]): { [K in T]: bigint } {
        const result = {} as { [K in T]: bigint };
        for (const name of scalarNames) {
          result[name] = generateRandomScalar();
        }
        return result;
      }
      
      // Function that works with just the point types  
      function generatePoints<T extends string>(pointNames: T[]): { [K in T]: Point } {
        const result = {} as { [K in T]: Point };
        for (const name of pointNames) {
          result[name] = Point.fromHash(name, 'test_domain');
        }
        return result;
      }
      
      // Usage example
      type Scalars = ExtractProtocolScalars<typeof protocol>;
      type Points = ExtractProtocolPoints<typeof protocol>;
      
      const scalars = generateScalars(protocol.scalars);
      const points = generatePoints(protocol.points);
      const allVariables = { ...scalars, ...points };
      
      const result = processProtocolVariables(protocol, allVariables);
      expect(result.results).toHaveLength(2);
    });
  });
});