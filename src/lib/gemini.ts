// src/lib/gemini.ts
import { supabase } from "@/integrations/supabase/client";
export type GeneratedQuestion = {
  question: string;
  options: string[];
  correct: number;
  skill: string;
  explanation: string;
  isCodeQuestion?: boolean;
};

const _seenQuestions = new Set<string>();

function fingerprint(q: GeneratedQuestion): string {
  return q.question.trim().toLowerCase().slice(0, 60);
}

function isDuplicate(q: GeneratedQuestion): boolean {
  return _seenQuestions.has(fingerprint(q));
}

function markSeen(q: GeneratedQuestion): void {
  _seenQuestions.add(fingerprint(q));
}

export function resetQuestionHistory(): void {
  _seenQuestions.clear();
}

const TECHNICAL_KEYWORDS = [
  "javascript", "typescript", "python", "java", "c++", "c#", "go", "rust",
  "kotlin", "swift", "ruby", "php", "scala", "dart",
  "react", "vue", "angular", "nextjs", "next.js", "svelte", "html", "css",
  "tailwind", "redux", "graphql", "webpack", "vite",
  "node", "nodejs", "express", "django", "flask", "spring", "fastapi",
  "docker", "kubernetes", "aws", "gcp", "azure", "terraform",
  "sql", "mongodb", "postgresql", "mysql", "redis", "elasticsearch",
  "machine learning", "deep learning", "tensorflow", "pytorch",
  "data science", "pandas", "numpy",
  "algorithm", "data structure", "api", "rest", "microservices", "devops",
  "git", "linux", "bash", "shell", "database", "cloud", "backend", "frontend",
  "fullstack", "software engineer", "developer", "programming", "coding",
];

function isTechnicalInput(input: string): boolean {
  const lower = input.toLowerCase();
  return TECHNICAL_KEYWORDS.some((kw) => lower.includes(kw));
}

const FACTUAL_ANSWERS: { pattern: RegExp; answer: number | string }[] = [
  { pattern: /legs\s+does\s+a\s+cat/i,        answer: 4 },
  { pattern: /legs\s+does\s+a\s+dog/i,        answer: 4 },
  { pattern: /legs\s+does\s+a\s+spider/i,     answer: 8 },
  { pattern: /legs\s+does\s+a\s+bird/i,       answer: 2 },
  { pattern: /legs\s+does\s+a\s+human/i,      answer: 2 },
  { pattern: /legs\s+does\s+a\s+person/i,     answer: 2 },
  { pattern: /legs\s+does\s+a\s+horse/i,      answer: 4 },
  { pattern: /legs\s+does\s+a\s+cow/i,        answer: 4 },
  { pattern: /legs\s+does\s+an?\s+insect/i,   answer: 6 },
  { pattern: /legs\s+does\s+a\s+bee/i,        answer: 6 },
  { pattern: /legs\s+does\s+a\s+butterfly/i,  answer: 6 },
  { pattern: /legs\s+does\s+a\s+ant/i,        answer: 6 },
  { pattern: /legs\s+does\s+a\s+crab/i,       answer: 10 },
  { pattern: /legs\s+does\s+an?\s+octopus/i,  answer: 8 },
  { pattern: /wheels\s+does\s+a\s+bike/i,     answer: 2 },
  { pattern: /wheels\s+does\s+a\s+bicycle/i,  answer: 2 },
  { pattern: /wheels\s+does\s+a\s+tricycle/i, answer: 3 },
  { pattern: /wheels\s+does\s+a\s+car/i,      answer: 4 },
  { pattern: /wheels\s+does\s+a\s+truck/i,    answer: 4 },
  { pattern: /wheels\s+does\s+a\s+bus/i,      answer: 4 },
  { pattern: /sides\s+does\s+a\s+triangle/i,  answer: 3 },
  { pattern: /sides\s+does\s+a\s+square/i,    answer: 4 },
  { pattern: /sides\s+does\s+a\s+rectangle/i, answer: 4 },
  { pattern: /sides\s+does\s+a\s+pentagon/i,  answer: 5 },
  { pattern: /sides\s+does\s+a\s+hexagon/i,   answer: 6 },
  { pattern: /sides\s+does\s+a\s+heptagon/i,  answer: 7 },
  { pattern: /sides\s+does\s+an?\s+octagon/i, answer: 8 },
  { pattern: /sides\s+does\s+a\s+circle/i,    answer: 0 },
  { pattern: /sides\s+does\s+a\s+heart/i,     answer: 0 },
  { pattern: /comes\s+after\s+(\d+)/i,        answer: "DYNAMIC" },
  { pattern: /comes\s+before\s+(\d+)/i,       answer: "DYNAMIC" },
];

