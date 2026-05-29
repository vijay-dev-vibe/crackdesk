// pages/Checkout.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useReferralCode } from "@/hooks/useReferralCode";
import { useSubscription } from "@/hooks/useSubscription";
import { useTrialActivation, isTrialCode } from "@/hooks/useTrialActivation";
import { PLAN_LIMITS, type PlanType } from "@/lib/plans";
import {
  Check,
  Tag,
  Loader2,
  ShieldCheck,
  ChevronLeft,
  Crown,
  Zap,
  Rocket,
  Sparkles,
  FlameKindling,
  BadgePercent,
  X,
  MapPin,
  Clock,
} from "lucide-react";

// ── GST helpers ──────────────────────────────────────────────────────────────

const BUSINESS_STATE = "Tamil Nadu";

function calcGST(finalPrice: number, isSameState: boolean) {
  if (finalPrice === 0) return { base: 0, cgst: 0, sgst: 0, igst: 0 };
  const base = finalPrice / 1.18;
  const tax = finalPrice - base;
  if (isSameState) return { base, cgst: tax / 2, sgst: tax / 2, igst: 0 };
  return { base, cgst: 0, sgst: 0, igst: tax };
}

function fmt(n: number) {
  return n.toFixed(2);
}

// ── Indian states ─────────────────────────────────────────────────────────────

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

// ── Plan metadata ─────────────────────────────────────────────────────────────

const PLAN_ICONS: Record<string, React.ElementType> = {
  Free: Zap,
  Trial: FlameKindling,
  Starter: Sparkles,
  Pro: Crown,
  Premium: Rocket,
};

const PLAN_COLORS: Record<PlanType, string> = {
  free: "from-slate-400 to-slate-500",
  starter: "from-blue-400 to-blue-600",
  pro: "from-amber-400 to-yellow-500",
  premium: "from-purple-500 to-indigo-600",
};

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  premium: "Premium",
};

