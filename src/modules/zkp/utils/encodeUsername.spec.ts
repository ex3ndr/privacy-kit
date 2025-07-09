import { describe, it, expect } from 'vitest';
import { encodeUsername } from './encodeUsername';
import { Point } from '@/modules/algebraic/math/point';

describe('encodeUsername', () => {
    it('should encode empty string to zero', () => {
        const result = encodeUsername('');
        expect(result).toBe(0n);
    });

    it('should encode underscore', () => {
        const result = encodeUsername('_');
        expect(result).toBe(1n); // '_' maps to 1
        expect(result).toBeLessThan(Point.ORDER);
    });

    it('should encode single character a', () => {
        const result = encodeUsername('a');
        expect(result).toBe(2n); // 'a' maps to 2 in base-37
        expect(result).toBeLessThan(Point.ORDER);
    });

    it('should encode single character b', () => {
        const result = encodeUsername('b');
        expect(result).toBe(3n); // 'b' maps to 3 in base-37
        expect(result).toBeLessThan(Point.ORDER);
    });

    it('should encode z', () => {
        const result = encodeUsername('z');
        expect(result).toBe(27n); // 'z' maps to 27 in base-37
        expect(result).toBeLessThan(Point.ORDER);
    });

    it('should encode digit in non-first position', () => {
        const result = encodeUsername('a0'); // 'a'=2, '0'=28 -> 0*37+28=28, then 28*27+2=758
        expect(result).toBe(758n);
        expect(result).toBeLessThan(Point.ORDER);
    });

    it('should encode another digit in non-first position', () => {
        const result = encodeUsername('a9'); // 'a'=2, '9'=37 -> 0*37+37=37, then 37*27+2=1001
        expect(result).toBe(1001n);
        expect(result).toBeLessThan(Point.ORDER);
    });

    it('should encode two characters', () => {
        const result = encodeUsername('ab');
        // First char: 'a' (2), second char: 'b' (3)
        // Following the algorithm: scalar = 0 * 37 + 3 = 3, then scalar = 3 * 27 + 2 = 83
        expect(result).toBe(83n);
        expect(result).toBeLessThan(Point.ORDER);
    });

    it('should encode username with underscore', () => {
        const result = encodeUsername('user_name');
        expect(result).toBeGreaterThan(0n);
        expect(result).toBeLessThan(Point.ORDER);
    });

    it('should encode username with multiple characters', () => {
        const result = encodeUsername('abc');
        expect(result).toBeGreaterThan(0n);
        expect(result).toBeLessThan(Point.ORDER);
    });

    it('should produce different results for different usernames', () => {
        const result1 = encodeUsername('alice');
        const result2 = encodeUsername('bob');
        expect(result1).not.toBe(result2);
    });

    it('should handle uppercase and lowercase the same', () => {
        const result1 = encodeUsername('Alice');
        const result2 = encodeUsername('alice');
        expect(result1).toBe(result2);
    });

    it('should handle numbers in non-first positions', () => {
        const result = encodeUsername('user123');
        expect(result).toBeGreaterThan(0n);
        expect(result).toBeLessThan(Point.ORDER);
    });

    it('should throw error for usernames starting with numbers', () => {
        expect(() => encodeUsername('0user')).toThrow('Username cannot start with a number');
        expect(() => encodeUsername('1user')).toThrow('Username cannot start with a number');
        expect(() => encodeUsername('9test')).toThrow('Username cannot start with a number');
    });

    it('should allow usernames starting with underscore', () => {
        const result = encodeUsername('_user');
        expect(result).toBeGreaterThan(0n);
        expect(result).toBeLessThan(Point.ORDER);
    });

    it('should allow usernames starting with letters', () => {
        const result1 = encodeUsername('alice');
        const result2 = encodeUsername('Bob');
        expect(result1).toBeGreaterThan(0n);
        expect(result2).toBeGreaterThan(0n);
        expect(result1).toBeLessThan(Point.ORDER);
        expect(result2).toBeLessThan(Point.ORDER);
    });

    it('should throw error for invalid characters', () => {
        expect(() => encodeUsername('user@name')).toThrow('Invalid character');
        expect(() => encodeUsername('user-name')).toThrow('Invalid character');
        expect(() => encodeUsername('user.name')).toThrow('Invalid character');
        expect(() => encodeUsername('user name')).toThrow('Invalid character'); // space is not allowed
    });

    it('should throw error for too long username', () => {
        const longUsername = 'a'.repeat(21); // MAX_USERNAME_LENGTH + 1
        expect(() => encodeUsername(longUsername)).toThrow('Username too long');
    });

    it('should handle maximum length username', () => {
        const maxUsername = 'a'.repeat(20); // MAX_USERNAME_LENGTH
        const result = encodeUsername(maxUsername);
        expect(result).toBeGreaterThan(0n);
        expect(result).toBeLessThan(Point.ORDER);
    });

    it('should be deterministic', () => {
        const username = 'testuser';
        const result1 = encodeUsername(username);
        const result2 = encodeUsername(username);
        expect(result1).toBe(result2);
    });

    it('should handle mixed case and numbers', () => {
        const result = encodeUsername('User123');
        expect(result).toBeGreaterThan(0n);
        expect(result).toBeLessThan(Point.ORDER);
    });

    it('should ensure no character maps to zero', () => {
        // Test characters to ensure none map to 0
        expect(encodeUsername('_')).toBe(1n);
        expect(encodeUsername('a')).toBe(2n);
        expect(encodeUsername('z')).toBe(27n);
        // Note: Single digits cannot be tested as first characters since they're not allowed
    });

    it('should handle usernames with all valid character types in valid positions', () => {
        const result = encodeUsername('user_123'); // starts with letter, contains underscore and numbers
        expect(result).toBeGreaterThan(0n);
        expect(result).toBeLessThan(Point.ORDER);
    });

    it('should demonstrate base 27 vs base 37 logic', () => {
        // First character uses base 27 (only letters and underscore allowed: values 1-27)
        // Subsequent characters use base 37 (all valid chars: values 1-37)
        const result1 = encodeUsername('a0'); // 'a'=2 in base27, '0'=28 in base37: 0*37+28=28, then 28*27+2=758
        const result2 = encodeUsername('a1'); // 'a'=2 in base27, '1'=29 in base37: 0*37+29=29, then 29*27+2=785
        
        expect(result1).toBe(758n);
        expect(result2).toBe(785n);
        expect(result1).not.toBe(result2);
    });
}); 