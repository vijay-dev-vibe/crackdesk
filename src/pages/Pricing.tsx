import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Rocket, Sparkles, FlameKindling } from "lucide-react";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Free",
    icon: Zap,
    price: 0,
    description: "Get started with basic mock tests",
    features: [
      { name: "2 mock tests per month", included: true },
      { name: "1 AI interview session", included: true },
      { name: "Basic question generation", included: true },
      { name: "Score tracking", included: true },
      { name: "Full score report", included: false },
      { name: "Dashboard access", included: false },
      { name: "Skill breakdown analysis", included: false },
      { name: "Progress tracking", included: false },
    ],
    cta: "Get Started",
    popular: false,
    note: "Always free",
    variant: "outline" as const,
  },
    {
    name: "Trial",
    icon: FlameKindling,
    price: 19,
    description: "Try it out with 2 mock tests, no commitment",
    features: [
      { name: "2 mock tests (one-time)", included: true },
      { name: "Basic question generation", included: true },
      { name: "Score tracking", included: true },
      { name: "AI interview session", included: false },
      { name: "Full score report", included: false },
      { name: "Dashboard access", included: false },
      { name: "Skill breakdown analysis", included: false },
      { name: "Progress tracking", included: false },
    ],
    cta: "Try for ₹19",
    popular: false,
    note: "One-time payment",
    variant: "default" as const,
  },
  {
    name: "Starter",
    icon: Sparkles,
    price: 199,
    description: "For students beginning placement prep",
    features: [
      { name: "10 mock tests per month", included: true },
      { name: "2 AI interview sessions", included: true },
      { name: "Advanced AI question generation", included: true },
      { name: "Score tracking", included: true },
      { name: "Full score report", included: true },
      { name: "Dashboard access", included: false },
      { name: "Skill breakdown analysis", included: false },
      { name: "Progress tracking", included: false },
    ],
    cta: "Get Starter",
    popular: false,
    note: "Per month",
    variant: "default" as const,
  },
  {
    name: "Pro",
    icon: Crown,
    price: 499,
    description: "For serious placement preparation",
    features: [
      { name: "Unlimited mock tests", included: true },
      { name: "5 AI interview sessions/month", included: true },
      { name: "Advanced AI question generation", included: true },
      { name: "Score tracking", included: true },
      { name: "Full score report", included: true },
      { name: "Dashboard access", included: true },
      { name: "Skill breakdown analysis", included: true },
      { name: "Progress tracking", included: true },
    ],
    cta: "Upgrade to Pro",
    popular: true,
    note: "Per month",
    variant: "hero" as const,
  },
  {
    name: "Premium",
    icon: Rocket,
    price: 999,
    description: "Maximum preparation with all features",
    features: [
      { name: "Unlimited mock tests", included: true },
      { name: "Unlimited AI interviews", included: true },
      { name: "Advanced AI question generation", included: true },
      { name: "Score tracking", included: true },
      { name: "Full score report", included: true },
      { name: "Dashboard access", included: true },
      { name: "Skill breakdown analysis", included: true },
      { name: "Progress tracking", included: true },
    ],
    cta: "Go Premium",
    popular: false,
    note: "Per month",
    variant: "default" as const,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12">

        {/* ── Header ── */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h5 className="font-display text-10xl font-bold text-foreground md:text-4xl">
            Simple, transparent <span className="bg-gradient-to-r text-10xl from-yellow-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
                  Pricing
            </span>  
          </h5>
          <p className="mt-3 text-muted-foreground">
            Choose the plan that fits your placement preparation needs
          </p>
        </div>

        {/* ── Plan Cards ── */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 max-w-7xl mx-auto">
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
                    {plan.features.map((f) => (
                      <li key={f.name} className="flex items-start gap-2 text-xs">
                        {f.included ? (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        ) : (
                          <span className="h-3.5 w-3.5 shrink-0 mt-0.5 flex items-center justify-center text-muted-foreground/30 text-base leading-none">—</span>
                        )}
                        <span className={f.included ? "text-foreground" : "text-muted-foreground/50"}>
                          {f.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link to="/signup">
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