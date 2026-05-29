import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RotateCcw, ArrowLeft, CheckCircle2, TrendingUp, AlertTriangle, Award, Clock, Mic } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { callInterviewAI, parseAIJson } from "@/lib/interviewAI";

// ─── Types ────────────────────────────────────────────────────────────────────
interface QuestionScore { id: number; score: number; feedback: string; keyword_hits?: string[] }
interface AnalysisResult {
  overall_score: number; overall_grade: string; summary: string;
  hire_recommendation: string; strengths: string[]; improvements: string[];
  question_scores: QuestionScore[]; integrity_note?: string;
  // accept both camelCase and snake_case from AI
  overallScore?: number; overallGrade?: string;
  hireRecommendation?: string; questionScores?: QuestionScore[];
}

// ─── Analysis Prompt ──────────────────────────────────────────────────────────
const ANALYSIS_PROMPT = `You are a world-class interview evaluator with 20+ years of experience at top-tier companies. Your evaluations are trusted to make final hiring decisions.

Evaluate the candidate across 8 professional dimensions:
1. Technical Depth & Accuracy
2. Communication Clarity
3. Problem-Solving Approach (STAR, MECE, first-principles)
4. Relevance & Focus
5. Self-Awareness & Growth
6. Leadership & Impact
7. Cultural Fit & Professionalism
8. Recall & Consistency

Scoring rules:
- overall_score: weighted 0–100. Be calibrated; do NOT inflate.
- Apply -2 per tab violation (max -15) to overall_score.
- Short answers (<15 words): max 4/10 for that question.
- STAR structure with quantified results: 8–10/10.
- overall_grade: "A+" (90-100), "A" (80-89), "B+" (70-79), "B" (60-69), "C" (50-59), "D" (<50)
- hire_recommendation: "Strong Hire" (85+), "Hire" (70-84), "Maybe" (55-69), "No Hire" (<55)
- keyword_hits: 2-5 actual keywords from their answer showing domain knowledge.
- Per-question feedback: specific, actionable, reference their actual words.
- strengths: 3 specific with evidence, not generic.
- improvements: 2-3 highly actionable with examples.
- integrity_note: professional note if violations > 0, else "".

Return ONLY valid JSON, zero markdown:
{
  "overall_score": number,
  "overall_grade": "string",
  "summary": "2-3 sentence calibrated assessment",
  "hire_recommendation": "string",
  "strengths": ["specific strength with evidence"],
  "improvements": ["specific actionable improvement"],
  "question_scores": [{"id":number,"score":number,"feedback":"string","keyword_hits":["string"]}],
  "integrity_note": "string"
}`;

// ─── Client-side analytics ────────────────────────────────────────────────────
function estimateWPM(answers: any[], sec: number) {
  if (!sec) return 0;
  const words = answers.reduce((s, a) => s + (a.answer?.split(/\s+/).filter(Boolean).length || 0), 0);
  return Math.round((words / sec) * 60);
}
function countFillers(answers: any[]) {
  const re = /\b(um|uh|like|you know|basically|literally|actually|kind of|sort of|i mean|right\?|so yeah|just)\b/gi;
  return answers.reduce((s, a) => { const m = (a.answer || "").match(re); return s + (m ? m.length : 0); }, 0);
}
function starScore(answers: any[]) {
  const re = /\b(situation|context|task|responsible|challenge|action|decided|implemented|result|outcome|achieved|improved|increased|reduced)\b/gi;
  const total = answers.reduce((s, a) => { const m = (a.answer || "").match(re); return s + (m ? new Set(m.map((x: string) => x.toLowerCase())).size : 0); }, 0);
  return Math.min(100, Math.round((total / 20) * 100));
}
function avgWords(answers: any[]) {
  if (!answers.length) return 0;
  return Math.round(answers.reduce((s, a) => s + (a.answer?.split(/\s+/).filter(Boolean).length || 0), 0) / answers.length);
}
function substantiveRate(answers: any[]) {
  return answers.length ? Math.round(answers.filter(a => (a.answer?.split(/\s+/).filter(Boolean).length || 0) >= 30).length / answers.length * 100) : 0;
}

