// hooks/useRewardCode.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface RewardCode {
  code: string;
  redeemed: boolean;
  generated_at: string;
}

export function useRewardCode() {
  const [reward, setReward] = useState<RewardCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReward = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    console.log("DEBUG session user:", session?.user?.id); // TEMP DEBUG

    if (!session?.user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("performance_rewards")
      .select("code, redeemed, generated_at")
      .eq("user_id", session.user.id)
      .maybeSingle();

    console.log("DEBUG reward data:", data, "error:", error); // TEMP DEBUG

    setReward(data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReward();
  }, [fetchReward]);

  const redeem = useCallback(async () => {
    setError(null);
    setRedeeming(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setError("Not logged in.");
      setRedeeming(false);
      return false;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-interview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "redeem-reward-code",
            code: reward?.code,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to redeem code.");
        setRedeeming(false);
        return false;
      }

      await fetchReward(); // refresh — reward.redeemed will now be true
      setRedeeming(false);
      return true;
    } catch {
      setError("Something went wrong. Please try again.");
      setRedeeming(false);
      return false;
    }
  }, [reward, fetchReward]);

  return { reward, loading, redeeming, error, redeem };
}