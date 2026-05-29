import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, CheckCircle2, ChevronDown, ChevronUp, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { COURSE_CATEGORIES, initializeStudentQuestions } from "@/lib/studentQuestions";

export default function Signup() {
  const [step, setStep] = useState<1 | 2>(1);
  const [showPass, setShowPass] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [college, setCollege] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    COURSE_CATEGORIES[0].category
  );
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ── Step 1 validation ────────────────────────────────────────────────────
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName || !email || !college || !password || !dob) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setStep(2);
  };

  // ── Course toggle ────────────────────────────────────────────────────────
  const toggleCourse = (key: string) => {
    if (selectedCourses.includes(key)) {
      setSelectedCourses(selectedCourses.filter((k) => k !== key));
      setError("");
    } else {
      if (selectedCourses.length >= 5) {
        setError("You can select a maximum of 5 courses.");
        return;
      }
      setSelectedCourses([...selectedCourses, key]);
      setError("");
    }
  };

  // ── Signup submit ────────────────────────────────────────────────────────
  const handleSignup = async () => {
    if (selectedCourses.length === 0 || selectedCourses.length > 5) {
      setError("Please select 1 to 5 courses.");
      return;
    }
    setError("");
    setLoading(true);

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          college_name: college,
          departments: selectedCourses,
        },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName,
        email,
        college_name: college,
        date_of_birth: dob,
        departments: selectedCourses,
        plan_type: "free",
        avatar_key: "adventurer:luna",
        avatar_url: null,
      });
      if (profileError) console.error("Profile creation failed:", profileError.message);

      localStorage.setItem("generating_questions", "true");
      localStorage.setItem("generating_departments", JSON.stringify(selectedCourses));

      navigate("/dashboard", { replace: true });

      initializeStudentQuestions(data.user.id, selectedCourses)
        .then(() => {
          localStorage.removeItem("generating_questions");
          localStorage.removeItem("generating_departments");
        })
        .catch((err) => {
          console.error("Question generation failed:", err);
          localStorage.removeItem("generating_questions");
          localStorage.removeItem("generating_departments");
        });
    }

    setLoading(false);
  };

  // ── Derived: filtered categories for search ──────────────────────────────
  const lowerSearch = search.toLowerCase();
  const filteredCategories = search.trim()
    ? COURSE_CATEGORIES.map((cat) => ({
        ...cat,
        courses: cat.courses.filter((c) =>
          c.label.toLowerCase().includes(lowerSearch) ||
          c.key.toLowerCase().includes(lowerSearch)
        ),
      })).filter((cat) => cat.courses.length > 0)
    : COURSE_CATEGORIES;

  // ── Selected labels for chips ─────────────────────────────────────────────
  const selectedLabels = selectedCourses.map((key) => {
    for (const cat of COURSE_CATEGORIES) {
      const found = cat.courses.find((c) => c.key === key);
      if (found) return { key, label: found.label };
    }
    return { key, label: key };
  });

  return (
    <div className="flex min-h-screen">
      {/* ── Left branding panel ── */}
      <div className="hidden w-1/2 items-center justify-center gradient-primary lg:flex">
        <div className="max-w-md px-12 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10 backdrop-blur">
              <span className="font-display text-3xl font-bold text-primary-foreground">A</span>
            </div>
          </div>
          <h2 className="font-display text-3xl font-bold text-primary-foreground">Join MapReducer</h2>
          <p className="mt-4 text-primary-foreground/70">
            Start preparing smarter with AI-powered mock tests tailored to real job descriptions.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              step === 1
                ? "bg-primary-foreground text-primary"
                : "bg-primary-foreground/30 text-primary-foreground"
            }`}>1</div>
            <div className="h-px w-12 bg-primary-foreground/30" />
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              step === 2
                ? "bg-primary-foreground text-primary"
                : "bg-primary-foreground/30 text-primary-foreground"
            }`}>2</div>
          </div>
          <p className="mt-2 text-sm text-primary-foreground/70">
            {step === 1 ? "Your details" : "Choose your courses"}
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-lg">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <span className="font-display text-lg font-bold text-primary-foreground">A</span>
            </div>
            <span className="font-display text-xl font-bold">MapReducer</span>
          </Link>

          {/* ════════════════════ STEP 1 ════════════════════ */}
          {step === 1 && (
            <>
              <h1 className="font-display text-2xl font-bold text-foreground">Create your account</h1>
              <p className="mt-1 text-sm text-muted-foreground">Step 1 of 2 — Your details</p>

              {error && (
                <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  {error}
                </div>
              )}

              <form className="mt-8 space-y-5" onSubmit={handleNextStep}>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
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
                  <Label htmlFor="college">College</Label>
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
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button variant="hero" className="w-full" type="submit">
                  Next — Choose Courses →
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  Log in
                </Link>
              </p>
            </>
          )}

          {/* ════════════════════ STEP 2 ════════════════════ */}
          {step === 2 && (
            <>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Choose your courses
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Step 2 of 2 — Select up to{" "}
                <strong>5 courses</strong> across any category
              </p>

              {error && (
                <div className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  {error}
                </div>
              )}

              {/* Selected chips */}
              {selectedLabels.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {selectedLabels.map(({ key, label }) => (
                    <span
                      key={key}
                      className="flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1"
                    >
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      {label}
                      <button
                        onClick={() => toggleCourse(key)}
                        className="ml-1 hover:text-destructive leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Counter */}
              <p className={`mt-2 text-xs font-medium ${
                selectedCourses.length === 5
                  ? "text-amber-500"
                  : selectedCourses.length > 0
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}>
                {selectedCourses.length}/5 selected
                {selectedCourses.length === 5 && " — maximum reached"}
              </p>

              {/* Search */}
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search any course…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>

              {/* Category accordion list */}
              <div className="mt-3 rounded-xl border border-border overflow-hidden divide-y divide-border max-h-[420px] overflow-y-auto">
                {filteredCategories.map((cat) => {
                  const isOpen =
                    search.trim() !== "" || expandedCategory === cat.category;
                  const selectedInCat = cat.courses.filter((c) =>
                    selectedCourses.includes(c.key)
                  ).length;

                  return (
                    <div key={cat.category}>
                      {/* Category header */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCategory(
                            isOpen && !search.trim() ? null : cat.category
                          )
                        }
                        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg leading-none">{cat.icon}</span>
                          <span className="text-sm font-semibold text-foreground">
                            {cat.category}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({cat.courses.length})
                          </span>
                          {selectedInCat > 0 && (
                            <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5">
                              {selectedInCat}
                            </span>
                          )}
                        </div>
                        {!search.trim() && (
                          isOpen
                            ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {/* Course grid inside category */}
                      {isOpen && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-background">
                          {cat.courses.map((course) => {
                            const isSelected = selectedCourses.includes(course.key);
                            const isDisabled =
                              !isSelected && selectedCourses.length >= 5;
                            return (
                              <button
                                key={course.key}
                                type="button"
                                onClick={() => toggleCourse(course.key)}
                                disabled={isDisabled}
                                className={`relative flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                                    : isDisabled
                                    ? "cursor-not-allowed border-muted bg-muted/30 text-muted-foreground opacity-40"
                                    : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/20"
                                }`}
                              >
                                {isSelected && (
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                                )}
                                <span className="leading-tight">{course.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredCategories.length === 0 && (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No courses match "{search}"
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-3">
                <Button
                  variant="outline"
                  className="w-1/3"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  ← Back
                </Button>
                <Button
                  variant="hero"
                  className="w-2/3"
                  onClick={handleSignup}
                  disabled={loading || selectedCourses.length === 0}
                >
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}