function verifyFactualAnswer(q: GeneratedQuestion): GeneratedQuestion {
  const question = q.question;
  const addMatch = question.match(/(\d+)\s*\+\s*(\d+)/);
  const subMatch = question.match(/(\d+)\s*[-−]\s*(\d+)/);
  const mulMatch = question.match(/(\d+)\s*[×x\*]\s*(\d+)/i);
  const divMatch = question.match(/(\d+)\s*[÷/]\s*(\d+)/);
  let expectedNum: number | null = null;
  if (addMatch) expectedNum = parseInt(addMatch[1]) + parseInt(addMatch[2]);
  else if (subMatch) expectedNum = parseInt(subMatch[1]) - parseInt(subMatch[2]);
  else if (mulMatch) expectedNum = parseInt(mulMatch[1]) * parseInt(mulMatch[2]);
  else if (divMatch) {
    const divisor = parseInt(divMatch[2]);
    if (divisor !== 0) expectedNum = parseInt(divMatch[1]) / divisor;
  }
  if (expectedNum !== null) {
    const idx = q.options.findIndex(
      (o) => parseInt(o.trim()) === expectedNum || parseFloat(o.trim()) === expectedNum
    );
    if (idx !== -1 && idx !== q.correct) return { ...q, correct: idx };
    return q;
  }
  const afterMatch = question.match(/comes\s+after\s+(\d+)/i);
  const beforeMatch = question.match(/comes\s+before\s+(\d+)/i);
  if (afterMatch || beforeMatch) {
    const base = parseInt((afterMatch ?? beforeMatch)![1]);
    const target = afterMatch ? base + 1 : base - 1;
    const idx = q.options.findIndex((o) => parseInt(o.trim()) === target);
    if (idx !== -1 && idx !== q.correct) return { ...q, correct: idx };
    return q;
  }
  for (const fact of FACTUAL_ANSWERS) {
    if (fact.answer === "DYNAMIC") continue;
    if (fact.pattern.test(question)) {
      const expected = fact.answer as number;
      const idx = q.options.findIndex(
        (o) => parseInt(o.trim()) === expected || o.trim().toLowerCase() === String(expected)
      );
      if (idx !== -1 && idx !== q.correct) return { ...q, correct: idx };
      return q;
    }
  }
  return q;
}

function analyzeInput(input: string): {
  type: "grade_level" | "topic" | "job_description";
  context: string;
} {
  const normalized = input.trim().toLowerCase();
  const gradePattern = /(\d+)\s*(st|nd|rd|th)?\s*(grade|standard|std|class)/i;
  const gradeMatch = input.match(gradePattern);
  if (gradeMatch) {
    const gradeNum = parseInt(gradeMatch[1]);
    return { type: "grade_level", context: `Grade ${gradeNum} (Age ${gradeNum + 5} years)` };
  }
  const jobKeywords = [
    "experience", "required", "responsibilities", "skills", "qualifications",
    "candidate", "position", "role", "years", "work", "team", "develop",
  ];
  const hasJobKeywords = jobKeywords.some((k) => normalized.includes(k));
  const isLongText = input.split(/\s+/).length > 20;
  const hasMultipleSentences = (input.match(/[.!?]/g) || []).length > 2;
  if (hasJobKeywords || (isLongText && hasMultipleSentences)) {
    return { type: "job_description", context: "Job Role Assessment" };
  }
  return { type: "topic", context: "Topic Knowledge" };
}

// ── CODE ERROR INSTRUCTIONS ────────────────────────────────────────────────
const CODE_ERROR_INSTRUCTIONS = `
IMPORTANT — "FIND THE BUG" QUESTIONS (required for technical topics):
At least 5 questions MUST be "find the bug" questions.
For these questions:
- Show a short code snippet (4-8 lines) with exactly ONE deliberate bug
- Question format: "Spot the error in this code:\\n\`\`\`javascript\\nline1\\nline2\\nline3\\n\`\`\`"
- CRITICAL: Use the literal two characters backslash-n (\\n) between each line of code. Do NOT use real newlines inside the JSON string value.
- options: 4 short descriptions of possible errors
- correct: index of the actual error
- skill: specific concept e.g. "React Hooks", "Async/Await", "Python Syntax"
- explanation: what the bug is and how to fix it
- Realistic bugs only:
  * useState/useEffect called inside if/loop
  * Missing await on async call
  * Mutating state directly (state.push instead of setState)
  * Missing dependency in useEffect array
  * Wrong comparison (= instead of ===)
  * Off-by-one in array index
  * Accessing .length on undefined
  * Missing return in function
`;

