import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  Users, CreditCard, UserX, Activity, Database, Key, TrendingUp,
  RefreshCw, LogOut, ShieldAlert, Zap, Upload, CheckCircle2,
  AlertTriangle, FileText, Clock, ToggleLeft, ToggleRight,
  Plus, Trash2, ChevronUp, ChevronDown, Eye, Timer,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalUsers: number;
  paidUsers: number;
  freeUsers: number;
  signupsToday: number;
  totalQuestions: number;
  apiTokensTotal: number;
  apiTokensToday: number;
  dbRowsUsed: number;
  activeTrials: number;
  totalTests: number;
  totalInterviews: number;
  recentUsers: any[];
}

interface ReferralCode {
  id: string;
  code: string;
  is_active: boolean;
  grants_plan: string;
  description: string;
  used_count: number;
  created_at: string;
  first_used_at: string | null;
}

interface TrialActivation {
  id: string;
  user_id: string;
  plan_type: string;
  code: string;
  activated_at: string;
  expires_at: string;
  reverted: boolean;
  profile?: { full_name: string; email: string };
}

interface ParsedQuestion {
  department: string; level: string; question: string;
  options: string[]; correct: number; skill: string;
}

interface UploadResult { total: number; inserted: number; skipped: number; errors: string[]; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString("en-IN"); }
function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function countdown(expires: string) {
  const ms = new Date(expires).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: any; label: string; value: string | number; sub?: string; accent: string;
}) {
  return (
    <div style={{
      background: "#0d1117", border: "1px solid #21262d",
      borderRadius: 14, padding: "20px 22px",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "#8b949e", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: accent + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: 16, height: 16, color: accent }} />
        </div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "#f0f6fc", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#6e7681" }}>{sub}</div>}
    </div>
  );
}

function UsageBar({ label, used, total, color }: { label: string; used: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const warn = pct > 80;
  return (
    <div style={{ background: "#0d1117", border: `1px solid ${warn ? "#f8514922" : "#21262d"}`, borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: "#c9d1d9", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: warn ? "#f85149" : "#f0f6fc", fontFamily: "monospace" }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "#21262d", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: warn ? "#f85149" : color, borderRadius: 99, transition: "width 0.8s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: 11, color: "#6e7681" }}>{fmt(used)} used</span>
        <span style={{ fontSize: 11, color: "#6e7681" }}>{fmt(total)} limit</span>
      </div>
    </div>
  );
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): { questions: ParsedQuestion[]; errors: string[] } {
  const lines = text.trim().split("\n").filter(Boolean);
  const errors: string[] = [];
  const questions: ParsedQuestion[] = [];
  if (lines.length < 2) { errors.push("CSV must have a header row and at least one data row."); return { questions, errors }; }
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, ""));
  const col = (row: string[], name: string) => { const idx = headers.indexOf(name); return idx >= 0 ? (row[idx] ?? "").replace(/^"|"$/g, "").trim() : ""; };
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i]; if (!raw.trim()) continue;
    const row: string[] = []; let cur = "", inQ = false;
    for (let c = 0; c < raw.length; c++) {
      if (raw[c] === '"') { inQ = !inQ; continue; }
      if (raw[c] === sep && !inQ) { row.push(cur); cur = ""; continue; }
      cur += raw[c];
    }
    row.push(cur);
    const dept = col(row, "department").toUpperCase();
    const level = col(row, "level").toLowerCase();
    const question = col(row, "question");
    const optA = col(row, "option_a"), optB = col(row, "option_b"), optC = col(row, "option_c"), optD = col(row, "option_d");
    const correctRaw = col(row, "correct");
    const skill = col(row, "skill") || dept;
    if (!dept || !level || !question) { errors.push(`Row ${i + 1}: Missing department, level, or question.`); continue; }
    if (!["easy", "medium", "hard"].includes(level)) { errors.push(`Row ${i + 1}: Level must be easy/medium/hard.`); continue; }
    if (!optA || !optB || !optC || !optD) { errors.push(`Row ${i + 1}: All 4 options required.`); continue; }
    let correct: number;
    const cU = correctRaw.trim().toUpperCase();
    if (["A","B","C","D"].includes(cU)) correct = ["A","B","C","D"].indexOf(cU);
    else correct = parseInt(correctRaw);
    if (isNaN(correct) || correct < 0 || correct > 3) { errors.push(`Row ${i + 1}: correct must be 0-3 or A-D.`); continue; }
    questions.push({ department: dept, level, question, options: [optA, optB, optC, optD], correct, skill });
  }
  return { questions, errors };
}

