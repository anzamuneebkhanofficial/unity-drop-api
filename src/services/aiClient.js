/** @format */

import retry from 'async-retry';
import ai from './ai.js';

const DEFAULT_MODEL = 'gemini-2.0-flash';

// ✅ Extract text safely from Gemini response
function extractText(resp) {
  if (!resp) return null;

  // New SDK always has .text
  if (resp.text) return resp.text;

  // fallback for candidate structure
  if (resp.output?.candidates?.length) {
    return resp.output.candidates
      .map((c) => (c.content.parts || []).map((p) => p.text || '').join(''))
      .join('');
  }

  return null;
}

export async function callGemini({
  systemPrompt,
  userPrompt,
  model = DEFAULT_MODEL,
}) {
  const resp = await retry(
    async () => {
      const r = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                // ✅ Combine system + user into one user role
                text: `${systemPrompt}\n\nUSER TASK:\n${userPrompt}`,
              },
            ],
          },
        ],
      });
      if (!r) throw new Error('Empty AI response');
      return r;
    },
    { retries: 2, minTimeout: 500 }
  );

  const text = extractText(resp);
  if (!text) throw new Error('No text in AI response');

  // ✅ Parse JSON strictly, with fallback to substring extraction
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('AI output unparsable as JSON: ' + text.slice(0, 200));
  }
}