// ─── Normalize AI response (handle both camelCase + snake_case) ──────────────
function normalize(raw: any): AnalysisResult {
  return {
    overall_score: raw.overall_score ?? raw.overallScore ?? 0,
    overall_grade: raw.overall_grade ?? raw.overallGrade ?? "N/A",
    summary: raw.summary ?? "",
    hire_recommendation: raw.hire_recommendation ?? raw.hireRecommendation ?? "N/A",
    strengths: raw.strengths ?? [],
    improvements: raw.improvements ?? [],
    question_scores: (raw.question_scores ?? raw.questionScores ?? []).map((q: any) => ({
      id: q.id,
      score: Math.max(0, Math.min(10, q.score ?? 0)),
      feedback: q.feedback ?? "",
      keyword_hits: q.keyword_hits ?? q.keywordHits ?? [],
    })),
    integrity_note: raw.integrity_note ?? raw.integrityNote ?? "",
  };
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#F8F7F4",
  surface: "#FFFFFF",
  border: "#E8E4DE",
  text: "#1C1917",
  textMid: "#78716C",
  textLight: "#A8A29E",
  accent: "#D89B26",
  accentLight: "rgba(216,155,38,0.07)",
  accentBorder: "rgba(216,155,38,0.2)",
  gold: "#B45309",
  goldLight: "rgba(180,83,9,0.07)",
  error: "#991B1B",
  errorBg: "rgba(153,27,27,0.06)",
};

// ─── Score color helper ───────────────────────────────────────────────────────
function scoreColor(s: number, max = 100) {
  const pct = max === 10 ? s * 10 : s;
  return pct >= 75 ? "#D89B26" : pct >= 50 ? "#B45309" : "#991B1B";
}
function scoreBg(s: number, max = 100) {
  const pct = max === 10 ? s * 10 : s;
  return pct >= 75 ? "rgba(45,90,39,0.07)" : pct >= 50 ? "rgba(180,83,9,0.07)" : "rgba(153,27,27,0.06)";
}
function scoreBar(s: number) {
  return s >= 7 ? "#D89B26" : s >= 5 ? "#B45309" : "#991B1B";
}

