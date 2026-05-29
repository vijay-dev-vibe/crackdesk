import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Get userId passed from ForgotPassword verification
  const userId = location.state?.userId;
  const validSession = !!userId;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    // Call ai-interview edge function with reset-password action
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-interview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: "reset-password",
          user_id: userId,
          new_password: password,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error || "Failed to reset password. Try again.");
    } else {
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden w-1/2 items-center justify-center gradient-primary lg:flex">
        <div className="max-w-md px-12 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10 backdrop-blur">
              <Logo className="h-10 w-10" />
            </div>
          </div>
          <h2 className="font-display text-3xl font-bold text-primary-foreground">New Password</h2>
          <p className="mt-4 text-primary-foreground/70">
            Choose a strong password to secure your MapReducer account.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <Logo className="h-6 w-6" />
            </div>
            <span className="font-display text-xl font-bold">MapReducer</span>
          </Link>

          {done ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground">Password updated!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your password has been changed successfully. Redirecting to login...
              </p>
              <Link to="/login">
                <Button variant="hero" className="mt-6 w-full">Go to Login</Button>
              </Link>
            </div>

          ) : !validSession ? (
            <div className="text-center">
              <h1 className="font-display text-2xl font-bold text-foreground">Invalid access</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Please verify your identity first before resetting your password.
              </p>
              <Link to="/forgot-password">
                <Button variant="hero" className="mt-6 w-full">Go to Forgot Password</Button>
              </Link>
            </div>

          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-foreground">Set new password</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your new password below.
              </p>

              {error && (
                <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                  {error}
                </div>
              )}

              <form className="mt-8 space-y-5" onSubmit={handleReset}>
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPass ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>

                <Button variant="hero" className="w-full" type="submit" disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}