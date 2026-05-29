import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  GraduationCap, Crown, Award, BookOpen,
  TrendingUp, Calendar, Pencil, X, Save, Loader2, Camera,
  KeyRound, Trash2, AlertTriangle, Eye, EyeOff, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getDepartmentMeta } from "@/lib/studentQuestions";
import { toast } from "sonner";
import AvatarPicker, { AvatarImg } from "../components/AvatarPicker";

interface ProfileData {
  full_name:    string;
  email:        string;
  college_name: string;
  departments:  string[];
  plan_type:    string;
  created_at:   string;
  avatar_key:   string | null;
  avatar_url:   string | null;
}

interface Stats {
  testsTaken: number;
  avgScore:   number;
  bestScore:  number;
}

const PLAN_DISPLAY: Record<string, { label: string; color: string }> = {
  free:     { label: "Free",    color: "bg-muted text-muted-foreground" },
  trial:    { label: "Trial",   color: "bg-orange-100 text-orange-700 border-orange-200" },
  starter:  { label: "Starter", color: "bg-blue-100 text-blue-700 border-blue-200" },
  pro:      { label: "Pro",     color: "bg-purple-100 text-purple-700 border-purple-200" },
  premium:  { label: "Premium", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
};

export default function Profile() {
  const [profile,         setProfile]         = useState<ProfileData | null>(null);
  const [stats,           setStats]           = useState<Stats>({ testsTaken:0, avgScore:0, bestScore:0 });
  const [editing,         setEditing]         = useState(false);
  const [editName,        setEditName]        = useState("");
  const [editCollege,     setEditCollege]     = useState("");
  const [saving,          setSaving]          = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [showPicker,      setShowPicker]      = useState(false);
  const [avatarKey,       setAvatarKey]       = useState<string | null>(null);
  const [userId,          setUserId]          = useState<string>("");

  // ── Change Password modal ────────────────────────────────────────────────
  const [showCPModal,     setShowCPModal]     = useState(false);
  // step: "verify" | "reset"
  const [cpStep,          setCpStep]          = useState<"verify"|"reset">("verify");
  const [cpEmail,         setCpEmail]         = useState("");
  const [cpDob,           setCpDob]           = useState("");
  const [cpCollege,       setCpCollege]       = useState("");
  const [cpNewPassword,   setCpNewPassword]   = useState("");
  const [cpConfirmPass,   setCpConfirmPass]   = useState("");
  const [cpShowNew,       setCpShowNew]       = useState(false);
  const [cpShowConfirm,   setCpShowConfirm]   = useState(false);
  const [cpError,         setCpError]         = useState("");
  const [cpVerifying,     setCpVerifying]     = useState(false);
  const [cpSaving,        setCpSaving]        = useState(false);

  // ── Delete Account modal ─────────────────────────────────────────────────
  const [showDAModal,     setShowDAModal]     = useState(false);
  const [deleteInput,     setDeleteInput]     = useState("");
  const [deleting,        setDeleting]        = useState(false);
  const [deleteError,     setDeleteError]     = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;
      setUserId(uid);

      const { data: prof } = await (supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle() as any);

      const { data: sub } = await (supabase
        .from("user_subscriptions")
        .select("plan_type")
        .eq("user_id", uid)
        .maybeSingle() as any);

      const realPlanType = sub?.plan_type || prof?.plan_type || "free";

      if (prof) {
        const fullName =
          prof.full_name ||
          session.user.user_metadata?.full_name ||
          session.user.email?.split("@")[0] || "";

        const p: ProfileData = {
          full_name:    fullName,
          email:        prof.email        || session.user.email || "",
          college_name: prof.college_name || "",
          departments:  prof.departments  || [],
          plan_type:    realPlanType,
          created_at:   prof.created_at,
          avatar_key:   prof.avatar_key   || null,
          avatar_url:   prof.avatar_url   || null,
        };
        setProfile(p);
        setEditName(p.full_name);
        setEditCollege(p.college_name);
        setAvatarKey(prof.avatar_key || "adventurer:luna");
      } else {
        const fullName =
          session.user.user_metadata?.full_name ||
          session.user.email?.split("@")[0] || "";
        setProfile({
          full_name:    fullName,
          email:        session.user.email || "",
          college_name: "",
          departments:  [],
          plan_type:    realPlanType,
          created_at:   session.user.created_at,
          avatar_key:   null,
          avatar_url:   null,
        });
        setEditName(fullName);
        setAvatarKey("adventurer:luna");
      }

      const { data: results } = await (supabase
        .from("test_results")
        .select("score, total_questions")
        .eq("user_id", uid) as any);

      if (results && results.length > 0) {
        const scores = results.map((r: any) =>
          Math.round((r.score / r.total_questions) * 100));
        setStats({
          testsTaken: results.length,
          avgScore:   Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length),
          bestScore:  Math.max(...scores),
        });
      }

      setLoading(false);
    };
    load();
  }, []);

  /* ── Save avatar ─────────────────────────────────────────────────────────── */
  const handleAvatarSelect = (key: string, url: string) => {
    setAvatarKey(key);
    setProfile(p => p ? { ...p, avatar_key: key, avatar_url: url } : p);
    toast.success("Avatar updated!");
    window.dispatchEvent(new CustomEvent("avatar-updated"));
  };

  /* ── Save name/college ───────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await (supabase
      .from("profiles")
      .update({ full_name: editName, college_name: editCollege })
      .eq("id", session.user.id) as any);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      setProfile(p => p ? { ...p, full_name: editName, college_name: editCollege } : p);
      setEditing(false);
      toast.success("Profile updated!");
    }
    setSaving(false);
  };

  /* ── Open Change Password modal ─────────────────────────────────────────── */
  const openCPModal = () => {
    setCpStep("verify");
    setCpEmail("");
    setCpDob("");
    setCpCollege("");
    setCpNewPassword("");
    setCpConfirmPass("");
    setCpError("");
    setShowCPModal(true);
  };

  /* ── Step 1: Verify identity against DB ─────────────────────────────────── */
  const handleVerifyIdentity = async () => {
    setCpError("");
    if (!cpEmail || !cpDob || !cpCollege) {
      setCpError("Please fill in all fields.");
      return;
    }
    setCpVerifying(true);

    // Fetch the profile row matching the entered email
    const { data: prof, error } = await (supabase
      .from("profiles")
      .select("email, college_name, date_of_birth")
      .eq("email", cpEmail.trim().toLowerCase())
      .maybeSingle() as any);

    setCpVerifying(false);

    if (error || !prof) {
      setCpError("No account found with that email.");
      return;
    }

    const dobMatch     = prof.date_of_birth === cpDob;           // "YYYY-MM-DD"
    const collegeMatch = prof.college_name?.trim().toLowerCase() === cpCollege.trim().toLowerCase();

    if (!dobMatch || !collegeMatch) {
      setCpError("Details do not match our records. Please check and try again.");
      return;
    }

    // All matched — proceed to reset step
    setCpStep("reset");
  };

  /* ── Step 2: Save new password ───────────────────────────────────────────── */
  const handleResetPassword = async () => {
    setCpError("");
    if (!cpNewPassword || !cpConfirmPass) {
      setCpError("Please fill in both password fields.");
      return;
    }
    if (cpNewPassword.length < 6) {
      setCpError("Password must be at least 6 characters.");
      return;
    }
    if (cpNewPassword !== cpConfirmPass) {
      setCpError("Passwords do not match.");
      return;
    }

    setCpSaving(true);
    const { error } = await supabase.auth.updateUser({ password: cpNewPassword });
    setCpSaving(false);

    if (error) {
      setCpError("Failed to update password: " + error.message);
    } else {
      toast.success("Password changed successfully!");
      setShowCPModal(false);
    }
  };

  /* ── Delete account ──────────────────────────────────────────────────────── */
