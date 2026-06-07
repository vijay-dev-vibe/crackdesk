// src/lib/gemini.ts
export type GeneratedQuestion = {
  question: string;
  options: string[];
  correct: number;
  skill: string;
  explanation: string;
  isCodeQuestion?: boolean; // NEW: marks "find the bug" questions
};

// ─────────────────────────────────────────────────────────────────────────────
// DEDUPLICATION STORE
// Keeps a rolling set of question fingerprints across all calls in the session
// ─────────────────────────────────────────────────────────────────────────────
const _seenQuestions = new Set<string>();

function fingerprint(q: GeneratedQuestion): string {
  // Normalise + lowercase first 60 chars — resilient to minor AI rephrasing
  return q.question.trim().toLowerCase().slice(0, 60);
}

function isDuplicate(q: GeneratedQuestion): boolean {
  return _seenQuestions.has(fingerprint(q));
}

function markSeen(q: GeneratedQuestion): void {
  _seenQuestions.add(fingerprint(q));
}

/** Call this if the user starts a brand-new test so old fingerprints don't block fresh questions */
export function resetQuestionHistory(): void {
  _seenQuestions.clear();
}

// ─────────────────────────────────────────────────────────────────────────────
// TECHNICAL TOPIC DETECTION
// ─────────────────────────────────────────────────────────────────────────────
const TECHNICAL_KEYWORDS = [
  // Languages
  "javascript", "typescript", "python", "java", "c++", "c#", "go", "rust",
  "kotlin", "swift", "ruby", "php", "scala", "dart",
  // Frontend
  "react", "vue", "angular", "nextjs", "next.js", "svelte", "html", "css",
  "tailwind", "redux", "graphql", "webpack", "vite",
  // Backend / infra
  "node", "nodejs", "express", "django", "flask", "spring", "fastapi",
  "docker", "kubernetes", "aws", "gcp", "azure", "terraform",
  // Data / ML
  "sql", "mongodb", "postgresql", "mysql", "redis", "elasticsearch",
  "machine learning", "deep learning", "tensorflow", "pytorch",
  "data science", "pandas", "numpy",
  // General
  "algorithm", "data structure", "api", "rest", "microservices", "devops",
  "git", "linux", "bash", "shell", "database", "cloud", "backend", "frontend",
  "fullstack", "software engineer", "developer", "programming", "coding",
];

