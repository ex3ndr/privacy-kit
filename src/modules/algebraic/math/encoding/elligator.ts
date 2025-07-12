import { ed25519 } from '@noble/curves/ed25519';
import { Point } from '../point';
import { encodingConstants as cc } from './constants';
import { isNegativeLE, pow2 } from '@noble/curves/abstract/modular';

export function elligatorEncode(r0: bigint): Point {
    // The input is already a field element from the test vectors
    // Just ensure it's properly reduced modulo p
    const { d } = ed25519.CURVE;
    const P = ed25519.CURVE.Fp.ORDER;
    const mod = ed25519.CURVE.Fp.create;

    // Reduce r0 modulo P to ensure it's a valid field element
    r0 = mod(r0);
    const r = mod(cc.SQRT_M1 * r0 * r0); // 1
    const Ns = mod((r + 1n) * cc.ONE_MINUS_D_SQ); // 2
    let c = BigInt(-1); // 3
    const D = mod((c - d * r) * mod(r + d)); // 4
    let { isValid: Ns_D_is_sq, value: s } = uvRatio(Ns, D); // 5
    let s_ = mod(s * r0); // 6
    if (!isNegativeLE(s_, P)) s_ = mod(-s_);
    if (!Ns_D_is_sq) s = s_; // 7
    if (!Ns_D_is_sq) c = r; // 8
    const Nt = mod(c * (r - 1n) * cc.D_MINUS_ONE_SQ - D); // 9
    const s2 = mod(s * s);  // Ensure s2 is reduced mod p
    const W0 = mod((s + s) * D); // 10
    const W1 = mod(Nt * cc.SQRT_AD_MINUS_ONE); // 11
    const W2 = mod(1n - s2); // 12
    const W3 = mod(1n + s2); // 13
    return Point.fromExtended({
        X: mod(W0 * W3),
        Y: mod(W2 * W1),
        Z: mod(W1 * W3),
        T: mod(W0 * W2)
    });
}

/**
 * Decodes a Ristretto point to find all field elements that map to it via elligatorEncode.
 * Returns up to 8 field elements that encode to the given point.
 * 
 * @param point The Ristretto point to decode
 * @returns Array of objects with field element and validity flag
 */
export function elligatorDecode(point: Point): { value: bigint, isValid: boolean }[] {
    const results: { value: bigint, isValid: boolean }[] = [];
    
    // Get the extended point coordinates using toExtended method
    const extPoint = (point as any).toExtended();
    const X = extPoint.X;
    const Y = extPoint.Y;
    const Z = extPoint.Z;
    const T = extPoint.T;
    
    // Convert to Jacobi quartic points
    const jacobiPoints = toJacobiQuarticRistretto(X, Y, Z, T);
    
    // For each Jacobi point, try to find its Elligator preimage
    for (const jp of jacobiPoints) {
        // Try the point itself
        const result1 = elligatorInverse(jp.S, jp.T);
        results.push(result1);
        
        // Try the dual point (-S, -T)
        const P = ed25519.CURVE.Fp.ORDER;
        const mod = ed25519.CURVE.Fp.create;
        const dualS = mod(-jp.S);
        const dualT = mod(-jp.T);
        const result2 = elligatorInverse(dualS, dualT);
        results.push(result2);
    }
    
    return results;
}

/**
 * Converts an Edwards curve point to 4 Jacobi quartic points
 */
