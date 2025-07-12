import { describe, expect, it } from "vitest";
import { Point } from "./point";

describe('point', () => {
    it('should be able to convert to and from affine', () => {
        const point = Point.BASE;
        const affine = point.toAffine();
        const point2 = Point.fromAffine(affine);
        expect(point.equals(point2)).toBe(true);
    });
});