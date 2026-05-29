// hooks/useSubscription.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PLAN_LIMITS,
  getRemainingTests,
  getRemainingInterviews,
  type PlanType,
} from "@/lib/plans";
import { checkAndRevertExpiredTrial } from "./useTrialActivation";

export function useSubscription() {
  const [subscription, setSubscription] = useState<{
    plan_type: PlanType;
  } | null>(null);
  const [mockTestsUsed, setMockTestsUsed] = useState(0);
  const [aiInterviewsUsed, setAiInterviewsUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      setLoading(false);
      return;
    }
    const uid = session.user.id;

    // ── Check & revert expired NEWCODE trial first ──
    const reverted = await checkAndRevertExpiredTrial(uid);

    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("plan_type")
      .eq("user_id", uid)
      .maybeSingle();

    const plan = reverted
      ? "free"
      : ((sub?.plan_type ?? "free") as PlanType);

    const limits = PLAN_LIMITS[plan];

    let mockUsed = 0, aiUsed = 0;

    if (limits.isOneTime) {
      const { count: mc } = await supabase
        .from("test_results")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid);
      const { count: ac } = await supabase
        .from("interview_results")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid);
      mockUsed = mc ?? 0;
      aiUsed = ac ?? 0;
    } else {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const iso = monthStart.toISOString();

      const { count: mc } = await supabase
        .from("test_results")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .gte("created_at", iso);
      const { count: ac } = await supabase
        .from("interview_results")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .gte("created_at", iso);
      mockUsed = mc ?? 0;
      aiUsed = ac ?? 0;
    }

    setSubscription({ plan_type: plan });
    setMockTestsUsed(mockUsed);
    setAiInterviewsUsed(aiUsed);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const planLimits = subscription ? PLAN_LIMITS[subscription.plan_type] : null;

  const canGenerateMockTest = useCallback(() => {
    if (!planLimits) return false;
    return mockTestsUsed < planLimits.maxMockTestsPerMonth;
  }, [planLimits, mockTestsUsed]);

  const canStartAIInterview = useCallback(() => {
    if (!planLimits) return false;
    return aiInterviewsUsed < planLimits.maxAIInterviewsPerMonth;
  }, [planLimits, aiInterviewsUsed]);

  const incrementMockTestUsage = useCallback(() => {
    setMockTestsUsed((p) => p + 1);
  }, []);

  const incrementAIInterviewUsage = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await supabase
      .from("interview_results")
      .insert({ user_id: session.user.id });

    if (error) {
      console.error("Failed to increment AI interview usage:", error);
      return;
    }

    await fetchUsage();
  }, [fetchUsage]);

  const mockTestsRemaining = planLimits
    ? getRemainingTests(subscription!.plan_type, mockTestsUsed)
    : 0;

  const aiInterviewsRemaining = planLimits
    ? getRemainingInterviews(subscription!.plan_type, aiInterviewsUsed)
    : 0;

  const updatePlan = useCallback(
    async (newPlan: PlanType) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const { error } = await supabase
        .from("user_subscriptions")
        .upsert(
          {
            user_id: session.user.id,
            plan_type: newPlan,
            tests_used_this_month: 0,
            month_start_date: monthStart.toISOString(),
            updated_at: now.toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("Upsert error:", error);
        throw error;
      }

      await fetchUsage();
    },
    [fetchUsage]
  );

  return {
    subscription,
    loading,
    planLimits,
    canGenerateMockTest,
    canStartAIInterview,
    incrementMockTestUsage,
    incrementAIInterviewUsage,
    mockTestsRemaining,
    aiInterviewsRemaining,
    mockTestsUsed,
    aiInterviewsUsed,
    updatePlan,
    refetch: fetchUsage,
  };
}