function toJacobiQuarticRistretto(X: bigint, Y: bigint, Z: bigint, T: bigint): { S: bigint, T: bigint }[] {
    const P = ed25519.CURVE.Fp.ORDER;
    const mod = ed25519.CURVE.Fp.create;
    
    const x2 = mod(X * X); // X^2
    const y2 = mod(Y * Y); // Y^2
    const y4 = mod(y2 * y2); // Y^4
    const z2 = mod(Z * Z); // Z^2
    const z_min_y = mod(Z - Y); // Z - Y
    const z_pl_y = mod(Z + Y); // Z + Y
    const z2_min_y2 = mod(z2 - y2); // Z^2 - Y^2

    // gamma := 1/sqrt( Y^4 X^2 (Z^2 - Y^2) )
    const toInvert = mod(mod(y4 * x2) * z2_min_y2);
    const { isValid, value: gamma } = sqrtInverse(toInvert);
    
    if (!isValid) {
        // Handle special case where X=0 or Y=0
        const xIsZero = X === 0n;
        const yIsZero = Y === 0n;
        
        if (xIsZero || yIsZero) {
            // Return special case values as in Rust implementation
            return [
                { S: 0n, T: 1n },
                { S: 0n, T: 1n },
                { S: 1n, T: mod(-2n * cc.INVSQRT_A_MINUS_D) },
                { S: mod(-1n), T: mod(-2n * cc.INVSQRT_A_MINUS_D) }
            ];
        }
        
        // If not special case but still invalid, return empty
        return [];
    }

    const den = mod(gamma * y2);

    const s_over_x = mod(den * z_min_y);
    const sp_over_xp = mod(den * z_pl_y);

    const s0 = mod(s_over_x * X);
    const s1 = mod(-sp_over_xp * X);

    // t_0 := -2/sqrt(-d-1) * Z * sOverX
    // t_1 := -2/sqrt(-d-1) * Z * spOverXp
    const tmp = mod(mod(-2n * cc.INVSQRT_A_MINUS_D) * Z);
    const t0 = mod(tmp * s_over_x);
    const t1 = mod(tmp * sp_over_xp);

    // den := -1/sqrt(1+d) (Y^2 - Z^2) gamma
    const den2 = mod(mod(mod(-z2_min_y2) * invSqrtOnePlusD()) * gamma);

    // Same as before but with the substitution (X, Y, Z) = (Y, X, i*Z)
    const iz = mod(cc.SQRT_M1 * Z); // iZ
    const iz_min_x = mod(iz - X); // iZ - X
    const iz_pl_x = mod(iz + X); // iZ + X

    const s_over_y = mod(den2 * iz_min_x);
    const sp_over_yp = mod(den2 * iz_pl_x);

    const s2 = mod(s_over_y * Y);
    const s3 = mod(-sp_over_yp * Y);

    // t_2 := -2/sqrt(-d-1) * i*Z * sOverY
    // t_3 := -2/sqrt(-d-1) * i*Z * spOverYp
    const tmp2 = mod(mod(-2n * cc.INVSQRT_A_MINUS_D) * iz);
    const t2 = mod(tmp2 * s_over_y);
    const t3 = mod(tmp2 * sp_over_yp);

    return [
        { S: s0, T: t0 },
        { S: s1, T: t1 },
        { S: s2, T: t2 },
        { S: s3, T: t3 }
    ];
}

/**
 * Computes the Elligator inverse for a Jacobi quartic point (s,t)
 * Returns the field element that maps to this point if it exists
 */
function elligatorInverse(S: bigint, T: bigint): { value: bigint, isValid: boolean } {
    const P = ed25519.CURVE.Fp.ORDER;
    const mod = ed25519.CURVE.Fp.create;
    const { d } = ed25519.CURVE;
    
    // Special case: s = 0. If s is zero, either t = 1 or t = -1.
    // If t=1, then sqrt(i*d) is the preimage. Otherwise it's 0.
    const sIsZero = S === 0n;
    const tEqualsOne = T === 1n;
    
    if (sIsZero) {
        if (tEqualsOne) {
            // Return sqrt(i*d)
            const id = mod(cc.SQRT_M1 * d);
            const { isValid, value } = sqrtField(id);
            return { value: isValid ? value : 0n, isValid };
        }
        return { value: 0n, isValid: true };
    }
    
    // a := (t+1) (d+1)/(d-1)
    const dp1 = mod(d + 1n);
    const dm1 = mod(d - 1n);
    const dp1_over_dm1 = mod(dp1 * modInverse(dm1));
    const a = mod(mod(T + 1n) * dp1_over_dm1);
    const a2 = mod(a * a);
    
    // y := 1/sqrt(i (s^4 - a^2)).
    const s2 = mod(S * S);
    const s4 = mod(s2 * s2);
    const invSqY = mod(mod(s4 - a2) * cc.SQRT_M1);
    
    // There is no preimage if the square root of i*(s^4-a^2) does not exist.
    const { isValid: sq, value: y } = sqrtInverse(invSqY);
    
    if (!sq) {
        return { value: 0n, isValid: false };
    }
    
    // x := (a + sign(s)*s^2) y
    let pms2 = s2;
    if (isNegativeLE(S, P)) {
        pms2 = mod(-pms2);
    }
    
    let x = mod(mod(a + pms2) * y);
    
    // Make x positive
    if (isNegativeLE(x, P)) {
        x = mod(-x);
    }
    
    return { value: x, isValid: true };
}

/**
 * Helper to compute 1/sqrt(1+d)
 */
function invSqrtOnePlusD(): bigint {
    const P = ed25519.CURVE.Fp.ORDER;
    const mod = ed25519.CURVE.Fp.create;
    const { d } = ed25519.CURVE;
    
    const onePlusD = mod(1n + d);
    const { value } = sqrtInverse(onePlusD);
    return value;
}

