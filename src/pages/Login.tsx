import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ACCOUNTS — Add / remove company admins here only.
// Regular users NEVER appear here. They log in via Supabase below.
// ─────────────────────────────────────────────────────────────────────────────
export default function Login() {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = (location.state as any)?.from?.pathname || "/dashboard";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ── 2. Regular user login via Supabase ───────────────────────────────
      const { error: authError } = await supabase.auth.signInWithPassword({
        email:    email.trim(),
        password: password,
      });

      if (authError) {
        // Give friendly messages instead of raw Supabase errors
        const msg = authError.message?.toLowerCase() ?? "";
        if (msg.includes("invalid login") || msg.includes("invalid credentials") || msg.includes("wrong password")) {
          setError("❌ Wrong email or password. Please check and try again.");
        } else if (msg.includes("email not confirmed")) {
          setError("📧 Please verify your email first. Check your inbox for a confirmation link.");
        } else if (msg.includes("too many requests")) {
          setError("⏳ Too many attempts. Please wait a few minutes and try again.");
        } else if (msg.includes("user not found") || msg.includes("no user")) {
          setError("🔍 No account found with this email. Did you sign up yet?");
        } else {
          setError(authError.message || "Something went wrong. Please try again.");
        }
        setLoading(false);
        return;
      }
      
      // Check if this user is an admin, and route them accordingly
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile?.is_admin) {
          navigate("/admin/dashboard", { replace: true });
          setLoading(false);
          return;
        }
      }

      // Regular user — send to their dashboard
      navigate(from, { replace: true });

      // Regular user — send to their dashboard
      navigate(from, { replace: true });

    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — shown only on large screens */}
      <div className="hidden w-1/2 items-center justify-center gradient-primary lg:flex">
        <div className="max-w-md px-12 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10 backdrop-blur">
              <span className="font-display text-3xl font-bold text-primary-foreground">A</span>
            </div>
          </div>
          <h2 className="font-display text-3xl font-bold text-primary-foreground">
            Welcome Back!
          </h2>
          <p className="mt-4 text-primary-foreground/70">
            Continue your journey to acing your dream placement with AI-powered mock tests.
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <span className="font-display text-lg font-bold text-primary-foreground">A</span>
            </div>
            <span className="font-display text-xl font-bold">MapReducer</span>
          </Link>

          <h1 className="font-display text-2xl font-bold text-foreground">
            Log in to your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your credentials to continue
          </p>

          {/* Error message */}
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
              {error}
            </div>
          )}

          {/* Form */}
          <form className="mt-8 space-y-5" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye    className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              variant="hero"
              className="w-full"
              type="submit"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log In"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-semibold text-primary hover:underline"
            >
              Sign up
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}