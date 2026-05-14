/** @format */

export const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * Normalizes blood group string to standard A+, B-, etc.
 * Handles shorthand (A -> A+) and trims/uppercases.
 */
export const normalizeBloodGroup = (bg) => {
    if (typeof bg !== 'string') return bg;

    let normalized = bg.trim().toUpperCase();

    // Auto-correct shorthand values
    if (normalized === 'A') return 'A+';
    if (normalized === 'B') return 'B+';
    if (normalized === 'O') return 'O+';
    if (normalized === 'AB') return 'AB+';

    return normalized;
};

/**
 * Normalizes gender string to Proper Case (Male, Female, Other)
 */
export const normalizeGender = (gender) => {
    if (typeof gender !== 'string') return gender;
    const normalized = gender.trim().toLowerCase();
    if (normalized === 'male') return 'Male';
    if (normalized === 'female') return 'Female';
    if (normalized === 'other') return 'Other';
    return gender; // Fallback to original if unknown
};
