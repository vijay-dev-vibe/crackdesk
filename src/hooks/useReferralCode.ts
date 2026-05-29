// hooks/useReferralCode.ts
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlanType } from "@/lib/plans";

export type ReferralStatus = "idle" | "validating" | "valid" | "invalid" | "expired";

export interface ReferralResult {
  code: string;
  grants_plan: PlanType;
  description: string;
  first_used_at: string | null;
  expiresAt: Date | null; // computed — when the 2hr window closes
}

export function useReferralCode() {
  const [status, setStatus] = useState<ReferralStatus>("idle");
  const [result, setResult] = useState<ReferralResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(async (code: string) => {
    if (!code.trim()) {
      setError("Please enter a referral code.");
      return false;
    }

    setStatus("validating");
    setError(null);
    setResult(null);

    const { data, error: dbError } = await supabase
      .from("referral_codes")
      .select("code, grants_plan, description, first_used_at, is_active")
      .eq("code", code.trim().toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (dbError || !data) {
      setStatus("invalid");
      setError("Invalid or inactive referral code.");
      return false;
    }

    // Check 2hr expiry window
    if (data.first_used_at) {
      const firstUsed = new Date(data.first_used_at);
      const expiresAt = new Date(firstUsed.getTime() + 2 * 60 * 60 * 1000);
      if (new Date() > expiresAt) {
        setStatus("expired");
        setError("This code has expired. The 2-hour access window has closed.");
        return false;
      }

      // Still within window
      setResult({
        ...data,
        grants_plan: data.grants_plan as PlanType,
        expiresAt,
      });
      setStatus("valid");
      return true;
    }

    // Code never used before — valid, window not yet started
    setResult({
      ...data,
      grants_plan: data.grants_plan as PlanType,
      expiresAt: null, // will be set on first redemption
    });
    setStatus("valid");
    return true;
  }, []);

const markUsed = useCallback(async (code: string) => {
  // NEWCODE handles its own timer via trial_activations — skip stamping here
  if (code.toUpperCase() === "NEWCODE") return;

  const { data } = await supabase
    .from("referral_codes")
    .select("first_used_at")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (!data?.first_used_at) {
    await supabase
      .from("referral_codes")
      .update({ first_used_at: new Date().toISOString() })
      .eq("code", code.toUpperCase());
  }
}, []);
  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, validate, markUsed, reset };
}