function isTechnicalInput(input: string): boolean {
  const lower = input.toLowerCase();
  return TECHNICAL_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTUAL KNOWLEDGE BASE
// ─────────────────────────────────────────────────────────────────────────────
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
  { pattern: /wheels\s+does\s+a\s+bike/i,      answer: 2 },
  { pattern: /wheels\s+does\s+a\s+bicycle/i,   answer: 2 },
  { pattern: /wheels\s+does\s+a\s+tricycle/i,  answer: 3 },
  { pattern: /wheels\s+does\s+a\s+car/i,       answer: 4 },
  { pattern: /wheels\s+does\s+a\s+truck/i,     answer: 4 },
  { pattern: /wheels\s+does\s+a\s+bus/i,       answer: 4 },
  { pattern: /sides\s+does\s+a\s+triangle/i,   answer: 3 },
  { pattern: /sides\s+does\s+a\s+square/i,     answer: 4 },
  { pattern: /sides\s+does\s+a\s+rectangle/i,  answer: 4 },
  { pattern: /sides\s+does\s+a\s+pentagon/i,   answer: 5 },
  { pattern: /sides\s+does\s+a\s+hexagon/i,    answer: 6 },
  { pattern: /sides\s+does\s+a\s+heptagon/i,   answer: 7 },
  { pattern: /sides\s+does\s+an?\s+octagon/i,  answer: 8 },
  { pattern: /sides\s+does\s+a\s+circle/i,     answer: 0 },
  { pattern: /sides\s+does\s+a\s+heart/i,      answer: 0 },
  { pattern: /comes\s+after\s+(\d+)/i,         answer: "DYNAMIC" },
  { pattern: /comes\s+before\s+(\d+)/i,        answer: "DYNAMIC" },
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
    if (idx !== -1 && idx !== q.correct) {
      return { ...q, correct: idx };
    }
    return q;
  }

  const afterMatch = question.match(/comes\s+after\s+(\d+)/i);
  const beforeMatch = question.match(/comes\s+before\s+(\d+)/i);
  if (afterMatch || beforeMatch) {
    const base = parseInt((afterMatch ?? beforeMatch)![1]);
    const target = afterMatch ? base + 1 : base - 1;
    const idx = q.options.findIndex((o) => parseInt(o.trim()) === target);
    if (idx !== -1 && idx !== q.correct) {
      return { ...q, correct: idx };
    }
    return q;
  }

  for (const fact of FACTUAL_ANSWERS) {
    if (fact.answer === "DYNAMIC") continue;
    if (fact.pattern.test(question)) {
      const expected = fact.answer as number;
      const idx = q.options.findIndex(
        (o) => parseInt(o.trim()) === expected || o.trim().toLowerCase() === String(expected)
      );
      if (idx !== -1 && idx !== q.correct) {
        return { ...q, correct: idx };
      }
      return q;
    }
  }

  return q;
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
// CODE ERROR QUESTION BLOCK
// Appended to prompts when the topic is technical
// ─────────────────────────────────────────────────────────────────────────────
const CODE_ERROR_INSTRUCTIONS = `
IMPORTANT — "FIND THE BUG" QUESTIONS (required for technical topics):
At least 5 of the ${20} questions MUST be "find the bug" / "spot the syntax error" questions.
For these questions:
- Show a short code snippet (4-10 lines) with exactly ONE deliberate bug/error
- The question text should be: "What is wrong with the following code?" or "Spot the error in this code:"
- Include the buggy code directly in the "question" field using this format:
  "Spot the error:\n\`\`\`language\n[code here]\n\`\`\`"
- The "options" should be 4 descriptions of what the error might be
- "correct" should point to the actual error
- "skill" should name the specific concept (e.g. "React Hooks", "Python Syntax", "Async/Await")
- "explanation" should explain exactly why it's a bug and how to fix it
- Make sure bugs are realistic mistakes developers actually make:
  * Missing return statement
  * Wrong hook usage (e.g., useState called inside condition)
  * Off-by-one errors
  * Missing await keyword
  * Wrong variable scope
  * Incorrect destructuring
  * Missing dependency in useEffect array
  * Mutating state directly
  * Wrong comparison operator (= vs ==)
  * Accessing property of undefined
`;

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────
function buildSmartPrompt(input: string, needed: number = 20): string {
  const analysis = analyzeInput(input);
  const technical = isTechnicalInput(input);

  const INDEX_RULE = `
CRITICAL — CORRECT INDEX RULE (read carefully before writing each question):
- "correct" must be the 0-based index of the right answer inside the "options" array.
- After you write the options array, MANUALLY COUNT which index holds the right answer.
- Example: options: ["2", "4", "6", "8"] — if the answer is 4, correct = 1 (not 0, not 2).
- NEVER assume the right answer is always at index 0 or 1.
- DOUBLE-CHECK every single question before including it.
- For factual questions (animal legs, shape sides, etc.) use real-world facts:
    cat=4 legs, dog=4 legs, spider=8 legs, bird=2 legs, insect=6 legs,
    triangle=3 sides, square=4 sides, rectangle=4 sides, circle=0 sides,
    bike=2 wheels, car=4 wheels.

NO-REPEAT RULE:
- Every question must be UNIQUE. Do not repeat the same question or very similar
  questions (same concept asked in the same way). Vary the phrasing, scenario,
  and the concept being tested for every single question.
`;

  const codeBlock = technical ? CODE_ERROR_INSTRUCTIONS : "";

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
- question: "What is 5 + 3?", options: ["6","7","8","9"], correct: 2
- question: "How many sides does a triangle have?", options: ["2","3","4","5"], correct: 1
- question: "How many legs does a cat have?", options: ["2","3","4","6"], correct: 2`;
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
${codeBlock}

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
- Every question must be UNIQUE — no two questions should test the same concept in the same way

${INDEX_RULE}
${codeBlock}

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
- Every question must be UNIQUE — do not repeat the same concept twice

${INDEX_RULE}
${codeBlock}

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
// TAG CODE QUESTIONS
// Detect questions whose text contains a code block and mark them
// ─────────────────────────────────────────────────────────────────────────────
function tagCodeQuestion(q: GeneratedQuestion): GeneratedQuestion {
  const hasCodeBlock = q.question.includes("```") || q.question.includes("Spot the error") || q.question.includes("What is wrong with");
  return hasCodeBlock ? { ...q, isCodeQuestion: true } : q;
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

  // Reset deduplication store for each new test
  resetQuestionHistory();

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

  const stripped = rawStr.replace(/```json|```/g, "").trim();
  const match = stripped.match(/\[[\s\S]*\]/);
  if (!match) {
    throw new Error("No valid questions found in response. Please try again.");
  }

  try {
    const parsed: unknown[] = JSON.parse(match[0]);

    const verified = (parsed as GeneratedQuestion[])
      .filter(isValidQuestion)        // 1. drop malformed
      .map(verifyFactualAnswer)       // 2. fix wrong correct indices
      .map(tagCodeQuestion)           // 3. tag "find the bug" questions
      .filter((q) => {               // 4. deduplicate
        if (isDuplicate(q)) {
          console.warn(`[gemini] Skipping duplicate question: "${q.question.slice(0, 50)}"`);
          return false;
        }
        markSeen(q);
        return true;
      });

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