// ─── Referral Manager ─────────────────────────────────────────────────────────

function ReferralManager() {
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState({ code: "", grants_plan: "premium", description: "" });
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("referral_codes").select("*").order("created_at", { ascending: false });
    setCodes(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const toggleCode = async (id: string, current: boolean) => {
    await supabase.from("referral_codes").update({ is_active: !current }).eq("id", id);
    fetchCodes();
  };

  const deleteCode = async (id: string) => {
    if (!confirm("Delete this code?")) return;
    await supabase.from("referral_codes").delete().eq("id", id);
    fetchCodes();
  };

  const addCode = async () => {
    if (!newCode.code.trim()) return;
    setAdding(true);
    await supabase.from("referral_codes").insert({
      code: newCode.code.trim().toUpperCase(),
      grants_plan: newCode.grants_plan,
      description: newCode.description,
      is_active: true,
      used_count: 0,
    });
    setNewCode({ code: "", grants_plan: "premium", description: "" });
    setShowAdd(false);
    setAdding(false);
    fetchCodes();
  };

  const planColor: Record<string, string> = {
    premium: "#a78bfa", pro: "#f59e0b", starter: "#34d399", free: "#6e7681"
  };

  return (
    <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #21262d", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Key style={{ width: 16, height: 16, color: "#a78bfa" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#c9d1d9", textTransform: "uppercase", letterSpacing: "0.05em" }}>Referral Codes</span>
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#21262d", color: "#8b949e" }}>{codes.length}</span>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
          borderRadius: 8, background: "#1f6feb22", border: "1px solid #1f6feb",
          color: "#58a6ff", fontSize: 12, cursor: "pointer", fontWeight: 500,
        }}>
          <Plus style={{ width: 13, height: 13 }} /> Add Code
        </button>
      </div>

      {showAdd && (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #21262d", background: "#161b22", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            placeholder="CODE (e.g. LAUNCH50)"
            value={newCode.code}
            onChange={e => setNewCode(p => ({ ...p, code: e.target.value.toUpperCase() }))}
            style={{ flex: 1, minWidth: 120, padding: "8px 12px", borderRadius: 8, background: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", fontSize: 13, fontFamily: "monospace" }}
          />
          <select
            value={newCode.grants_plan}
            onChange={e => setNewCode(p => ({ ...p, grants_plan: e.target.value }))}
            style={{ padding: "8px 12px", borderRadius: 8, background: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", fontSize: 13 }}
          >
            {["premium","pro","starter","free"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input
            placeholder="Description (optional)"
            value={newCode.description}
            onChange={e => setNewCode(p => ({ ...p, description: e.target.value }))}
            style={{ flex: 2, minWidth: 160, padding: "8px 12px", borderRadius: 8, background: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", fontSize: 13 }}
          />
          <button onClick={addCode} disabled={adding || !newCode.code.trim()} style={{
            padding: "8px 16px", borderRadius: 8, background: adding ? "#21262d" : "#238636",
            border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#161b22" }}>
              {["Code","Plan","Description","Used","Created","Status","Actions"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#6e7681", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#6e7681" }}>Loading…</td></tr>
            ) : codes.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#6e7681" }}>No referral codes yet</td></tr>
            ) : codes.map(c => (
              <tr key={c.id} style={{ borderTop: "1px solid #21262d" }}>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ fontFamily: "monospace", color: "#f0f6fc", fontWeight: 600, letterSpacing: "0.1em" }}>{c.code}</span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: (planColor[c.grants_plan] ?? "#6e7681") + "22", color: planColor[c.grants_plan] ?? "#6e7681" }}>
                    {c.grants_plan}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "#8b949e", maxWidth: 200 }}>{c.description || "—"}</td>
                <td style={{ padding: "12px 16px", color: "#f0f6fc", fontFamily: "monospace", textAlign: "center" }}>{c.used_count ?? 0}</td>
                <td style={{ padding: "12px 16px", color: "#6e7681", whiteSpace: "nowrap" }}>{timeAgo(c.created_at)}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: c.is_active ? "#23863622" : "#6e768122", color: c.is_active ? "#3fb950" : "#6e7681" }}>
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => toggleCode(c.id, c.is_active)} title={c.is_active ? "Deactivate" : "Activate"} style={{ padding: "5px 8px", borderRadius: 7, background: "#21262d", border: "1px solid #30363d", cursor: "pointer", display: "flex", alignItems: "center" }}>
                      {c.is_active ? <ToggleRight style={{ width: 14, height: 14, color: "#3fb950" }} /> : <ToggleLeft style={{ width: 14, height: 14, color: "#6e7681" }} />}
                    </button>
                    <button onClick={() => deleteCode(c.id)} title="Delete" style={{ padding: "5px 8px", borderRadius: 7, background: "#21262d", border: "1px solid #30363d", cursor: "pointer", display: "flex", alignItems: "center" }}>
                      <Trash2 style={{ width: 14, height: 14, color: "#f85149" }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Trial Activations ────────────────────────────────────────────────────────

function TrialActivations() {
  const [trials, setTrials] = useState<TrialActivation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const fetchTrials = async () => {
      setLoading(true);
      const { data: ta } = await supabase
        .from("trial_activations")
        .select("*")
        .eq("reverted", false)
        .order("activated_at", { ascending: false })
        .limit(20);

      if (!ta) { setLoading(false); return; }

      const ids = ta.map(t => t.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);

      const merged = ta.map(t => ({
        ...t,
        profile: profiles?.find(p => p.id === t.user_id),
      }));
      setTrials(merged);
      setLoading(false);
    };
    fetchTrials();
  }, []);

  // Live countdown tick
  useEffect(() => {
    const i = setInterval(() => setTick(p => p + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const active = trials.filter(t => new Date(t.expires_at) > new Date());
  const expired = trials.filter(t => new Date(t.expires_at) <= new Date());

  const planColor: Record<string, string> = { premium: "#a78bfa", pro: "#f59e0b", starter: "#34d399", free: "#6e7681" };

  return (
    <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #21262d", display: "flex", alignItems: "center", gap: 10 }}>
        <Timer style={{ width: 16, height: 16, color: "#f59e0b" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#c9d1d9", textTransform: "uppercase", letterSpacing: "0.05em" }}>Trial Activations</span>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#f59e0b22", color: "#f59e0b" }}>{active.length} live</span>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#21262d", color: "#6e7681", marginLeft: 2 }}>{expired.length} expired</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#161b22" }}>
              {["User","Email","Plan","Code","Activated","Expires / Countdown","Status"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#6e7681", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#6e7681" }}>Loading…</td></tr>
            ) : trials.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#6e7681" }}>No trial activations yet</td></tr>
            ) : trials.map(t => {
              const isLive = new Date(t.expires_at) > new Date();
              return (
                <tr key={t.id} style={{ borderTop: "1px solid #21262d", background: isLive ? "#f59e0b08" : "transparent" }}>
                  <td style={{ padding: "12px 16px", color: "#f0f6fc", fontWeight: 500 }}>{t.profile?.full_name ?? "Unknown"}</td>
                  <td style={{ padding: "12px 16px", color: "#8b949e", fontSize: 12 }}>{t.profile?.email ?? "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: (planColor[t.plan_type] ?? "#6e7681") + "22", color: planColor[t.plan_type] ?? "#6e7681" }}>
                      {t.plan_type}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#a78bfa", fontWeight: 600 }}>{t.code}</td>
                  <td style={{ padding: "12px 16px", color: "#6e7681", whiteSpace: "nowrap" }}>{timeAgo(t.activated_at)}</td>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: 600, color: isLive ? "#f59e0b" : "#6e7681", whiteSpace: "nowrap" }}>
                    {isLive ? countdown(t.expires_at) : new Date(t.expires_at).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: isLive ? "#f59e0b22" : "#21262d", color: isLive ? "#f59e0b" : "#6e7681" }}>
                      {isLive ? "🟡 Live" : "Expired"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── CSV Upload ───────────────────────────────────────────────────────────────

function CSVUpload() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedQuestion[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [libraryCount, setLibraryCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.from("library_questions").select("*", { count: "exact", head: true }).then(({ count }) => setLibraryCount(count ?? 0));
  }, [result]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setFileName(file.name); setResult(null);
    const reader = new FileReader();
    reader.onload = ev => {
      const { questions, errors } = parseCSV(ev.target?.result as string);
      setPreview(questions); setParseErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (preview.length === 0) return;
    setUploading(true);
    let inserted = 0, skipped = 0; const errors: string[] = [];
    for (let i = 0; i < preview.length; i += 100) {
      const chunk = preview.slice(i, i + 100);
      const { error } = await supabase.from("library_questions").insert(chunk.map(q => ({ department: q.department, level: q.level, question: q.question, options: q.options, correct: q.correct, skill: q.skill })));
      if (error) { skipped += chunk.length; errors.push(`Batch ${Math.floor(i/100)+1}: ${error.message}`); }
      else inserted += chunk.length;
    }
    setResult({ total: preview.length, inserted, skipped, errors });
    setPreview([]); setFileName(null);
    if (fileRef.current) fileRef.current.value = "";
    setUploading(false);
  };

  const downloadTemplate = () => {
    const csv = ["department,level,question,option_a,option_b,option_c,option_d,correct,skill",
      "CSE,easy,What is an array?,A data structure,A loop,A function,A class,0,Arrays"].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "questions_template.csv"; a.click();
  };

  const summary = preview.reduce<Record<string, number>>((acc, q) => { const k = `${q.department}/${q.level}`; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});

  return (
    <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #21262d", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Upload style={{ width: 16, height: 16, color: "#58a6ff" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#c9d1d9", textTransform: "uppercase", letterSpacing: "0.05em" }}>Upload Questions via CSV</span>
          {libraryCount !== null && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#21262d", color: "#8b949e" }}>{fmt(libraryCount)} in library</span>}
        </div>
        <button onClick={downloadTemplate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "#1f6feb22", border: "1px solid #1f6feb", color: "#58a6ff", fontSize: 12, cursor: "pointer" }}>
          <FileText style={{ width: 13, height: 13 }} /> Template
        </button>
      </div>

      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Format guide */}
        <div style={{ background: "#161b22", borderRadius: 10, padding: "14px 16px", fontSize: 12 }}>
          <p style={{ color: "#8b949e", fontWeight: 600, marginBottom: 10 }}>Required columns:</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "6px 16px" }}>
            {[["department","CSE, AI, ML, IT…"],["level","easy / medium / hard"],["question","Question text"],["option_a–d","4 answer options"],["correct","0=A 1=B 2=C 3=D"],["skill","Arrays, OOP…"]].map(([c,d]) => (
              <div key={c} style={{ display: "flex", gap: 8 }}>
                <code style={{ color: "#58a6ff", flexShrink: 0 }}>{c}</code>
                <span style={{ color: "#6e7681" }}>{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "2rem", borderRadius: 12, border: `2px dashed ${fileName ? "#1f6feb" : "#30363d"}`, background: fileName ? "#1f6feb0a" : "#161b22", cursor: "pointer" }}>
          <Upload style={{ width: 32, height: 32, color: fileName ? "#58a6ff" : "#484f58" }} />
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: fileName ? "#58a6ff" : "#6e7681", margin: 0 }}>{fileName ? `✓ ${fileName}` : "Click to select CSV"}</p>
            <p style={{ fontSize: 12, color: "#484f58", margin: "4px 0 0" }}>{fileName ? `${preview.length} valid questions` : "Comma or semicolon separated"}</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFile} />
        </label>

        {parseErrors.length > 0 && (
          <div style={{ background: "#f851490a", border: "1px solid #f8514922", borderRadius: 10, padding: "12px 14px" }}>
            <p style={{ color: "#f85149", fontSize: 12, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle style={{ width: 14, height: 14 }} /> {parseErrors.length} row(s) with errors:
            </p>
            <div style={{ maxHeight: 100, overflowY: "auto" }}>
              {parseErrors.map((e, i) => <p key={i} style={{ fontSize: 11, color: "#f85149", fontFamily: "monospace", margin: "2px 0" }}>{e}</p>)}
            </div>
          </div>
        )}

        {preview.length > 0 && (
          <div style={{ background: "#1f6feb0a", border: "1px solid #1f6feb22", borderRadius: 10, padding: "14px 16px" }}>
            <p style={{ color: "#58a6ff", fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Preview — {preview.length} questions ready:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {Object.entries(summary).map(([k, v]) => (
                <span key={k} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "#1f6feb22", color: "#58a6ff" }}>{k}: {v}</span>
              ))}
            </div>
            <button onClick={handleUpload} disabled={uploading} style={{ width: "100%", padding: "10px", borderRadius: 9, background: uploading ? "#21262d" : "#1f6feb", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {uploading ? <><RefreshCw style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Uploading…</> : <><Upload style={{ width: 14, height: 14 }} /> Upload {preview.length} Questions</>}
            </button>
          </div>
        )}

        {result && (
          <div style={{ background: result.errors.length === 0 ? "#23863608" : "#f8514908", border: `1px solid ${result.errors.length === 0 ? "#23863622" : "#f8514922"}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              {result.errors.length === 0 ? <CheckCircle2 style={{ width: 16, height: 16, color: "#3fb950" }} /> : <AlertTriangle style={{ width: 16, height: 16, color: "#f59e0b" }} />}
              <span style={{ fontWeight: 600, color: result.errors.length === 0 ? "#3fb950" : "#f59e0b", fontSize: 13 }}>Upload Complete</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[["Total", result.total, "#c9d1d9"], ["Inserted", result.inserted, "#3fb950"], ["Failed", result.skipped, "#f85149"]].map(([l, v, c]) => (
                <div key={l as string} style={{ textAlign: "center", background: "#0d1117", borderRadius: 8, padding: "10px 6px" }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: c as string, fontFamily: "monospace", margin: 0 }}>{v}</p>
                  <p style={{ fontSize: 11, color: "#6e7681", margin: "4px 0 0" }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, paidUsers: 0, freeUsers: 0, signupsToday: 0,
    totalQuestions: 0, apiTokensTotal: 0, apiTokensToday: 0,
    dbRowsUsed: 0, activeTrials: 0, totalTests: 0, totalInterviews: 0,
    recentUsers: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [nextRefresh, setNextRefresh] = useState(30);
  const [activeTab, setActiveTab] = useState<"overview" | "codes" | "trials" | "upload">("overview");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      // Users from profiles
      const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: paidUsers } = await supabase.from("user_subscriptions").select("*", { count: "exact", head: true }).neq("plan_type", "free");

      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const { count: signupsToday } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString());

      // Questions
      const { count: totalQuestions } = await supabase.from("library_questions").select("*", { count: "exact", head: true });

      // API tokens
      const { data: tokenData } = await supabase.from("api_usage_logs").select("tokens_used");
      const apiTokensTotal = tokenData?.reduce((s, r) => s + (r.tokens_used || 0), 0) ?? 0;
      const { data: todayTokenData } = await supabase.from("api_usage_logs").select("tokens_used").gte("created_at", todayStart.toISOString());
      const apiTokensToday = todayTokenData?.reduce((s, r) => s + (r.tokens_used || 0), 0) ?? 0;

      // Tests & Interviews
      const { count: totalTests } = await supabase.from("test_results").select("*", { count: "exact", head: true });
      const { count: totalInterviews } = await supabase.from("interview_results").select("*", { count: "exact", head: true });

      // Active trials
      const { count: activeTrials } = await supabase.from("trial_activations").select("*", { count: "exact", head: true }).eq("reverted", false).gt("expires_at", new Date().toISOString());

      // DB rows estimate
      const t = totalUsers ?? 0;
      const q = totalQuestions ?? 0;
      const dbRowsUsed = t + q + (totalTests ?? 0) + (totalInterviews ?? 0);

      // Recent users
      const { data: recentUsers } = await supabase.from("profiles").select("full_name, email, plan_type, created_at, departments, college_name").order("created_at", { ascending: false }).limit(10);

      setStats({
        totalUsers: t,
        paidUsers: paidUsers ?? 0,
        freeUsers: t - (paidUsers ?? 0),
        signupsToday: signupsToday ?? 0,
        totalQuestions: q,
        apiTokensTotal,
        apiTokensToday,
        dbRowsUsed,
        activeTrials: activeTrials ?? 0,
        totalTests: totalTests ?? 0,
        totalInterviews: totalInterviews ?? 0,
        recentUsers: recentUsers ?? [],
      });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
    setLoading(false);
    setLastUpdated(new Date());
    setNextRefresh(30);
  }, []);

  useEffect(() => {
    fetchStats();
    const ri = setInterval(fetchStats, 30000);
    const ci = setInterval(() => setNextRefresh(p => p <= 1 ? 30 : p - 1), 1000);
    return () => { clearInterval(ri); clearInterval(ci); };
  }, [fetchStats]);

  const convPct = stats.totalUsers > 0 ? ((stats.paidUsers / stats.totalUsers) * 100).toFixed(1) : "0.0";

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "codes", label: "Referral Codes", icon: Key },
    { id: "trials", label: "Trial Activations", icon: Timer },
    { id: "upload", label: "Upload Questions", icon: Upload },
  ] as const;

  return (
    <div style={{ minHeight: "100vh", background: "#010409", color: "#c9d1d9", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #010409; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 99px; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #21262d", padding: "14px 24px", background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f8514922", border: "1px solid #f8514944", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldAlert style={{ width: 18, height: 18, color: "#f85149" }} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#f0f6fc" }}>Admin Dashboard</p>
            <p style={{ fontSize: 11, color: "#6e7681" }}>MapReducer · Live Data</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {stats.activeTrials > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "#f59e0b22", border: "1px solid #f59e0b44" }}>
              <Timer style={{ width: 13, height: 13, color: "#f59e0b" }} />
              <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>{stats.activeTrials} live trial{stats.activeTrials !== 1 ? "s" : ""}</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "#21262d", fontSize: 12, color: "#8b949e" }}>
            <Zap style={{ width: 12, height: 12, color: "#f59e0b" }} />
            <span>Refresh in <span style={{ color: "#f59e0b", fontWeight: 600 }}>{nextRefresh}s</span></span>
          </div>
          <span style={{ fontSize: 11, color: "#6e7681" }}>{lastUpdated.toLocaleTimeString()}</span>
          <button onClick={fetchStats} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "#21262d", border: "1px solid #30363d", color: "#c9d1d9", fontSize: 12, cursor: "pointer" }}>
            <RefreshCw style={{ width: 13, height: 13, ...(loading ? { animation: "spin 1s linear infinite" } : {}) }} />
            {loading ? "Syncing…" : "Refresh"}
          </button>
          <button onClick={() => { sessionStorage.removeItem("admin_auth"); navigate("/login"); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "#f8514908", border: "1px solid #f8514944", color: "#f85149", fontSize: 12, cursor: "pointer" }}>
            <LogOut style={{ width: 13, height: 13 }} /> Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid #21262d", padding: "0 24px", background: "#0d1117", display: "flex", gap: 4 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "12px 16px",
            background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
            color: activeTab === tab.id ? "#f0f6fc" : "#6e7681",
            borderBottom: activeTab === tab.id ? "2px solid #58a6ff" : "2px solid transparent",
            transition: "all 0.15s", fontFamily: "inherit",
          }}>
            <tab.icon style={{ width: 14, height: 14 }} />
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        {activeTab === "overview" && (
          <>
            {/* KPI Row 1 — Users */}
            <div>
              <p style={{ fontSize: 11, color: "#6e7681", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>User Metrics</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                <KpiCard icon={Users} label="Total Users" value={fmt(stats.totalUsers)} sub="All registered" accent="#58a6ff" />
                <KpiCard icon={CreditCard} label="Paid Users" value={fmt(stats.paidUsers)} sub={`${convPct}% conversion`} accent="#3fb950" />
                <KpiCard icon={UserX} label="Free Users" value={fmt(stats.freeUsers)} sub="On free plan" accent="#f59e0b" />
                <KpiCard icon={TrendingUp} label="Signups Today" value={fmt(stats.signupsToday)} sub="New accounts" accent="#a78bfa" />
                <KpiCard icon={Timer} label="Active Trials" value={stats.activeTrials} sub="NEWCODE live now" accent="#f59e0b" />
              </div>
            </div>

            {/* KPI Row 2 — Activity */}
            <div>
              <p style={{ fontSize: 11, color: "#6e7681", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Activity & Usage</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                <KpiCard icon={Database} label="Questions in Library" value={fmt(stats.totalQuestions)} sub="All-time total" accent="#34d399" />
                <KpiCard icon={Zap} label="API Tokens (Total)" value={fmt(stats.apiTokensTotal)} sub="All-time" accent="#f59e0b" />
                <KpiCard icon={Zap} label="API Tokens Today" value={fmt(stats.apiTokensToday)} sub="Since midnight" accent="#58a6ff" />
                <KpiCard icon={Activity} label="Total Mock Tests" value={fmt(stats.totalTests)} sub="All-time" accent="#a78bfa" />
                <KpiCard icon={Eye} label="Total AI Interviews" value={fmt(stats.totalInterviews)} sub="All-time" accent="#f85149" />
              </div>
            </div>

            {/* Resource bars */}
            <div>
              <p style={{ fontSize: 11, color: "#6e7681", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Resource Limits</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                <UsageBar label="Database Rows" used={stats.dbRowsUsed} total={500000} color="#58a6ff" />
                <UsageBar label="API Tokens (All-Time)" used={stats.apiTokensTotal} total={1000000} color="#a78bfa" />
                <UsageBar label="API Tokens Today" used={stats.apiTokensToday} total={100000} color="#f59e0b" />
              </div>
            </div>

            {/* Plan breakdown + recent users */}
            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
              {/* Plan breakdown */}
              <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 14, padding: "20px" }}>
                <p style={{ fontSize: 11, color: "#6e7681", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Plan Distribution</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { label: "Paid", value: stats.paidUsers, color: "#3fb950" },
                    { label: "Free", value: stats.freeUsers, color: "#f59e0b" },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: "#c9d1d9" }}>{item.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: item.color, fontFamily: "monospace" }}>{item.value}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 99, background: "#21262d" }}>
                        <div style={{ height: "100%", width: `${stats.totalUsers > 0 ? (item.value / stats.totalUsers) * 100 : 0}%`, background: item.color, borderRadius: 99, transition: "width 0.8s ease" }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                    <div style={{ background: "#161b22", borderRadius: 10, padding: "14px", textAlign: "center" }}>
                      <p style={{ fontSize: 26, fontWeight: 700, color: "#3fb950", fontFamily: "monospace" }}>{stats.paidUsers}</p>
                      <p style={{ fontSize: 11, color: "#6e7681", marginTop: 4 }}>Paying</p>
                    </div>
                    <div style={{ background: "#161b22", borderRadius: 10, padding: "14px", textAlign: "center" }}>
                      <p style={{ fontSize: 26, fontWeight: 700, color: "#f59e0b", fontFamily: "monospace" }}>{stats.freeUsers}</p>
                      <p style={{ fontSize: 11, color: "#6e7681", marginTop: 4 }}>Free</p>
                    </div>
                  </div>
                  <div style={{ background: "#161b22", borderRadius: 10, padding: "14px", textAlign: "center", marginTop: 4 }}>
                    <p style={{ fontSize: 26, fontWeight: 700, color: "#58a6ff", fontFamily: "monospace" }}>{convPct}%</p>
                    <p style={{ fontSize: 11, color: "#6e7681", marginTop: 4 }}>Conversion Rate</p>
                  </div>
                </div>
              </div>

              {/* Recent users */}
              <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #21262d" }}>
                  <p style={{ fontSize: 11, color: "#6e7681", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Recent Signups</p>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#161b22" }}>
                        {["Name","Email","College","Plan","Joined"].map(h => (
                          <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#6e7681", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#6e7681" }}>Loading…</td></tr>
                      ) : stats.recentUsers.length === 0 ? (
                        <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#6e7681" }}>No users yet</td></tr>
                      ) : stats.recentUsers.map((u, i) => (
                        <tr key={i} style={{ borderTop: "1px solid #21262d" }}>
                          <td style={{ padding: "11px 16px", color: "#f0f6fc", fontWeight: 500, whiteSpace: "nowrap" }}>{u.full_name || "—"}</td>
                          <td style={{ padding: "11px 16px", color: "#8b949e", fontSize: 12 }}>{u.email || "—"}</td>
                          <td style={{ padding: "11px 16px", color: "#6e7681", fontSize: 12 }}>{u.college_name || "—"}</td>
                          <td style={{ padding: "11px 16px" }}>
                            <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: u.plan_type !== "free" ? "#23863622" : "#21262d", color: u.plan_type !== "free" ? "#3fb950" : "#6e7681" }}>
                              {u.plan_type ?? "free"}
                            </span>
                          </td>
                          <td style={{ padding: "11px 16px", color: "#6e7681", fontSize: 12, whiteSpace: "nowrap" }}>{timeAgo(u.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "codes" && <ReferralManager />}
        {activeTab === "trials" && <TrialActivations />}
        {activeTab === "upload" && <CSVUpload />}

      </div>
    </div>
  );
}