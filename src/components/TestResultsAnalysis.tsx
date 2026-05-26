// ─────────────────────────────────────────────────────────────
//  TestResultsAnalysis.tsx
//  Standalone results + skill analysis UI for MapReducer Mock Test
// ─────────────────────────────────────────────────────────────

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Download, RotateCcw, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { type GeneratedQuestion } from "@/lib/gemini";

// ── Types ─────────────────────────────────────────────────────

interface SkillStat {
  skill: string;
  correct: number;
  total: number;
  pct: number;
}

interface PlanLimits {
  features: {
    skillBreakdown: boolean;
    certificateDownload: boolean;
  };
}

export interface TestResultsAnalysisProps {
  questions: GeneratedQuestion[];
  answers: (number | null)[];
  timeTaken: number;
  planLimits: PlanLimits | null;
  onDownloadCertificate: () => void;
  onRetakeTest: () => void;
}

// ── Helpers ───────────────────────────────────────────────────

function formatTimeTaken(s: number): string {
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function computeSkillBreakdown(
  questions: GeneratedQuestion[],
  answers: (number | null)[]
): SkillStat[] {
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
}

// ── Sub-components ────────────────────────────────────────────

function ScoreCircle({
  percentage,
  score,
  total,
}: {
  percentage: number;
  score: number;
  total: number;
}) {
  return (
    <Card className="shadow-elevated border-border mb-6">
      <CardContent className="p-8 text-center">
        <div className="inline-flex h-28 w-28 items-center justify-center rounded-full bg-secondary">
          <span className="font-display text-4xl font-bold text-primary">{percentage}%</span>
        </div>
        <p className="mt-3 text-lg font-medium text-foreground">
          {score} / {total} Correct
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
  );
}

function QuickStats({
  score,
  wrongCount,
  unanswered,
  timeTaken,
}: {
  score: number;
  wrongCount: number;
  unanswered: number;
  timeTaken: number;
}) {
  const stats = [
    { label: "Correct",    value: score,                    color: "text-success" },
    { label: "Wrong",      value: wrongCount,               color: "text-destructive" },
    { label: "Unanswered", value: unanswered,               color: "text-muted-foreground" },
    { label: "Time Taken", value: formatTimeTaken(timeTaken), color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border">
          <CardContent className="p-4 text-center">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SkillAreaBadges({
  strongAreas,
  weakAreas,
}: {
  strongAreas: string[];
  weakAreas: string[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-8">
      {/* Strong */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm font-semibold text-foreground">Strong Areas</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {strongAreas.length > 0 ? (
              strongAreas.map((s) => (
                <span key={s} className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">
                  {s}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">None identified</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weak */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold text-foreground">Weak Areas</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {weakAreas.length > 0 ? (
              weakAreas.map((s) => (
                <span
                  key={s}
                  className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full"
                >
                  {s}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">None identified</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SkillBreakdownTable({ breakdown }: { breakdown: SkillStat[] }) {
  return (
    <div className="sticky top-20">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-1 rounded-full bg-primary" />
        <h3 className="font-display font-semibold text-foreground">Skill Breakdown</h3>
        <span className="text-xs text-muted-foreground ml-auto">{breakdown.length} skills</span>
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
          {breakdown.map((s, i) => (
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
                  <span className="text-sm font-medium text-foreground truncate">{s.skill}</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.pct}%` }}
                    transition={{ delay: 0.3 + i * 0.04, duration: 0.6, ease: "easeOut" }}
                    className={`h-1.5 rounded-full ${s.pct >= 70 ? "bg-success" : "bg-destructive"}`}
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
                  <span className="text-muted-foreground font-normal">/{s.total}</span>
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AnswerReview({
  questions,
  answers,
}: {
  questions: GeneratedQuestion[];
  answers: (number | null)[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-1 rounded-full bg-primary" />
        <h3 className="font-display font-semibold text-foreground">Answer Review</h3>
        <span className="text-xs text-muted-foreground ml-auto">{questions.length} questions</span>
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
              {/* Question Header */}
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
                  <p className="text-sm font-medium text-foreground leading-snug">{q.question}</p>
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

              {/* Answer Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
                {/* User Answer */}
                <div
                  className={`px-3 py-2.5 ${
                    isSkipped ? "bg-muted/20" : isCorrect ? "bg-success/5" : "bg-destructive/5"
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
                    {isSkipped ? "Not answered" : isCorrect ? "Your answer ✓" : "Your answer ✗"}
                  </p>
                  {isSkipped ? (
                    <p className="text-xs text-muted-foreground italic">Skipped</p>
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

                {/* Correct Answer */}
                <div className="px-3 py-2.5 bg-success/5">
                  <p className="text-xs font-semibold text-success mb-1.5">Correct answer</p>
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
  );
}

// ── Main Export ───────────────────────────────────────────────

export default function TestResultsAnalysis({
  questions,
  answers,
  timeTaken,
  planLimits,
  onDownloadCertificate,
  onRetakeTest,
}: TestResultsAnalysisProps) {
  const score = answers.reduce(
    (acc, a, i) => acc + (a === questions[i]?.correct ? 1 : 0),
    0
  );
  const wrongCount = answers.reduce(
    (acc, a, i) => acc + (a !== null && a !== questions[i]?.correct ? 1 : 0),
    0
  );
  const unanswered = answers.filter((a) => a === null).length;
  const percentage = questions.length ? Math.round((score / questions.length) * 100) : 0;

  const breakdown = computeSkillBreakdown(questions, answers);
  const strongAreas = breakdown.filter((s) => s.pct >= 70).map((s) => s.skill);
  const weakAreas   = breakdown.filter((s) => s.pct  < 70).map((s) => s.skill);

  const canDownload    = !!planLimits?.features.certificateDownload;
  const canSeeBreakdown = !!planLimits?.features.skillBreakdown;

  return (
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
          Here's your detailed AI-powered score report
        </p>
      </div>

      {/* Score Circle */}
      <ScoreCircle percentage={percentage} score={score} total={questions.length} />

      {/* Quick Stats */}
      <QuickStats
        score={score}
        wrongCount={wrongCount}
        unanswered={unanswered}
        timeTaken={timeTaken}
      />

      {/* Skill Breakdown — locked for Free plan */}
      {!canSeeBreakdown ? (
        <Card className="border-border mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Lock className="h-8 w-8 text-primary mx-auto" />
              <p className="font-semibold text-foreground">
                Upgrade to unlock detailed skill analysis
              </p>
              <Link to="/pricing">
                <Button variant="hero" size="sm" className="gap-2">
                  <Crown className="h-4 w-4" /> Upgrade to Pro
                </Button>
              </Link>
            </div>
          </div>
          <CardContent className="p-8 blur-sm">
            <div className="h-40 bg-muted/50 rounded" />
          </CardContent>
        </Card>
      ) : (
        <>
          <SkillAreaBadges strongAreas={strongAreas} weakAreas={weakAreas} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mb-8">
            <SkillBreakdownTable breakdown={breakdown} />
            <AnswerReview questions={questions} answers={answers} />
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row mt-10">
        <Button
          variant={canDownload ? "hero" : "outline"}
          className="flex-1 gap-2"
          onClick={onDownloadCertificate}
          disabled={!canDownload}
        >
          {canDownload ? (
            <><Download className="h-4 w-4" /> Download Certificate</>
          ) : (
            <><Lock className="h-4 w-4" /> Upgrade to Download Certificate</>
          )}
        </Button>

        <Button variant="outline" className="flex-1 gap-2" onClick={onRetakeTest}>
          <RotateCcw className="h-4 w-4" /> Take Another Test
        </Button>
      </div>
    </motion.div>
  );
}