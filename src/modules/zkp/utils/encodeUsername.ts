import { Point } from "@/modules/algebraic/math/point";

// Maximum length for usernames in characters to ensure they fit in a scalar
const MAX_USERNAME_LENGTH = 20;

/**
 * Converts a character to its base-37 value following the Rust mapping:
 * '_' → 1
 * 'a'-'z' → 2-27
 * '0'-'9' → 28-37
 */
function charToBase37(char: string): number {
    const code = char.charCodeAt(0);
    
    // '_' → 1
    if (code === 95) { // underscore
        return 1;
    }
    
    // 'a'-'z' → 2-27
    if (code >= 97 && code <= 122) {
        return code - 97 + 2;
    }
    
    // 'A'-'Z' → 2-27 (convert to lowercase first)
    if (code >= 65 && code <= 90) {
        return code - 65 + 2;
    }
    
    // '0'-'9' → 28-37
    if (code >= 48 && code <= 57) {
        return code - 48 + 28;
    }
    
    throw new Error(`Invalid character '${char}' (code ${code}). Only a-z, A-Z, 0-9, and _ are allowed.`);
}

/**
 * Checks if a character is a valid first character (cannot be a number)
 */
function isValidFirstChar(char: string): boolean {
    const code = char.charCodeAt(0);
    // Only underscore and letters are allowed as first character
    return code === 95 || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

export function encodeUsername(val: string): bigint {
    const normalized = val.toLowerCase();
    
    if (normalized.length > MAX_USERNAME_LENGTH) {
        throw new Error(`Username too long: ${normalized.length} characters, max ${MAX_USERNAME_LENGTH} characters`);
    }
    
    if (normalized.length === 0) {
        return 0n;
    }
    
    // Username cannot start with a number
    if (!isValidFirstChar(normalized[0])) {
        throw new Error(`Username cannot start with a number. First character must be a letter or underscore.`);
    }
    
    const thirtySevenBig = 37n;
    const twentySevenBig = 27n; // Base 27 for first char (no numbers allowed)
    let scalar = 0n;
    
    // Process characters from index 1 to end in reverse order (base 37)
    for (let i = normalized.length - 1; i >= 1; i--) {
        scalar = scalar * thirtySevenBig;
        scalar = scalar + BigInt(charToBase37(normalized[i]));
    }
    
    // Handle the first character specially (base 27 since numbers not allowed)
    scalar = scalar * twentySevenBig;
    scalar = scalar + BigInt(charToBase37(normalized[0]));
    
    // Reduce modulo the curve order to ensure it's a valid scalar
    return scalar % Point.ORDER;
}