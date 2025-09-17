/** @format */

// /** @format */

// // Compatibility map: donorBlood -> patientBloods it can give to
// const COMPAT_MAP = {
//   'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
//   'O+': ['O+', 'A+', 'B+', 'AB+'],
//   'A-': ['A-', 'A+', 'AB-', 'AB+'],
//   'A+': ['A+', 'AB+'],
//   'B-': ['B-', 'B+', 'AB-', 'AB+'],
//   'B+': ['B+', 'AB+'],
//   'AB-': ['AB-', 'AB+'],
//   'AB+': ['AB+'],
// };

// // Check blood compatibility
// function isCompatible(donorBlood, patientBlood) {
//   if (!donorBlood || !patientBlood) return false;
//   const arr = COMPAT_MAP[donorBlood];
//   return Array.isArray(arr) && arr.includes(patientBlood);
// }

// // Priority scoring constants
// const SCORES = {
//   exactBlood: 50,
//   compatibleBlood: 30,
//   exactLocation: 30,
//   nearbyLocation: 18,
//   availability: 10,
//   recentPatient: 6,
//   recentlyDonated: 6,
//   lessRecentDonated: 3,
//   penaltyRecentDonation: -6,
// };

// // Compute local score
// function computeScore(candidate, donor, now = new Date()) {
//   const donorBG = donor?.bloodGroup;
//   const candBG = candidate?.bloodGroup;

//   const sameCity =
//     candidate.location &&
//     donor.location &&
//     candidate.location.toLowerCase().trim() ===
//       donor.location.toLowerCase().trim();

//   const compatible = isCompatible(donorBG, candBG);

//   let score = 0;

//   // 1️⃣ Blood match
//   if (donorBG && candBG && donorBG === candBG) score += SCORES.exactBlood;
//   else if (compatible) score += SCORES.compatibleBlood;

//   // 2️⃣ Location
//   if (candidate.location && donor.location) {
//     const c = candidate.location.toLowerCase();
//     const t = donor.location.toLowerCase();
//     if (c === t) score += SCORES.exactLocation;
//     else if (c.includes(t) || t.includes(c)) score += SCORES.nearbyLocation;
//     else if (c.split(',').some((x) => t.includes(x.trim()))) score += 12;
//   }

//   // 3️⃣ Availability
//   if (candidate.availabilityStatus) score += SCORES.availability;

//   // 4️⃣ Recency
//   if (candidate.createdAt) {
//     const days = Math.max(
//       0,
//       Math.floor((now - new Date(candidate.createdAt)) / (1000 * 60 * 60 * 24))
//     );
//     if (days <= 7) score += SCORES.recentPatient;
//     else if (days <= 30) score += 3;
//   }

//   // 5️⃣ Last donation (for patients, maybe ignore; for donors, give bonus)
//   if (candidate.lastDonatedAt) {
//     const daysSince = Math.floor(
//       (now - new Date(candidate.lastDonatedAt)) / (1000 * 60 * 60 * 24)
//     );
//     if (daysSince >= 90) score += SCORES.recentlyDonated;
//     else if (daysSince >= 60) score += SCORES.lessRecentDonated;
//     else score += SCORES.penaltyRecentDonation;
//   }

//   if (score > 100) score = 100;
//   if (score < 0) score = 0;
//   return Math.round(score);
// }

// // Deterministic reason string
// function buildLocalReason(candidate, donor) {
//   const parts = [];
//   const donorBG = donor?.bloodGroup;
//   const candBG = candidate?.bloodGroup;

//   // Blood
//   if (donorBG && candBG && donorBG === candBG)
//     parts.push('Exact blood group match');
//   else if (isCompatible(donorBG, candBG))
//     parts.push(`Compatible blood group (${donorBG} → ${candBG})`);
//   else parts.push(`No blood compatibility`);

//   // Location
//   if (candidate.location && donor.location) {
//     const c = candidate.location.toLowerCase();
//     const t = donor.location.toLowerCase();
//     if (c === t) parts.push('Same city');
//     else parts.push(`Patient located in ${candidate.location}`);
//   }

//   // Availability
//   if (candidate.availabilityStatus) parts.push('Available now');

//   // Hospital (optional)
//   if (candidate.hospitalName)
//     parts.push(`Admitted in ${candidate.hospitalName}`);

//   return parts.join('; ');
// }
