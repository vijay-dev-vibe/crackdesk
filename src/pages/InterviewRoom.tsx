import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, Loader2, PhoneOff, Video, VideoOff, FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { callInterviewAI } from "@/lib/interviewAI";
import { useSubscription } from "@/hooks/useSubscription";
import Navbar from "@/components/Navbar";

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "prep" | "camera-check" | "live" | "done";
interface Violation { time: string; qNum: number }
interface AnswerRecord { questionId: number; question: string; answer: string; questionType?: string }
interface Plan {
  role: string; level: string; focus_areas: string[];
  questions: { id: number; text: string; type: string; hint: string }[];
}

// ─── Session helpers ──────────────────────────────────────────────────────────
const IV_KEYS = ["iv_plan","iv_analysis","iv_answers","iv_violations","iv_duration"];
const clearSession = () => IV_KEYS.forEach(k => sessionStorage.removeItem(k));

// ─── PDF text extraction via pdf.js CDN ──────────────────────────────────────
async function extractPdfText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const script = document.getElementById("pdfjs-script");
    const run = async () => {
      try {
        const pdfjsLib = (window as any)["pdfjs-dist/build/pdf"];
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
        }
        resolve(fullText.trim());
      } catch (e) { reject(e); }
    };
    if ((window as any)["pdfjs-dist/build/pdf"]) { run(); return; }
    if (!script) {
      const s = document.createElement("script");
      s.id = "pdfjs-script";
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = run;
      s.onerror = () => reject(new Error("Failed to load PDF.js"));
      document.head.appendChild(s);
    } else {
      script.addEventListener("load", run);
    }
  });
}

