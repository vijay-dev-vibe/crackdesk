import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { callInterviewAI, parseAIJson } from "@/lib/interviewAI";

interface QuestionScore { id: number; score: number; feedback: string; keyword_hits: string[]; }
interface AnalysisResult {
  overall_score: number; overall_grade: string; summary: string;
  hire_recommendation: string; strengths: string[]; improvements: string[];
  question_scores: QuestionScore[]; integrity_note: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// WORLD-CLASS ANALYSIS PROMPT
// Evaluates 8 professional dimensions, detects filler words, estimates
// communication quality, applies penalty for tab violations, and returns
// richly-detailed per-question feedback with domain-relevant keyword matching.
// ─────────────────────────────────────────────────────────────────────────────
const ANALYSIS_PROMPT = `You are a world-class interview evaluator with 20+ years of experience at top-tier companies (Google, McKinsey, Goldman Sachs). Your evaluations are trusted to make final hiring decisions.

Evaluate the candidate across these 8 professional dimensions:
1. Technical Depth & Accuracy — correctness, specificity, use of industry terminology
2. Communication Clarity — structure, conciseness, absence of filler phrases ("um", "like", "you know")
3. Problem-Solving Approach — frameworks used (STAR, MECE, first-principles), logical flow
4. Relevance & Focus — how directly the answer addresses the question asked
5. Self-Awareness & Growth — acknowledgment of weaknesses, learning mindset
6. Leadership & Impact — ownership language, quantified results, team influence
7. Cultural Fit & Professionalism — tone, enthusiasm, alignment to role expectations
8. Recall & Consistency — coherence across answers, no contradictions

Scoring rules:
- overall_score: weighted average of all 8 dimensions (0–100). Do NOT inflate. Be honest and calibrated to real hiring bar.
- Apply a -2 point penalty per tab violation (max -15) to overall_score.
- If answer is very short (< 15 words), score that question max 4/10.
- If answer shows strong STAR structure with quantified results, score 8–10/10.
- overall_grade: "A+" (90–100), "A" (80–89), "B+" (70–79), "B" (60–69), "C" (50–59), "D" (below 50)
- hire_recommendation: "Strong Hire" (85+), "Hire" (70–84), "Maybe" (55–69), "No Hire" (below 55)

For keyword_hits: extract 2–5 actual domain-relevant keywords or phrases the candidate used that demonstrate knowledge (e.g. "REST API", "regression analysis", "stakeholder alignment"). Only include words actually present in their answer.

For feedback per question: be specific, actionable, and reference their actual answer. Mention what was good, what was missing, and one concrete tip to improve.

For strengths: give 3 specific strengths with evidence from their answers (not generic praise).
For improvements: give 2–3 highly actionable improvements with examples of what a better answer would include.

For integrity_note: if tab violations > 0, write a professional note about the integrity concern and its impact on trust. If none, return "".

Return ONLY valid JSON with zero markdown, no extra keys:
{
  "overall_score": number,
  "overall_grade": "string",
  "summary": "2–3 sentence calibrated assessment referencing specific role and candidate performance",
  "hire_recommendation": "string",
  "strengths": ["specific strength with evidence", ...],
  "improvements": ["specific actionable improvement", ...],
  "question_scores": [
    {
      "id": number,
      "score": number 0–10,
      "feedback": "specific, actionable, 2–3 sentence feedback referencing their actual answer",
      "keyword_hits": ["actual keyword from answer", ...]
    }
  ],
  "integrity_note": "string"
}`;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS: compute supplementary analytics from raw answers client-side
// These enrich the display without extra API calls.
// ─────────────────────────────────────────────────────────────────────────────

/** Estimate words per minute as a proxy for verbal fluency */
function estimateWPM(answers: any[], durationSeconds: number): number {
  if (!durationSeconds) return 0;
  const totalWords = answers.reduce((sum, a) => sum + (a.answer?.split(/\s+/).filter(Boolean).length || 0), 0);
  return Math.round((totalWords / durationSeconds) * 60);
}

/** Count filler-word occurrences across all answers */
function countFillerWords(answers: any[]): number {
  const fillers = /\b(um|uh|like|you know|basically|literally|actually|kind of|sort of|i mean|right\?|so yeah|just|stuff|things)\b/gi;
  return answers.reduce((sum, a) => {
    const matches = (a.answer || "").match(fillers);
    return sum + (matches ? matches.length : 0);
  }, 0);
}

/** Detect STAR method usage (Situation/Task/Action/Result keywords) */
function detectSTARUsage(answers: any[]): number {
  const starSignals = /\b(situation|context|background|task|responsible|challenge|action|decided|implemented|result|outcome|achieved|improved|increased|reduced|led to)\b/gi;
  const total = answers.reduce((sum, a) => {
    const matches = (a.answer || "").match(starSignals);
    return sum + (matches ? new Set(matches.map((m: string) => m.toLowerCase())).size : 0);
  }, 0);
  // return as a % of ideal (20 unique STAR signals = 100%)
  return Math.min(100, Math.round((total / 20) * 100));
}

/** Average answer length in words */
function avgAnswerLength(answers: any[]): number {
  if (!answers.length) return 0;
  const total = answers.reduce((sum, a) => sum + (a.answer?.split(/\s+/).filter(Boolean).length || 0), 0);
  return Math.round(total / answers.length);
}

/** Score confidence: % of answers that are ≥ 30 words (substantive) */
function substantiveAnswerRate(answers: any[]): number {
  const substantive = answers.filter(a => (a.answer?.split(/\s+/).filter(Boolean).length || 0) >= 30).length;
  return answers.length ? Math.round((substantive / answers.length) * 100) : 0;
}

/** Build rich user message for the AI — includes per-answer word counts and filler flags */
function buildUserMessage(plan: any, answers: any[], violations: any[], duration: number): string {
  const fillers = /\b(um|uh|like|you know|basically|literally|actually|kind of|sort of|i mean)\b/gi;

  const qaText = answers.map((a: any, i: number) => {
    const wordCount = a.answer?.split(/\s+/).filter(Boolean).length || 0;
    const fillerMatches = (a.answer || "").match(fillers) || [];
    const hasSTAR = /\b(situation|task|action|result|outcome|achieved)\b/i.test(a.answer || "");
    return [
      `Q${i + 1} [type: ${a.questionType || "general"}, words: ${wordCount}, fillers: ${fillerMatches.length}, STAR: ${hasSTAR ? "yes" : "no"}]:`,
      `Question: ${a.question}`,
      `Answer: ${a.answer || "(no answer given)"}`,
    ].join("\n");
  }).join("\n\n");

  return [
    `Role: ${plan.role} (${plan.level})`,
    `Focus areas: ${(plan.focus_areas || []).join(", ")}`,
    `Interview duration: ${Math.floor(duration / 60)}m ${duration % 60}s`,
    `Tab violations: ${violations.length}`,
    `Total questions: ${answers.length}`,
    ``,
    `--- ANSWERS ---`,
    qaText,
    ``,
    `--- INTEGRITY ---`,
    violations.length > 0
      ? `Violations occurred at: ${violations.map((v: any) => `Q${v.qNum} (${v.time})`).join(", ")}`
      : `No integrity violations detected.`,
  ].join("\n");
}

export default function InterviewAnalysis() {
  const navigate = useNavigate();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [duration, setDuration] = useState(0);

  // ── Supplementary client-side analytics (no extra API call) ──
  const [wpm, setWpm] = useState(0);
  const [fillerCount, setFillerCount] = useState(0);
  const [starScore, setStarScore] = useState(0);
  const [avgWords, setAvgWords] = useState(0);
  const [substantiveRate, setSubstantiveRate] = useState(0);

  useEffect(() => {
    const planRaw = sessionStorage.getItem("iv_plan");
    const answersRaw = sessionStorage.getItem("iv_answers");
    const violationsRaw = sessionStorage.getItem("iv_violations");
    const durationRaw = sessionStorage.getItem("iv_duration");

    if (!planRaw || !answersRaw) { navigate("/ai-interview"); return; }

    const plan = JSON.parse(planRaw);
    const ans = JSON.parse(answersRaw);
    const viols = violationsRaw ? JSON.parse(violationsRaw) : [];
    const dur = Number(durationRaw) || 0;

    setAnswers(ans);
    setViolations(viols);
    setDuration(dur);

    // ── Compute client-side analytics immediately ──
    setWpm(estimateWPM(ans, dur));
    setFillerCount(countFillerWords(ans));
    setStarScore(detectSTARUsage(ans));
    setAvgWords(avgAnswerLength(ans));
    setSubstantiveRate(substantiveAnswerRate(ans));

    // ── Call AI with enriched prompt and message ──
    const userMsg = buildUserMessage(plan, ans, viols, dur);

    callInterviewAI({
      action: "analyze",
      systemPrompt: ANALYSIS_PROMPT,
      userMessage: userMsg,
      maxTokens: 2500, // increased for richer per-question feedback
    })
      .then((raw) => {
        const parsed = parseAIJson(raw);

        // ── Safety clamp: ensure scores stay in valid range ──
        if (parsed) {
          parsed.overall_score = Math.max(0, Math.min(100, parsed.overall_score));
          if (parsed.question_scores) {
            parsed.question_scores = parsed.question_scores.map((qs: QuestionScore) => ({
              ...qs,
              score: Math.max(0, Math.min(10, qs.score)),
            }));
          }
          // ── Sync hire_recommendation with score in case AI drifts ──
          if (parsed.overall_score >= 85 && parsed.hire_recommendation !== "Strong Hire") {
            parsed.hire_recommendation = "Strong Hire";
          } else if (parsed.overall_score >= 70 && parsed.overall_score < 85 && parsed.hire_recommendation === "Strong Hire") {
            parsed.hire_recommendation = "Hire";
          } else if (parsed.overall_score < 55 && parsed.hire_recommendation === "Strong Hire") {
            parsed.hire_recommendation = "No Hire";
          }
        }

        setResult(parsed);
        setLoading(false);
      })
      .catch(() => {
        setResult({
          overall_score: 0, overall_grade: "N/A",
          summary: "Analysis failed. Please try again.",
          hire_recommendation: "N/A", strengths: [], improvements: [],
          question_scores: [], integrity_note: "",
        });
        setLoading(false);
      });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium text-foreground">Generating your performance report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const scoreBg = result.overall_score >= 75 ? "from-green-500 to-emerald-600" : result.overall_score >= 50 ? "from-amber-500 to-orange-600" : "from-red-500 to-rose-600";
  const scoreBarColor = (s: number) => s >= 7 ? "bg-green-500" : s >= 5 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-4xl space-y-8">
        {/* HERO BANNER */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={`bg-gradient-to-br ${scoreBg} border-0 text-white overflow-hidden`}>
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <motion.div
                  className="text-6xl md:text-7xl font-display font-bold"
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  {result.overall_score}%
                </motion.div>
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-3">
                    <span className="rounded-full bg-white/20 px-4 py-1 text-sm font-bold">{result.overall_grade}</span>
                    <span className="rounded-full bg-white/20 px-4 py-1 text-sm font-bold">{result.hire_recommendation}</span>
                  </div>
                  <p className="text-white/90 text-sm">{result.summary}</p>
                  <div className="flex gap-4 mt-3 text-xs text-white/70">
                    <span>⏱ {Math.floor(duration / 60)}m {duration % 60}s</span>
                    <span>⚠️ {violations.length} violation{violations.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* STAT CARDS — original 4 + 4 new analytics cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Overall Score", value: `${result.overall_score}%` },
            { label: "Grade", value: result.overall_grade },
            { label: "Questions Done", value: `${answers.length}/8` },
            { label: "Tab Violations", value: String(violations.length), alert: violations.length > 0 },
          ].map((s) => (
            <Card key={s.label} className={s.alert ? "border-destructive/30 bg-destructive/5" : ""}>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* COMMUNICATION ANALYTICS — extra row of 4 smart metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Speaking Pace",
              value: wpm > 0 ? `${wpm} WPM` : "N/A",
              note: wpm >= 120 && wpm <= 160 ? "✓ Ideal pace" : wpm > 160 ? "↑ Too fast" : wpm > 0 ? "↓ Too slow" : "",
              alert: wpm > 180 || (wpm > 0 && wpm < 80),
            },
            {
              label: "Filler Words",
              value: String(fillerCount),
              note: fillerCount === 0 ? "✓ None detected" : fillerCount <= 5 ? "Acceptable" : "Too many",
              alert: fillerCount > 5,
            },
            {
              label: "STAR Usage",
              value: `${starScore}%`,
              note: starScore >= 60 ? "✓ Strong structure" : starScore >= 30 ? "Partial structure" : "Needs structure",
              alert: starScore < 30,
            },
            {
              label: "Avg Answer Length",
              value: `${avgWords} words`,
              note: avgWords >= 50 ? "✓ Detailed" : avgWords >= 25 ? "Adequate" : "Too brief",
              alert: avgWords < 25,
            },
          ].map((s) => (
            <Card key={s.label} className={s.alert ? "border-amber-300 bg-amber-50/50" : "border-blue-100 bg-blue-50/30"}>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
                {s.note && <p className="text-xs mt-1 text-muted-foreground">{s.note}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* SUBSTANTIVE ANSWER RATE — thin progress bar card */}
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">Answer Depth Rate</p>
              <span className="text-sm font-bold text-foreground">{substantiveRate}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${substantiveRate >= 70 ? "bg-green-500" : substantiveRate >= 40 ? "bg-amber-500" : "bg-red-400"}`}
                style={{ width: `${substantiveRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {substantiveRate >= 70
                ? "Most answers were detailed and substantive (30+ words)."
                : substantiveRate >= 40
                ? "About half your answers had sufficient depth. Aim for more detail."
                : "Most answers were too short. Interviewers expect 50–100 word responses minimum."}
            </p>
          </CardContent>
        </Card>

        {/* STRENGTHS & IMPROVEMENTS */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader><CardTitle className="text-base text-green-800">💪 Strengths</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {result.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-green-700">
                  <span>✓</span><span>{s}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader><CardTitle className="text-base text-amber-800">📈 Areas to Improve</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {result.improvements.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-amber-700">
                  <span>→</span><span>{s}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* QUESTION BREAKDOWN */}
        <div>
          <h2 className="font-display text-xl font-bold text-foreground mb-4">Question Breakdown</h2>
          <div className="space-y-4">
            {result.question_scores.map((qs, i) => {
              const a = answers[i];
              const wordCount = a?.answer?.split(/\s+/).filter(Boolean).length || 0;
              return (
                <Card key={qs.id}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                      <p className="text-sm font-medium text-foreground flex-1">{a?.question}</p>
                      {/* ── Word count badge — shows depth at a glance ── */}
                      <span className="shrink-0 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {wordCount}w
                      </span>
                    </div>
                    {a?.answer && (
                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xs text-muted-foreground italic">"{a.answer}"</p>
                      </div>
                    )}
                    <p className="text-sm text-foreground">{qs.feedback}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${scoreBarColor(qs.score)}`} style={{ width: `${qs.score * 10}%` }} />
                      </div>
                      <span className="text-sm font-bold text-foreground">{qs.score}/10</span>
                    </div>
                    {qs.keyword_hits?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {qs.keyword_hits.map((kw, j) => (
                          <Badge key={j} variant="secondary" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* INTEGRITY REPORT */}
        {violations.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader><CardTitle className="text-base text-destructive">⚠️ Integrity Report</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{violations.length} tab violation{violations.length !== 1 ? "s" : ""} detected:</p>
              <ul className="space-y-1">
                {violations.map((v: any, i: number) => (
                  <li key={i} className="text-sm text-foreground">Question {v.qNum} at {v.time}</li>
                ))}
              </ul>
              {result.integrity_note && <p className="text-sm text-muted-foreground italic mt-2">{result.integrity_note}</p>}
            </CardContent>
          </Card>
        )}

        {/* ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => navigate("/ai-interview")} variant="hero" className="flex-1">
            <RotateCcw className="h-4 w-4" /> Try Again
          </Button>
          <Button onClick={() => navigate("/dashboard")} variant="outline" className="flex-1">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}