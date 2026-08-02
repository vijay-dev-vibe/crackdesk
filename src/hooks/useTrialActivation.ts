// hooks/useTrialActivation.ts
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlanType } from "@/lib/plans";

export const TRIAL_CODE = "NEWCODE";
export const TRIAL_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

export function isTrialCode(code: string) {
  return code.trim().toUpperCase() === TRIAL_CODE;
}

async function callEdgeFunction(action: string, extra: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-interview`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, ...extra }),
    }
  );

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed");
  return result;
}

/**
 * Redeems any referral code (NEWCODE trial or a permanent code) via the
 * server. Replaces direct client writes to user_subscriptions, which are
 * now blocked at the database level.
 */
export async function redeemReferralCode(code: string): Promise<{ expires_at?: string }> {
  return callEdgeFunction("redeem-referral-code", { code });
}

/**
 * Checks if the user has an expired NEWCODE trial and reverts them to free.
 * Now goes through the server (service role) since plan_type writes are
 * blocked for regular client calls.
 * Returns true if a revert happened.
 */
export async function checkAndRevertExpiredTrial(_uid: string): Promise<boolean> {
  try {
    const result = await callEdgeFunction("revert-expired-trial");
    return !!result.reverted;
  } catch (err) {
    console.error("Failed to check/revert trial:", err);
    return false;
  }
}

// ── Hook — only for Checkout.tsx ─────────────────────────────────────────────

export function useTrialActivation() {
  /**
   * Activates a 2-hour trial for NEWCODE. Kept for API compatibility with
   * existing Checkout.tsx callers — internally now calls the server action.
   */
  const activateTrial = useCallback(async (_planType: PlanType): Promise<Date> => {
    const result = await redeemReferralCode(TRIAL_CODE);
    if (!result.expires_at) throw new Error("No expiry returned from server");
    return new Date(result.expires_at);
  }, []);

  /**
   * Get active trial info for the current user (for countdown timer).
   * Still a plain read — RLS allows a user to read their own row, so this
   * stays as a direct client query.
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