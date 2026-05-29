import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── CONFIG ────────────────────────────────────────────────
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz--BBRPMPA7k2Ne2FOhZfBLgzzk9rA-DjPnJU-S35MTWMmQlyE7dQEJxmVep2Y-qkS/exec";
// ─────────────────────────────────────────────────────────

type Step = "greeting" | "page" | "problem" | "done";

interface Message {
  from: "lima" | "user";
  text: string;
}

const PAGES = [
  "Home",
  "Pricing",
  "Dashboard",
  "Mock Test",
  "AI Interview",
  "Profile",
  "Results",
  "Other",
];

const limaGreeting =
  "Hi! 👋 I'm **Lima**, your feedback assistant. Which page were you on when you found an issue?";

export default function LimaBot() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("greeting");

  const [messages, setMessages] = useState<Message[]>([
    {
      from: "lima",
      text: limaGreeting,
    },
  ]);

  const [selectedPage, setSelectedPage] = useState("");
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pulse, setPulse] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Greeting → page
  useEffect(() => {
    if (step === "greeting") {
      const timer = setTimeout(() => {
        setStep("page");
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [step]);

  // Floating pulse
  useEffect(() => {
    const interval = setInterval(() => {
      if (!open) {
        setPulse(true);

        setTimeout(() => {
          setPulse(false);
        }, 1000);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [open]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  function addMessage(message: Message) {
    setMessages((prev) => [...prev, message]);
  }

  function limaReply(text: string) {
    setTimeout(() => {
      addMessage({
        from: "lima",
        text,
      });
    }, 400);
  }

  function handlePageSelect(page: string) {
    setSelectedPage(page);

    addMessage({
      from: "user",
      text: page,
    });

    limaReply(
      `Got it — **${page}**. Now describe the issue below or hold 🎙 to record your voice.`
    );

    setStep("problem");
  }

  function handleSendText() {
    const trimmed = input.trim();

    if (!trimmed || submitting) return;

    addMessage({
      from: "user",
      text: trimmed,
    });

    setInput("");

    submitFeedback(selectedPage, trimmed);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const recorder = new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(chunksRef.current, {
          type: "audio/webm",
        });

        addMessage({
          from: "user",
          text: "🎙 Voice feedback recorded",
        });

        await submitFeedback(
          selectedPage,
          "[Voice Recording Submitted]",
          blob
        );
      };

      recorder.start();

      mediaRef.current = recorder;

      setRecording(true);
    } catch (error) {
      console.error(error);

      limaReply(
        "⚠️ Microphone permission denied. Please type your feedback instead."
      );
    }
  }

  function stopRecording() {
    if (mediaRef.current && recording) {
      mediaRef.current.stop();
      setRecording(false);
    }
  }

  async function submitFeedback(
    page: string,
    problem: string,
    _audio?: Blob
  ) {
    try {
      setSubmitting(true);

      limaReply("Sending your feedback... ✨");

      const payload = {
        timestamp: new Date().toISOString(),
        page,
        problem,
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      // ✅ FIXED FETCH FOR GOOGLE APPS SCRIPT
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify(payload),
      });

      // Since no-cors hides response,
      // assume success if no fetch error occurs

      limaReply(
        "✅ Feedback submitted successfully! Thank you for helping us improve."
      );

      setStep("done");
    } catch (error) {
      console.error(error);

      limaReply(
        "⚠️ Unable to send feedback right now. Please try again later."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetChat() {
    setMessages([
      {
        from: "lima",
        text: limaGreeting,
      },
    ]);

    setSelectedPage("");
    setInput("");
    setStep("greeting");
  }

  function renderBubble(text: string) {
    const parts = text.split(/\*\*(.+?)\*\*/g);

    return parts.map((part, index) =>
      index % 2 === 1 ? (
        <strong key={index}>{part}</strong>
      ) : (
        part
      )
    );
  }

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setOpen((prev) => !prev)}
        animate={pulse ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          fontSize: "24px",
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          color: "#fff",
          boxShadow: "0 4px 20px rgba(245,158,11,0.45)",
        }}
      >
        {open ? "✕" : "💬"}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            style={{
              position: "fixed",
              bottom: "92px",
              right: "24px",
              width: "340px",
              maxHeight: "520px",
              background: "#fff",
              borderRadius: "16px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              zIndex: 9998,
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #f59e0b, #b45309)",
                padding: "14px",
                color: "#fff",
                fontWeight: 700,
                fontSize: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Lima • Feedback Assistant</span>

              {step === "done" && (
                <button
                  onClick={resetChat}
                  style={{
                    border: "none",
                    background: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    padding: "5px 10px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  New
                </button>
              )}
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "14px",
                background: "#fafaf8",
              }}
            >
              {messages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent:
                      msg.from === "user"
                        ? "flex-end"
                        : "flex-start",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "10px 13px",
                      borderRadius:
                        msg.from === "user"
                          ? "14px 14px 4px 14px"
                          : "14px 14px 14px 4px",
                      background:
                        msg.from === "user"
                          ? "#f59e0b"
                          : "#fff",
                      color:
                        msg.from === "user"
                          ? "#fff"
                          : "#111",
                      fontSize: "13px",
                      lineHeight: 1.5,
                    }}
                  >
                    {renderBubble(msg.text)}
                  </div>
                </div>
              ))}

              {/* Page Selection */}
              {step === "page" && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    marginTop: "10px",
                  }}
                >
                  {PAGES.map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageSelect(page)}
                      style={{
                        border: "1px solid #f59e0b",
                        background: "#fff",
                        color: "#b45309",
                        borderRadius: "20px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            {step === "problem" && (
              <div
                style={{
                  padding: "10px",
                  borderTop: "1px solid #eee",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <textarea
                  rows={2}
                  placeholder="Describe the issue..."
                  value={input}
                  disabled={submitting}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendText();
                    }
                  }}
                  style={{
                    flex: 1,
                    resize: "none",
                    borderRadius: "10px",
                    border: "1px solid #ddd",
                    padding: "8px",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />

                {/* Voice Button */}
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    border: "none",
                    cursor: "pointer",
                    background: recording
                      ? "#ef4444"
                      : "#f3f0ea",
                  }}
                >
                  🎙
                </button>

                {/* Send Button */}
                <button
                  onClick={handleSendText}
                  disabled={!input.trim() || submitting}
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    border: "none",
                    cursor: "pointer",
                    background:
                      input.trim() && !submitting
                        ? "#f59e0b"
                        : "#ddd",
                    color: "#fff",
                  }}
                >
                  ➤
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}