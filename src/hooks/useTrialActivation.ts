// hooks/useTrialActivation.ts
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlanType } from "@/lib/plans";

export const TRIAL_CODE = "NEWCODE";
export const TRIAL_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

export function isTrialCode(code: string) {
  return code.trim().toUpperCase() === TRIAL_CODE;
}

// ── Plain async functions (no hooks) — safe to call anywhere ─────────────────

/**
 * Checks if the user has an expired NEWCODE trial and reverts them to free.
 * Plain function — safe to call inside useCallback without hook nesting.
 * Returns true if a revert happened.
 */
export async function checkAndRevertExpiredTrial(uid: string): Promise<boolean> {
  const now = new Date().toISOString();

  const { data: expiredTrial } = await supabase
    .from("trial_activations")
    .select("id, plan_type")
    .eq("user_id", uid)
    .eq("code", TRIAL_CODE)
    .eq("reverted", false)
    .lt("expires_at", now)
    .maybeSingle();

  if (!expiredTrial) return false;

  const { error: revertError } = await supabase
    .from("user_subscriptions")
    .upsert(
      {
        user_id: uid,
        plan_type: "free",
        tests_used_this_month: 0,
        month_start_date: new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        ).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (revertError) {
    console.error("Failed to revert trial:", revertError);
    return false;
  }

  await supabase
    .from("trial_activations")
    .update({ reverted: true })
    .eq("id", expiredTrial.id);

  return true;
}

// ── Hook — only for Checkout.tsx ─────────────────────────────────────────────

export function useTrialActivation() {
  /**
   * Activates a 2-hour trial for the given plan.
   * Inserts/upserts a row in trial_activations and upgrades user's plan.
   */
  const activateTrial = useCallback(async (planType: PlanType): Promise<Date> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("Not authenticated");

    const uid = session.user.id;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TRIAL_DURATION_MS);

    // Upsert: re-applying NEWCODE resets the 2hr window fresh
    const { error: insertError } = await supabase
      .from("trial_activations")
      .upsert(
        {
          user_id: uid,
          plan_type: planType,
          code: TRIAL_CODE,
          activated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          reverted: false,
        },
        { onConflict: "user_id,code" }
      );

    if (insertError) throw insertError;

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const { error: planError } = await supabase
      .from("user_subscriptions")
      .upsert(
        {
          user_id: uid,
          plan_type: planType,
          tests_used_this_month: 0,
          month_start_date: monthStart.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (planError) throw planError;

    return expiresAt;
  }, []);

  /**
   * Get active trial info for the current user (for countdown timer).
   * Returns null if no active trial.
   */
  const getActiveTrial = useCallback(async (): Promise<{
    expiresAt: Date;
    planType: PlanType;
  } | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const now = new Date().toISOString();

    const { data } = await supabase
      .from("trial_activations")
      .select("expires_at, plan_type")
      .eq("user_id", session.user.id)
      .eq("code", TRIAL_CODE)
      .eq("reverted", false)
      .gt("expires_at", now)
      .maybeSingle();

    if (!data) return null;

    return {
      expiresAt: new Date(data.expires_at),
      planType: data.plan_type as PlanType,
    };
  }, []);

  return { activateTrial, getActiveTrial };
}