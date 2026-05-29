import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { maxDuration: 60 };

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Groq only accepts its own model names — map everything to a capable one
const toGroqModel = (requested: string): string => {
  if (requested.includes('70b') || requested.includes('gpt-4') || requested.includes('claude')) {
    return 'llama-3.3-70b-versatile';   // best Groq model for instruction following
  }
  return 'llama-3.3-70b-versatile';     // always use 70b for interviews — never 8b
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const requestedModel: string = req.body?.model || 'meta-llama/llama-3.1-70b-instruct';
  console.log('[api/ai] requested model:', requestedModel);
  console.log('[api/ai] OpenRouter key:', !!OPENROUTER_API_KEY);
  console.log('[api/ai] Groq key:', !!GROQ_API_KEY);

  // ── 1. Try OpenRouter ──────────────────────────────────────────────────────
  if (OPENROUTER_API_KEY) {
    try {
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://mapreducer.vercel.app',
          'X-Title': 'MapReducer',
        },
        body: JSON.stringify(req.body),
      });

      if (orRes.ok) {
        const data = await orRes.json();
        console.log('[api/ai] OpenRouter SUCCESS');
        return res.status(200).json(data);
      }

      const errText = await orRes.text();
      console.warn('[api/ai] OpenRouter FAILED:', orRes.status, errText);
    } catch (err) {
      console.warn('[api/ai] OpenRouter EXCEPTION:', err);
    }
  }

  // ── 2. Groq fallback — ALWAYS use 70b, never let 8b touch interviews ──────
  if (GROQ_API_KEY) {
    const groqModel = toGroqModel(requestedModel);
    console.log('[api/ai] Groq fallback model:', groqModel);

    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          ...req.body,
          model: groqModel,        // ← override with valid Groq model name
          temperature: 0.2,        // ← lower = stricter JSON, less hallucination
        }),
      });

      const data = await groqRes.json();

      if (!groqRes.ok) {
        console.error('[api/ai] Groq FAILED:', data);
        return res.status(groqRes.status).json(data);
      }

      console.log('[api/ai] Groq SUCCESS with model:', groqModel);
      return res.status(200).json(data);
    } catch (err: any) {
      console.error('[api/ai] Groq EXCEPTION:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(500).json({ error: 'No API keys configured. Set OPENROUTER_API_KEY or GROQ_API_KEY.' });
}