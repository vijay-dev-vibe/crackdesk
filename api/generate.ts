import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 60,
};

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/* -------------------- GROQ -------------------- */
async function callGroq(prompt: string): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");

  console.log("➡️ Calling Groq...");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile", // CHANGED: Better model for longer responses
      messages: [
        {
          role: "system",
          content: "You are a quiz generator. Return ONLY a valid JSON array. Never truncate responses. Complete all questions before ending."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000, // INCREASED: From 2000 to 4000
      response_format: { type: "json_object" }, // ADDED: Request JSON format
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("❌ Groq Error:", data);
    throw new Error(data?.error?.message || "Groq failed");
  }

  const content = data?.choices?.[0]?.message?.content || "";
  console.log(`📦 Received ${content.length} characters`);
  
  return content;
}

/* -------------------- GEMINI -------------------- */
async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

  console.log("➡️ Calling Gemini...");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: `${prompt}\n\nIMPORTANT: Return ONLY a valid JSON array. Complete all questions.` 
          }] 
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4000, // INCREASED
          responseMimeType: "application/json", // ADDED
        },
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    console.error("❌ Gemini Error:", data);
    throw new Error(data?.error?.message || "Gemini failed");
  }

  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  console.log(`📦 Received ${content.length} characters`);
  
  return content;
}

/* -------------------- IMPROVED JSON PARSER -------------------- */
function safeParseQuestions(text: string): any[] {
  try {
    console.log("🔍 Attempting to parse response...");
    
    // Remove markdown code blocks
    let cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    // Find JSON array boundaries
    const arrayStart = cleaned.indexOf("[");
    const arrayEnd = cleaned.lastIndexOf("]");

    if (arrayStart === -1) {
      throw new Error("No JSON array start '[' found in response");
    }

    // Extract the JSON array
    if (arrayEnd === -1 || arrayEnd < arrayStart) {
      console.warn("⚠️ Incomplete JSON detected - attempting repair...");
      
      // Find last complete object
      const lastObjectEnd = cleaned.lastIndexOf("}");
      
      if (lastObjectEnd > arrayStart) {
        // Try to close the array after the last complete object
        cleaned = cleaned.substring(arrayStart, lastObjectEnd + 1) + "]";
        console.log("🔧 Repaired JSON by closing array");
      } else {
        throw new Error("Cannot repair incomplete JSON - no complete objects found");
      }
    } else {
      cleaned = cleaned.substring(arrayStart, arrayEnd + 1);
    }

    // Clean up common JSON issues
    cleaned = cleaned
      // Remove trailing commas before closing brackets
      .replace(/,(\s*[\]}])/g, "$1")
      // Fix missing commas between objects (common error)
      .replace(/}\s*{/g, "},\n{")
      // Remove numbering like "1. {" 
      .replace(/\n\s*\d+\.\s*{/g, "\n{");

    console.log("📋 Cleaned JSON length:", cleaned.length);

    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      throw new Error("Parsed result is not an array");
    }

    console.log(`✅ Successfully parsed ${parsed.length} questions`);
    return parsed;

  } catch (err: any) {
    console.error("❌ JSON Parse Failed");
    console.error("Error:", err.message);
    console.error("Response preview:", text.slice(0, 500));
    console.error("Response end:", text.slice(-200));
    throw new Error(`Invalid AI response format: ${err.message}`);
  }
}

/* -------------------- VALIDATE QUESTIONS -------------------- */
function validateQuestions(questions: any[]): any[] {
  const valid = questions.filter((q, index) => {
    const isValid = 
      q &&
      typeof q.question === "string" && q.question.length > 0 &&
      Array.isArray(q.options) && q.options.length >= 2 &&
      typeof q.correct === "number" && q.correct >= 0 && q.correct < q.options.length &&
      typeof q.skill === "string" && q.skill.length > 0 &&
      typeof q.explanation === "string" && q.explanation.length > 0;

    if (!isValid) {
      console.warn(`⚠️ Question ${index + 1} is invalid:`, JSON.stringify(q).slice(0, 100));
    }

    return isValid;
  });

  console.log(`✅ Validated ${valid.length}/${questions.length} questions`);
  return valid;
}

/* -------------------- RETRY LOGIC -------------------- */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`⏳ Retry ${attempt + 1}/${maxRetries - 1} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/* -------------------- HANDLER -------------------- */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log("\n=== GENERATE API ===");
  console.log("Timestamp:", new Date().toISOString());

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt required" });
    }

    console.log("Prompt chars:", prompt.length);

    // Don't truncate too early - use full prompt if reasonable
    const effectivePrompt = prompt.length > 5000 ? prompt.slice(0, 5000) : prompt;
    
    let text = "";
    let apiUsed = "";

    /* ---------- MULTI API FALLBACK WITH RETRY ---------- */
    try {
      text = await retryWithBackoff(async () => await callGroq(effectivePrompt));
      apiUsed = "Groq";
      console.log("✅ Groq Success");
    } catch (e1: any) {
      console.warn("⚠️ Groq failed:", e1.message);
      console.warn("→ Switching to Gemini");

      try {
        text = await retryWithBackoff(async () => await callGemini(effectivePrompt));
        apiUsed = "Gemini";
        console.log("✅ Gemini Success");
      } catch (e2: any) {
        console.error("❌ Both APIs failed");
        console.error("Groq error:", e1.message);
        console.error("Gemini error:", e2.message);
        throw new Error(`All AI providers failed. Last error: ${e2.message}`);
      }
    }

    if (!text || text.length < 20) {
      throw new Error("Empty or too short AI response");
    }

    console.log(`📝 Response from ${apiUsed}: ${text.length} chars`);

    const questions = safeParseQuestions(text);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("No questions found in response");
    }

    const validQuestions = validateQuestions(questions);

    if (validQuestions.length === 0) {
      throw new Error("No valid questions after validation");
    }

    console.log(`✅ Returning ${validQuestions.length} valid questions`);

    return res.status(200).json({ 
      questions: validQuestions,
      meta: {
        total: validQuestions.length,
        apiUsed,
        timestamp: new Date().toISOString()
      }
    });

  } catch (err: any) {
    console.error("🔥 FINAL ERROR:", err.message);
    console.error("Stack:", err.stack);

    return res.status(500).json({
      error: err.message || "Generation failed",
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}