// ─── Grade badge gradient ─────────────────────────────────────────────────────
function gradeGradient(score: number) {
  if (score >= 85) return "linear-gradient(135deg, #166534, #15803D)";
  if (score >= 70) return "linear-gradient(135deg, #14532D, #D89B26)";
  if (score >= 55) return "linear-gradient(135deg, #92400E, #B45309)";
  return "linear-gradient(135deg, #7F1D1D, #991B1B)";
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, note, alert }: { label: string; value: string; note?: string; alert?: boolean }) {
  return (
    <div style={{
      background: alert ? "rgba(180,83,9,0.05)" : C.surface,
      border: `1.5px solid ${alert ? "rgba(180,83,9,0.3)" : C.border}`,
      borderRadius: 12, padding: "16px 18px", textAlign: "center",
    }}>
      <p style={{ fontSize: 11, color: C.textLight, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 500 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: "'Playfair Display', serif" }}>{value}</p>
      {note && <p style={{ fontSize: 10, color: C.textMid, marginTop: 4 }}>{note}</p>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function InterviewAnalysis() {
  const navigate = useNavigate();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [duration, setDuration] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [fillers, setFillers] = useState(0);
  const [star, setStar] = useState(0);
  const [avgW, setAvgW] = useState(0);
  const [subRate, setSubRate] = useState(0);

  useEffect(() => {
    const planRaw = sessionStorage.getItem("iv_plan");
    const answersRaw = sessionStorage.getItem("iv_answers");
    const violationsRaw = sessionStorage.getItem("iv_violations");
    const durationRaw = sessionStorage.getItem("iv_duration");
    const existingAnalysis = sessionStorage.getItem("iv_analysis");

    if (!answersRaw) { navigate("/ai-interview"); return; }

    const plan = planRaw ? JSON.parse(planRaw) : { role: "Interview", level: "", focus_areas: [] };
    const ans = JSON.parse(answersRaw);
    const viols = violationsRaw ? JSON.parse(violationsRaw) : [];
    const dur = Number(durationRaw) || 0;

    setAnswers(ans);
    setViolations(viols);
    setDuration(dur);
    setWpm(estimateWPM(ans, dur));
    setFillers(countFillers(ans));
    setStar(starScore(ans));
    setAvgW(avgWords(ans));
    setSubRate(substantiveRate(ans));

    // Use pre-computed analysis if available
    if (existingAnalysis) {
      try {
        const parsed = parseAIJson ? parseAIJson(existingAnalysis) : JSON.parse(existingAnalysis);
        if (parsed) {
          setResult(normalize(parsed));
          setLoading(false);
          sessionStorage.removeItem("iv_plan");
          sessionStorage.removeItem("iv_answers");
          sessionStorage.removeItem("iv_violations");
          sessionStorage.removeItem("iv_duration");
          sessionStorage.removeItem("iv_analysis");
          return;
        }
      } catch (e) { console.error("Existing analysis parse failed, re-running:", e); }
    }

    // Build user message for fresh analysis
    const qaText = ans.map((a: any, i: number) => {
      const wc = a.answer?.split(/\s+/).filter(Boolean).length || 0;
      return `Q${i + 1} [type: ${a.questionType || "general"}, words: ${wc}]:\nQuestion: ${a.question}\nAnswer: ${a.answer || "(no answer given)"}`;
    }).join("\n\n");

    const userMsg = [
      `Role: ${plan.role} (${plan.level})`,
      `Interview duration: ${Math.floor(dur / 60)}m ${dur % 60}s`,
      `Tab violations: ${viols.length}`,
      ``,
      `--- ANSWERS ---`,
      qaText,
      ``,
      `--- INTEGRITY ---`,
      viols.length > 0
        ? `Violations at: ${viols.map((v: any) => `Q${v.qNum} (${v.time})`).join(", ")}`
        : "No violations.",
    ].join("\n");

    callInterviewAI({ action: "analyze", systemPrompt: ANALYSIS_PROMPT, userMessage: userMsg, maxTokens: 2500 })
      .then(raw => {
        const parsed = parseAIJson ? parseAIJson(raw) : JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        setResult(normalize(parsed));
        setLoading(false);
        sessionStorage.removeItem("iv_plan");
        sessionStorage.removeItem("iv_answers");
        sessionStorage.removeItem("iv_violations");
        sessionStorage.removeItem("iv_duration");
        sessionStorage.removeItem("iv_analysis");
      })
      .catch(() => {
        setResult({
          overall_score: 0, overall_grade: "N/A",
          summary: "Analysis could not be generated. Please try again.",
          hire_recommendation: "N/A", strengths: [], improvements: [],
          question_scores: [], integrity_note: "",
        });
        setLoading(false);
      });
  }, [navigate]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap'); @keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      <Navbar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: C.accentLight, border: `2px solid ${C.accentBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <Loader2 size={28} style={{ color: C.accent, animation: "spin 1s linear infinite" }} />
          </div>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: C.text, marginBottom: 8 }}>
            Analysing Your Performance
          </p>
          <p style={{ fontSize: 13, color: C.textMid }}>Evaluating across 8 professional dimensions…</p>
        </div>
      </div>
    </div>
  );

  if (!result) return null;

  const score = result.overall_score;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: slideUp 0.5s ease forwards; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D4CFC8; border-radius: 3px; }
      `}</style>
      <Navbar />

      <main style={{ flex: 1, maxWidth: 860, margin: "0 auto", padding: "40px 20px 80px", width: "100%" }}>

        {/* ── Hero Banner ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
          <div style={{
            background: gradeGradient(score),
            borderRadius: 20, padding: "32px 36px",
            color: "#fff", overflow: "hidden", position: "relative",
          }}>
            {/* Decorative circles */}
            <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
            <div style={{ position: "absolute", bottom: -20, right: 60, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 28, position: "relative" }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 180, delay: 0.1 }}>
                <div style={{
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: 16, padding: "20px 28px", textAlign: "center",
                  backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)",
                }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 700, lineHeight: 1 }}>{score}%</p>
                  <p style={{ fontSize: 11, opacity: 0.8, letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>Overall</p>
                </div>
              </motion.div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <span style={{
                    background: "rgba(255,255,255,0.2)", borderRadius: 100,
                    padding: "4px 14px", fontSize: 12, fontWeight: 700,
                    border: "1px solid rgba(255,255,255,0.3)", letterSpacing: 1,
                  }}>
                    Grade: {result.overall_grade}
                  </span>
                  <span style={{
                    background: "rgba(255,255,255,0.2)", borderRadius: 100,
                    padding: "4px 14px", fontSize: 12, fontWeight: 700,
                    border: "1px solid rgba(255,255,255,0.3)", letterSpacing: 0.5,
                  }}>
                    {result.hire_recommendation}
                  </span>
                </div>
                <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.65, maxWidth: 420 }}>{result.summary}</p>
                <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11, opacity: 0.7 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={11} /> {Math.floor(duration / 60)}m {duration % 60}s
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertTriangle size={11} /> {violations.length} violation{violations.length !== 1 ? "s" : ""}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Award size={11} /> {answers.length}/8 questions
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Core Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard label="Score" value={`${score}%`} />
          <StatCard label="Grade" value={result.overall_grade} />
          <StatCard label="Questions" value={`${answers.length}/8`} />
          <StatCard label="Violations" value={String(violations.length)} alert={violations.length > 0} />
        </div>

        {/* ── Communication Analytics ── */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: C.textLight, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
            Communication Analytics
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <StatCard
              label="Speaking Pace"
              value={wpm > 0 ? `${wpm} WPM` : "N/A"}
              note={wpm >= 120 && wpm <= 160 ? "✓ Ideal pace" : wpm > 160 ? "↑ A bit fast" : wpm > 0 ? "↓ A bit slow" : ""}
              alert={wpm > 180 || (wpm > 0 && wpm < 80)}
            />
            <StatCard
              label="Filler Words"
              value={String(fillers)}
              note={fillers === 0 ? "✓ None detected" : fillers <= 5 ? "Acceptable" : "Reduce fillers"}
              alert={fillers > 5}
            />
            <StatCard
              label="STAR Usage"
              value={`${star}%`}
              note={star >= 60 ? "✓ Strong structure" : star >= 30 ? "Partial structure" : "Use STAR method"}
              alert={star < 30}
            />
            <StatCard
              label="Avg Length"
              value={`${avgW}w`}
              note={avgW >= 50 ? "✓ Detailed" : avgW >= 25 ? "Adequate" : "Too brief"}
              alert={avgW < 25}
            />
          </div>
        </div>

        {/* ── Answer Depth ── */}
        <div style={{
          background: C.surface, border: `1.5px solid ${C.border}`,
          borderRadius: 12, padding: "16px 20px", marginBottom: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
              <Mic size={14} style={{ color: C.textMid }} />
              Answer Depth Rate
            </p>
            <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(subRate) }}>{subRate}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 100, background: C.border, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${subRate}%` }} transition={{ duration: 0.8, delay: 0.2 }}
              style={{ height: "100%", borderRadius: 100, background: scoreColor(subRate) }}
            />
          </div>
          <p style={{ fontSize: 11, color: C.textMid, marginTop: 6 }}>
            {subRate >= 70
              ? "Most answers were detailed and substantive (30+ words)."
              : subRate >= 40
              ? "About half your answers had sufficient depth. Aim for more detail."
              : "Most answers were too short. Interviewers expect 50–100 word responses."}
          </p>
        </div>

        {/* ── Strengths & Improvements ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{
            background: C.accentLight, border: `1.5px solid ${C.accentBorder}`,
            borderRadius: 14, padding: "20px 22px",
          }}>
            <p style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600, color: C.accent, marginBottom: 14 }}>
              <CheckCircle2 size={16} /> Strengths
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {result.strengths.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: C.text }}>
                  <span style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ lineHeight: 1.6 }}>{s}</span>
                </div>
              ))}
              {result.strengths.length === 0 && (
                <p style={{ fontSize: 13, color: C.textMid, fontStyle: "italic" }}>No strengths recorded.</p>
              )}
            </div>
          </div>
          <div style={{
            background: C.goldLight, border: "1.5px solid rgba(180,83,9,0.2)",
            borderRadius: 14, padding: "20px 22px",
          }}>
            <p style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600, color: C.gold, marginBottom: 14 }}>
              <TrendingUp size={16} /> Areas to Improve
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {result.improvements.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: C.text }}>
                  <span style={{ color: C.gold, fontWeight: 700, flexShrink: 0 }}>→</span>
                  <span style={{ lineHeight: 1.6 }}>{s}</span>
                </div>
              ))}
              {result.improvements.length === 0 && (
                <p style={{ fontSize: 13, color: C.textMid, fontStyle: "italic" }}>No improvements noted.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Question Breakdown ── */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: C.text, marginBottom: 16 }}>
            Question Breakdown
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {result.question_scores.map((qs, i) => {
              const a = answers[i];
              const wc = a?.answer?.split(/\s+/).filter(Boolean).length || 0;
              return (
                <motion.div key={qs.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={{
                    background: C.surface, border: `1.5px solid ${C.border}`,
                    borderRadius: 14, padding: "20px 22px",
                  }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: C.accentLight, border: `1.5px solid ${C.accentBorder}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: C.accent,
                    }}>
                      {i + 1}
                    </div>
                    <p style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.text, lineHeight: 1.5 }}>
                      {a?.question ?? `Question ${i + 1}`}
                    </p>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: C.textLight, background: C.bg, borderRadius: 100, padding: "2px 8px", border: `1px solid ${C.border}` }}>
                        {wc}w
                      </span>
                      <span style={{
                        fontSize: 13, fontWeight: 700,
                        color: scoreColor(qs.score, 10),
                        background: scoreBg(qs.score, 10),
                        borderRadius: 8, padding: "2px 10px",
                      }}>
                        {qs.score}/10
                      </span>
                    </div>
                  </div>

                  {a?.answer && (
                    <div style={{
                      background: C.bg, borderRadius: 8, padding: "10px 14px",
                      marginBottom: 10, borderLeft: `3px solid ${C.border}`,
                    }}>
                      <p style={{ fontSize: 12, color: C.textMid, fontStyle: "italic", lineHeight: 1.6 }}>
                        "{a.answer}"
                      </p>
                    </div>
                  )}

                  <p style={{ fontSize: 13, color: C.text, lineHeight: 1.65, marginBottom: 12 }}>{qs.feedback}</p>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: qs.keyword_hits?.length ? 10 : 0 }}>
                    <div style={{ flex: 1, height: 5, borderRadius: 100, background: C.border, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${qs.score * 10}%` }}
                        transition={{ duration: 0.6, delay: i * 0.06 + 0.2 }}
                        style={{ height: "100%", borderRadius: 100, background: scoreBar(qs.score) }}
                      />
                    </div>
                  </div>

                  {qs.keyword_hits && qs.keyword_hits.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {qs.keyword_hits.map((kw, j) => (
                        <span key={j} style={{
                          fontSize: 10, padding: "3px 10px", borderRadius: 100,
                          background: C.accentLight, color: C.accent,
                          border: `1px solid ${C.accentBorder}`, fontWeight: 500, letterSpacing: 0.5,
                        }}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Integrity Report ── */}
        {violations.length > 0 && (
          <div style={{
            background: C.errorBg, border: "1.5px solid rgba(153,27,27,0.25)",
            borderRadius: 14, padding: "20px 22px", marginBottom: 24,
          }}>
            <p style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600, color: C.error, marginBottom: 12 }}>
              <AlertTriangle size={16} /> Integrity Report
            </p>
            <p style={{ fontSize: 13, color: C.textMid, marginBottom: 8 }}>
              {violations.length} tab violation{violations.length !== 1 ? "s" : ""} detected:
            </p>
            <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 4 }}>
              {violations.map((v: any, i: number) => (
                <li key={i} style={{ fontSize: 13, color: C.text }}>
                  Question {v.qNum} at {v.time}
                </li>
              ))}
            </ul>
            {result.integrity_note && (
              <p style={{ fontSize: 12, color: C.textMid, marginTop: 10, fontStyle: "italic", lineHeight: 1.65 }}>
                {result.integrity_note}
              </p>
            )}
          </div>
        )}

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/ai-interview")}
            style={{
              flex: 1, minWidth: 180, height: 48, borderRadius: 10,
              background: C.accent, color: "#fff", border: "none",
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              letterSpacing: 1,
            }}>
            <RotateCcw size={15} /> Try Again
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              flex: 1, minWidth: 180, height: 48, borderRadius: 10,
              background: C.surface, color: C.text,
              border: `1.5px solid ${C.border}`,
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
            <ArrowLeft size={15} /> Back to Dashboard
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}