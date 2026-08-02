import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from './_rateLimit.js';

export const config = { maxDuration: 60 };

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Only these origins are allowed to call this endpoint
const ALLOWED_ORIGINS = [
  'https://mapreducer.in',
  'https://www.mapreducer.in',
  'http://localhost:5173', // local dev
];

// Groq only accepts its own model names — map everything to a capable one
const toGroqModel = (requested: string): string => {
  if (requested.includes('70b') || requested.includes('gpt-4') || requested.includes('claude')) {
    return 'llama-3.3-70b-versatile';   // best Groq model for instruction following
  }
  return 'llama-3.3-70b-versatile';     // always use 70b for interviews — never 8b
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Require a logged-in user ────────────────────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[api/ai] Missing SUPABASE_URL / SUPABASE_ANON_KEY env vars');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const token = authHeader.slice('Bearer '.length);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
    
  }
  const allowed = await checkRateLimit(user.id, res);
  if (!allowed) return; // checkRateLimit already sent the 429 response

  // ── Basic request size guard ────────────────────────────────────────────
  const bodySize = JSON.stringify(req.body || {}).length;
  if (bodySize > 50_000) {
    return res.status(413).json({ error: 'Request too large' });
  }

  const requestedModel: string = req.body?.model || 'meta-llama/llama-3.1-70b-instruct';
  console.log('[api/ai] user:', user.id, 'model:', requestedModel);

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