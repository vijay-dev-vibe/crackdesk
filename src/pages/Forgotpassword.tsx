import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [college, setCollege] = useState("");
  const [dob, setDob] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");
  const navigate = useNavigate();

  // Step 1 — Verify identity
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("id, email, college_name, date_of_birth")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (fetchError || !data) {
      setError("No account found with that email.");
      setLoading(false);
      return;
    }

    const dobMatch = data.date_of_birth === dob;
    const collegeMatch =
      data.college_name?.toLowerCase().trim() === college.toLowerCase().trim();

    if (!dobMatch || !collegeMatch) {
      setError("College name or date of birth does not match our records.");
      setLoading(false);
      return;
    }

    setUserId(data.id);
    setVerified(true);
    setLoading(false);
  };

  // Step 2 — Set new password via admin API (Supabase Edge Function)
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-interview/index.ts`, // Call the same function but it will route based on action
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: "reset-password", user_id: userId, new_password: newPassword }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to reset password.");
      } else {
        setDone(true);
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch {
      setError("Something went wrong. Please try again.");
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
          <h2 className="font-display text-3xl font-bold text-primary-foreground">Reset Password</h2>
          <p className="mt-4 text-primary-foreground/70">
            Verify your identity to set a new password.
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

          <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>

          {done ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h1 className="font-display text-2xl font-bold">Password Updated!</h1>
              <p className="mt-2 text-sm text-muted-foreground">Redirecting to login...</p>
              <Link to="/login">
                <Button variant="hero" className="mt-6 w-full">Go to Login</Button>
              </Link>
            </div>

          ) : !verified ? (
            <>
              <h1 className="font-display text-2xl font-bold text-foreground">Verify your identity</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your details to confirm it's you.
              </p>

              {error && (
                <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                  {error}
                </div>
              )}

              <form className="mt-8 space-y-5" onSubmit={handleVerify}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
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
                  <Label htmlFor="college">College Name</Label>
                  <Input
                    id="college"
                    placeholder="Anna University"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    required
                  />
                </div>
                <Button variant="hero" className="w-full" type="submit" disabled={loading}>
                  {loading ? "Verifying..." : "Verify Identity"}
                </Button>
              </form>
            </>

          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-foreground">Set new password</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Identity verified! Enter your new password.
              </p>

              {error && (
                <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                  {error}
                </div>
              )}

              <form className="mt-8 space-y-5" onSubmit={handleReset}>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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