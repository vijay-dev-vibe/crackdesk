import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { Crown, Zap, Rocket, Sparkles, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { PLAN_LIMITS } from "@/lib/plans";
import type { PlanType } from "@/lib/plans";

export default function AdminTestPanel() {
  const { subscription, loading, updatePlan, mockTestsRemaining, aiInterviewsRemaining, planLimits, mockTestsUsed, aiInterviewsUsed } = useSubscription();
  const [updating, setUpdating] = useState(false);

  const handlePlanChange = async (plan: PlanType) => {
    setUpdating(true);
    try {
      await updatePlan(plan);
      toast.success(`Successfully switched to ${PLAN_LIMITS[plan].displayName}!`);
    } catch (error) {
      toast.error("Failed to update plan");
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPlan = subscription?.plan_type || "free";

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            🧪 Test Admin Panel
          </h1>
          <p className="text-muted-foreground mb-8">
            Switch between plans to test all features and limits (For Development Only)
          </p>

          {/* Current Status Card */}
          {subscription && planLimits && (
            <Card className="mb-8 border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Plan Status</span>
                  <span className="text-sm font-normal px-3 py-1 rounded-full bg-primary/10 text-primary">
                    {PLAN_LIMITS[currentPlan].displayName}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Usage Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Plan Type</p>
                    <p className="font-bold capitalize">{currentPlan}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Mock Tests</p>
                    <p className="font-bold">
                      {mockTestsUsed} / {planLimits.maxMockTestsPerMonth === Infinity ? "∞" : planLimits.maxMockTestsPerMonth}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">AI Interviews</p>
                    <p className="font-bold">
                      {aiInterviewsUsed} / {planLimits.maxAIInterviewsPerMonth === Infinity ? "∞" : planLimits.maxAIInterviewsPerMonth}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Remaining Tests</p>
                    <p className="font-bold text-primary">
                      {mockTestsRemaining === 'unlimited' ? '∞' : mockTestsRemaining}
                    </p>
                  </div>
                </div>

                {/* Feature Access Grid */}
                <div>
                  <h3 className="font-semibold mb-3 text-sm">Feature Access</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: "Full Score Report", key: "fullScoreReport" },
                      { label: "Dashboard", key: "dashboard" },
                      { label: "History Access", key: "history" },
                      { label: "Skill Breakdown", key: "skillBreakdown" },
                      { label: "Progress Tracking", key: "progressTracking" },
                      { label: "Weekly Activity", key: "weeklyActivityChart" },
                      { label: "Score Distribution", key: "scoreDistribution" },
                      { label: "Certificate Download", key: "certificateDownload" },
                      { label: "PDF Export", key: "scoreReportPDF" },
                      { label: "Priority Generation", key: "priorityGeneration" },
                      { label: "Custom Templates", key: "customTemplates" },
                      { label: "Email Support", key: "emailSupport" },
                    ].map(({ label, key }) => {
                      const enabled = (planLimits.features as any)[key];
                      return (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          {enabled ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/40" />
                          )}
                          <span className={enabled ? "text-foreground" : "text-muted-foreground/50"}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">AI Quality</p>
                    <p className="font-medium capitalize">{planLimits.aiQuality}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Avatar Choices</p>
                    <p className="font-medium">
                      {planLimits.features.avatarChoices === Infinity ? "All" : planLimits.features.avatarChoices}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">History Retention</p>
                    <p className="font-medium">
                      {planLimits.features.historyRetentionDays === Infinity 
                        ? "Forever" 
                        : `${planLimits.features.historyRetentionDays} days`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Concurrent Tests</p>
                    <p className="font-medium">{planLimits.maxConcurrentTests}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan Switching Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { 
                plan: "free" as const, 
                name: "Free", 
                icon: Zap, 
                color: "border-gray-300",
                gradient: "from-gray-400 to-gray-600"
              },
              { 
                plan: "starter" as const, 
                name: "Starter", 
                icon: Sparkles, 
                color: "border-blue-500",
                gradient: "from-blue-400 to-blue-600"
              },
              { 
                plan: "pro" as const, 
                name: "Pro", 
                icon: Crown, 
                color: "border-purple-500",
                gradient: "from-purple-400 to-purple-600"
              },
              { 
                plan: "premium" as const, 
                name: "Premium", 
                icon: Rocket, 
                color: "border-yellow-500",
                gradient: "from-yellow-400 to-yellow-600"
              },
            ].map(({ plan, name, icon: Icon, color, gradient }) => {
              const limits = PLAN_LIMITS[plan];
              const isCurrent = currentPlan === plan;
              
              return (
                <Card 
                  key={plan} 
                  className={`${color} transition-all ${isCurrent ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"}`}
                >
                  <CardHeader className="text-center pb-3">
                    <div className={`h-12 w-12 mx-auto mb-2 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      ₹{limits.price.monthly}/mo
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Key Features */}
                    <div className="text-xs space-y-1 pb-3 border-b">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mock Tests:</span>
                        <span className="font-semibold">
                          {limits.maxMockTestsPerMonth === Infinity ? "∞" : limits.maxMockTestsPerMonth}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">AI Interviews:</span>
                        <span className="font-semibold">
                          {limits.maxAIInterviewsPerMonth === Infinity ? "∞" : limits.maxAIInterviewsPerMonth}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dashboard:</span>
                        <span className="font-semibold">
                          {limits.features.dashboard ? "✅" : "❌"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">History:</span>
                        <span className="font-semibold text-xs">
                          {limits.features.historyRetentionDays === Infinity 
                            ? "Forever" 
                            : `${limits.features.historyRetentionDays}d`}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      variant={isCurrent ? "hero" : "outline"}
                      className="w-full"
                      onClick={() => handlePlanChange(plan)}
                      disabled={updating || isCurrent}
                      size="sm"
                    >
                      {isCurrent ? "✓ Current Plan" : `Switch to ${name}`}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Feature Comparison Table */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Full Feature Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-semibold">Feature</th>
                      <th className="text-center py-3 px-2 font-semibold">Free</th>
                      <th className="text-center py-3 px-2 font-semibold">Starter</th>
                      <th className="text-center py-3 px-2 font-semibold">Pro</th>
                      <th className="text-center py-3 px-2 font-semibold">Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Mock Tests/Month", key: "maxMockTestsPerMonth", isLimit: true },
                      { label: "AI Interviews/Month", key: "maxAIInterviewsPerMonth", isLimit: true },
                      { label: "Full Score Report", key: "fullScoreReport" },
                      { label: "Dashboard Access", key: "dashboard" },
                      { label: "History Retention", key: "historyRetentionDays", isSpecial: true },
                      { label: "Skill Breakdown", key: "skillBreakdown" },
                      { label: "Progress Tracking", key: "progressTracking" },
                      { label: "Weekly Activity Chart", key: "weeklyActivityChart" },
                      { label: "Score Distribution", key: "scoreDistribution" },
                      { label: "PDF Export", key: "scoreReportPDF" },
                      { label: "Certificate Download", key: "certificateDownload" },
                      { label: "Priority Generation", key: "priorityGeneration" },
                      { label: "Custom Templates", key: "customTemplates" },
                      { label: "Email Support", key: "emailSupport" },
                      { label: "Chat Support", key: "chatSupport" },
                      { label: "Expert Review", key: "expertReview" },
                    ].map(({ label, key, isLimit, isSpecial }) => (
                      <tr key={key} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{label}</td>
                        {(["free", "starter", "pro", "premium"] as PlanType[]).map(plan => {
                          const limits = PLAN_LIMITS[plan];
                          let value;
                          
                          if (isLimit) {
                            value = (limits as any)[key];
                            value = value === Infinity ? "∞" : value;
                          } else if (isSpecial && key === "historyRetentionDays") {
                            value = limits.features.historyRetentionDays === Infinity ? "Forever" : `${limits.features.historyRetentionDays} days`;
                          } else {
                            const enabled = (limits.features as any)[key];
                            value = enabled ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
                          }
                          
                          return (
                            <td key={plan} className="py-3 px-2 text-center">
                              {typeof value === "string" || typeof value === "number" ? (
                                <span className="font-medium">{value}</span>
                              ) : (
                                value
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Warning Banner */}
          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>⚠️ Development Only:</strong> This panel is for testing all plan features before deployment. 
              In production, users will upgrade through Razorpay payment integration on the pricing page.
            </p>
          </div>

          {/* Testing Checklist */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Testing Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">□</span>
                  <span>Test Free tier: Try taking 3rd test (should be blocked)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">□</span>
                  <span>Test Free tier: Try accessing dashboard (should show locked screen)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">□</span>
                  <span>Test Starter tier: Verify dashboard is still locked</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">□</span>
                  <span>Test Starter tier: Check history shows last 30 days warning</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">□</span>
                  <span>Test Pro tier: Verify dashboard fully unlocked</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">□</span>
                  <span>Test Pro tier: Check unlimited history access</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">□</span>
                  <span>Test Premium tier: Verify all features enabled</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">□</span>
                  <span>Test usage limits reset properly on plan switch</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}