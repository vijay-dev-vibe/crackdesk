import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BookOpen, Mic, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSubscription } from "@/hooks/useSubscription";

export async function saveTestResult(payload: {
  test_title: string;
  sector: string;
  level: string;
  score: number;
  total_questions: number;
  time_taken: number;
}) {
  const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) { console.error("[saveTestResult] Session error:", sessionErr.message); return; }
  if (!session?.user) { console.warn("[saveTestResult] No user logged in — result not saved."); return; }
  const { error } = await supabase.from("test_results").insert({ user_id: session.user.id, ...payload });
  if (error) console.error("[saveTestResult] DB insert error:", error.message);
  else console.log("[saveTestResult] ✅ Saved successfully");
}

interface TestResult {
  id: string;
  test_title: string;
  sector: string;
  level: string;
  score: number;
  total_questions: number;
  time_taken: number;
  created_at: string;
}

interface InterviewResult {
  id: string;
  user_id: string;
  created_at: string;
  overall_score: number | null;
  overall_grade: string | null;
  hire_recommendation: string | null;
  role: string | null;
  duration_seconds: number | null;
  violations: number | null;
}

type Filter = "all" | "high" | "mid" | "low";

function getPct(r: TestResult) {
  if (!r.score || !r.total_questions) return 0;
  return Math.round((r.score / r.total_questions) * 100);
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function getColor(pct: number) {
  return pct >= 70 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";
}

function getBgClass(pct: number) {
  return pct >= 70
    ? "bg-green-50 text-green-700"
    : pct >= 50
    ? "bg-amber-50 text-amber-700"
    : "bg-red-50 text-red-700";
}

function getInterviewColor(score: number) {
  return score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
}

function getHireBadgeClass(rec: string | null) {
  if (!rec) return "bg-gray-50 text-gray-600";
  if (rec === "Strong Hire") return "bg-green-50 text-green-700";
  if (rec === "Hire") return "bg-emerald-50 text-emerald-700";
  if (rec === "Maybe") return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

function ScoreRing({ pct }: { pct: number }) {
  const r = 18, cx = 22, cy = 22, circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  const color = getColor(pct);
  return (
    <div className="relative w-11 h-11 shrink-0">
      <svg width="44" height="44" viewBox="0 0 44 44"
        style={{ transform: "rotate(-90deg)", position: "absolute" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="3" />
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${dash.toFixed(1)} ${(circ - dash).toFixed(1)}`}
          strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-medium"
        style={{ color }}>{pct}%</span>
    </div>
  );
}

function InterviewScoreRing({ score }: { score: number }) {
  const r = 18, cx = 22, cy = 22, circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  const color = getInterviewColor(score);
  return (
    <div className="relative w-11 h-11 shrink-0">
      <svg width="44" height="44" viewBox="0 0 44 44"
        style={{ transform: "rotate(-90deg)", position: "absolute" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="3" />
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${dash.toFixed(1)} ${(circ - dash).toFixed(1)}`}
          strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-medium"
        style={{ color }}>{score}%</span>
    </div>
  );
}

function MiniBarChart({ results }: { results: TestResult[] }) {
  const last10 = results.slice(0, 10).reverse();
  if (!last10.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl p-4 mb-5">
      <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">
        Score trend — last {last10.length} tests
      </p>
      <div className="flex items-end gap-1.5 h-16">
        {last10.map((r) => {
          const pct = getPct(r);
          const height = Math.max(4, Math.round((pct / 100) * 56));
          return (
            <div key={r.id} className="flex flex-col items-center gap-1 flex-1" title={`${pct}%`}>
              <div className="w-full rounded-t"
                style={{ height, background: getColor(pct), opacity: 0.85 }} />
              <span className="text-[9px] text-muted-foreground font-mono">
                {new Date(r.created_at).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short",
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-border rounded-xl p-4 flex items-center gap-4 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-muted rounded w-3/5" />
        <div className="h-3 bg-muted rounded w-2/5" />
      </div>
      <div className="h-6 w-12 bg-muted rounded" />
    </div>
  );
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "high", label: "≥ 70%" },
  { key: "mid", label: "50–70%" },
  { key: "low", label: "< 50%" },
];

export default function TestHistory() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [interviewResults, setInterviewResults] = useState<InterviewResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const { planLimits, subscription, loading: subLoading } = useSubscription();

  useEffect(() => {
    if (subLoading) return;

    let mounted = true;

    async function loadResults() {
      try {
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw new Error(sessionErr.message);
        if (!session?.user) {
          if (mounted) setLoading(false);
          return;
        }

        // ── Retention cutoff ────────────────────────────────────────────
        const retentionDays = planLimits?.historyRetentionDays;
        const hasLimit =
          retentionDays !== undefined &&
          retentionDays !== null &&
          Number.isFinite(retentionDays);

        const cutoffIso = hasLimit
          ? new Date(Date.now() - (retentionDays as number) * 24 * 60 * 60 * 1000).toISOString()
          : null;

        // ── Mock test results ───────────────────────────────────────────
        let query = supabase
          .from("test_results")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (cutoffIso) query = query.gte("created_at", cutoffIso);

        const { data, error: dbErr } = await query;
        if (dbErr) throw new Error(dbErr.message);
        if (mounted) setResults(data ?? []);

        // ── Interview results ───────────────────────────────────────────
        const { data: ivData } = await supabase
          .from("interview_results")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (mounted) setInterviewResults(ivData ?? []);

      } catch (e: any) {
        console.error("[TestHistory] Load error:", e.message);
        if (mounted) setError(e.message ?? "Failed to load results.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadResults();
    return () => { mounted = false; };
  }, [planLimits, subLoading]);

  const filtered = results.filter((r) => {
    const pct = getPct(r);
    if (filter === "high") return pct >= 70;
    if (filter === "mid") return pct >= 50 && pct < 70;
    if (filter === "low") return pct < 50;
    return true;
  });

  const totalTests = results.length;
  const validResults = results.filter(r => r.score != null && r.total_questions > 0);
  const avgScore = validResults.length > 0
    ? Math.round(validResults.reduce((a, r) => a + getPct(r), 0) / validResults.length)
    : 0;
  const bestScore = validResults.length > 0
    ? Math.max(...validResults.map(getPct))
    : 0;

  // Interview stats
  const validIvResults = interviewResults.filter(iv => iv.overall_score != null);
  const avgIvScore = validIvResults.length > 0
    ? Math.round(validIvResults.reduce((a, iv) => a + (iv.overall_score ?? 0), 0) / validIvResults.length)
    : 0;
  const bestIvScore = validIvResults.length > 0
    ? Math.max(...validIvResults.map(iv => iv.overall_score ?? 0))
    : 0;

  const retentionDays = planLimits?.historyRetentionDays;
  const showUpgradeBanner =
    !subLoading &&
    planLimits !== null &&
    retentionDays !== undefined &&
    retentionDays !== null &&
    Number.isFinite(retentionDays);

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">

        {/* ── Mock Tests Header ── */}
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight">Test History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All your past attempts and progress
            {subscription && (
              <span className="ml-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted border border-border capitalize">
                {subscription.plan_type} plan
              </span>
            )}
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* ── Mock Test Stats ── */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Total tests", value: totalTests.toString(), color: "" },
            {
              label: "Avg score", value: `${avgScore}%`,
              color: avgScore >= 70 ? "text-green-600" : avgScore >= 50 ? "text-amber-600" : "text-red-600",
            },
            { label: "Personal best", value: `${bestScore}%`, color: "text-green-600" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <div className="bg-white border border-border rounded-xl p-3.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className={`font-display text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {!loading && totalTests > 0 && <MiniBarChart results={results} />}

        {/* ── Upgrade banner ── */}
        {showUpgradeBanner && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-center justify-between">
            <span>
              Showing last {retentionDays} days of history.{" "}
              <Link to="/pricing" className="font-semibold underline">Upgrade to Pro</Link>{" "}
              for unlimited history.
            </span>
          </div>
        )}

        {/* ── Filter buttons ── */}
        {!loading && totalTests > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  filter === f.key
                    ? "bg-foreground text-background border-foreground"
                    : "bg-white border-border text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Mock Test List ── */}
        {loading || subLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : totalTests === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white border border-border rounded-xl p-12 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-semibold text-base">No tests taken yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Take your first mock test to see your progress here.</p>
              <Link to="/mock-test">
                <Button className="mt-5 gap-2" variant="default">
                  <BookOpen className="h-4 w-4" /> Take Your First Test
                </Button>
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((r, i) => {
              const pct = getPct(r);
              return (
                <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <div className="bg-white border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 hover:border-muted-foreground/30 transition-colors">
                    <ScoreRing pct={pct} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {r.test_title || `${r.sector} — ${r.level}`}
                      </p>
                      <div className="flex gap-3 mt-1 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{formatTime(r.time_taken)}</span>
                        <span className="text-[11px] text-muted-foreground">{r.total_questions} Qs</span>
                      </div>
                    </div>
                    <span className={`text-xs font-mono px-2 py-1 rounded-md font-medium shrink-0 ${getBgClass(pct)}`}>
                      {r.score}/{r.total_questions}
                    </span>
                  </div>
                </motion.div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No tests match this filter.</p>
            )}
          </div>
        )}

        {/* ── Divider ── */}
        <div className="my-10 flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground uppercase tracking-widest">AI Interviews</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* ── AI Interviews Section ── */}
        <div>
          <div className="mb-4">
            <h2 className="font-display text-xl font-bold tracking-tight">AI Interview History</h2>
            <p className="text-sm text-muted-foreground mt-1">Your past AI mock interview sessions</p>
          </div>

          {/* Interview Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Total interviews", value: interviewResults.length.toString(), color: "" },
              {
                label: "Avg score",
                value: validIvResults.length > 0 ? `${avgIvScore}%` : "—",
                color: avgIvScore >= 70 ? "text-green-600" : avgIvScore >= 50 ? "text-amber-600" : "text-red-600",
              },
              {
                label: "Personal best",
                value: validIvResults.length > 0 ? `${bestIvScore}%` : "—",
                color: "text-green-600",
              },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <div className="bg-white border border-border rounded-xl p-3.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <p className={`font-display text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Interview List */}
          {loading || subLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : interviewResults.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-white border border-border rounded-xl p-12 text-center">
                <Mic className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-semibold text-base">No interviews taken yet</h3>
                <p className="text-sm text-muted-foreground mt-1">Complete an AI mock interview to see your history here.</p>
                <Link to="/ai-interview">
                  <Button className="mt-5 gap-2" variant="default">
                    <Mic className="h-4 w-4" /> Start AI Interview
                  </Button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-2.5">
              {interviewResults.map((iv, i) => {
                const hasScore = iv.overall_score != null;
                return (
                  <motion.div key={iv.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <div className="bg-white border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 hover:border-muted-foreground/30 transition-colors">
                      {/* Score ring or mic icon */}
                      {hasScore ? (
                        <InterviewScoreRing score={iv.overall_score!} />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                          <Mic size={16} className="text-amber-600" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {iv.role ? `${iv.role} Interview` : "AI Mock Interview"}
                        </p>
                        <div className="flex gap-3 mt-1 flex-wrap items-center">
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(iv.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          {iv.duration_seconds != null && (
                            <span className="text-[11px] text-muted-foreground">{formatTime(iv.duration_seconds)}</span>
                          )}
                          {iv.overall_grade && (
                            <span className="text-[11px] font-medium text-muted-foreground">
                              Grade: <span className="text-foreground font-semibold">{iv.overall_grade}</span>
                            </span>
                          )}
                          {iv.violations != null && iv.violations > 0 && (
                            <span className="text-[11px] text-red-500 flex items-center gap-0.5">
                              <AlertTriangle size={10} /> {iv.violations} violation{iv.violations !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Hire recommendation badge */}
                      <span className={`text-xs font-medium px-2 py-1 rounded-md shrink-0 ${getHireBadgeClass(iv.hire_recommendation)}`}>
                        {iv.hire_recommendation ?? "Completed"}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

      </main>
      <Footer />
    </div>
  );
}