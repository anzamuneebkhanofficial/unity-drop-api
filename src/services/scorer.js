/** @format */

export const COMPAT_MAP = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

const SCORE = {
  exactBlood: 50,
  compatibleBlood: 30,
  exactLocation: 30,
  partialLocation: 12,
  availability: 10,
  max: 100,
};

export function normalizeBlood(bg) {
  if (!bg) return '';
  return bg.replace(/\s+/g, '').toUpperCase();
}

export function normalizeLocation(loc) {
  if (!loc) return '';
  return loc.toLowerCase().trim();
}

export function isCompatible(donorBlood, patientBlood) {
  if (!donorBlood || !patientBlood) return false;
  const arr = COMPAT_MAP[donorBlood];
  if (!Array.isArray(arr)) return false;
  return arr.includes(patientBlood);
}

export function computeScore(candidate, donor) {
  const donorBG = normalizeBlood(donor?.bloodGroup);
  const candBG = normalizeBlood(candidate?.bloodGroup);

  const bloodMatch = donorBG === candBG;
  const bloodCompatible = isCompatible(donorBG, candBG);

  const locationMatch =
    normalizeLocation(candidate?.location) ===
    normalizeLocation(donor?.location);

  let score = 0;

  if (bloodMatch) score += SCORE.exactBlood;
  else if (bloodCompatible) score += SCORE.compatibleBlood;

  if (locationMatch) score += SCORE.exactLocation;
  else if (candidate?.location && donor?.location)
    score += SCORE.partialLocation;

  if (candidate?.availabilityStatus) score += SCORE.availability;

  return Math.min(Math.max(score, 0), SCORE.max);
}
export function computeScoreForPatient(candidateDonor, patient) {
  // candidateDonor: donor document/object
  // patient: patient document/object (the one requesting)
  const donorBG = normalizeBlood(candidateDonor?.bloodGroup); // donor candidate blood
  const patientBG = normalizeBlood(patient?.bloodGroup);

  const bloodMatch = donorBG === patientBG;
  // Check if the donor candidate can donate to the patient
  const bloodCompatible = isCompatible(donorBG, patientBG);

  const locationMatch =
    normalizeLocation(candidateDonor?.location) ===
    normalizeLocation(patient?.location);

  let score = 0;

  if (bloodMatch) score += SCORE.exactBlood;
  else if (bloodCompatible) score += SCORE.compatibleBlood;

  if (locationMatch) score += SCORE.exactLocation;
  else if (candidateDonor?.location && patient?.location)
    score += SCORE.partialLocation;

  if (candidateDonor?.availabilityStatus) score += SCORE.availability;

  return Math.min(Math.max(score, 0), SCORE.max);
}

export function buildMatchMessage(candidate, donor) {
  const donorBG = normalizeBlood(donor?.bloodGroup);
  const candBG = normalizeBlood(candidate?.bloodGroup);

  const bloodMatch = donorBG === candBG;
  const bloodCompatible = isCompatible(donorBG, candBG);
  const locationMatch =
    normalizeLocation(candidate?.location) ===
    normalizeLocation(donor?.location);

  let matchMessage = '';
  if (bloodMatch && locationMatch) matchMessage = 'Perfect match';
  else if (bloodMatch) matchMessage = 'Blood matches, location different';
  else if (bloodCompatible && locationMatch)
    matchMessage = 'Compatible blood, same city';
  else if (bloodCompatible) matchMessage = 'Compatible blood, different city';
  else if (locationMatch) matchMessage = 'Location matches, blood incompatible';
  else matchMessage = 'No suitable match found';

  const bloodMsg = bloodMatch
    ? 'Exact blood group match'
    : bloodCompatible
    ? `${donorBG} donor can donate to ${candBG}`
    : `${donorBG} donor cannot donate to ${candBG}`;

  const locationMsg = locationMatch
    ? 'Same city'
    : candidate?.location
    ? `Patient in ${candidate.location}`
    : 'Location not available';

  return { matchMessage, details: `${bloodMsg}; ${locationMsg}` };
}

export function escapeRegex(str) {
  if (!str) return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
