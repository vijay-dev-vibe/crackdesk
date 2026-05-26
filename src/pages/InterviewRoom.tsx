import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, Loader2, PhoneOff, Video, VideoOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { callInterviewAI } from "@/lib/interviewAI";
import { useSubscription } from "@/hooks/useSubscription";
import Navbar from "@/components/Navbar";

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "prep" | "live" | "done";
interface Violation { time: string; qNum: number }
interface AnswerRecord { questionId: number; question: string; answer: string }
interface Plan {
  role: string; level: string; focus_areas: string[];
  questions: { id: number; text: string; type: string; hint: string }[];
}

// ─── Prep UI styles (injected once) ──────────────────────────────────────────
const PREP_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
.iv-prep *{box-sizing:border-box;margin:0;padding:0}
.iv-prep{font-family:'DM Sans',sans-serif;background:#FAF8F3;color:#0E0E0F;min-height:100vh;overflow-x:hidden;position:relative}
.iv-prep::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 60% 50% at 20% 10%,rgba(201,168,76,.06) 0%,transparent 70%),radial-gradient(ellipse 50% 60% at 85% 80%,rgba(201,168,76,.05) 0%,transparent 70%);pointer-events:none;z-index:0}
.iv-page{position:relative;z-index:1;max-width:1000px;margin:0 auto;padding:48px 32px 80px}
.iv-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 18px;border:1px solid rgba(201,168,76,.2);border-radius:100px;background:#F2EDE0;margin-bottom:22px}
.iv-badge-dot{width:6px;height:6px;border-radius:50%;background:#C9A84C;animation:ivpulse 2s ease-in-out infinite}
@keyframes ivpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.2)}}
.iv-badge span{font-size:10px;font-weight:500;letter-spacing:3px;text-transform:uppercase;color:#C9A84C}
.iv-h1{font-family:'Cormorant Garamond',serif;font-size:54px;font-weight:300;line-height:1.1;color:#0E0E0F;letter-spacing:-1px;margin-bottom:16px}
.iv-h1 em{font-style:italic;color:#C9A84C}
.iv-sub{font-size:14px;color:#5A5550;line-height:1.7;max-width:480px;font-weight:300}
.iv-pills{display:flex;gap:10px;margin-top:24px;flex-wrap:wrap;justify-content:center}
.iv-pill{display:flex;align-items:center;gap:6px;padding:5px 14px;border:1px solid rgba(201,168,76,.2);border-radius:100px;font-size:11px;color:#5A5550;background:transparent}
.iv-steps{display:flex;gap:0;justify-content:center;margin-bottom:44px}
.iv-step{display:flex;align-items:center;gap:10px}
.iv-step-num{width:28px;height:28px;border-radius:50%;border:1px solid rgba(201,168,76,.2);background:#F2EDE0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;color:#5A5550;flex-shrink:0}
.iv-step-num.active{background:#C9A84C;border-color:#C9A84C;color:#0E0E0F}
.iv-step-label{font-size:11px;color:#9A948C;white-space:nowrap}
.iv-step-label.active{color:#2A2724;font-weight:500}
.iv-connector{width:40px;height:1px;background:rgba(201,168,76,.2);margin:0 6px}
.iv-divider{display:flex;align-items:center;gap:16px;margin-bottom:36px}
.iv-divider-line{flex:1;height:1px;background:rgba(201,168,76,.2)}
.iv-divider-label{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:500}
.iv-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
.iv-card{background:#FFFDF7;border:1px solid rgba(201,168,76,.2);border-radius:20px;padding:28px;position:relative;overflow:hidden;transition:border-color .2s}
.iv-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#C9A84C,transparent);opacity:0;transition:opacity .3s}
.iv-card:focus-within{border-color:rgba(201,168,76,.5)}
.iv-card:focus-within::before{opacity:1}
.iv-card-hdr{display:flex;align-items:center;gap:12px;margin-bottom:20px}
.iv-card-icon{width:36px;height:36px;border-radius:10px;border:1px solid rgba(201,168,76,.2);background:#F2EDE0;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.iv-card-title{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#0E0E0F;letter-spacing:.3px}
.iv-card-count{margin-left:auto;font-size:11px;color:#9A948C;font-weight:300;white-space:nowrap}
.iv-ta{width:100%;resize:none;outline:none;border:1px solid rgba(201,168,76,.08);border-radius:12px;padding:14px 16px;font-size:13px;font-family:'DM Sans',sans-serif;color:#0E0E0F;background:#FAF8F3;line-height:1.75;transition:border-color .2s,background .2s;caret-color:#C9A84C}
.iv-ta::placeholder{color:#9A948C}
.iv-ta:focus{border-color:rgba(201,168,76,.4);background:#FFFDF7}
.iv-drop{border:1.5px dashed rgba(201,168,76,.2);border-radius:12px;padding:20px 16px;text-align:center;cursor:pointer;margin-bottom:16px;transition:border-color .2s,background .2s}
.iv-drop:hover,.iv-drop.over{border-color:#C9A84C;background:rgba(201,168,76,.07)}
.iv-drop-icon{font-size:22px;margin-bottom:8px;display:block;opacity:.5}
.iv-drop-main{font-size:12px;color:#5A5550;margin-bottom:3px}
.iv-drop-main strong{color:#C9A84C;font-weight:500}
.iv-drop-ext{font-size:10px;color:#9A948C;letter-spacing:1px}
.iv-or{display:flex;align-items:center;gap:12px;margin:14px 0}
.iv-or-line{flex:1;height:1px;background:rgba(201,168,76,.2)}
.iv-or-text{font-size:10px;color:#9A948C;letter-spacing:2px;text-transform:uppercase}
.iv-chip{display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border-radius:100px;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.2);font-size:11px;color:#2A2724;margin-bottom:12px}
.iv-chip-rm{cursor:pointer;color:#9A948C;font-size:14px;line-height:1;border:none;background:none;padding:0}
.iv-char{text-align:right;font-size:10px;color:#9A948C;margin-top:6px;letter-spacing:.5px;transition:color .2s}
.iv-char.ok{color:#C9A84C}
.iv-status{display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:12px;font-size:12px;margin-bottom:12px}
.iv-status.ready{background:rgba(34,197,94,.06);color:#15803d;border:1px solid rgba(34,197,94,.2)}
.iv-status.warn{background:rgba(201,168,76,.08);color:#92611a;border:1px solid rgba(201,168,76,.2)}
.iv-status.err{background:rgba(220,38,38,.06);color:#b91c1c;border:1px solid rgba(220,38,38,.2)}
.iv-status.info{background:rgba(59,130,246,.06);color:#1e40af;border:1px solid rgba(59,130,246,.15)}
.iv-sdot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.ready .iv-sdot{background:#22c55e}.warn .iv-sdot{background:#C9A84C}.err .iv-sdot{background:#ef4444}.info .iv-sdot{background:#3b82f6;animation:ivpulse 1.5s infinite}
.iv-plan{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-radius:12px;background:#F2EDE0;border:1px solid rgba(201,168,76,.2);margin-bottom:12px}
.iv-plan-name{font-size:12px;font-weight:500;color:#2A2724;text-transform:capitalize;letter-spacing:.5px}
.iv-plan-detail{font-size:11px;color:#9A948C;margin-top:1px}
.iv-sess{display:flex;gap:4px;align-items:center}
.iv-sess-dot{width:8px;height:8px;border-radius:50%;background:#C9A84C}
.iv-sess-dot.used{background:rgba(201,168,76,.2)}
.iv-err-box{padding:12px 16px;border-radius:12px;background:rgba(220,38,38,.06);border:1px solid rgba(220,38,38,.2);color:#b91c1c;font-size:12px;margin-bottom:14px;display:flex;gap:8px}
.iv-cta{width:100%;height:56px;border-radius:14px;font-size:13px;font-weight:500;letter-spacing:2.5px;text-transform:uppercase;border:none;cursor:pointer;background:#0E0E0F;color:#E8C97A;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:10px;position:relative;overflow:hidden;transition:transform .15s,box-shadow .2s}
.iv-cta::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,transparent 40%,rgba(201,168,76,.12) 100%);pointer-events:none}
.iv-cta:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 32px rgba(201,168,76,.2)}
.iv-cta:active:not(:disabled){transform:translateY(0)}
.iv-cta:disabled{cursor:not-allowed;background:#F2EDE0;color:#9A948C}
.iv-cta-arrow{width:20px;height:20px;border:1px solid rgba(201,168,76,.4);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;transition:transform .2s}
.iv-cta:hover:not(:disabled) .iv-cta-arrow{transform:translateX(3px)}
.iv-spinner{width:16px;height:16px;border:2px solid rgba(201,168,76,.3);border-top-color:#E8C97A;border-radius:50%;animation:ivspin .75s linear infinite;flex-shrink:0}
@keyframes ivspin{to{transform:rotate(360deg)}}
`;

// ─── AI Avatar ────────────────────────────────────────────────────────────────
function AIAvatar({ speaking }: { speaking: boolean }) {
  const G = { gold: "#D4A843", goldGlow: "rgba(212,168,67,0.3)", goldLight: "#F0C85A", text: "#1A1A1A", textMid: "#6B5A2A" };
  return (
    <div className="relative w-full h-full flex items-center justify-center"
      style={{ background: "linear-gradient(160deg,#fff 0%,#FFF8E7 60%,#FDF0C0 100%)" }}>
      <div className="flex flex-col items-center gap-3 z-10">
        <div className="relative">
          {speaking && (
            <>
              <motion.div className="absolute rounded-full"
                style={{ inset: "-14px", border: `2px solid ${G.gold}` }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.9, 0.1, 0.9] }}
                transition={{ repeat: Infinity, duration: 1.0 }} />
              <motion.div className="absolute rounded-full"
                style={{ inset: "-26px", border: `1px solid ${G.goldLight}` }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.05, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.4, delay: 0.2 }} />
            </>
          )}
          <motion.div className="rounded-full overflow-hidden"
            style={{
              width: 130, height: 130,
              border: `3px solid ${speaking ? G.gold : "#B8891E"}`,
              boxShadow: speaking ? `0 0 28px ${G.goldGlow}` : "0 4px 20px rgba(212,168,67,0.2)",
            }}
            animate={{ scale: speaking ? [1, 1.02, 1] : 1 }}
            transition={{ repeat: speaking ? Infinity : 0, duration: 1.5 }}>
            <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Aria"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </motion.div>
        </div>
        <div className="text-center">
          <p style={{ fontFamily: "'Georgia',serif", fontWeight: 700, color: G.text, fontSize: 16, letterSpacing: 3 }}>ARIA</p>
          <p style={{ color: G.textMid, fontSize: 10, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase" }}>AI Interviewer</p>
        </div>
        <div className="flex items-end gap-1" style={{ height: 20 }}>
          {[4, 7, 10, 13, 10, 7, 4, 7, 10, 7, 4].map((h, i) => (
            <motion.div key={i} style={{ width: 3, borderRadius: 2, background: speaking ? G.gold : "rgba(212,168,67,0.2)" }}
              animate={speaking ? { height: [`${h}px`, `${h * 2}px`, `${h}px`] } : { height: `${h * 0.5}px` }}
              transition={{ repeat: Infinity, duration: 0.45 + i * 0.04, delay: i * 0.06 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Media Toggle Button ──────────────────────────────────────────────────────
function MediaBtn({ on, onIcon: OnIcon, offIcon: OffIcon, onClick, disabled }: {
  on: boolean; onIcon: any; offIcon: any; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-9 h-9 rounded-full flex items-center justify-center"
      style={{
        background: disabled ? "rgba(150,150,150,0.4)" : on ? "rgba(212,168,67,0.8)" : "rgba(220,38,38,0.8)",
        border: "none", cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}>
      {on ? <OnIcon className="h-4 w-4 text-white" /> : <OffIcon className="h-4 w-4 text-white" />}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InterviewRoom() {
  const navigate = useNavigate();
  const { planLimits, canStartAIInterview, incrementAIInterviewUsage, subscription, loading } = useSubscription();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);
  const transcriptRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [phase, setPhase] = useState<Phase>("prep");
  const [currentQ, setCurrentQ] = useState(0);
  const [displayQ, setDisplayQ] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [tabBanner, setTabBanner] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [camError, setCamError] = useState("");
  const [streamReady, setStreamReady] = useState(false);

  // Prep state
  const [jd, setJd] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState("");
  const [dropOver, setDropOver] = useState(false);

  // ── FIX 1: Never hide Navbar — remove the body attribute manipulation.
  // The Navbar is now always rendered in the prep phase, and hidden only
  // during live via a local flag, not a body attribute that interferes.
  // If your Navbar watches data-iv-phase on body and hides itself, that's
  // why it disappeared. We remove that side-effect entirely.

  // ── Video ref callback ──────────────────────────────────────────────────────
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      el.muted = true;
      el.playsInline = true;
      el.play().catch(console.error);
    }
  }, []);

  // ── TTS ─────────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const trySpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = ["Google US English", "Microsoft Aria Online (Natural) - English (United States)", "Samantha", "Karen"];
      let voice = preferred.map(n => voices.find(v => v.name === n)).find(Boolean)
        ?? voices.find(v => v.lang === "en-US") ?? voices[0];
      const utter = new SpeechSynthesisUtterance(text);
      if (voice) utter.voice = voice;
      utter.pitch = 1.0; utter.rate = 0.92; utter.volume = 1;
      utter.onstart = () => setSpeaking(true);
      utter.onend = utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    };
    window.speechSynthesis.getVoices().length ? trySpeak() : (window.speechSynthesis.onvoiceschanged = trySpeak);
  }, []);

  // ── FIX 2: Camera / mic init — robust permission handling ─────────────────
  // The original code had a broken .catch() that retried the same call,
  // swallowing the real error. We now:
  //  1. Check if the API exists
  //  2. Try video+audio first, fall back to video-only if audio fails
  //  3. Show a specific, actionable error message for each failure mode
  //  4. Re-attempt once if the browser returns a transient error
  useEffect(() => {
    let mounted = true;

    const initMedia = async () => {
      // Guard: API must exist
      if (!navigator.mediaDevices?.getUserMedia) {
        if (mounted) setCamError("Camera/Mic not supported. Use Chrome, Edge, or Safari.");
        return;
      }

      // Try to get camera permission state first (Chrome/Edge only)
      // This catches the "already denied in settings" case without a getUserMedia call
      try {
        if (navigator.permissions) {
          const camPerm = await navigator.permissions.query({ name: "camera" as PermissionName });
          if (camPerm.state === "denied") {
            if (mounted) setCamError(
              "Camera access is blocked. Click the 🔒 icon in the address bar → Site settings → Allow Camera & Microphone, then refresh."
            );
            return;
          }
        }
      } catch {
        // Permissions API not available — that's fine, continue to getUserMedia
      }

      // Primary attempt: video + audio
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        setStreamReady(true);
        setCamError(""); // Clear any previous error
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.play().catch(console.error);
        }
        return; // ✅ Success — stop here
      } catch (err: any) {
        if (!mounted) return;

        // Map DOMException names to user-friendly messages
        const errorMessages: Record<string, string> = {
          NotAllowedError:
            "Permission denied. Click the 🔒 icon in your address bar → Site settings → Allow Camera & Microphone, then refresh this page.",
          SecurityError:
            "Permission denied. Click the 🔒 icon in your address bar → Site settings → Allow Camera & Microphone, then refresh this page.",
          NotFoundError:
            "No camera or microphone detected. Please plug one in and refresh.",
          NotReadableError:
            "Camera is already in use by another app (Zoom, Teams, etc.). Close it and refresh.",
          OverconstrainedError:
            "Your camera doesn't support the required settings. Try a different browser.",
          AbortError:
            "Camera access was interrupted. Please refresh and try again.",
        };

        const knownMessage = errorMessages[err.name];
        if (knownMessage) {
          setCamError(knownMessage);
          return;
        }

        // Unknown error — try video-only fallback (in case mic is the blocker)
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
          streamRef.current = stream;
          setStreamReady(true);
          setCamError("⚠️ Microphone unavailable — camera only. You can still type your answers.");
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.muted = true;
            videoRef.current.playsInline = true;
            videoRef.current.play().catch(console.error);
          }
        } catch (fallbackErr: any) {
          if (mounted) {
            setCamError(`Camera error (${fallbackErr.name}): ${fallbackErr.message}. Please refresh and allow access.`);
          }
        }
      }
    };

    initMedia();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => { streamRef.current?.getAudioTracks().forEach(t => { t.enabled = micOn; }); }, [micOn]);
  useEffect(() => { streamRef.current?.getVideoTracks().forEach(t => { t.enabled = camOn; }); }, [camOn]);

  // Load plan from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("iv_plan");
    if (raw) { try { setPlan(JSON.parse(raw)); } catch { } }
  }, []);

  // Tab visibility proctoring
  useEffect(() => {
    const handler = () => {
      if (document.hidden && phase === "live") {
        setViolations(p => [...p, { time: new Date().toLocaleTimeString(), qNum: currentQ + 1 }]);
        setTabBanner(true);
        setTimeout(() => setTabBanner(false), 5000);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [phase, currentQ]);

  // Timer
  useEffect(() => {
    if (phase === "live") timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // Speak question on change
  useEffect(() => {
    if (phase === "live" && plan && !aiLoading) {
      const q = plan.questions[currentQ];
      if (q) setTimeout(() => speak(q.text), 400);
    }
  }, [currentQ, phase, aiLoading, plan, speak]);

  // ── File handler ────────────────────────────────────────────────────────────
  const handleFile = useCallback((file: File | null) => {
    if (!file) return;
    setResumeFile(file);
    if (file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = e => setResumeText((e.target?.result as string) ?? "");
      reader.readAsText(file);
    }
  }, []);

  // ── Speech toggle ───────────────────────────────────────────────────────────
  const toggleSpeech = useCallback(() => {
    if (listeningRef.current) {
      listeningRef.current = false;
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported. Use Chrome or Edge."); return; }
    if (!micOn) { alert("Enable microphone first."); return; }
    const start = () => {
      const rec = new SR();
      rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
      let final = transcriptRef.current;
      rec.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++)
          e.results[i].isFinal ? (final += e.results[i][0].transcript + " ") : (interim += e.results[i][0].transcript);
        transcriptRef.current = final;
        setAnswer(final + interim);
      };
      rec.onerror = (e: any) => {
        if (e.error === "no-speech" && listeningRef.current) setTimeout(start, 100);
        else { listeningRef.current = false; setListening(false); }
      };
      rec.onend = () => { if (listeningRef.current) setTimeout(start, 100); else setListening(false); };
      rec.start();
      recognitionRef.current = rec;
    };
    listeningRef.current = true;
    setListening(true);
    transcriptRef.current = answer;
    start();
  }, [micOn, answer]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Start interview ─────────────────────────────────────────────────────────
  const handleStartInterview = async () => {
    if (!streamReady || loading) {
      alert(loading ? "Checking your plan… try again in a moment." : "Camera not ready yet.");
      return;
    }
    if (!canStartAIInterview()) {
      alert(planLimits?.isOneTime
        ? "You've used your free AI interview session. Upgrade to Starter for 2/month."
        : "You've used all AI interview sessions this month. Upgrade for more.");
      navigate("/pricing");
      return;
    }
    if (plan) {
      speak(`Welcome! I'm Aria. Let's begin your ${plan.role} interview.`);
      setPhase("live");
      return;
    }
    if (!jd.trim()) { setPlanError("Please paste a Job Description."); return; }
    if (!resumeText.trim()) { setPlanError("Please paste your résumé text."); return; }
    setPlanError("");
    setGeneratingPlan(true);
    try {
      const raw = await callInterviewAI({
        action: "generate_plan",
        systemPrompt: `You are an expert interviewer. Given a job description and candidate resume, return ONLY valid JSON (no markdown):
{"role":"<title>","level":"<Junior|Mid|Senior>","focus_areas":["area1"],"questions":[{"id":1,"text":"<q>","type":"<Behavioral|Technical|Situational>","hint":"<hint>"}]}
Generate exactly 8 questions tailored to the JD and resume.`,
        userMessage: `JOB DESCRIPTION:\n${jd}\n\nRESUME:\n${resumeText}`,
        maxTokens: 2000,
      });
      const parsed: Plan = JSON.parse(raw.replace(/```json|```/g, "").trim());
      sessionStorage.setItem("iv_plan", JSON.stringify(parsed));
      setPlan(parsed);
      speak(`Welcome! I'm Aria. Let's begin your ${parsed.role} interview.`);
      setPhase("live");
    } catch (e) {
      setPlanError("Failed to generate interview plan. Please try again.");
    } finally {
      setGeneratingPlan(false);
    }
  };

  // ── Submit answer ───────────────────────────────────────────────────────────
  const submitAnswer = async () => {
    if (!plan || !answer.trim() || aiLoading) return;
    listeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    window.speechSynthesis.cancel();
    transcriptRef.current = "";
    const q = plan.questions[currentQ];
    const record: AnswerRecord = { questionId: q.id, question: q.text, answer: answer.trim() };
    const newAnswers = [...answers, record];
    setAnswers(newAnswers);
    setAnswer("");
    if (currentQ === plan.questions.length - 1) {
      setAiLoading(true);
      try {
        const analysis = await callInterviewAI({
          action: "analyze",
          systemPrompt: `You are an expert interviewer. Return ONLY valid JSON (no markdown): {"overallScore":75,"summary":"brief","strengths":["s1"],"improvements":["i1"],"questionScores":[{"id":1,"score":80,"feedback":"brief"}]}`,
          userMessage: `Role: ${plan.role} (${plan.level})\n\n${newAnswers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")}`,
          maxTokens: 1500,
        });
        sessionStorage.setItem("iv_analysis", analysis);
      } catch (e) { console.error(e); }
      sessionStorage.setItem("iv_answers", JSON.stringify(newAnswers));
      sessionStorage.setItem("iv_violations", JSON.stringify(violations));
      sessionStorage.setItem("iv_duration", String(elapsed));
      streamRef.current?.getTracks().forEach(t => t.stop());
      window.speechSynthesis.cancel();
      await incrementAIInterviewUsage();
      navigate("/ai-interview/analysis");
    } else {
      setAiLoading(true);
      setAnswer("");
      transcriptRef.current = "";
      setTimeout(() => {
        setCurrentQ(c => { const next = c + 1; setDisplayQ(next); return next; });
        setAiLoading(false);
      }, 600);
    }
  };

  const endInterview = () => {
    listeningRef.current = false;
    recognitionRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    window.speechSynthesis.cancel();
    navigate("/ai-interview");
  };

  const q = plan?.questions[currentQ];
  const dq = plan ? (plan.questions[displayQ] ?? q) : undefined;
  const progress = plan ? (displayQ / plan.questions.length) * 100 : 0;

  // ── Live phase styles ────────────────────────────────────────────────────────
  const liveCard: React.CSSProperties = {
    background: "#fff", border: "1.5px solid rgba(212,168,67,0.4)",
    borderRadius: 16, boxShadow: "0 2px 16px rgba(212,168,67,0.12)",
  };
  const liveBar: React.CSSProperties = {
    background: "#fff", borderBottom: "1.5px solid rgba(212,168,67,0.4)",
    boxShadow: "0 2px 8px rgba(212,168,67,0.1)",
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    // FIX 1: Wrap everything in a fragment so Navbar sits above the page
    // content without being trapped inside the h-screen flex container.
    // The outer wrapper is now a plain div that stacks vertically.
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'DM Sans',sans-serif", background: "#FAF8F3" }}>

      {/* ── FIX 1: Navbar always visible in prep; hidden during live ─── */}
      {phase !== "live" && <Navbar />}

      {/* Inject prep CSS once */}
      {phase === "prep" && <style>{PREP_CSS}</style>}

      {/* Tab-switch banner */}
      <AnimatePresence>
        {tabBanner && (
          <motion.div initial={{ y: -56 }} animate={{ y: 0 }} exit={{ y: -56 }}
            className="fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-bold"
            style={{ background: "#dc2626", color: "#fff", letterSpacing: 1 }}>
            ⚠️ Tab switch detected! ({violations.length} violation{violations.length !== 1 ? "s" : ""})
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PREP PHASE ────────────────────────────────────────────────────── */}
      {phase === "prep" && (
        <div className="iv-prep flex-1 overflow-y-auto">
          <div className="iv-page">

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 52, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div className="iv-badge">
                <div className="iv-badge-dot" />
                <span>AI Interview Simulator</span>
              </div>
              <h1 className="iv-h1">Your Personal<br /><em>Interview Coach</em></h1>
              <p className="iv-sub">
                Paste the job description and your résumé. Aria builds a tailored 8-question session,
                conducts the live interview, then delivers a full performance report.
              </p>
              <div className="iv-pills">
                {["◈ 8 tailored questions", "◉ Camera + mic proctored", "◆ Full AI score report"].map(t => (
                  <div key={t} className="iv-pill">{t}</div>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div className="iv-steps">
              {[["1", "Provide context", true], ["2", "Live interview", false], ["3", "Performance report", false]].map(
                ([num, label, active], i) => (
                  <div key={num as string} style={{ display: "flex", alignItems: "center" }}>
                    {i > 0 && <div className="iv-connector" />}
                    <div className="iv-step">
                      <div className={`iv-step-num${active ? " active" : ""}`}>{num}</div>
                      <span className={`iv-step-label${active ? " active" : ""}`}>{label}</span>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Section divider */}
            <div className="iv-divider">
              <div className="iv-divider-line" />
              <div className="iv-divider-label">Session Setup</div>
              <div className="iv-divider-line" />
            </div>

            {/* Two cards */}
            <div className="iv-grid">

              {/* JD */}
              <div className="iv-card">
                <div className="iv-card-hdr">
                  <div className="iv-card-icon">📋</div>
                  <span className="iv-card-title">Job Description</span>
                  <span className="iv-card-count">{jd.length > 0 ? `${jd.length.toLocaleString()} chars` : "0 chars"}</span>
                </div>
                <textarea
                  className="iv-ta"
                  value={jd}
                  rows={13}
                  onChange={e => setJd(e.target.value)}
                  placeholder="Paste the full job description here — role, responsibilities, requirements…"
                />
                <div className={`iv-char${jd.length > 500 ? " ok" : ""}`}>
                  {jd.length > 500 ? "✓ Good detail level" : "Include role, responsibilities, and requirements"}
                </div>
              </div>

              {/* Resume */}
              <div className="iv-card">
                <div className="iv-card-hdr">
                  <div className="iv-card-icon">📄</div>
                  <span className="iv-card-title">Your Résumé</span>
                  <span className="iv-card-count">{resumeText.length > 0 ? `${resumeText.length.toLocaleString()} chars` : "0 chars"}</span>
                </div>

                {/* Drop zone */}
                {!resumeFile ? (
                  <div
                    className={`iv-drop${dropOver ? " over" : ""}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDropOver(true); }}
                    onDragLeave={() => setDropOver(false)}
                    onDrop={e => { e.preventDefault(); setDropOver(false); handleFile(e.dataTransfer.files[0]); }}>
                    <span className="iv-drop-icon">↑</span>
                    <p className="iv-drop-main">Drop your résumé or <strong>browse files</strong></p>
                    <p className="iv-drop-ext">.TXT · .PDF supported</p>
                    <input ref={fileInputRef} type="file" accept=".txt,.pdf" style={{ display: "none" }}
                      onChange={e => handleFile(e.target.files?.[0] ?? null)} />
                  </div>
                ) : (
                  <div className="iv-chip" style={{ marginBottom: 16 }}>
                    <span>📎</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{resumeFile.name}</span>
                    <button className="iv-chip-rm" onClick={() => { setResumeFile(null); setResumeText(""); }}>✕</button>
                  </div>
                )}

                <div className="iv-or">
                  <div className="iv-or-line" /><span className="iv-or-text">or paste text</span><div className="iv-or-line" />
                </div>

                <textarea
                  className="iv-ta"
                  value={resumeText}
                  rows={7}
                  onChange={e => setResumeText(e.target.value)}
                  placeholder="Paste your résumé text here — experience, skills, education, achievements…"
                />
                <div className={`iv-char${resumeText.length > 300 ? " ok" : ""}`}>
                  {resumeText.length > 300 ? "✓ Résumé detected" : "Include experience, skills, and education"}
                </div>
              </div>
            </div>

            {/* Plan banner */}
            {subscription && planLimits && (
              <div className="iv-plan">
                <div>
                  <div className="iv-plan-name">{subscription.plan_type} Plan</div>
                  <div className="iv-plan-detail">
                    {planLimits.isOneTime
                      ? `${planLimits.maxAIInterviewsPerMonth} free session total`
                      : `${planLimits.maxAIInterviewsPerMonth} sessions / month`}
                  </div>
                </div>
                <div className="iv-sess">
                  {Array.from({ length: planLimits.maxAIInterviewsPerMonth }).map((_, i) => (
                    <div key={i} className={`iv-sess-dot${i === 0 ? " used" : ""}`} />
                  ))}
                </div>
              </div>
            )}

            {/* Camera status */}
            {streamReady ? (
              <div className="iv-status ready" style={{ marginBottom: 12 }}>
                <div className="iv-sdot" /><span>Camera and microphone ready</span>
              </div>
            ) : camError ? (
              <div className="iv-status err" style={{ marginBottom: 12 }}>
                <div className="iv-sdot" /><span>{camError}</span>
              </div>
            ) : (
              <div className="iv-status info" style={{ marginBottom: 12 }}>
                <div className="iv-sdot" /><span>Requesting camera and microphone access…</span>
              </div>
            )}

            {/* Error */}
            {planError && (
              <div className="iv-err-box">
                <span>⚠</span><span>{planError}</span>
              </div>
            )}

            {/* CTA */}
            <button
              className="iv-cta"
              onClick={handleStartInterview}
              disabled={!streamReady || generatingPlan}>
              {generatingPlan ? (
                <><div className="iv-spinner" /><span>Generating your interview…</span></>
              ) : !streamReady ? (
                <span>Waiting for camera access…</span>
              ) : (
                <><span>Begin Interview Session</span><span className="iv-cta-arrow">→</span></>
              )}
            </button>

          </div>
        </div>
      )}

      {/* ── LIVE PHASE ─────────────────────────────────────────────────────── */}
      {phase === "live" && q && (
        // FIX 1: Live phase gets its own full-screen container
        <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#FAF8F3", zIndex: 40 }}>
          {/* Top bar */}
          <div className="flex items-center gap-3 px-4 shrink-0" style={{ ...liveBar, height: 56 }}>
            <div className="flex-1 min-w-0 flex items-center gap-3 overflow-hidden rounded-xl px-3 py-1.5"
              style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.4)", height: 38 }}>
              <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold"
                style={{ background: "#D4A843", color: "#fff", letterSpacing: 1 }}>
                Q{(displayQ ?? 0) + 1}/{plan!.questions.length}
              </span>
              <div className="min-w-0 flex-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                <p className="text-sm font-semibold whitespace-nowrap" style={{ color: "#1A1A1A" }}>{dq?.text}</p>
              </div>
              <span className="shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium"
                style={{ background: "rgba(212,168,67,0.12)", color: "#B8891E", border: "1px solid rgba(212,168,67,0.4)", whiteSpace: "nowrap" }}>
                {dq?.type}
              </span>
            </div>
            <div className="shrink-0 flex items-center gap-2 rounded-xl px-3"
              style={{ height: 38, background: "rgba(212,168,67,0.1)", border: "1.5px solid rgba(212,168,67,0.4)", minWidth: 110 }}>
              <span style={{ color: "#9A7B3A", fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>TIME</span>
              <span style={{ fontFamily: "'Courier New',monospace", fontSize: 19, fontWeight: 700, color: "#B8891E", letterSpacing: 2 }}>
                {formatTime(elapsed)}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
                <span style={{ color: "#ef4444", fontSize: 9, fontWeight: 700, letterSpacing: 2 }}>LIVE</span>
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-0.5 shrink-0" style={{ background: "rgba(212,168,67,0.15)" }}>
            <motion.div style={{ height: "100%", background: "linear-gradient(90deg,#B8891E,#D4A843)" }}
              animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
          </div>

          {/* Video panels */}
          <div className="flex gap-3 p-3 flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 min-w-0 rounded-2xl overflow-hidden relative" style={liveCard}>
              <AIAvatar speaking={speaking} />
              <div className="absolute bottom-3 left-3 rounded-xl px-3 py-1.5 flex items-center gap-2"
                style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(212,168,67,0.4)" }}>
                <div className="h-2 w-2 rounded-full" style={{ background: "#D4A843" }} />
                <span style={{ color: "#6B5A2A", fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>AI INTERVIEWER</span>
              </div>
            </div>

            <div className="flex-1 min-w-0 rounded-2xl overflow-hidden relative" style={liveCard}>
              <video ref={setVideoRef} autoPlay playsInline muted
                style={{
                  width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)",
                  display: camOn && streamReady ? "block" : "none",
                }} />
              {(!camOn || !streamReady) && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.4)" }}>
                    <VideoOff className="h-7 w-7" style={{ color: "#D4A843" }} />
                  </div>
                  <p className="text-xs" style={{ color: "#6B5A2A" }}>{!streamReady ? "Initialising camera…" : "Camera off"}</p>
                </div>
              )}
              <div className="absolute bottom-3 left-3 rounded-xl px-3 py-1.5 flex items-center gap-2"
                style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(212,168,67,0.4)" }}>
                <div className="h-2 w-2 rounded-full" style={{ background: streamReady ? "#6B5A2A" : "#999" }} />
                <span style={{ color: "#6B5A2A", fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>CANDIDATE</span>
              </div>
              {listening && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1"
                  style={{ background: "rgba(220,38,38,0.85)", border: "1px solid #ef4444" }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: 2 }}>REC</span>
                </div>
              )}
              <div className="absolute bottom-3 right-3 flex gap-2">
                <MediaBtn on={camOn} onIcon={Video} offIcon={VideoOff} onClick={() => setCamOn(c => !c)} disabled={!streamReady} />
                <MediaBtn on={micOn} onIcon={Mic} offIcon={MicOff} onClick={() => setMicOn(m => !m)} disabled={!streamReady} />
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center gap-3 px-4 shrink-0"
            style={{ ...liveBar, height: 56, borderTop: "1.5px solid rgba(212,168,67,0.4)", borderBottom: "none", boxShadow: "0 -2px 8px rgba(212,168,67,0.1)" }}>
            <div className="flex-1 min-w-0 flex items-center rounded-xl overflow-hidden"
              style={{
                height: 38, background: "#fff",
                border: `1.5px solid ${listening ? "#D4A843" : "rgba(212,168,67,0.4)"}`,
                boxShadow: listening ? "0 0 8px rgba(212,168,67,0.3)" : "none",
              }}>
              <input type="text" className="flex-1 h-full px-4 text-sm outline-none bg-transparent"
                style={{ color: "#1A1A1A", fontFamily: "'DM Sans',sans-serif" }}
                placeholder={listening ? "Listening… speak now" : "Type your answer or use mic…"}
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitAnswer(); } }} />
            </div>

            <button onClick={toggleSpeech} disabled={!streamReady || !micOn}
              className="flex items-center gap-1.5 rounded-xl px-3 text-xs font-bold shrink-0"
              style={{
                height: 38,
                background: listening ? "rgba(220,38,38,0.1)" : "rgba(212,168,67,0.1)",
                border: `1.5px solid ${listening ? "#ef4444" : "rgba(212,168,67,0.4)"}`,
                color: listening ? "#dc2626" : "#B8891E",
                cursor: !streamReady || !micOn ? "not-allowed" : "pointer",
                letterSpacing: 1, whiteSpace: "nowrap",
                opacity: !streamReady || !micOn ? 0.5 : 1,
                fontFamily: "'DM Sans',sans-serif",
              }}>
              {listening
                ? <><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />&nbsp;Stop</>
                : <><Mic className="h-3.5 w-3.5" />Mic</>}
            </button>

            <button onClick={submitAnswer} disabled={aiLoading || !answer.trim()}
              className="flex items-center justify-center gap-1.5 rounded-xl px-4 font-bold text-xs shrink-0"
              style={{
                height: 38,
                background: aiLoading || !answer.trim() ? "rgba(212,168,67,0.12)" : "linear-gradient(90deg,#B8891E,#D4A843)",
                color: aiLoading || !answer.trim() ? "#9A7B3A" : "#fff",
                border: "1.5px solid rgba(212,168,67,0.4)",
                letterSpacing: 1, whiteSpace: "nowrap",
                cursor: aiLoading || !answer.trim() ? "not-allowed" : "pointer",
                boxShadow: !aiLoading && answer.trim() ? "0 2px 10px rgba(212,168,67,0.3)" : "none",
                fontFamily: "'DM Sans',sans-serif",
              }}>
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : currentQ === plan!.questions.length - 1 ? "✓ Finish" : "Next →"}
            </button>

            <button onClick={endInterview} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(220,38,38,0.08)", border: "1.5px solid rgba(220,38,38,0.3)", cursor: "pointer" }}>
              <PhoneOff className="h-4 w-4 text-red-400" />
            </button>
          </div>
        </div>
      )}

      {/* ── DONE PHASE ─────────────────────────────────────────────────────── */}
      {phase === "done" && (
        <div className="flex-1 flex items-center justify-center" style={{ background: "#FAF8F3" }}>
          <div className="text-center space-y-4 rounded-3xl p-12"
            style={{ background: "#FFFDF7", border: "2px solid #D4A843", boxShadow: "0 8px 40px rgba(212,168,67,0.2)" }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              style={{ width: 48, height: 48, margin: "0 auto" }}>
              <Loader2 className="h-12 w-12" style={{ color: "#D4A843" }} />
            </motion.div>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 600, color: "#0E0E0F", letterSpacing: 2 }}>
              INTERVIEW COMPLETE
            </p>
            <p style={{ color: "#5A5550", fontSize: 13, letterSpacing: 1 }}>Generating your performance report…</p>
          </div>
        </div>
      )}
    </div>
  );
}