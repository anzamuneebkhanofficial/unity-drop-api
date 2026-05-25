/** @format */
export const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const normalizeBloodGroup = (bg) => {
    if (typeof bg !== 'string') return bg;
    let normalized = bg.trim().toUpperCase();
    if (normalized === 'A') return 'A+';
    if (normalized === 'B') return 'B+';
    if (normalized === 'O') return 'O+';
    if (normalized === 'AB') return 'AB+';
    return normalized;
};
export const normalizeGender = (gender) => {
    if (typeof gender !== 'string') return gender;
    const normalized = gender.trim().toLowerCase();
    if (normalized === 'male') return 'Male';
    if (normalized === 'female') return 'Female';
    if (normalized === 'other') return 'Other';
    return gender;
};