/**
 * Compute 1/sqrt(x) if it exists
 */
function sqrtInverse(x: bigint): { isValid: boolean, value: bigint } {
    const P = ed25519.CURVE.Fp.ORDER;
    const mod = ed25519.CURVE.Fp.create;
    
    if (x === 0n) {
        return { isValid: false, value: 0n };
    }
    
    // Try to compute sqrt(1/x) = 1/sqrt(x)
    const inv = modInverse(x);
    return sqrtField(inv);
}

/**
 * Compute sqrt(x) if it exists
 */
function sqrtField(x: bigint): { isValid: boolean, value: bigint } {
    const P = ed25519.CURVE.Fp.ORDER;
    const mod = ed25519.CURVE.Fp.create;
    
    // For p = 2^255 - 19, we can compute sqrt as x^((p+3)/8)
    const exp = (P + 3n) / 8n;
    const candidate = modPow(x, exp, P);
    const candidate2 = mod(candidate * candidate);
    
    if (candidate2 === x) {
        return { isValid: true, value: candidate };
    }
    
    // Try multiplying by sqrt(-1)
    const candidate3 = mod(candidate * cc.SQRT_M1);
    const candidate4 = mod(candidate3 * candidate3);
    
    if (candidate4 === x) {
        return { isValid: true, value: candidate3 };
    }
    
    return { isValid: false, value: 0n };
}

/**
 * Modular exponentiation
 */
function modPow(base: bigint, exp: bigint, modulus: bigint): bigint {
    let result = 1n;
    base = base % modulus;
    
    while (exp > 0n) {
        if (exp & 1n) {
            result = (result * base) % modulus;
        }
        exp = exp >> 1n;
        base = (base * base) % modulus;
    }
    
    return result;
}

/**
 * Modular inverse using extended Euclidean algorithm
 */
function modInverse(a: bigint): bigint {
    const P = ed25519.CURVE.Fp.ORDER;
    const mod = ed25519.CURVE.Fp.create;
    
    // Use Fermat's little theorem: a^(p-2) mod p = a^(-1) mod p
    return modPow(a, P - 2n, P);
}

//
// Math
//

function uvRatio(u: bigint, v: bigint): { isValid: boolean; value: bigint } {
    const P = ed25519.CURVE.Fp.ORDER;
    const mod = ed25519.CURVE.Fp.create;

    const v3 = mod(v * v * v); // v³
    const v7 = mod(v3 * v3 * v); // v⁷
    // (p+3)/8 and (p-5)/8
    const pow = ed25519_pow_2_252_3(mod(u * v7)).pow_p_5_8;
    let x = mod(u * v3 * pow); // (uv³)(uv⁷)^(p-5)/8
    const vx2 = mod(v * x * x); // vx²
    const root1 = x; // First root candidate
    const root2 = mod(x * cc.SQRT_M1); // Second root candidate
    const useRoot1 = vx2 === u; // If vx² = u (mod p), x is a square root
    const useRoot2 = vx2 === mod(-u); // If vx² = -u, set x <-- x * 2^((p-1)/4)
    const noRoot = vx2 === mod(-u * cc.SQRT_M1); // There is no valid root, vx² = -u√(-1)
    if (useRoot1) x = root1;
    if (useRoot2 || noRoot) x = root2; // We return root2 anyway, for const-time
    if (isNegativeLE(x, P)) x = mod(-x);
    return { isValid: useRoot1 || useRoot2, value: x };
}

function ed25519_pow_2_252_3(x: bigint) {
    const P = ed25519.CURVE.Fp.ORDER;
    const mod = ed25519.CURVE.Fp.create;

    const x2 = mod(x * x);
    const b2 = mod(x2 * x); // x^3, 11
    const b4 = mod(pow2(b2, 2n, P) * b2); // x^15, 1111
    const b5 = mod(pow2(b4, 1n, P) * x); // x^31
    const b10 = mod(pow2(b5, 5n, P) * b5);
    const b20 = mod(pow2(b10, 10n, P) * b10);
    const b40 = mod(pow2(b20, 20n, P) * b20);
    const b80 = mod(pow2(b40, 40n, P) * b40);
    const b160 = mod(pow2(b80, 80n, P) * b80);
    const b240 = mod(pow2(b160, 80n, P) * b80);
    const b250 = mod(pow2(b240, 10n, P) * b10);
    const pow_p_5_8 = mod(pow2(b250, 2n, P) * x);
    // ^ To pow to (p+3)/8, multiply it by x.
    return { pow_p_5_8, b2 };
}