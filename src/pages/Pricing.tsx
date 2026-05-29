import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown, Zap, Rocket, Sparkles, FlameKindling } from "lucide-react";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Free",
    icon: Zap,
    price: 0,
    description: "Get started with basic mock tests",
    features: [
      { name: "Mock Tests/Month", value: "2" },
      { name: "AI Interviews/Month", value: "1" },
      { name: "History Retention", value: "7 days" },
      { name: "Dashboard", included: false },
      { name: "Full Score Report", included: false },
      { name: "Skill Breakdown", included: false },
      { name: "Progress Tracking", included: false },
      { name: "Weekly Activity Chart", included: false },
      { name: "Score Distribution", included: false },
      { name: "PDF Export", included: false },
      { name: "Certificate Download", included: false },
    ],
    cta: "Get Started",
    popular: false,
    note: "Always free",
    variant: "outline" as const,
  },
  {
    name: "Starter",
    icon: Sparkles,
    price: 99,
    description: "For students beginning placement prep",
    features: [
      { name: "Mock Tests/Month", value: "8" },
      { name: "AI Interviews/Month", value: "2" },
      { name: "History Retention", value: "30 days" },
      { name: "Full Score Report", included: true },
      { name: "Skill Breakdown", included: true },
      { name: "Dashboard", included: false },
      { name: "Progress Tracking", included: false },
      { name: "Weekly Activity Chart", included: false },
      { name: "Score Distribution", included: false },
      { name: "PDF Export", included: false },
      { name: "Certificate Download", included: false },
    ],
    cta: "Get Starter",
    popular: false,
    note: "Per month",
    variant: "default" as const,
  },
  {
    name: "Pro",
    icon: Crown,
    price: 199,
    description: "For serious placement preparation",
    features: [
      { name: "Mock Tests/Month", value: "20" },
      { name: "AI Interviews/Month", value: "5" },
      { name: "Dashboard", included: true },
      { name: "History Retention", value: "Forever" },
      { name: "Full Score Report", included: true },
      { name: "Skill Breakdown", included: true },
      { name: "Progress Tracking", included: true },
      { name: "Weekly Activity Chart", included: true },
      { name: "Score Distribution", included: true },
      { name: "PDF Export", included: true },
      { name: "Certificate Download", included: true },
    ],
    cta: "Upgrade to Pro",
    popular: true,
    note: "Per month",
    variant: "hero" as const,
  },
  {
    name: "Premium",
    icon: Rocket,
    price: 349,
    description: "Maximum preparation with all features",
    features: [
      { name: "Mock Tests/Month", value: "40" },
      { name: "AI Interviews/Month", value: "10" },
      { name: "Dashboard", included: true },
      { name: "History Retention", value: "Forever" },
      { name: "Full Score Report", included: true },
      { name: "Skill Breakdown", included: true },
      { name: "Progress Tracking", included: true },
      { name: "Weekly Activity Chart", included: true },
      { name: "Score Distribution", included: true },
      { name: "PDF Export", included: true },
      { name: "Certificate Download", included: true },
    ],
    cta: "Go Premium",
    popular: false,
    note: "Per month",
    variant: "default" as const,
  },
];

// All features for the comparison table (excluding Trial)
const comparisonPlans = plans.filter((p) => p.name !== "Trial");

const comparisonRows = [
  { label: "Mock Tests/Month", key: "Mock Tests/Month", isCount: true },
  { label: "AI Interviews/Month", key: "AI Interviews/Month", isCount: true },
  { label: "Full Score Report", key: "Full Score Report", isCount: false },
  { label: "Dashboard Access", key: "Dashboard", isCount: false },
  { label: "History Retention", key: "History Retention", isCount: true },
  { label: "Skill Breakdown", key: "Skill Breakdown", isCount: false },
  { label: "Progress Tracking", key: "Progress Tracking", isCount: false },
  { label: "Weekly Activity Chart", key: "Weekly Activity Chart", isCount: false },
  { label: "Score Distribution", key: "Score Distribution", isCount: false },
  { label: "PDF Export", key: "PDF Export", isCount: false },
  { label: "Certificate Download", key: "Certificate Download", isCount: false },
];

function getFeatureValue(plan: typeof plans[0], key: string) {
  const f = plan.features.find((feat) => feat.name === key);
  if (!f) return null;
  if ("value" in f) return f.value;
  if ("included" in f) return f.included;
  return null;
}

export default function Pricing() {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12">

        {/* ── Header ── */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Simple, transparent{" "}
            <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
              Pricing
            </span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Choose the plan that fits your placement preparation needs
          </p>
        </div>

        {/* ── Plan Cards ── */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card
                className={`relative h-full flex flex-col shadow-card border-border ${
                  plan.popular ? "ring-2 ring-primary" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-primary text-primary-foreground whitespace-nowrap">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                    <plan.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className="text-xs leading-snug">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  <div className="text-center mb-6">
                    <span className="text-4xl font-bold text-foreground">
                      ₹{plan.price}
                    </span>
                    <p className="text-muted-foreground text-xs mt-1">{plan.note}</p>
                  </div>

                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((f) => {
                      const hasValue = "value" in f;
                      const isIncluded = hasValue ? true : (f as { included: boolean }).included;
                      return (
                        <li key={f.name} className="flex items-start gap-2 text-xs">
                          {isIncluded ? (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          ) : (
                            <span className="h-3.5 w-3.5 shrink-0 mt-0.5 flex items-center justify-center text-muted-foreground/30 text-base leading-none">—</span>
                          )}
                          <span className={isIncluded ? "text-foreground" : "text-muted-foreground/50"}>
                            {hasValue
                              ? `${f.name}: ${"value" in f ? f.value : ""}`
                              : f.name}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <Link to={plan.name === "Free" ? "/signup" : `/checkout?plan=${plan.name.toLowerCase()}`}>
                    <Button variant={plan.variant} className="w-full" size="sm">
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}