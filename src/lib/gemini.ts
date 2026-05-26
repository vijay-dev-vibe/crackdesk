// src/lib/gemini.ts
export type GeneratedQuestion = {
  question: string;
  options: string[];
  correct: number;
  skill: string;
  explanation: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// FACTUAL KNOWLEDGE BASE
// Used to verify / auto-fix common factual questions the AI often gets wrong
// ─────────────────────────────────────────────────────────────────────────────
const FACTUAL_ANSWERS: { pattern: RegExp; answer: number | string }[] = [
  // Animal legs
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

  // Wheels / vehicle parts
  { pattern: /wheels\s+does\s+a\s+bike/i,      answer: 2 },
  { pattern: /wheels\s+does\s+a\s+bicycle/i,   answer: 2 },
  { pattern: /wheels\s+does\s+a\s+tricycle/i,  answer: 3 },
  { pattern: /wheels\s+does\s+a\s+car/i,       answer: 4 },
  { pattern: /wheels\s+does\s+a\s+truck/i,     answer: 4 },  // simplified
  { pattern: /wheels\s+does\s+a\s+bus/i,       answer: 4 },  // simplified

  // Shape sides
  { pattern: /sides\s+does\s+a\s+triangle/i,   answer: 3 },
  { pattern: /sides\s+does\s+a\s+square/i,     answer: 4 },
  { pattern: /sides\s+does\s+a\s+rectangle/i,  answer: 4 },
  { pattern: /sides\s+does\s+a\s+pentagon/i,   answer: 5 },
  { pattern: /sides\s+does\s+a\s+hexagon/i,    answer: 6 },
  { pattern: /sides\s+does\s+a\s+heptagon/i,   answer: 7 },
  { pattern: /sides\s+does\s+an?\s+octagon/i,  answer: 8 },
  { pattern: /sides\s+does\s+a\s+circle/i,     answer: 0 },
  { pattern: /sides\s+does\s+a\s+heart/i,      answer: 0 },  // 0 straight sides

  // Counting / sequence
  { pattern: /comes\s+after\s+(\d+)/i,         answer: "DYNAMIC" },  // handled separately
  { pattern: /comes\s+before\s+(\d+)/i,        answer: "DYNAMIC" },
];

/**
 * Attempts to find the correct option index for factual questions.
 * Returns the fixed index, or the original if no match found.
 */
function verifyFactualAnswer(q: GeneratedQuestion): GeneratedQuestion {
  const question = q.question;

  // ── 1. Arithmetic: +, -, *, /  ─────────────────────────────────────────────
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
    if (idx !== -1 && idx !== q.correct) {
      console.warn(
        `[gemini] Fixed math answer for "${question}": was ${q.correct} → ${idx}`
      );
      return { ...q, correct: idx };
    }
    return q; // math correct or option not found (leave as-is)
  }

  // ── 2. "Which number comes after/before N?" ────────────────────────────────
  const afterMatch = question.match(/comes\s+after\s+(\d+)/i);
  const beforeMatch = question.match(/comes\s+before\s+(\d+)/i);
  if (afterMatch || beforeMatch) {
    const base = parseInt((afterMatch ?? beforeMatch)![1]);
    const target = afterMatch ? base + 1 : base - 1;
    const idx = q.options.findIndex((o) => parseInt(o.trim()) === target);
    if (idx !== -1 && idx !== q.correct) {
      console.warn(
        `[gemini] Fixed sequence answer for "${question}": was ${q.correct} → ${idx}`
      );
      return { ...q, correct: idx };
    }
    return q;
  }

  // ── 3. Factual knowledge base lookup ──────────────────────────────────────
  for (const fact of FACTUAL_ANSWERS) {
    if (fact.answer === "DYNAMIC") continue; // already handled above
    if (fact.pattern.test(question)) {
      const expected = fact.answer as number;
      const idx = q.options.findIndex(
        (o) => parseInt(o.trim()) === expected || o.trim().toLowerCase() === String(expected)
      );
      if (idx !== -1 && idx !== q.correct) {
        console.warn(
          `[gemini] Fixed factual answer for "${question}": was ${q.correct} → ${idx}`
        );
        return { ...q, correct: idx };
      }
      return q;
    }
  }

  return q; // no rule matched — leave unchanged
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────
function buildSmartPrompt(input: string, needed: number = 20): string {
  const analysis = analyzeInput(input);

  // Shared critical rule appended to every prompt
  const INDEX_RULE = `
CRITICAL — CORRECT INDEX RULE (read carefully before writing each question):
- "correct" must be the 0-based index of the right answer inside the "options" array.
- After you write the options array, MANUALLY COUNT which index holds the right answer.
- Example: options: ["2", "4", "6", "8"] — if the answer is 4, correct = 1 (not 0, not 2).
- Example: options: ["3", "6", "5", "7"] — if the answer is 5, correct = 2.
- NEVER assume the right answer is always at index 0 or 1.
- DOUBLE-CHECK every single question before including it.
- For factual questions (animal legs, shape sides, etc.) use real-world facts:
    cat=4 legs, dog=4 legs, spider=8 legs, bird=2 legs, insect=6 legs,
    triangle=3 sides, square=4 sides, rectangle=4 sides, circle=0 sides,
    bike=2 wheels, car=4 wheels.
`;

  // ── GRADE LEVEL ────────────────────────────────────────────────────────────
  if (analysis.type === "grade_level") {
    const gradeMatch = input.match(/(\d+)/);
    const grade = gradeMatch ? parseInt(gradeMatch[1]) : 1;

    let difficulty = "";
    let examples = "";
    if (grade <= 2) {
      difficulty = "Very simple, age-appropriate for 6-8 year old children";
      examples = `
Examples of appropriate questions (with CORRECT indices shown):
- question: "What is 5 + 3?", options: ["6","7","8","9"], correct: 2   ← because 5+3=8 is at index 2
- question: "How many sides does a triangle have?", options: ["2","3","4","5"], correct: 1  ← 3 sides at index 1
- question: "How many legs does a cat have?", options: ["2","3","4","6"], correct: 2  ← 4 legs at index 2`;
    } else if (grade <= 5) {
      difficulty = "Elementary level for ages 9-11";
      examples = "Basic multiplication, division, simple fractions, geometry (area, perimeter), word problems.";
    } else if (grade <= 8) {
      difficulty = "Middle school level for ages 12-14";
      examples = "Pre-algebra, ratios, proportions, geometry, basic probability.";
    } else {
      difficulty = "High school level for ages 15-18";
      examples = "Advanced algebra, trigonometry, calculus basics, complex problem solving.";
    }

    return `You are an expert educator creating quiz questions for GRADE ${grade} students.

REQUIREMENTS:
- Questions must be appropriate for ${analysis.context}
- ${difficulty}
- Use simple, clear language that grade ${grade} students can understand
${examples}

${INDEX_RULE}

Generate exactly ${needed} multiple choice questions for: ${input.trim()}

Return ONLY a valid JSON array with no extra text, no markdown fences:
[
  {
    "question": "Clear, age-appropriate question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "skill": "Specific skill (e.g., 'Addition', 'Shapes', 'Counting')",
    "explanation": "Simple explanation a child can understand"
  }
]`;
  }

  // ── JOB DESCRIPTION ────────────────────────────────────────────────────────
  if (analysis.type === "job_description") {
    return `You are an expert technical interviewer. Analyze this job description and generate exactly ${needed} multiple choice questions to assess candidates.

Job Description:
${input.trim()}

REQUIREMENTS:
- Extract ALL key skills, technologies, and requirements from the JD
- Generate questions that directly test those skills
- Mix difficulty: 30% easy, 50% medium, 20% hard

${INDEX_RULE}

Return ONLY a valid JSON array with no extra text, no markdown fences:
[
  {
    "question": "Specific technical question",
    "options": ["Detailed option 1", "Detailed option 2", "Detailed option 3", "Detailed option 4"],
    "correct": 0,
    "skill": "Specific technology/skill from JD",
    "explanation": "Why this answer is correct"
  }
]`;
  }

  // ── TOPIC ──────────────────────────────────────────────────────────────────
  return `You are an expert educator. Generate exactly ${needed} multiple choice questions about the following topic.

Topic: ${input.trim()}

REQUIREMENTS:
- Cover fundamental to advanced concepts
- Mix question types: definitions, applications, problem-solving
- Progressive difficulty: easy → medium → hard

${INDEX_RULE}

Return ONLY a valid JSON array with no extra text, no markdown fences:
[
  {
    "question": "Clear, specific question about the topic",
    "options": ["Detailed option 1", "Detailed option 2", "Detailed option 3", "Detailed option 4"],
    "correct": 0,
    "skill": "Specific sub-topic or concept",
    "explanation": "Clear explanation of the correct answer"
  }
]`;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION VALIDATOR
// ─────────────────────────────────────────────────────────────────────────────
function isValidQuestion(q: GeneratedQuestion): boolean {
  if (!q.question || typeof q.question !== "string" || q.question.trim().length < 10) return false;
  if (!Array.isArray(q.options) || q.options.length !== 4) return false;
  if (typeof q.correct !== "number" || q.correct < 0 || q.correct > 3) return false;
  if (!q.options.every((o) => typeof o === "string" && o.trim().length > 0)) return false;
  if (q.options.some((o) => /^[A-D]\.?\s*$/.test(o.trim()))) return false;
  if (!q.skill || !q.explanation) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export async function generateQuestionsFromJD(
  input: string
): Promise<GeneratedQuestion[]> {
  if (!input.trim()) {
    throw new Error("Please enter a topic, grade level, or job description.");
  }

  const prompt = buildSmartPrompt(input, 20);

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown API error" }));
    throw new Error(err.error || `API error: ${response.status}`);
  }

  const data = await response.json();
  const raw: unknown = data.questions ?? data.result ?? data;
  const rawStr = typeof raw === "string" ? raw : JSON.stringify(raw);

  // Strip markdown fences and extract JSON array
  const stripped = rawStr.replace(/```json|```/g, "").trim();
  const match = stripped.match(/\[[\s\S]*\]/);
  if (!match) {
    throw new Error("No valid questions found in response. Please try again.");
  }

  try {
    const parsed: unknown[] = JSON.parse(match[0]);

    const verified = (parsed as GeneratedQuestion[])
      .filter(isValidQuestion)          // 1. drop malformed questions
      .map(verifyFactualAnswer);         // 2. auto-fix wrong correct indices

    if (verified.length === 0) {
      throw new Error(
        "No valid questions were generated. Please try again with a different input."
      );
    }

    return verified.slice(0, 20);
  } catch (parseError) {
    console.error("JSON Parse Error:", parseError);
    throw new Error("Failed to parse questions. Please try again.");
  }
}