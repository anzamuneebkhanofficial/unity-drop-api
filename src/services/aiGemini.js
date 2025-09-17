/** @format */

import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';
import retry from 'async-retry';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const DEFAULT_MODEL = 'gemini-2.0-flash';

function extractText(resp) {
  if (!resp) return null;
  if (resp.text) return resp.text;
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
            parts: [{ text: `${systemPrompt}\n\nUSER TASK:\n${userPrompt}` }],
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

  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('AI output unparsable as JSON: ' + text.slice(0, 200));
  }
}
