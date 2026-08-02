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
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          // FIX 1: Tell system to return a JSON array directly, not wrapped in an object
          content: "You are a quiz generator. Return ONLY a valid JSON array starting with [ and ending with ]. Never wrap in an object. Never truncate. Complete all questions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 8000, // bumped: code questions are long, need headroom for 25 questions
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
            text: `${prompt}\n\nIMPORTANT: Return ONLY a valid JSON array starting with [ and ending with ]. Complete all questions.` 
          }] 
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8000,
          // FIX 3: Removed responseMimeType — it can also cause wrapping issues
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

/* -------------------- SANITIZE CONTROL CHARS -------------------- */
// Walks the JSON string char-by-char. When inside a JSON string value,
// replaces raw \n \r \t with their escape sequences so JSON.parse doesn't choke.
// This correctly handles escaped quotes (\") and doesn't touch structural newlines.
function sanitizeJsonControlChars(text: string): string {
  let result = "";
  let inString = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") {
        // Escaped character — pass both chars through unchanged
        result += ch + (text[i + 1] ?? "");
        i += 2;
        continue;
      }
      if (ch === '"') {
        inString = false;
        result += ch;
      } else if (ch === "\n") {
        result += "\\n";   // escape raw newline inside string
      } else if (ch === "\r") {
        result += "\\r";
      } else if (ch === "\t") {
        result += "\\t";
      } else {
        result += ch;
      }
    } else {
      if (ch === '"') inString = true;
      result += ch;
    }
    i++;
  }
  return result;
}

/* -------------------- IMPROVED JSON PARSER -------------------- */
function safeParseQuestions(text: string): any[] {
  try {
    console.log("🔍 Attempting to parse response...");
    
    let cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    // FIX: Escape literal newlines/tabs that appear inside JSON string values.
    // The AI puts real newline characters inside "question" strings (code snippets),
    // which makes JSON.parse throw "Bad control character" errors.
    // We use a state-machine approach: scan char by char, and only escape
    // control characters when we're inside a JSON string (between unescaped quotes).
    cleaned = sanitizeJsonControlChars(cleaned);

    // FIX 4: If Groq wraps in an object like {"questions":[...]}, unwrap it
    if (cleaned.startsWith("{")) {
      console.warn("⚠️ Response is an object, trying to extract array inside...");
      const inner = cleaned.match(/"(?:questions|data|items|results)"\s*:\s*(\[[\s\S]*\])/);
      if (inner) {
        cleaned = inner[1];
        console.log("🔧 Unwrapped array from object key");
      } else {
        // Try to find any array inside the object
        const anyArray = cleaned.match(/:\s*(\[[\s\S]*\])/);
        if (anyArray) {
          cleaned = anyArray[1];
          console.log("🔧 Extracted first array found in object");
        }
      }
    }

    const arrayStart = cleaned.indexOf("[");
    const arrayEnd = cleaned.lastIndexOf("]");

    if (arrayStart === -1) {
      throw new Error("No JSON array start '[' found in response");
    }

    if (arrayEnd === -1 || arrayEnd < arrayStart) {
      console.warn("⚠️ Incomplete JSON detected - attempting repair...");
      const lastObjectEnd = cleaned.lastIndexOf("}");
      if (lastObjectEnd > arrayStart) {
        cleaned = cleaned.substring(arrayStart, lastObjectEnd + 1) + "]";
        console.log("🔧 Repaired JSON by closing array");
      } else {
        throw new Error("Cannot repair incomplete JSON - no complete objects found");
      }
    } else {
      cleaned = cleaned.substring(arrayStart, arrayEnd + 1);
    }

    cleaned = cleaned
      .replace(/,(\s*[\]}])/g, "$1")
      .replace(/}\s*{/g, "},\n{")
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

    const effectivePrompt = prompt.length > 6000 ? prompt.slice(0, 6000) : prompt;
    
    let text = "";
    let apiUsed = "";

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
    return res.status(500).json({
      error: err.message || "Generation failed",
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}