// ── PROMPT BUILDER ─────────────────────────────────────────────────────────
function buildSmartPrompt(input: string, needed: number = 25): string {
  const analysis = analyzeInput(input);
  const technical = isTechnicalInput(input);
  const codeBlock = technical ? CODE_ERROR_INSTRUCTIONS : "";

  const RULES = `
RULES YOU MUST FOLLOW:
1. CORRECT INDEX: "correct" = 0-based index of the right answer in "options" array. Count carefully. Never default to 0.
2. NO REPEATS: Every question must test a DIFFERENT concept. No two questions about the same thing.
3. UNIQUE SCENARIOS: Vary the scenario, phrasing, and concept for every single question.
4. COMPLETE ALL ${needed}: You must generate exactly ${needed} questions. Do not stop early.
${codeBlock}`;

  const JSON_FORMAT = `
Return ONLY a valid JSON array. No markdown. No explanation. Start with [ and end with ].
[
  {
    "question": "question text here",
    "options": ["A", "B", "C", "D"],
    "correct": 0,
    "skill": "skill name",
    "explanation": "why this answer is correct"
  }
]`;

  if (analysis.type === "grade_level") {
    const gradeMatch = input.match(/(\d+)/);
    const grade = gradeMatch ? parseInt(gradeMatch[1]) : 1;
    let difficulty = grade <= 2 ? "Very simple for 6-8 year olds"
      : grade <= 5 ? "Elementary for ages 9-11"
      : grade <= 8 ? "Middle school for ages 12-14"
      : "High school for ages 15-18";
    return `You are an expert educator. Generate exactly ${needed} unique multiple choice questions for Grade ${grade} students.
Topic: ${input.trim()}
Difficulty: ${difficulty}
${RULES}
${JSON_FORMAT}`;
  }

  if (analysis.type === "job_description") {
    return `You are an expert technical interviewer. Generate exactly ${needed} unique multiple choice questions to assess candidates for this role.

Job Description:
${input.trim()}

Extract every skill and technology from the JD and write questions that test each one differently.
Mix: 30% easy, 50% medium, 20% hard.
${RULES}
${JSON_FORMAT}`;
  }

  return `You are an expert educator. Generate exactly ${needed} unique multiple choice questions about this topic.

Topic: ${input.trim()}

Cover fundamentals through advanced. Progressive difficulty: easy → medium → hard.
${RULES}
${JSON_FORMAT}`;
}

function isValidQuestion(q: GeneratedQuestion): boolean {
  if (!q.question || typeof q.question !== "string" || q.question.trim().length < 10) return false;
  if (!Array.isArray(q.options) || q.options.length !== 4) return false;
  if (typeof q.correct !== "number" || q.correct < 0 || q.correct > 3) return false;
  if (!q.options.every((o) => typeof o === "string" && o.trim().length > 0)) return false;
  if (q.options.some((o) => /^[A-D]\.?\s*$/.test(o.trim()))) return false;
  if (!q.skill || !q.explanation) return false;
  return true;
}

function tagCodeQuestion(q: GeneratedQuestion): GeneratedQuestion {
  const hasCode = q.question.includes("```")
    || q.question.toLowerCase().includes("spot the error")
    || q.question.toLowerCase().includes("what is wrong with");
  return hasCode ? { ...q, isCodeQuestion: true } : q;
}

export async function generateQuestionsFromJD(
  input: string
): Promise<GeneratedQuestion[]> {
  if (!input.trim()) {
    throw new Error("Please enter a topic, grade level, or job description.");
  }

  // Clear seen questions for fresh test
  resetQuestionHistory();

  // FIX: pass 25 so after filtering we always have 20
  const prompt = buildSmartPrompt(input, 25);

  const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error("Not logged in");
    }

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ prompt }),
    });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown API error" }));
    throw new Error(err.error || `API error: ${response.status}`);
  }

  const data = await response.json();
  const raw: unknown = data.questions ?? data.result ?? data;
  const rawStr = typeof raw === "string" ? raw : JSON.stringify(raw);

  const stripped = rawStr.replace(/```json|```/g, "").trim();
  const match = stripped.match(/\[[\s\S]*\]/);
  if (!match) {
    throw new Error("No valid questions found in response. Please try again.");
  }

  try {
    const parsed: unknown[] = JSON.parse(match[0]);

    const verified = (parsed as GeneratedQuestion[])
      .filter(isValidQuestion)
      .map(verifyFactualAnswer)
      .map(tagCodeQuestion)
      .filter((q) => {
        if (isDuplicate(q)) return false;
        markSeen(q);
        return true;
      });

    if (verified.length === 0) {
      throw new Error("No valid questions were generated. Please try again.");
    }

    return verified.slice(0, 20);
  } catch (parseError) {
    console.error("JSON Parse Error:", parseError);
    throw new Error("Failed to parse questions. Please try again.");
  }
}