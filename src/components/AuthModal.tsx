import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultTab?: "login" | "signup";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuthModal({ open, onClose, onSuccess, defaultTab = "login" }: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "signup">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
      setName("");
      setError("");
      setLoading(false);
      setTab(defaultTab);
    }
  }, [open, defaultTab]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // ── Login ──────────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      const msg = authError.message?.toLowerCase() ?? "";
      if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
        setError("Wrong email or password. Please try again.");
      } else if (msg.includes("email not confirmed")) {
        setError("Please verify your email first. Check your inbox.");
      } else if (msg.includes("too many requests")) {
        setError("Too many attempts. Please wait a few minutes.");
      } else {
        setError(authError.message || "Something went wrong. Please try again.");
      }
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();
    onClose();
  };

  // ── Signup ─────────────────────────────────────────────────────────────────

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } },
    });

    if (authError) {
      setError(authError.message || "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();
    onClose();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl overflow-hidden">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-0">
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
            <span className="font-bold text-lg text-primary-foreground">M</span>
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold text-foreground">
            {tab === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "login"
              ? "Log in to access all MapReducer features."
              : "Sign up free and start practising today."}
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex border-b border-border mx-8">
          {(["login", "signup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              className={`pb-2 px-1 mr-6 text-sm font-semibold border-b-2 transition-colors ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "login" ? "Log In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="px-8 py-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={tab === "login" ? handleLogin : handleSignup} className="space-y-4">
            {tab === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="modal-name">Full Name</Label>
                <Input
                  id="modal-name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="modal-email">Email</Label>
              <Input
                id="modal-email"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="modal-password">Password</Label>
              <div className="relative">
                <Input
                  id="modal-password"
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
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {tab === "login" && (
              <div className="text-right">
                <a href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
            )}

            <Button
              variant="hero"
              className="w-full mt-2"
              type="submit"
              disabled={loading}
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : tab === "login" ? "Log In" : "Create Account"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {tab === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setTab(tab === "login" ? "signup" : "login"); setError(""); }}
              className="font-semibold text-primary hover:underline"
            >
              {tab === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}