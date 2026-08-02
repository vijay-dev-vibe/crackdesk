import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // ── Reset Password action ─────────────────────────────────────────
    // SECURITY: identity (email + college + dob) is re-verified HERE,
    // server-side, using the service role — never trust a bare user_id
    // or a "verified" flag coming from the client.
    if (body.action === "reset-password") {
      const { email, college_name, dob, new_password } = body;

      if (!email || !college_name || !dob || !new_password) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new_password.length < 6) {
        return new Response(JSON.stringify({ error: "Password must be at least 6 characters." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, college_name, date_of_birth")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      // Generic error message on purpose — don't reveal whether the
      // email exists or which specific field was wrong.
      const genericError = () =>
        new Response(JSON.stringify({ error: "Verification failed. Check your details." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      if (!profile) return genericError();

      const dobMatch = profile.date_of_birth === dob;
      const collegeMatch =
        profile.college_name?.toLowerCase().trim() === college_name.toLowerCase().trim();

      if (!dobMatch || !collegeMatch) return genericError();

      // Only now — after server-side verification — update the password
      const { error } = await supabase.auth.admin.updateUserById(profile.id, {
        password: new_password,
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Redeem Reward Code action ───────────────────────────────────────
    // Awarded automatically (DB trigger) when a user scores >=80% on a
    // mock test. This action is the ONLY way plan_type can become "pro"
    // via this path — it always runs server-side with the service role.
// ── Redeem Referral Code action ─────────────────────────────────────
    // Handles both NEWCODE (2-hour trial) and permanent referral codes.
    // Replaces client-side plan_type writes, which are now DB-blocked.
    if (body.action === "redeem-referral-code") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { code } = body;
      if (!code) {
        return new Response(JSON.stringify({ error: "Missing code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const normalizedCode = code.trim().toUpperCase();

      const { data: refCode } = await admin
        .from("referral_codes")
        .select("code, grants_plan, first_used_at, is_active")
        .eq("code", normalizedCode)
        .eq("is_active", true)
        .maybeSingle();

      if (!refCode) {
        return new Response(JSON.stringify({ error: "Invalid or inactive referral code." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date();
      const isNewCode = normalizedCode === "NEWCODE";

      // 2-hour expiry window check (same rule for all codes, matches existing logic)
      if (refCode.first_used_at && !isNewCode) {
        const firstUsed = new Date(refCode.first_used_at);
        const expiresWindow = new Date(firstUsed.getTime() + 2 * 60 * 60 * 1000);
        if (now > expiresWindow) {
          return new Response(JSON.stringify({ error: "This code has expired." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const planType = refCode.grants_plan;

      if (isNewCode) {
        // 2-hour trial — re-applying resets the window fresh
        const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        const { error: trialError } = await admin
          .from("trial_activations")
          .upsert(
            {
              user_id: user.id,
              plan_type: planType,
              code: "NEWCODE",
              activated_at: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              reverted: false,
            },
            { onConflict: "user_id,code" }
          );
        if (trialError) {
          return new Response(JSON.stringify({ error: trialError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: planError } = await admin
          .from("user_subscriptions")
          .upsert(
            {
              user_id: user.id,
              plan_type: planType,
              tests_used_this_month: 0,
              month_start_date: now.toISOString(),
              updated_at: now.toISOString(),
            },
            { onConflict: "user_id" }
          );
        if (planError) {
          return new Response(JSON.stringify({ error: planError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ success: true, expires_at: expiresAt.toISOString() }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Regular permanent referral code
      const { error: planError } = await admin
        .from("user_subscriptions")
        .upsert(
          {
            user_id: user.id,
            plan_type: planType,
            tests_used_this_month: 0,
            month_start_date: now.toISOString(),
            updated_at: now.toISOString(),
          },
          { onConflict: "user_id" }
        );
      if (planError) {
        return new Response(JSON.stringify({ error: planError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!refCode.first_used_at) {
        await admin
          .from("referral_codes")
          .update({ first_used_at: now.toISOString() })
          .eq("code", normalizedCode);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Revert Expired Trial action ──────────────────────────────────────
    // Called on page load to auto-downgrade a user whose 2-hour trial ended.
    if (body.action === "revert-expired-trial") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const now = new Date().toISOString();

      const { data: expiredTrial } = await admin
        .from("trial_activations")
        .select("id")
        .eq("user_id", user.id)
        .eq("code", "NEWCODE")
        .eq("reverted", false)
        .lt("expires_at", now)
        .maybeSingle();

      if (!expiredTrial) {
        return new Response(JSON.stringify({ reverted: false }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await admin
        .from("user_subscriptions")
        .upsert(
          {
            user_id: user.id,
            plan_type: "free",
            tests_used_this_month: 0,
            month_start_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      await admin
        .from("trial_activations")
        .update({ reverted: true })
        .eq("id", expiredTrial.id);

      return new Response(JSON.stringify({ reverted: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Delete User action ────────────────────────────────────────────
    if (body.action === "delete-user") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify the caller's identity using their JWT
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use service role to delete the auth user
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── AI Interview action (existing) ────────────────────────────────
    const { action, systemPrompt, userMessage, maxTokens } = body;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: maxTokens || 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      return new Response(JSON.stringify({ error: `AI API error: ${response.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});