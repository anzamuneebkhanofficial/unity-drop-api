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
  exactBlood: 60,
  compatibleBlood: 40,
  exactLocation: 30,
  partialLocation: 10,
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

export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

export function computeScore(entity1, entity2) {
  const bg1 = normalizeBlood(entity1?.bloodGroup);
  const bg2 = normalizeBlood(entity2?.bloodGroup);

  const bloodMatch = bg1 === bg2;
  const bloodCompatible = isCompatible(bg1, bg2);

  const locationMatch =
    normalizeLocation(entity1?.location) ===
    normalizeLocation(entity2?.location);

  let score = 0;

  if (bloodMatch) score += SCORE.exactBlood;
  else if (bloodCompatible) score += SCORE.compatibleBlood;

  // Real-time location scoring
  const coords1 = entity1?.locationCoordinates?.coordinates;
  const coords2 = entity2?.locationCoordinates?.coordinates;

  if (coords1 && coords2) {
    const dist = calculateDistance(
      coords1[1],
      coords1[0],
      coords2[1],
      coords2[0]
    );
    if (dist !== null) {
      entity1.distance = dist.toFixed(1) + " km";
      if (dist < 5) score += SCORE.exactLocation; // Within 5km
      else if (dist < 20) score += SCORE.partialLocation + 10; // Within 20km
      else if (dist < 50) score += SCORE.partialLocation; // Within 50km
    }
  } else {
    if (locationMatch) score += SCORE.exactLocation;
    else if (entity1?.location && entity2?.location)
      score += SCORE.partialLocation;
  }

  if (entity1?.availabilityStatus) score += SCORE.availability;

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