// ─── AI Avatar ────────────────────────────────────────────────────────────────
function AIAvatar({ speaking }: { speaking: boolean }) {
  return (
    <div style={{
      width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(145deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)",
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative" }}>
          {speaking && (
            <>
              <motion.div style={{
                position: "absolute", inset: -18, borderRadius: "50%",
                border: "2px solid rgba(99,102,241,0.6)",
              }} animate={{ scale: [1, 1.18, 1], opacity: [0.8, 0.1, 0.8] }}
                transition={{ repeat: Infinity, duration: 1.2 }} />
              <motion.div style={{
                position: "absolute", inset: -32, borderRadius: "50%",
                border: "1px solid rgba(99,102,241,0.3)",
              }} animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.05, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.6, delay: 0.3 }} />
            </>
          )}
          <motion.div style={{
            width: 120, height: 120, borderRadius: "50%", overflow: "hidden",
            border: `3px solid ${speaking ? "#6366F1" : "#334155"}`,
            boxShadow: speaking ? "0 0 32px rgba(99,102,241,0.4)" : "0 4px 24px rgba(0,0,0,0.5)",
          }} animate={{ scale: speaking ? [1, 1.03, 1] : 1 }}
            transition={{ repeat: speaking ? Infinity : 0, duration: 1.5 }}>
            <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Aria"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </motion.div>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#E2E8F0", fontSize: 15, letterSpacing: 4, textTransform: "uppercase" }}>Aria</p>
          <p style={{ color: "#6366F1", fontSize: 9, fontWeight: 600, letterSpacing: 5, textTransform: "uppercase", marginTop: 2 }}>AI Interviewer</p>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 22 }}>
          {[3,6,9,12,9,6,3,6,9,6,3].map((h, i) => (
            <motion.div key={i} style={{ width: 3, borderRadius: 2, background: speaking ? "#6366F1" : "rgba(99,102,241,0.25)" }}
              animate={speaking ? { height: [`${h}px`, `${h*2.2}px`, `${h}px`] } : { height: `${h*0.5}px` }}
              transition={{ repeat: Infinity, duration: 0.4 + i * 0.04, delay: i * 0.06 }} />
          ))}
        </div>
      </div>
    </div>
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
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState("");
  const [dropOver, setDropOver] = useState(false);

  // Camera check phase state
  const [cameraCheckStep, setCameraCheckStep] = useState<"requesting"|"ready"|"error">("requesting");

  // ── Fresh mount: wipe session ────────────────────────────────────────────
  useEffect(() => {
    clearSession();
    setPlan(null);
    setPhase("prep");
    setCurrentQ(0);
    setDisplayQ(0);
    setAnswer("");
    setAnswers([]);
    setElapsed(0);
    setViolations([]);
  }, []);

  // ── Video ref callback ────────────────────────────────────────────────────
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      el.muted = true;
      el.playsInline = true;
      el.play().catch(console.error);
    }
  }, []);

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const trySpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = ["Google US English","Microsoft Aria Online (Natural) - English (United States)","Samantha","Karen"];
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

  // ── Init camera only when entering camera-check phase ────────────────────
  const initMedia = useCallback(async () => {
    setCameraCheckStep("requesting");
    setCamError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError("Camera/Mic not supported. Use Chrome, Edge, or Safari.");
      setCameraCheckStep("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setStreamReady(true);
      setCamError("");
      setCameraCheckStep("ready");
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.play().catch(console.error);
      }
    } catch (err: any) {
      const msgs: Record<string, string> = {
        NotAllowedError: "Permission denied. Click the 🔒 icon → Site settings → Allow Camera & Microphone, then try again.",
        SecurityError: "Permission denied. Click the 🔒 icon → Site settings → Allow Camera & Microphone, then try again.",
        NotFoundError: "No camera or microphone detected. Please plug one in and try again.",
        NotReadableError: "Camera is already in use by another app (Zoom, Teams, etc.). Close it and try again.",
        OverconstrainedError: "Your camera doesn't support the required settings. Try a different browser.",
        AbortError: "Camera access was interrupted. Please try again.",
      };
      const msg = msgs[err.name] ?? `Camera error (${err.name}). Please allow access and try again.`;
      setCamError(msg);
      setCameraCheckStep("error");
      // Try video only as fallback
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        setStreamReady(true);
        setCamError("⚠️ Microphone unavailable — you can still type your answers.");
        setCameraCheckStep("ready");
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.play().catch(console.error);
        }
      } catch { /* keep error state */ }
    }
  }, []);

  useEffect(() => {
    if (phase === "camera-check") initMedia();
  }, [phase, initMedia]);

  useEffect(() => { streamRef.current?.getAudioTracks().forEach(t => { t.enabled = micOn; }); }, [micOn]);
  useEffect(() => { streamRef.current?.getVideoTracks().forEach(t => { t.enabled = camOn; }); }, [camOn]);

  // ── Tab proctoring ────────────────────────────────────────────────────────
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

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "live") timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // ── Speak question on change ──────────────────────────────────────────────
  useEffect(() => {
    if (phase === "live" && plan) {
      const q = plan.questions[currentQ];
      if (q) {
        const t = setTimeout(() => speak(q.text), 400);
        return () => clearTimeout(t);
      }
    }
  }, [currentQ, phase]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      window.speechSynthesis.cancel();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── File handler: PDF + TXT ───────────────────────────────────────────────
  const handleFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setResumeFile(file);
    setResumeError("");

    if (file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = e => setResumeText((e.target?.result as string) ?? "");
      reader.readAsText(file);
      return;
    }

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setResumeLoading(true);
      try {
        const text = await extractPdfText(file);
        if (text.length < 50) {
          setResumeError("Could not extract text from this PDF. It may be scanned. Please paste your résumé text manually.");
          setResumeText("");
        } else {
          setResumeText(text);
        }
      } catch (e) {
        setResumeError("Failed to read PDF. Please paste your résumé text manually.");
        setResumeText("");
      } finally {
        setResumeLoading(false);
      }
      return;
    }

    setResumeError("Unsupported file type. Please upload .pdf or .txt");
  }, []);

  // ── Speech recognition ────────────────────────────────────────────────────
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

  const stopAll = useCallback(() => {
    listeningRef.current = false;
    recognitionRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    window.speechSynthesis.cancel();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // ── Validate + generate plan, then go to camera-check ────────────────────
const handleBeginClick = async () => {
  if (loading) return;
  if (!canStartAIInterview()) {
    setPlanError(planLimits?.isOneTime
      ? "You've used your free AI interview session. Upgrade to Starter for 2/month."
      : "You've used all AI interview sessions this month. Upgrade for more.");
    return;
  }
    if (!jd.trim()) { setPlanError("Please paste a Job Description."); return; }
    if (!resumeText.trim()) { setPlanError("Please paste or upload your résumé."); return; }
    setPlanError("");
    setGeneratingPlan(true);

    try {
      const raw = await callInterviewAI({
        action: "generate_plan",
        systemPrompt: `You are a senior HR interviewer. Return ONLY valid JSON, no markdown, no explanation:
{"role":"<exact job title from JD>","level":"<Junior|Mid|Senior>","focus_areas":["area1","area2","area3"],"questions":[{"id":1,"text":"<question>","type":"<Behavioral|Technical|Situational>","hint":"<what a good answer includes>"}]}

RULES:
1. The JD defines the role. Generate questions ONLY about the role described in the JD.
2. NEVER ask about skills from the resume unless the JD also explicitly requires them.
3. Use the resume ONLY to find gaps — skills the JD needs but the resume lacks.
4. Mix: 3 Technical (JD-specific), 3 Behavioral (JD responsibilities), 2 Situational (real JD scenarios).
5. Generate exactly 8 questions.`,
        userMessage: `JOB DESCRIPTION:\n${jd}\n\nCANDIDATE RESUME:\n${resumeText}\n\nGenerate 8 interview questions strictly for the role described in the JOB DESCRIPTION above.`,
        maxTokens: 4000,
      });

      let parsed: Plan;
      try {
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let jsonStr = cleaned;
        if (!cleaned.endsWith("}")) {
          const lastQ = cleaned.lastIndexOf('},{"id"');
          const lastS = cleaned.lastIndexOf('"}');
          const cutAt = Math.max(lastQ, lastS);
          if (cutAt > 0) jsonStr = cleaned.substring(0, cutAt + 2) + "]}";
        }
        parsed = JSON.parse(jsonStr);
      } catch {
        setPlanError("Failed to parse interview plan. Please try again.");
        setGeneratingPlan(false);
        return;
      }

      sessionStorage.setItem("iv_plan", JSON.stringify(parsed));
      setPlan(parsed);
      // Now go to camera check phase
      setPhase("camera-check");
    } catch (e) {
      console.error(e);
      setPlanError("Failed to generate interview plan. Please try again.");
    } finally {
      setGeneratingPlan(false);
    }
  };

  // ── Start live interview after camera check ───────────────────────────────
  const handleStartLive = () => {
    if (!streamReady) return;
    speak(`Welcome! I'm Aria. Let's begin your ${plan!.role} interview.`);
    setPhase("live");
  };

  // ── Submit answer ─────────────────────────────────────────────────────────
  const submitAnswer = async () => {
    if (!plan || !answer.trim() || aiLoading) return;
    listeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    window.speechSynthesis.cancel();
    transcriptRef.current = "";

    const q = plan.questions[currentQ];
    const record: AnswerRecord = {
      questionId: q.id, question: q.text,
      answer: answer.trim(), questionType: q.type,
    };
    const newAnswers = [...answers, record];
    setAnswers(newAnswers);
    setAnswer("");

    if (currentQ === plan.questions.length - 1) {
      // Last question — save everything, navigate once
      setAiLoading(true);

      // Save session data BEFORE navigating
      sessionStorage.setItem("iv_answers", JSON.stringify(newAnswers));
      sessionStorage.setItem("iv_violations", JSON.stringify(violations));
      sessionStorage.setItem("iv_duration", String(elapsed));

      stopAll();

      // Fire-and-forget analysis
      (async () => {
        try {
          const analysis = await callInterviewAI({
            action: "analyze",
            systemPrompt: `You are an expert interviewer. Return ONLY valid JSON (no markdown):
{"overallScore":75,"summary":"brief","strengths":["s1"],"improvements":["i1"],"questionScores":[{"id":1,"score":8,"feedback":"brief","keyword_hits":["keyword"]}]}`,
            userMessage: `Role: ${plan.role} (${plan.level})\n\n${newAnswers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")}`,
            maxTokens: 2000,
          });
          sessionStorage.setItem("iv_analysis", analysis);
        } catch (e) { console.error("Analysis failed (non-fatal):", e); }
        try { await incrementAIInterviewUsage(); } catch { /* non-fatal */ }
      })();

      navigate("/ai-interview/analysis", { replace: true });
    } else {
      setAiLoading(true);
      const nextQ = currentQ + 1;
      setTimeout(() => {
        setCurrentQ(nextQ);
        setDisplayQ(nextQ);
        setAiLoading(false);
      }, 600);
    }
  };

  const endInterview = useCallback(() => {
    stopAll();
    clearSession();
    navigate("/dashboard", { replace: true });
  }, [stopAll, navigate]);

  const q = plan?.questions[currentQ];
  const dq = plan ? (plan.questions[displayQ] ?? q) : undefined;
  const progress = plan ? ((displayQ) / plan.questions.length) * 100 : 0;

  // ────────────────────────────────────────────────────────────────────────────
  // STYLES
  // ────────────────────────────────────────────────────────────────────────────
  const C = {
    bg: "#F8F7F4",
    surface: "#FFFFFF",
    border: "#E8E4DE",
    borderAccent: "#C7B89A",
    text: "#1C1917",
    textMid: "#78716C",
    textLight: "#A8A29E",
    accent: "#D89B26",      // Deep forest green — professional, trustworthy
    accentLight: "rgba(45,90,39,0.08)",
    accentBorder: "rgba(45,90,39,0.25)",
    gold: "#B45309",        // Warm amber for secondary highlights
    goldLight: "rgba(180,83,9,0.08)",
    error: "#ddad20",
    errorBg: "rgba(153,27,27,0.06)",
    errorBorder: "rgba(153,27,27,0.2)",
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: PREP PHASE
  // ────────────────────────────────────────────────────────────────────────────
  if (phase === "prep") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
          * { box-sizing: border-box; }
          .field-focus:focus { outline: none; border-color: #D89B26 !important; box-shadow: 0 0 0 3px rgba(45,90,39,0.1); }
          .btn-primary { transition: all 0.2s; }
          .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(45,90,39,0.25); }
          .btn-primary:active:not(:disabled) { transform: translateY(0); }
          .upload-zone:hover { border-color: #D89B26 !important; background: rgba(45,90,39,0.04) !important; }
          ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #D4CFC8; border-radius: 3px; }
        `}</style>
        <Navbar />

        <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 80px" }}>

          {/* Header */}
          <div style={{ marginBottom: 52 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "5px 14px", borderRadius: 100,
              background: C.accentLight, border: `1px solid ${C.accentBorder}`,
              marginBottom: 20,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: C.accent, letterSpacing: 2, textTransform: "uppercase" }}>
                AI Interview Simulator
              </span>
            </div>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(36px, 5vw, 52px)",
              fontWeight: 600, lineHeight: 1.15,
              color: C.text, letterSpacing: "-0.5px",
              marginBottom: 14,
            }}>
              Practice. Prepare. 
              <em style={{ fontStyle: "times new roman", color: C.accent }}> Perform.</em>
            </h1>
            <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.75, maxWidth: 6020, fontWeight: 300 }}>
              Paste the job description and upload your résumé. Aria — your AI interviewer —
              will generate 8 tailored questions, conduct a live video interview, then deliver
              a comprehensive performance report.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
              {["8 tailored questions", "Camera + mic proctored", "Full AI analysis report"].map(t => (
                <span key={t} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 14px", borderRadius: 100,
                  border: `1px solid ${C.border}`, background: C.surface,
                  fontSize: 11, color: C.textMid, fontWeight: 500,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.accent }} />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 44 }}>
            {[["1", "Provide context", true], ["2", "Camera check", false], ["3", "Live interview", false], ["4", "Your report", false]].map(
              ([num, label, active], i) => (
                <div key={String(num)} style={{ display: "flex", alignItems: "center" }}>
                  {i > 0 && <div style={{ width: 36, height: 1, background: C.border, margin: "0 4px" }} />}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: active ? C.accent : C.surface,
                      border: `1.5px solid ${active ? C.accent : C.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 600,
                      color: active ? "#fff" : C.textLight,
                      flexShrink: 0,
                    }}>{num}</div>
                    <span style={{ fontSize: 11, color: active ? C.text : C.textLight, fontWeight: active ? 500 : 400, whiteSpace: "nowrap" }}>
                      {label}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: C.textLight, fontWeight: 600 }}>
              Session Setup
            </span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          {/* Two-column cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

            {/* JD Card */}
            <div style={{
              background: C.surface, border: `1.5px solid ${C.border}`,
              borderRadius: 16, padding: 28,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: C.accentLight, border: `1px solid ${C.accentBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                }}>📋</div>
                <div>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, color: C.text }}>Job Description</p>
                  <p style={{ fontSize: 11, color: C.textLight, marginTop: 1 }}>Role, responsibilities & requirements</p>
                </div>
                {jd.length > 500 && (
                  <CheckCircle2 size={16} style={{ marginLeft: "auto", color: C.accent, flexShrink: 0 }} />
                )}
              </div>
              <textarea
                className="field-focus"
                value={jd}
                rows={14}
                onChange={e => setJd(e.target.value)}
                placeholder="Paste the full job description here — title, responsibilities, required skills…"
                style={{
                  width: "100%", resize: "none", outline: "none",
                  border: `1.5px solid ${C.border}`, borderRadius: 10,
                  padding: "12px 14px", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                  color: C.text, background: C.bg, lineHeight: 1.7,
                  caretColor: C.accent, transition: "border-color 0.2s",
                }}
              />
              <p style={{ fontSize: 10, color: jd.length > 500 ? C.accent : C.textLight, marginTop: 6, textAlign: "right", letterSpacing: 0.5 }}>
                {jd.length > 500 ? "✓ Good detail level" : `${jd.length} chars — include role & requirements`}
              </p>
            </div>

            {/* Resume Card */}
            <div style={{
              background: C.surface, border: `1.5px solid ${C.border}`,
              borderRadius: 16, padding: 28,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: C.goldLight, border: "1px solid rgba(180,83,9,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                }}>📄</div>
                <div>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, color: C.text }}>Your Résumé</p>
                  <p style={{ fontSize: 11, color: C.textLight, marginTop: 1 }}>Experience, skills & education</p>
                </div>
                {resumeText.length > 200 && !resumeLoading && (
                  <CheckCircle2 size={16} style={{ marginLeft: "auto", color: C.accent, flexShrink: 0 }} />
                )}
                {resumeLoading && (
                  <Loader2 size={16} style={{ marginLeft: "auto", color: C.gold, animation: "spin 1s linear infinite", flexShrink: 0 }} />
                )}
              </div>

              {/* Upload zone */}
              {!resumeFile ? (
                <div
                  className="upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDropOver(true); }}
                  onDragLeave={() => setDropOver(false)}
                  onDrop={e => { e.preventDefault(); setDropOver(false); handleFile(e.dataTransfer.files[0]); }}
                  style={{
                    border: `1.5px dashed ${dropOver ? C.accent : C.border}`,
                    borderRadius: 10, padding: "18px 16px", textAlign: "center",
                    cursor: "pointer", marginBottom: 14, transition: "all 0.2s",
                    background: dropOver ? C.accentLight : "transparent",
                  }}>
                  <FileText size={22} style={{ color: C.textLight, margin: "0 auto 8px" }} />
                  <p style={{ fontSize: 12, color: C.textMid, marginBottom: 3 }}>
                    Drop your résumé or <span style={{ color: C.accent, fontWeight: 600 }}>browse files</span>
                  </p>
                  <p style={{ fontSize: 10, color: C.textLight, letterSpacing: 1 }}>.PDF · .TXT supported — auto-extracted</p>
                  <input ref={fileInputRef} type="file" accept=".txt,.pdf"
                    style={{ display: "none" }}
                    onChange={e => handleFile(e.target.files?.[0] ?? null)} />
                </div>
              ) : (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 12px", borderRadius: 8, marginBottom: 14,
                  background: C.accentLight, border: `1px solid ${C.accentBorder}`,
                }}>
                  <FileText size={14} style={{ color: C.accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {resumeFile.name}
                  </span>
                  {resumeLoading && <Loader2 size={12} style={{ color: C.gold, animation: "spin 1s linear infinite", flexShrink: 0 }} />}
                  {!resumeLoading && resumeText && <CheckCircle2 size={12} style={{ color: C.accent, flexShrink: 0 }} />}
                  <button onClick={() => { setResumeFile(null); setResumeText(""); setResumeError(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: C.textLight, fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
              )}

              {resumeLoading && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", borderRadius: 8, marginBottom: 12,
                  background: C.goldLight, border: "1px solid rgba(180,83,9,0.2)",
                  fontSize: 12, color: C.gold,
                }}>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
                  Extracting text from PDF…
                </div>
              )}

              {resumeError && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  padding: "10px 14px", borderRadius: 8, marginBottom: 12,
                  background: C.errorBg, border: `1px solid ${C.errorBorder}`,
                  fontSize: 12, color: C.error,
                }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {resumeError}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "12px 0" }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 10, color: C.textLight, letterSpacing: 2, textTransform: "uppercase" }}>or paste text</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>

              <textarea
                className="field-focus"
                value={resumeText}
                rows={6}
                onChange={e => setResumeText(e.target.value)}
                placeholder="Paste your résumé text — experience, skills, education, achievements…"
                style={{
                  width: "100%", resize: "none", outline: "none",
                  border: `1.5px solid ${C.border}`, borderRadius: 10,
                  padding: "12px 14px", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                  color: C.text, background: C.bg, lineHeight: 1.7,
                  caretColor: C.accent, transition: "border-color 0.2s",
                }}
              />
              <p style={{ fontSize: 10, color: resumeText.length > 200 ? C.accent : C.textLight, marginTop: 6, textAlign: "right", letterSpacing: 0.5 }}>
                {resumeText.length > 200 ? "✓ Résumé detected" : "Include experience, skills & education"}
              </p>
            </div>
          </div>

          {/* Plan info */}
          {subscription && planLimits && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 18px", borderRadius: 10,
              background: C.surface, border: `1.5px solid ${C.border}`, marginBottom: 16,
            }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.text, textTransform: "capitalize" }}>{subscription.plan_type} Plan</p>
                <p style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
                  {planLimits.isOneTime
                    ? `${planLimits.maxAIInterviewsPerMonth} free session total`
                    : `${planLimits.maxAIInterviewsPerMonth} sessions / month`}
                </p>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {Array.from({ length: planLimits.maxAIInterviewsPerMonth }).map((_, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: i === 0 ? C.border : C.accent,
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {planError && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 16px", borderRadius: 10, marginBottom: 16,
              background: C.errorBg, border: `1px solid ${C.errorBorder}`,
              fontSize: 13, color: C.error,
            }}>
              <AlertCircle size={15} />
              {planError}
            </div>
          )}
{/* CTA */}
          {(() => {
            const isLocked = !loading && !canStartAIInterview();
            const isDisabled = generatingPlan || loading || isLocked;
            return (
              <>
                <button
                  className="btn-primary"
                  onClick={handleBeginClick}
                  disabled={isDisabled}
                  style={{
                    width: "100%", height: 54, borderRadius: 12,
                    border: isLocked ? `1.5px solid rgba(153,27,27,0.25)` : "none",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    background: isLocked ? "rgba(153,27,27,0.06)" : generatingPlan ? C.border : C.accent,
                    color: isLocked ? "#991B1B" : generatingPlan ? C.textLight : "#fff",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13, fontWeight: 600, letterSpacing: 2.5, textTransform: "uppercase",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    opacity: loading ? 0.5 : 1,
                    transition: "all 0.2s",
                  }}>
                  {loading ? (
                    <><Loader2 size={16} style={{ animation: "spin 0.75s linear infinite" }} /> Checking your plan…</>
                  ) : isLocked ? (
                    <><span style={{ fontSize: 15 }}>🔒</span><span>Session Limit Reached — Upgrade to Continue</span></>
                  ) : generatingPlan ? (
                    <><Loader2 size={16} style={{ animation: "spin 0.75s linear infinite" }} /> Generating your interview plan…</>
                  ) : (
                    <><span>Begin Interview Session</span><span style={{ fontSize: 16 }}>→</span></>
                  )}
                </button>

                {!loading && isLocked && (
                  <div style={{
                    marginTop: 12, padding: "12px 16px", borderRadius: 10,
                    background: "rgba(153,27,27,0.06)", border: "1px solid rgba(153,27,27,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  }}>
                    <p style={{ fontSize: 12, color: "#991B1B", margin: 0 }}>
                      {planLimits?.isOneTime
                        ? "You've used your free AI interview session."
                        : "You've used all AI interview sessions this month."}
                    </p>
                    <button
                      onClick={() => navigate("/pricing")}
                      style={{
                        flexShrink: 0, padding: "6px 14px", borderRadius: 8,
                        background: C.accent, border: "none", cursor: "pointer",
                        fontSize: 11, fontWeight: 700, color: "#fff",
                        letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap",
                      }}>
                      Upgrade →
                    </button>
                  </div>
                )}

                {!isLocked && (
                  <p style={{ textAlign: "center", fontSize: 11, color: C.textLight, marginTop: 14 }}>
                    Camera & microphone will be requested in the next step
                  </p>
                )}
              </>
            );
          })()}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: CAMERA CHECK PHASE
  // ────────────────────────────────────────────────────────────────────────────
  if (phase === "camera-check") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
          * { box-sizing: border-box; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
        `}</style>
        <Navbar />

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
          <div style={{ width: "100%", maxWidth: 640 }}>

            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "5px 14px", borderRadius: 100,
                background: C.accentLight, border: `1px solid ${C.accentBorder}`,
                marginBottom: 18,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: C.accent, letterSpacing: 2, textTransform: "uppercase" }}>
                  Step 2 of 4 — Camera Check
                </span>
              </div>
              <h2 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(28px, 4vw, 38px)",
                fontWeight: 600, color: C.text, marginBottom: 10,
              }}>
                Let's check your setup
              </h2>
              <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.7 }}>
                We need your camera and microphone before the interview begins.
              </p>
            </div>

            {/* Camera preview */}
            <div style={{
              background: "#0F172A",
              borderRadius: 16, overflow: "hidden",
              aspectRatio: "16/9", marginBottom: 24,
              border: `2px solid ${cameraCheckStep === "ready" ? C.accent : C.border}`,
              position: "relative",
              boxShadow: cameraCheckStep === "ready" ? `0 0 0 4px ${C.accentLight}` : "none",
              transition: "border-color 0.3s, box-shadow 0.3s",
            }}>
              <video
                ref={setVideoRef}
                autoPlay playsInline muted
                style={{
                  width: "100%", height: "100%", objectFit: "cover",
                  transform: "scaleX(-1)",
                  display: streamReady && camOn ? "block" : "none",
                }}
              />
              {(!streamReady || !camOn) && (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
                }}>
                  {cameraCheckStep === "requesting" && (
                    <>
                      <Loader2 size={32} style={{ color: "#6366F1", animation: "spin 1s linear infinite" }} />
                      <p style={{ color: "#94A3B8", fontSize: 13 }}>Requesting camera access…</p>
                    </>
                  )}
                  {cameraCheckStep === "error" && (
                    <>
                      <VideoOff size={32} style={{ color: "#EF4444" }} />
                      <p style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", maxWidth: 320, padding: "0 16px" }}>{camError}</p>
                    </>
                  )}
                </div>
              )}
              {streamReady && (
                <div style={{
                  position: "absolute", bottom: 12, left: 12,
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 100,
                  background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 10, color: "#fff", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>Camera Ready</span>
                </div>
              )}
              {/* Mic/cam controls */}
              {streamReady && (
                <div style={{
                  position: "absolute", bottom: 12, right: 12,
                  display: "flex", gap: 8,
                }}>
                  {[
                    { on: camOn, onI: Video, offI: VideoOff, toggle: () => setCamOn(c => !c) },
                    { on: micOn, onI: Mic, offI: MicOff, toggle: () => setMicOn(m => !m) },
                  ].map(({ on, onI: OnI, offI: OffI, toggle }, i) => (
                    <button key={i} onClick={toggle} style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: on ? "rgba(45,90,39,0.85)" : "rgba(220,38,38,0.8)",
                      border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {on ? <OnI size={15} color="#fff" /> : <OffI size={15} color="#fff" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status checks */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Camera", ok: streamReady && camOn, loading: cameraCheckStep === "requesting" },
                { label: "Microphone", ok: streamReady && micOn, loading: cameraCheckStep === "requesting" },
              ].map(({ label, ok, loading: ld }) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 16px", borderRadius: 10,
                  background: ok ? C.accentLight : ld ? "rgba(99,102,241,0.06)" : C.errorBg,
                  border: `1.5px solid ${ok ? C.accentBorder : ld ? "rgba(99,102,241,0.2)" : C.errorBorder}`,
                }}>
                  {ld ? (
                    <Loader2 size={16} style={{ color: "#6366F1", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                  ) : ok ? (
                    <CheckCircle2 size={16} style={{ color: C.accent, flexShrink: 0 }} />
                  ) : (
                    <AlertCircle size={16} style={{ color: C.error, flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: 13, fontWeight: 500, color: ok ? C.accent : ld ? "#6366F1" : C.error }}>
                    {label} {ld ? "checking…" : ok ? "ready" : "unavailable"}
                  </span>
                </div>
              ))}
            </div>

            {/* Interview info */}
            {plan && (
              <div style={{
                padding: "14px 18px", borderRadius: 10,
                background: C.surface, border: `1.5px solid ${C.border}`,
                marginBottom: 24,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Clock size={15} style={{ color: C.textMid, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: C.text }}>
                      {plan.role} — {plan.level} Interview
                    </p>
                    <p style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
                      {plan.questions.length} questions · Camera + microphone required · Stay on this tab
                    </p>
                  </div>
                </div>
              </div>
            )}

            {cameraCheckStep === "error" && !streamReady && (
              <button onClick={initMedia} style={{
                width: "100%", height: 46, borderRadius: 10,
                border: `1.5px solid ${C.border}`, background: C.surface,
                color: C.text, fontFamily: "'DM Sans', sans-serif",
                fontSize: 13, fontWeight: 500, cursor: "pointer", marginBottom: 12,
              }}>
                Try Again
              </button>
            )}

            <button
              onClick={handleStartLive}
              disabled={!streamReady}
              style={{
                width: "100%", height: 54, borderRadius: 12,
                border: "none", cursor: streamReady ? "pointer" : "not-allowed",
                background: streamReady ? C.accent : C.border,
                color: streamReady ? "#fff" : C.textLight,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13, fontWeight: 600, letterSpacing: 2.5, textTransform: "uppercase",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "all 0.2s",
              }}>
              {!streamReady ? (
                cameraCheckStep === "requesting"
                  ? <><Loader2 size={16} style={{ animation: "spin 0.75s linear infinite" }} /> Requesting access…</>
                  : "Camera unavailable — cannot start"
              ) : (
                <><span>Start Interview</span><span style={{ fontSize: 16 }}>→</span></>
              )}
            </button>

            <button onClick={() => { stopAll(); setPhase("prep"); setStreamReady(false); }}
              style={{
                width: "100%", marginTop: 10, padding: "10px 0",
                background: "none", border: "none", cursor: "pointer",
                fontSize: 12, color: C.textLight, fontFamily: "'DM Sans', sans-serif",
              }}>
              ← Back to setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: LIVE PHASE
  // ────────────────────────────────────────────────────────────────────────────
  if (phase === "live" && q) {
    const liveCard: React.CSSProperties = {
      background: "#fff",
      border: "1.5px solid #E8E4DE",
      borderRadius: 16,
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    };
    const liveBar: React.CSSProperties = {
      background: "#fff",
      borderBottom: "1.5px solid #E8E4DE",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    };

    return (
      <div style={{
        position: "fixed", inset: 0, display: "flex", flexDirection: "column",
        background: "#F8F7F4", zIndex: 40,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:wght@300;400;500;600&display=swap');
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
        `}</style>

        <AnimatePresence>
          {tabBanner && (
            <motion.div initial={{ y: -52 }} animate={{ y: 0 }} exit={{ y: -52 }}
              style={{
                position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
                padding: "12px 16px", textAlign: "center",
                background: "#991B1B", color: "#fff",
                fontSize: 13, fontWeight: 600, letterSpacing: 0.5,
              }}>
              ⚠️ Tab switch detected — {violations.length} violation{violations.length !== 1 ? "s" : ""} recorded
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top bar */}
        <div style={{ ...liveBar, height: 56, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", flexShrink: 0 }}>
          <div style={{
            flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10,
            background: "#F8F7F4", border: "1.5px solid #E8E4DE",
            borderRadius: 10, padding: "0 12px", height: 38, overflow: "hidden",
          }}>
            <span style={{
              flexShrink: 0, background: C.accent, color: "#fff",
              borderRadius: 100, padding: "2px 10px", fontSize: 10,
              fontWeight: 700, letterSpacing: 1.5, whiteSpace: "nowrap",
            }}>
              Q{(displayQ ?? 0) + 1}/{plan!.questions.length}
            </span>
            <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
              <p style={{
                fontSize: 13, fontWeight: 500, color: C.text,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {dq?.text}
              </p>
            </div>
            <span style={{
              flexShrink: 0, background: C.accentLight, color: C.accent,
              border: `1px solid ${C.accentBorder}`,
              borderRadius: 6, padding: "2px 8px", fontSize: 10,
              fontWeight: 600, letterSpacing: 1, whiteSpace: "nowrap",
            }}>
              {dq?.type}
            </span>
          </div>
          <div style={{
            flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
            background: "#F8F7F4", border: "1.5px solid #E8E4DE",
            borderRadius: 10, padding: "0 12px", height: 38, minWidth: 110,
          }}>
            <span style={{ fontSize: 9, color: C.textLight, letterSpacing: 2, textTransform: "uppercase" }}>Time</span>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: 2 }}>
              {formatTime(elapsed)}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#EF4444", animation: "pulse 1.5s infinite" }} />
              <span style={{ color: "#EF4444", fontSize: 9, fontWeight: 700, letterSpacing: 2 }}>LIVE</span>
            </span>
          </div>
        </div>

        {/* Progress */}
        <div style={{ height: 2, background: C.border, flexShrink: 0 }}>
          <motion.div style={{ height: "100%", background: C.accent }}
            animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
        </div>

        {/* Video panels */}
        <div style={{ display: "flex", gap: 10, padding: 10, flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0, borderRadius: 14, overflow: "hidden", ...liveCard, position: "relative" }}>
            <AIAvatar speaking={speaking} />
            <div style={{
              position: "absolute", bottom: 10, left: 10,
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 100,
              background: "rgba(255,255,255,0.92)", border: `1px solid ${C.border}`,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: speaking ? "#6366F1" : C.border }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: C.textMid, letterSpacing: 2, textTransform: "uppercase" }}>AI Interviewer</span>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0, borderRadius: 14, overflow: "hidden", ...liveCard, position: "relative" }}>
            <video ref={setVideoRef} autoPlay playsInline muted
              style={{
                width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)",
                display: camOn && streamReady ? "block" : "none",
              }} />
            {(!camOn || !streamReady) && (
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, background: "#F8F7F4" }}>
                <VideoOff size={28} style={{ color: C.textLight }} />
                <p style={{ fontSize: 12, color: C.textLight }}>{!streamReady ? "Initialising…" : "Camera off"}</p>
              </div>
            )}
            <div style={{
              position: "absolute", bottom: 10, left: 10,
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 100,
              background: "rgba(255,255,255,0.92)", border: `1px solid ${C.border}`,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: streamReady ? C.accent : C.border }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: C.textMid, letterSpacing: 2, textTransform: "uppercase" }}>Candidate</span>
            </div>
            {listening && (
              <div style={{
                position: "absolute", top: 10, left: 10,
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: 100,
                background: "rgba(220,38,38,0.85)",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", animation: "pulse 1s infinite" }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: 2 }}>REC</span>
              </div>
            )}
            <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", gap: 8 }}>
              {[
                { on: camOn, onI: Video, offI: VideoOff, toggle: () => setCamOn(c => !c) },
                { on: micOn, onI: Mic, offI: MicOff, toggle: () => setMicOn(m => !m) },
              ].map(({ on, onI: OnI, offI: OffI, toggle }, i) => (
                <button key={i} onClick={toggle} disabled={!streamReady} style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: on ? "rgba(45,90,39,0.85)" : "rgba(220,38,38,0.8)",
                  border: "none", cursor: streamReady ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {on ? <OnI size={14} color="#fff" /> : <OffI size={14} color="#fff" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          background: "#fff",
          borderTop: `1.5px solid ${C.border}`,
          boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
          height: 56, display: "flex", alignItems: "center", gap: 10,
          padding: "0 12px", flexShrink: 0,
        }}>
          <div style={{
            flex: 1, minWidth: 0, display: "flex", alignItems: "center",
            borderRadius: 10, overflow: "hidden", height: 38, background: "#fff",
            border: `1.5px solid ${listening ? C.accent : C.border}`,
            transition: "border-color 0.2s",
          }}>
            <input
              type="text"
              style={{
                flex: 1, height: "100%", padding: "0 14px",
                fontSize: 13, outline: "none", border: "none", background: "transparent",
                color: C.text, fontFamily: "'DM Sans', sans-serif",
              }}
              placeholder={listening ? "Listening — speak now…" : "Type your answer or use the mic…"}
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitAnswer(); } }}
            />
          </div>

          <button onClick={toggleSpeech} disabled={!streamReady || !micOn} style={{
            height: 38, borderRadius: 10, padding: "0 12px",
            display: "flex", alignItems: "center", gap: 6,
            background: listening ? "rgba(220,38,38,0.08)" : C.accentLight,
            border: `1.5px solid ${listening ? "#EF4444" : C.accentBorder}`,
            color: listening ? "#DC2626" : C.accent,
            cursor: (!streamReady || !micOn) ? "not-allowed" : "pointer",
            fontSize: 12, fontWeight: 600, letterSpacing: 1, whiteSpace: "nowrap",
            opacity: (!streamReady || !micOn) ? 0.4 : 1,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {listening
              ? <><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#EF4444", animation: "pulse 1s infinite" }} /> Stop</>
              : <><Mic size={13} /> Mic</>}
          </button>

          <button onClick={submitAnswer} disabled={aiLoading || !answer.trim()} style={{
            height: 38, borderRadius: 10, padding: "0 16px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: (aiLoading || !answer.trim()) ? C.border : C.accent,
            color: (aiLoading || !answer.trim()) ? C.textLight : "#fff",
            border: "none",
            cursor: (aiLoading || !answer.trim()) ? "not-allowed" : "pointer",
            fontSize: 12, fontWeight: 600, letterSpacing: 1, whiteSpace: "nowrap",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {aiLoading
              ? <Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} />
              : currentQ === plan!.questions.length - 1 ? "✓ Finish" : "Next →"}
          </button>

          <button onClick={endInterview} style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "rgba(220,38,38,0.08)", border: "1.5px solid rgba(220,38,38,0.25)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <PhoneOff size={15} style={{ color: "#DC2626" }} />
          </button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: DONE PHASE
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        textAlign: "center", padding: "48px 56px",
        background: C.surface, borderRadius: 20,
        border: `2px solid ${C.border}`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
      }}>
        <Loader2 size={40} style={{ color: C.accent, animation: "spin 1.2s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: C.text, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
          Interview Complete
        </p>
        <p style={{ color: C.textMid, fontSize: 13 }}>Generating your performance report…</p>
      </div>
    </div>
  );
}