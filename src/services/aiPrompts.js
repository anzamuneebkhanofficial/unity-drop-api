/** @format */

export const SYSTEM_MATCH_PROMPT = `
You are a professional blood donation assistant.
Rules:
1) Only use candidates provided in JSON payload. No invention.
2) Output strictly valid JSON. No extra text.
3) For each candidate include: id, score (0-10), reason (short factual), urgency ("high","medium","low"), suggestion (short action)
4) If no suitable candidates, return {"results": [], "note": "No suitable candidates in provided list"}
Return schema:
{ "results": [ { "id": "...", "score": 0, "reason":"", "urgency":"", "suggestion":"" } ], "note": "optional" }
`;

export function buildUserPromptForMatching({ target, candidates, params }) {
  const safeCandidates = candidates.map((c) => ({
    id: c._id?.toString() || c.id,
    bloodGroup: c.bloodGroup,
    location: c.location,
    createdAt: c.createdAt,
    localScore: c.score ?? null,
  }));

  const payload = {
    target: {
      bloodGroup: target.bloodGroup,
      location: target.location,
      role: params?.role,
    },
    candidates: safeCandidates,
    params,
  };
  return (
    JSON.stringify(payload, null, 2) +
    '\n\nTASK: Rank and annotate candidates as per SYSTEM_MATCH_PROMPT.'
  );
}