const handleDeleteAccount = async () => {
  setDeleteError("");
  const expected = profile?.college_name?.trim().toLowerCase();
  const entered  = deleteInput.trim().toLowerCase();

  if (!expected) {
    setDeleteError("No college name found on your profile. Please set it first.");
    return;
  }
  if (entered !== expected) {
    setDeleteError("College name doesn't match. Please type it exactly.");
    return;
  }

  setDeleting(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("Not logged in");
    const uid = session.user.id;

    // 1. Delete related table data first
    await (supabase.from("test_results").delete().eq("user_id", uid) as any);
    await (supabase.from("user_subscriptions").delete().eq("user_id", uid) as any);
    await (supabase.from("profiles").delete().eq("id", uid) as any);

    // 2. Call Edge Function to delete the auth user
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-interview`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "delete-user" }),
      }
    );

    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error || "Failed to delete auth user");
    }

    // 3. Sign out and redirect
    await supabase.auth.signOut();
    toast.success("Account deleted successfully.");
    window.location.href = "/";
  } catch (err: any) {
    toast.error(err.message || "Failed to delete account. Please contact support.");
    setDeleting(false);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] ||
    profile?.email?.split("@")[0] ||
    "User";

  const planMeta = PLAN_DISPLAY[profile?.plan_type ?? "free"] ?? PLAN_DISPLAY.free;

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">

        {/* ── Top header row ── */}
        <div className="flex items-center justify-between">
          {/* Left: avatar + name */}
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale:0.8, opacity:0 }}
              animate={{ scale:1,   opacity:1 }}
              className="relative shrink-0 cursor-pointer group"
              onClick={() => setShowPicker(true)}
              title="Change avatar"
            >
              <AvatarImg avatarKey={avatarKey} size={48} className="ring-2 ring-primary/40 ring-offset-2" />
              <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background:"rgba(0,0,0,0.45)" }}>
                <Camera className="h-4 w-4 text-white" />
              </div>
            </motion.div>

            <div>
              <motion.h1
                initial={{ opacity:0, x:-12 }}
                animate={{ opacity:1, x:0 }}
                className="font-display text-2xl font-bold text-foreground md:text-3xl"
              >
                {firstName}
              </motion.h1>
              <p className="text-sm text-muted-foreground">
                Manage your account and view your stats
              </p>
            </div>
          </div>

          {/* ── RIGHT: Change Password + Delete Account ── */}
          <motion.div
            initial={{ opacity:0, x:16 }}
            animate={{ opacity:1, x:0 }}
            className="flex flex-col gap-2 items-end"
          >
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-sm"
              onClick={openCPModal}
            >
              <KeyRound className="h-4 w-4" />
              Change Password
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-sm border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              onClick={() => { setShowDAModal(true); setDeleteInput(""); setDeleteError(""); }}
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
          </motion.div>
        </div>

        {/* ── Cards ── */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <motion.div initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }} className="lg:col-span-2">
            <Card className="shadow-card border-border">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0 cursor-pointer group" onClick={() => setShowPicker(true)}>
                      <div className="rounded-full overflow-hidden ring-2 ring-primary/30 ring-offset-2"
                        style={{ width:64, height:64 }}>
                        <AvatarImg avatarKey={avatarKey} size={64} />
                      </div>
                      <div
                        className="absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center
                                   opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ width:20, height:20, background:"var(--primary)", boxShadow:"0 0 6px rgba(0,0,0,0.3)" }}
                      >
                        <Camera className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </div>

                    <div>
                      {editing ? (
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs">Full Name</Label>
                            <Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">College</Label>
                            <Input value={editCollege} onChange={e => setEditCollege(e.target.value)} className="mt-1" />
                          </div>
                        </div>
                      ) : (
                        <>
                          <h2 className="font-display text-xl font-bold text-foreground">{profile?.full_name}</h2>
                          <p className="text-sm text-muted-foreground">{profile?.email}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {editing ? (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button variant="hero" size="sm" onClick={handleSave} disabled={saving} className="gap-1">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1">
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">College:</span>
                    <span className="font-medium text-foreground">{profile?.college_name || "Not set"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Crown className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">Plan:</span>
                    <Badge className={`capitalize border ${planMeta.color}`}>{planMeta.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">Joined:</span>
                    <span className="font-medium text-foreground">
                      {profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString("en-IN", { year:"numeric", month:"long", day:"numeric" })
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground shrink-0">Departments:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile?.departments && profile.departments.length > 0 ? (
                        profile.departments.map(d => {
                          const meta = getDepartmentMeta(d);
                          return (
                            <Badge key={d} className="bg-primary/10 text-primary border-primary/20">
                              {meta.icon} {meta.label}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-muted-foreground">None selected</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
            <Card className="shadow-card border-border h-full">
              <CardContent className="p-6">
                <h3 className="font-display text-lg font-semibold text-foreground mb-4">Performance</h3>
                <div className="space-y-5">
                  {[
                    { label:"Tests Taken",   value:stats.testsTaken.toString(), icon:BookOpen,   color:"text-primary" },
                    { label:"Average Score", value:`${stats.avgScore}%`,        icon:TrendingUp, color:"text-primary" },
                    { label:"Best Score",    value:`${stats.bestScore}%`,       icon:Award,      color:"text-primary" },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary shrink-0">
                        <s.icon className={`h-5 w-5 ${s.color}`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="font-display text-lg font-bold text-foreground">{s.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />

      {showPicker && (
        <AvatarPicker
          currentKey={avatarKey}
          onSelect={handleAvatarSelect}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          CHANGE PASSWORD MODAL
      ════════════════════════════════════════════════════════════════════ */}
      {showCPModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale:0.92, opacity:0 }}
            animate={{ scale:1,    opacity:1 }}
            className="bg-background rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <KeyRound className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground leading-tight">Change Password</h2>
                  <p className="text-xs text-muted-foreground">
                    {cpStep === "verify" ? "Step 1 of 2 — Verify your identity" : "Step 2 of 2 — Set new password"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowCPModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Step indicator */}
            <div className="flex gap-2 mb-6">
              <div className={`h-1.5 flex-1 rounded-full transition-colors ${cpStep === "verify" ? "bg-primary" : "bg-primary"}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-colors ${cpStep === "reset"  ? "bg-primary" : "bg-muted"}`} />
            </div>

            {cpStep === "verify" ? (
              /* ── STEP 1: Identity verification ── */
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">Email Address</Label>
                  <Input
                    className="mt-1.5"
                    type="email"
                    placeholder="Enter your registered email"
                    value={cpEmail}
                    onChange={e => { setCpEmail(e.target.value); setCpError(""); }}
                  />
                </div>
                <div>
                  <Label className="text-sm">Date of Birth</Label>
                  <Input
                    className="mt-1.5"
                    type="date"
                    value={cpDob}
                    onChange={e => { setCpDob(e.target.value); setCpError(""); }}
                  />
                </div>
                <div>
                  <Label className="text-sm">College Name</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="Enter your college name exactly"
                    value={cpCollege}
                    onChange={e => { setCpCollege(e.target.value); setCpError(""); }}
                  />
                </div>

                {cpError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    ❌ {cpError}
                  </p>
                )}

                <div className="flex gap-3 justify-end pt-1">
                  <Button variant="outline" onClick={() => setShowCPModal(false)}>Cancel</Button>
                  <Button variant="hero" onClick={handleVerifyIdentity} disabled={cpVerifying} className="gap-2">
                    {cpVerifying
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</>
                      : "Verify & Continue →"
                    }
                  </Button>
                </div>
              </div>
            ) : (
              /* ── STEP 2: Set new password ── */
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 mb-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Identity verified successfully!
                </div>

                <div>
                  <Label className="text-sm">New Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      type={cpShowNew ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      value={cpNewPassword}
                      onChange={e => { setCpNewPassword(e.target.value); setCpError(""); }}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setCpShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {cpShowNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Confirm New Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      type={cpShowConfirm ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={cpConfirmPass}
                      onChange={e => { setCpConfirmPass(e.target.value); setCpError(""); }}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setCpShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {cpShowConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {cpError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    ❌ {cpError}
                  </p>
                )}

                <div className="flex gap-3 justify-end pt-1">
                  <Button variant="outline" onClick={() => setCpStep("verify")}>← Back</Button>
                  <Button variant="hero" onClick={handleResetPassword} disabled={cpSaving} className="gap-2">
                    {cpSaving
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                      : <><KeyRound className="h-4 w-4" /> Update Password</>
                    }
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          DELETE ACCOUNT MODAL
      ════════════════════════════════════════════════════════════════════ */}
      {showDAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale:0.92, opacity:0 }}
            animate={{ scale:1,    opacity:1 }}
            className="bg-background rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border border-red-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <h2 className="font-display text-lg font-bold text-red-600">Delete Account</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowDAModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
              ⚠️ This action is <strong>permanent and irreversible</strong>. All your data, test results, and subscription info will be deleted.
            </div>

            <div className="mb-4">
              <Label className="text-sm font-medium text-foreground">
                Type your college name to confirm:
                <span className="ml-1 text-muted-foreground font-normal">
                  ({profile?.college_name || "not set"})
                </span>
              </Label>
              <Input
                className="mt-2 border-red-200 focus-visible:ring-red-400"
                placeholder={`Type "${profile?.college_name || "your college name"}" exactly`}
                value={deleteInput}
                onChange={e => { setDeleteInput(e.target.value); setDeleteError(""); }}
              />
              {deleteError && (
                <p className="mt-1.5 text-xs text-red-600">{deleteError}</p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowDAModal(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleting || !deleteInput}
                className="gap-2"
              >
                {deleting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
                  : <><Trash2 className="h-4 w-4" /> Delete My Account</>
                }
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}