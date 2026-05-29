import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Crown,
  Lock,
  ChevronRight,
  TrendingUp,
  Target,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { generateQuestionsFromJD, type GeneratedQuestion } from "@/lib/gemini";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generateCertificatePDF } from "@/lib/TestCertificatePDF";

type Phase = "input" | "quiz" | "results";

// ── Plan badge pill ──────────────────────────────────────────────────────────
const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  free:    { bg: "#f1f5f9", text: "#64748b", border: "#e2e8f0" },
  starter: { bg: "#eff6ff", text: "#3b82f6", border: "#bfdbfe" },
  pro:     { bg: "#fefce8", text: "#ca8a04", border: "#fde68a" },
  premium: { bg: "#fdf4ff", text: "#a21caf", border: "#f0abfc" },
};

function PlanBadge({ plan }: { plan: string }) {
  const c = PLAN_COLORS[plan] ?? PLAN_COLORS.free;
  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 1,
      }}
    >
      {plan}
    </span>
  );
}

// ── Locked overlay card ──────────────────────────────────────────────────────
function LockedFeature({
  title,
  description,
  requiredPlan,
}: {
  title: string;
  description: string;
  requiredPlan: string;
}) {
  return (
    <Card className="border-border mb-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-background/85 backdrop-blur-sm z-10 flex items-center justify-center">
        <div className="text-center space-y-3 px-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          <Link to="/pricing">
            <Button variant="hero" size="sm" className="gap-2 mt-1">
              <Crown className="h-3.5 w-3.5" />
              Upgrade to {requiredPlan}
            </Button>
          </Link>
        </div>
      </div>
      <CardContent className="p-8 blur-sm select-none">
        <div className="space-y-3">
          {[80, 60, 40, 70, 55].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 rounded bg-muted" style={{ width: `${w}%` }} />
              <div className="h-3 rounded bg-muted w-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MockTest() {
  const [phase, setPhase] = useState<Phase>("input");
  const [jd, setJd] = useState("");
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(1200);
  const [isGenerating, setIsGenerating] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const warnedRef = useRef(false);

  const {
    subscription,
    loading: subLoading,
    planLimits,
    canGenerateMockTest,
    incrementMockTestUsage,
    mockTestsRemaining,
  } = useSubscription();

  // ── Generate handler ────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!jd.trim()) {
      toast.error("Please enter a topic or job description");
      return;
    }

    if (!canGenerateMockTest()) {
      const isOneTime = planLimits?.isOneTime ?? false;
      toast.error("Test limit reached!", {
        description: isOneTime
          ? `Free plan includes ${planLimits?.maxMockTestsPerMonth} tests total. Upgrade to Starter for 8/month.`
          : `You've used all ${planLimits?.maxMockTestsPerMonth} tests this month. Upgrade for more.`,
        action: {
          label: "Upgrade",
          onClick: () => (window.location.href = "/pricing"),
        },
      });
      return;
    }

    setIsGenerating(true);
    try {
      const qs = await generateQuestionsFromJD(jd);
      setQuestions(qs);
      setAnswers(Array.from({ length: qs.length }, () => null));
      setCurrent(0);
      setTimeLeft(1200);
      warnedRef.current = false;
      setStartTime(Date.now());
      setPhase("quiz");
      toast.success(`${qs.length} questions ready!`, {
        description: "Your mock test is ready. Good luck!",
      });
      await incrementMockTestUsage();
    } catch (err) {
      toast.error("Generation failed", {
        description:
          err instanceof Error ? err.message : "Please try again.",
        action: { label: "Retry", onClick: handleGenerate },
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Finish test + save to Supabase ──────────────────────────────────────────
  const finishTest = useCallback(async () => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    setTimeTaken(elapsed);
    setPhase("results");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      const finalScore = answers.reduce(
        (acc, a, i) => acc + (a === questions[i]?.correct ? 1 : 0),
        0
      );
      const title =
        jd.trim().slice(0, 80) + (jd.length > 80 ? "…" : "");
      const { error } = await supabase.from("test_results").insert({
        user_id: session.user.id,
        test_title: title,
        sector: "AI Mock Test",
        level:
          finalScore / questions.length >= 0.8
            ? "Advanced"
            : finalScore / questions.length >= 0.5
            ? "Intermediate"
            : "Beginner",
        score: finalScore,
        total_questions: questions.length,
        time_taken: elapsed,
      });
      if (error) console.error("[MockTest] Failed to save:", error.message);
    } catch (e: any) {
      console.error("[MockTest] Save error:", e.message);
    }
  }, [startTime, answers, questions, jd]);

  // ── Timer ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "quiz") return;
    if (timeLeft <= 0) {
      finishTest();
      return;
    }
    if (timeLeft === 60 && !warnedRef.current) {
      warnedRef.current = true;
      toast.warning("Only 1 minute remaining!", {
        icon: <AlertTriangle className="h-4 w-4 text-warning" />,
        duration: 5000,
      });
    }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, finishTest]);

  const selectAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[current] = optionIndex;
    setAnswers(newAnswers);
  };

  // ── Derived stats ────────────────────────────────────────────────────────────
  const score = answers.reduce(
    (acc, a, i) => acc + (a === questions[i]?.correct ? 1 : 0),
    0
  );
  const wrongCount = answers.reduce(
    (acc, a, i) =>
      acc + (a !== null && a !== questions[i]?.correct ? 1 : 0),
    0
  );
  const unanswered = answers.filter((a) => a === null).length;
  const percentage = questions.length
    ? Math.round((score / questions.length) * 100)
    : 0;

  const skillBreakdown = () => {
    const map: Record<string, { correct: number; total: number }> = {};
    questions.forEach((q, i) => {
      if (!map[q.skill]) map[q.skill] = { correct: 0, total: 0 };
      map[q.skill].total++;
      if (answers[i] === q.correct) map[q.skill].correct++;
    });
    return Object.entries(map).map(([skill, { correct, total }]) => ({
      skill,
      correct,
      total,
      pct: Math.round((correct / total) * 100),
    }));
  };

  const strongAreas = () =>
    skillBreakdown()
      .filter((s) => s.pct >= 70)
      .map((s) => s.skill);
  const weakAreas = () =>
    skillBreakdown()
      .filter((s) => s.pct < 70)
      .map((s) => s.skill);
  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60)
      .toString()
      .padStart(2, "0")}`;
  const isWarningTime = timeLeft <= 60;
  const formatTimeTaken = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

  // ── PDF certificate ──────────────────────────────────────────────────────────
  const downloadPDF = () => {
    if (!planLimits?.features.certificateDownload) {
      toast.error("Certificate downloads require Pro or Premium plan", {
        action: {
          label: "Upgrade",
          onClick: () => (window.location.href = "/pricing"),
        },
      });
      return;
    }

    generateCertificatePDF({
      percentage,
      score,
      totalQuestions: questions.length,
      timeTaken,
      strongAreas: strongAreas(),
      weakAreas: weakAreas(),
    });

    toast.success("Certificate downloaded!");
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (subLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading your plan...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">

          {/* ══════════════════════════════════════════════════════════════════
              INPUT PHASE
          ══════════════════════════════════════════════════════════════════ */}
          {phase === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mx-auto max-w-2xl"
            >
              <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                    AI Mock Test Generator
                  </h1>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Paste a job description and AI will craft a personalised 20-question assessment.
                  </p>
                </div>
                {subscription && <PlanBadge plan={subscription.plan_type} />}
              </div>

              {/* ── Usage info banner ── */}
              {subscription && planLimits && (
                <Alert className="mt-4 border-border">
                  <Zap className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm">
                      {planLimits.isOneTime ? (
                        <>
                          <strong>{mockTestsRemaining}</strong> of{" "}
                          <strong>{planLimits.maxMockTestsPerMonth}</strong> free
                          tests remaining (lifetime)
                        </>
                      ) : planLimits.maxMockTestsPerMonth === Infinity ? (
                        <>Unlimited tests on your plan</>
                      ) : (
                        <>
                          <strong>{mockTestsRemaining}</strong> of{" "}
                          <strong>{planLimits.maxMockTestsPerMonth}</strong> tests
                          remaining this month
                        </>
                      )}
                      {" · "}
                      <span className="text-muted-foreground capitalize">
                        {planLimits.aiQuality} AI quality
                      </span>
                    </span>
                    {(subscription.plan_type === "free" ||
                      subscription.plan_type === "starter") && (
                      <Link to="/pricing">
                        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs">
                          <Crown className="h-3 w-3" /> Upgrade
                        </Button>
                      </Link>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* ── Limit-reached warning ── */}
              {!canGenerateMockTest() && planLimits && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-sm">
                        {planLimits.isOneTime
                          ? "Free test limit reached"
                          : "Monthly test limit reached"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {planLimits.isOneTime
                          ? "Upgrade to Starter (₹99/mo) for 8 tests per month."
                          : "Upgrade to the next plan for more tests."}
                      </p>
                    </div>
                    <Link to="/pricing">
                      <Button size="sm" variant="hero" className="gap-1 shrink-0">
                        <Crown className="h-3 w-3" /> Upgrade
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}

              <Card className="mt-6 shadow-card border-border">
                <CardContent className="p-6 space-y-4">
                  <Textarea
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                    placeholder="Paste the full job description or enter a topic (e.g. 'React Developer', 'Data Science', 'Product Manager')..."
                    className="min-h-[200px] resize-none"
                    disabled={!canGenerateMockTest()}
                  />
                  <Button
                    variant="hero"
                    onClick={handleGenerate}
                    disabled={!jd.trim() || isGenerating || !canGenerateMockTest()}
                    className="w-full gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        AI is generating your test…
                      </>
                    ) : !canGenerateMockTest() ? (
                      <>
                        <Lock className="h-4 w-4" />
                        {planLimits?.isOneTime
                          ? "Free limit reached — Upgrade to continue"
                          : "Monthly limit reached — Upgrade to continue"}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Mock Test
                        <span className="text-xs opacity-70 capitalize">
                          ({planLimits?.aiQuality} AI)
                        </span>
                      </>
                    )}
                  </Button>
                  {isGenerating && (
                    <p className="text-xs text-center text-muted-foreground">
                      This may take 10–15 seconds. AI is reading your JD and crafting questions.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              QUIZ PHASE
          ══════════════════════════════════════════════════════════════════ */}
          {phase === "quiz" && questions[current] && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div
                  className={`flex items-center gap-2 text-sm font-medium ${
                    isWarningTime ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {isWarningTime ? (
                    <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  <span className={isWarningTime ? "font-bold animate-pulse" : ""}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {current + 1} / {questions.length}
                </span>
              </div>

              {isWarningTime && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Less than 1 minute remaining!</span>
                </motion.div>
              )}

              <div className="h-2 rounded-full bg-secondary mb-8">
                <div
                  className="h-2 rounded-full gradient-primary transition-all duration-300"
                  style={{ width: `${((current + 1) / questions.length) * 100}%` }}
                />
              </div>

              <Card className="shadow-card border-border">
                <CardContent className="p-6">
                  <span className="text-xs font-semibold text-primary bg-secondary px-2 py-1 rounded">
                    {questions[current].skill}
                  </span>
                  <h2 className="mt-3 font-display text-lg font-semibold text-foreground">
                    {questions[current].question}
                  </h2>
                  <div className="mt-6 space-y-3">
                    {questions[current].options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => selectAnswer(oi)}
                        className={`w-full rounded-xl border p-4 text-left text-sm font-medium transition-all ${
                          answers[current] === oi
                            ? "border-primary bg-secondary text-primary"
                            : "border-border bg-card text-foreground hover:border-primary/40"
                        }`}
                      >
                        <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs">
                          {String.fromCharCode(65 + oi)}
                        </span>
                        {opt}
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-between">
                    <Button
                      variant="outline"
                      disabled={current === 0}
                      onClick={() => setCurrent((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    {current < questions.length - 1 ? (
                      <Button variant="hero" onClick={() => setCurrent((p) => p + 1)}>
                        Next
                      </Button>
                    ) : (
                      <Button variant="hero" onClick={finishTest}>
                        Submit Test
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              RESULTS PHASE
          ══════════════════════════════════════════════════════════════════ */}
          {phase === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-6xl"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                  Test Complete!
                </h1>
                <p className="mt-1 text-muted-foreground">
                  Here's your detailed score report
                  {planLimits?.features.advancedSkillBreakdown && " with AI-powered insights"}
                </p>
              </div>

              {/* Score Circle */}
              <Card className="shadow-elevated border-border mb-6">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex h-28 w-28 items-center justify-center rounded-full bg-secondary">
                    <span className="font-display text-4xl font-bold text-primary">
                      {percentage}%
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-medium text-foreground">
                    {score} / {questions.length} Correct
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {percentage >= 80
                      ? "Excellent work! You're well prepared."
                      : percentage >= 60
                      ? "Good effort! Focus on weak areas."
                      : "Keep practising. You'll get there!"}
                  </p>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
                {[
                  { label: "Correct", value: score, color: "text-success" },
                  { label: "Wrong", value: wrongCount, color: "text-destructive" },
                  { label: "Unanswered", value: unanswered, color: "text-muted-foreground" },
                  { label: "Time Taken", value: formatTimeTaken(timeTaken), color: "text-primary" },
                ].map((stat) => (
                  <Card key={stat.label} className="border-border">
                    <CardContent className="p-4 text-center">
                      <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* ── SKILL BREAKDOWN — gated by plan ── */}
              {!planLimits?.features.skillBreakdown ? (
                <LockedFeature
                  title="Skill breakdown requires Starter or above"
                  description="See exactly which skills you're strong and weak in, with per-skill scores and progress bars."
                  requiredPlan="Starter"
                />
              ) : (
                <>
                  {/* Strong / Weak areas */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-8">
                    <Card className="border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span className="text-sm font-semibold text-foreground">
                            Strong Areas
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {strongAreas().length > 0 ? (
                            strongAreas().map((s) => (
                              <span
                                key={s}
                                className="text-xs bg-success/10 text-success px-2 py-1 rounded-full"
                              >
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              None identified
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-semibold text-foreground">
                            Weak Areas
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {weakAreas().length > 0 ? (
                            weakAreas().map((s) => (
                              <span
                                key={s}
                                className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full"
                              >
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              None identified
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* AI recommendation — pro+ only */}
                  {planLimits.features.advancedSkillBreakdown && weakAreas().length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3"
                    >
                      <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          AI Recommendation
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Focus your next study session on{" "}
                          <strong>{weakAreas()[0]}</strong>
                          {weakAreas().length > 1 && (
                            <> and <strong>{weakAreas()[1]}</strong></>
                          )}
                          . Your strongest area is <strong>{strongAreas()[0] ?? "still developing"}</strong>.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Skill Breakdown table + Answer Review */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mb-8">
                    {/* Skill Breakdown */}
                    <div className="sticky top-20">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-4 w-1 rounded-full bg-primary" />
                        <h3 className="font-display font-semibold text-foreground">
                          Skill Breakdown
                        </h3>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {skillBreakdown().length} skills
                        </span>
                      </div>
                      <Card className="border-border overflow-hidden">
                        <div className="grid grid-cols-2 px-4 py-2.5 bg-muted/50 border-b border-border">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Skill
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                            Score
                          </span>
                        </div>
                        <div className="divide-y divide-border">
                          {skillBreakdown().map((s, i) => (
                            <motion.div
                              key={s.skill}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                              className="grid grid-cols-2 items-center px-4 py-3 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex flex-col gap-1.5 pr-4">
                                <div className="flex items-center gap-2">
                                  {s.pct >= 70 ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                                  )}
                                  <span className="text-sm font-medium text-foreground truncate">
                                    {s.skill}
                                  </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-secondary">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${s.pct}%` }}
                                    transition={{
                                      delay: 0.3 + i * 0.04,
                                      duration: 0.6,
                                      ease: "easeOut",
                                    }}
                                    className={`h-1.5 rounded-full ${
                                      s.pct >= 70 ? "bg-success" : "bg-destructive"
                                    }`}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    s.pct >= 70
                                      ? "bg-success/10 text-success"
                                      : "bg-destructive/10 text-destructive"
                                  }`}
                                >
                                  {s.pct}%
                                </span>
                                <span className="text-sm font-bold text-foreground tabular-nums">
                                  {s.correct}
                                  <span className="text-muted-foreground font-normal">
                                    /{s.total}
                                  </span>
                                </span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </Card>
                    </div>

                    {/* Answer Review */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-4 w-1 rounded-full bg-primary" />
                        <h3 className="font-display font-semibold text-foreground">
                          Answer Review
                        </h3>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {questions.length} questions
                        </span>
                      </div>
                      <div className="space-y-3">
                        {questions.map((q, i) => {
                          const userAns = answers[i];
                          const isCorrect = userAns === q.correct;
                          const isSkipped = userAns === null;
                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className={`rounded-xl border bg-card shadow-card overflow-hidden ${
                                isCorrect
                                  ? "border-success/30"
                                  : isSkipped
                                  ? "border-border"
                                  : "border-destructive/30"
                              }`}
                            >
                              <div className="flex items-start gap-3 px-4 pt-3 pb-2.5 border-b border-border/50">
                                <span
                                  className={`shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                    isCorrect
                                      ? "bg-success/10 text-success"
                                      : isSkipped
                                      ? "bg-muted text-muted-foreground"
                                      : "bg-destructive/10 text-destructive"
                                  }`}
                                >
                                  {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground leading-snug">
                                    {q.question}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold text-primary bg-secondary px-2 py-0.5 rounded">
                                      {q.skill}
                                    </span>
                                    {isCorrect ? (
                                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
                                        <CheckCircle2 className="h-3 w-3" /> Correct
                                      </span>
                                    ) : isSkipped ? (
                                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        — Skipped
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                                        <XCircle className="h-3 w-3" /> Wrong
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
                                <div
                                  className={`px-3 py-2.5 ${
                                    isSkipped
                                      ? "bg-muted/20"
                                      : isCorrect
                                      ? "bg-success/5"
                                      : "bg-destructive/5"
                                  }`}
                                >
                                  <p
                                    className={`text-xs font-semibold mb-1.5 ${
                                      isSkipped
                                        ? "text-muted-foreground"
                                        : isCorrect
                                        ? "text-success"
                                        : "text-destructive"
                                    }`}
                                  >
                                    {isSkipped
                                      ? "Not answered"
                                      : isCorrect
                                      ? "Your answer ✓"
                                      : "Your answer ✗"}
                                  </p>
                                  {isSkipped ? (
                                    <p className="text-xs text-muted-foreground italic">
                                      Skipped
                                    </p>
                                  ) : (
                                    <div className="flex items-start gap-2">
                                      <span
                                        className={`shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                                          isCorrect
                                            ? "bg-success/20 text-success"
                                            : "bg-destructive/20 text-destructive"
                                        }`}
                                      >
                                        {String.fromCharCode(65 + userAns!)}
                                      </span>
                                      <p className="text-xs text-foreground leading-relaxed">
                                        {q.options[userAns!]}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <div className="px-3 py-2.5 bg-success/5">
                                  <p className="text-xs font-semibold text-success mb-1.5">
                                    Correct answer
                                  </p>
                                  <div className="flex items-start gap-2">
                                    <span className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold bg-success/20 text-success">
                                      {String.fromCharCode(65 + q.correct)}
                                    </span>
                                    <p className="text-xs text-foreground leading-relaxed">
                                      {q.options[q.correct]}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── PDF export gate — pro/premium only ── */}
              {planLimits?.features.pdfExport && !planLimits.features.certificateDownload && (
                <div className="mb-6 rounded-xl border border-border bg-muted/30 p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Export your score report as PDF
                    </span>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={downloadPDF}>
                    <Download className="h-3.5 w-3.5" /> Export PDF
                  </Button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row mt-6">
                {planLimits?.features.certificateDownload ? (
                  <Button
                    variant="hero"
                    className="flex-1 gap-2"
                    onClick={downloadPDF}
                  >
                    <Download className="h-4 w-4" /> Download Certificate
                  </Button>
                ) : (
                  <Link to="/pricing" className="flex-1">
                    <Button variant="outline" className="w-full gap-2">
                      <Lock className="h-4 w-4" />
                      {subscription?.plan_type === "free" || subscription?.plan_type === "starter"
                        ? "Upgrade to Pro for Certificate"
                        : "Unlock Certificate"}
                    </Button>
                  </Link>
                )}
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => {
                    setPhase("input");
                    setJd("");
                  }}
                >
                  <RotateCcw className="h-4 w-4" /> Take Another Test
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}