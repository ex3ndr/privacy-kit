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