// ── Countdown timer helper ────────────────────────────────────────────────────

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updatePlan } = useSubscription();
  const { activateTrial } = useTrialActivation();

  const planKey = (searchParams.get("plan") ?? "pro") as PlanType;
  const plan = PLAN_LIMITS[planKey] ?? PLAN_LIMITS.pro;
  const PlanIcon = PLAN_ICONS[plan.name] ?? Crown;

  const [referralInput, setReferralInput] = useState("");
  const [applying, setApplying] = useState(false);
  const [selectedState, setSelectedState] = useState("");

  // Countdown state (only for NEWCODE trial)
  const [trialExpiresAt, setTrialExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState("");
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { status, result, error, validate, markUsed, reset } = useReferralCode();

  const isDiscounted = status === "valid";
  const isTrial = isDiscounted && isTrialCode(referralInput);
  const finalPrice = isDiscounted ? 0 : plan.price.monthly;

  const isSameState = selectedState === BUSINESS_STATE;
  const gst = calcGST(finalPrice, isSameState);

  useEffect(() => {
    if (planKey === "free") navigate("/pricing");
  }, [planKey, navigate]);

  // Countdown ticker
  useEffect(() => {
    if (!trialExpiresAt) return;
    countdownRef.current = setInterval(() => {
      const remaining = trialExpiresAt.getTime() - Date.now();
      setCountdown(formatCountdown(remaining));
      if (remaining <= 0) {
        clearInterval(countdownRef.current!);
        setCountdown("00:00:00");
      }
    }, 1000);
    return () => clearInterval(countdownRef.current!);
  }, [trialExpiresAt]);

  async function handleApplyCode() {
    await validate(referralInput);
  }

  async function handleConfirm() {
    setApplying(true);
    try {
      if (isDiscounted) {
        if (isTrial) {
          // ── NEWCODE: time-limited trial flow ──
          const expiresAt = await activateTrial(planKey);
          setTrialExpiresAt(expiresAt);
          toast({
            title: "⏱ Trial Activated!",
            description: `You now have ${PLAN_DISPLAY_NAMES[planKey]} access for 2 hours. It will revert to Free automatically.`,
          });
          navigate("/dashboard");
        } else {
          // ── Other codes: permanent access flow ──
          const targetPlan = result!.grants_plan as PlanType;
          await updatePlan(targetPlan);
          await markUsed(result!.code);
          toast({
            title: "🎉 Plan Activated!",
            description: `You now have full ${PLAN_DISPLAY_NAMES[targetPlan]} access — no payment needed.`,
          });
          navigate("/dashboard");
        }
      } else {
        toast({
          title: "Payment coming soon",
          description: "Payment integration is not yet enabled. Contact support.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">

        {/* Back */}
        <Link
          to="/pricing"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Pricing
        </Link>

        <div className="grid gap-8 md:grid-cols-[1fr_400px]">

          {/* ── Left ── */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Complete your order</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Have an internal access code? Apply it below to unlock the plan for free.
              </p>
            </div>

            {/* State Selection */}
            <Card className="border-border shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Your State / UT
                </CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                >
                  <option value="">Select your state for GST calculation</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                {selectedState && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {isSameState
                      ? "CGST + SGST applicable (intra-state supply)"
                      : "IGST applicable (inter-state supply)"}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Referral Code */}
            <Card className="border-border shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BadgePercent className="h-4 w-4 text-primary" />
                  Referral / Access Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code (e.g. ADMIN2024)"
                    value={referralInput}
                    onChange={(e) => {
                      setReferralInput(e.target.value.toUpperCase());
                      if (status !== "idle") reset();
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCode()}
                    disabled={status === "valid"}
                    className="font-mono tracking-widest uppercase"
                  />
                  {status === "valid" ? (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => { reset(); setReferralInput(""); }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleApplyCode}
                      disabled={status === "validating" || !referralInput}
                      variant="outline"
                    >
                      {status === "validating" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Tag className="h-4 w-4 mr-1" />
                      )}
                      Apply
                    </Button>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {status === "valid" && (
                    <motion.div
                      key="valid"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-1 text-sm font-medium bg-green-50 dark:bg-green-950/30 rounded-md px-3 py-2"
                    >
                      <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4 shrink-0" />
                        Code applied! 100% discount — ₹0 due today.
                      </span>

                      {/* NEWCODE: show 2hr trial notice */}
                      {isTrial ? (
                        <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-normal">
                          <Clock className="h-3 w-3 shrink-0" />
                          This is a 2-hour trial. Plan reverts to Free automatically after 2 hrs.
                        </span>
                      ) : (
                        <>
                          {result?.expiresAt && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-normal">
                              ⏱ This code expires at{" "}
                              {result.expiresAt.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              (2hr window started by first user)
                            </span>
                          )}
                          {!result?.expiresAt && (
                            <span className="text-xs text-muted-foreground font-normal">
                              ⏱ 2-hour window starts when you activate
                            </span>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}
                  {(status === "invalid" || status === "expired") && (
                    <motion.div
                      key="invalid"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Payment placeholder */}
            {!isDiscounted && (
              <Card className="border-border shadow-card opacity-60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-muted-foreground">
                    Payment — Coming Soon
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Payment integration will be available soon. Use an access code to proceed for now.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Confirm Button */}
            <Button
              className="w-full"
              size="lg"
              disabled={!isDiscounted || applying}
              onClick={handleConfirm}
              variant={isDiscounted ? "default" : "outline"}
            >
              {applying ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Activating…</>
              ) : isDiscounted ? (
                isTrial ? (
                  <><Clock className="h-4 w-4 mr-2" /> Start 2-Hour Trial — ₹0</>
                ) : (
                  <><ShieldCheck className="h-4 w-4 mr-2" /> Activate Plan — ₹0</>
                )
              ) : (
                "Apply a code to proceed"
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              By proceeding you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="space-y-4">
            <Card className="border-border shadow-card sticky top-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Plan Header */}
                <div className={`rounded-xl p-4 bg-gradient-to-br ${PLAN_COLORS[planKey]} text-white`}>
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-lg p-2">
                      <PlanIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg leading-none">{plan.name}</p>
                      <p className="text-white/70 text-xs mt-0.5">
                        {isTrial ? "2-hour trial" : plan.isOneTime ? "One-time" : "Monthly"}
                      </p>
                    </div>
                    {isDiscounted && (
                      <Badge className="ml-auto bg-white/20 text-white border-0 text-xs">
                        {isTrial ? "TRIAL" : "100% OFF"}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Trial banner with countdown */}
                <AnimatePresence>
                  {isTrial && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-sm text-amber-700 dark:text-amber-400"
                    >
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>
                        {countdown
                          ? <>Trial active — <span className="font-mono font-semibold">{countdown}</span> remaining</>
                          : "2-hour trial — reverts to Free after"}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Feature Highlights */}
                <ul className="space-y-2 text-sm">
                  {[
                    `${plan.maxMockTestsPerMonth} Mock Tests${plan.isOneTime ? "" : "/mo"}`,
                    `${plan.maxAIInterviewsPerMonth} AI Interview${plan.maxAIInterviewsPerMonth !== 1 ? "s" : ""}${plan.isOneTime ? "" : "/mo"}`,
                    plan.features.dashboard ? "Full Dashboard" : null,
                    plan.features.certificateDownload ? "Certificate Download" : null,
                    plan.features.progressTracking ? "Progress Tracking" : null,
                    plan.features.scoreReportPDF ? "PDF Score Reports" : null,
                  ]
                    .filter(Boolean)
                    .map((f) => (
                      <li key={f} className="flex items-center gap-2 text-foreground">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                </ul>

                {/* ── GST Breakdown ── */}
                <div className="border-t border-border pt-3 space-y-1.5 text-sm">

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{plan.name} Plan (excl. GST)</span>
                    <span className={isDiscounted ? "line-through text-muted-foreground" : ""}>
                      ₹{fmt(gst.base)}
                    </span>
                  </div>

                  <AnimatePresence>
                    {selectedState && (
                      <motion.div
                        key="gst-lines"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1.5 overflow-hidden"
                      >
                        {isSameState ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">CGST (9%)</span>
                              <span className={isDiscounted ? "text-muted-foreground" : ""}>
                                {isDiscounted ? "₹0.00" : `₹${fmt(gst.cgst)}`}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">SGST (9%)</span>
                              <span className={isDiscounted ? "text-muted-foreground" : ""}>
                                {isDiscounted ? "₹0.00" : `₹${fmt(gst.sgst)}`}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">IGST (18%)</span>
                            <span className={isDiscounted ? "text-muted-foreground" : ""}>
                              {isDiscounted ? "₹0.00" : `₹${fmt(gst.igst)}`}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Discount line */}
                  <AnimatePresence>
                    {isDiscounted && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex justify-between text-green-600 dark:text-green-400"
                      >
                        <span>{isTrial ? "Trial Discount" : "Referral Discount"}</span>
                        <span>−₹{plan.price.monthly}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!selectedState && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      Select your state to see tax breakdown
                    </p>
                  )}

                  <div className="flex justify-between font-bold text-foreground border-t border-border pt-2 mt-1">
                    <span>Total Due</span>
                    <span className="text-xl">₹{isDiscounted ? "0" : plan.price.monthly}</span>
                  </div>

                  {selectedState && (
                    <p className="text-xs text-muted-foreground text-right">
                      {isDiscounted
                        ? "No GST applicable on ₹0 transaction"
                        : `All prices inclusive of ${isSameState ? "CGST + SGST" : "IGST"} @ 18%`}
                    </p>
                  )}
                </div>

              </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure & encrypted
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}