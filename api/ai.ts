// api/ai.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 60,
};

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try OpenRouter first (if available)
    if (OPENROUTER_API_KEY) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://mapreducer.vercel.app",
            "X-Title": "MapReducer",
          },
          body: JSON.stringify(req.body),
        });

        if (response.ok) {
          const data = await response.json();
          return res.status(200).json(data);
        }

        console.warn('OpenRouter failed, trying Groq fallback...');
      } catch (err) {
        console.warn('OpenRouter error:', err);
      }
    }

    // Fallback to Groq
    if (GROQ_API_KEY) {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          ...req.body,
          model: req.body.model || "llama-3.1-8b-instant",
        }),
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    }

    // No API keys available
    return res.status(500).json({
      error: "No API keys configured"
    });

  } catch (error: any) {
    console.error('AI API Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}