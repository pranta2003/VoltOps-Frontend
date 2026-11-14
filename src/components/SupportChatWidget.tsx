import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { XIcon, ZapIcon, SendIcon } from "./Icons";

interface ChatMessage {
  id: string;
  sender: "assistant" | "user";
  text: string;
  time: string;
}

export function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState<"EN" | "BN">("EN");
  const [inputText, setInputText] = useState("");
  const [hasUnread, setHasUnread] = useState(true);
  const shouldReduceMotion = useReducedMotion();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialMessages: Record<"EN" | "BN", ChatMessage[]> = {
    EN: [
      {
        id: "msg-welcome-en",
        sender: "assistant",
        text: "Welcome to VoltOps Commercial Support! How can we assist with your industrial facility operations or dispatch commitments today?",
        time: "Just now",
      },
    ],
    BN: [
      {
        id: "msg-welcome-bn",
        sender: "assistant",
        text: "ভোল্টঅপ্স কমার্শিয়াল সাপোর্টে স্বাগতম! আপনার কারখানার জরুরি সার্ভিস বা ফিল্ড টেকনিশিয়ান কোঅর্ডিনেশন বিষয়ে কীভাবে সহায়তা করতে পারি?",
        time: "এইমাত্র",
      },
    ],
  };

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages["EN"]);

  // When language switches, re-initialize if only welcome message exists
  const handleLanguageChange = (lang: "EN" | "BN") => {
    setLanguage(lang);
    if (messages.length <= 1) {
      setMessages(initialMessages[lang]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const quickPrompts = {
    EN: [
      "Report breakdown",
      "Check arrival SLA",
      "Coverage plan pricing",
    ],
    BN: [
      "ব্রেকডাউন রিপোর্ট",
      "অ্যারাইভাল SLA যাচাই",
      "প্ল্যান প্রাইসিং",
    ],
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text,
      time: now,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText("");

    // Automated demonstration response
    setTimeout(() => {
      let reply = "";
      const lower = text.toLowerCase();

      if (language === "BN") {
        if (lower.includes("ব্রেকডাউন") || lower.includes("breakdown") || lower.includes("জরুরি")) {
          reply =
            "জরুরি ব্রেকডাউনে আমাদের সাভার ও গাজীপুর হাব থেকে ২০ মিনিট (প্ল্যান C প্রায়োরিটি) বা ৪০ মিনিট (প্ল্যান B স্ট্যান্ডার্ড) ফিজিক্যাল অ্যারাইভাল কমিটমেন্ট রয়েছে। [ডেমো সাপোর্ট — অফলাইন প্রোটোটাইপ]";
        } else if (lower.includes("প্রাইসিং") || lower.includes("দাম") || lower.includes("price") || lower.includes("plan")) {
          reply =
            "ভোল্টঅপ্স প্রোটোটাইপ প্রাইসিং: প্ল্যান A (৮-ঘণ্টা) ৳১,২০০/মাস, প্ল্যান B (২৪/৭ স্ট্যান্ডার্ড) ৳২,৫০০/মাস, এবং প্ল্যান C (২৪/৭ প্রায়োরিটি) ৳৪,০০০/মাস। [ডেমো সাপোর্ট — অফলাইন প্রোটোটাইপ]";
        } else {
          reply =
            "যোগাযোগ করার জন্য ধন্যবাদ। [ডেমো সাপোর্ট — অফলাইন প্রোটোটাইপ]। প্রোডাকশন এনভায়রনমেন্টে আপনার বার্তা সরাসরি আমাদের ২৪/৭ সাভার ও গাজীপুর ডিসপ্যাচ কোঅর্ডিনেশন সেন্টারে পৌঁছে যায়।";
        }
      } else {
        if (lower.includes("breakdown") || lower.includes("emergency") || lower.includes("sla")) {
          reply =
            "For emergency facility breakdowns, our Savar and Gazipur hubs guarantee 20-minute (Plan C Priority) or 40-minute (Plan B Standard) physical arrival on site. [Demo Support — Offline Prototype]";
        } else if (lower.includes("price") || lower.includes("pricing") || lower.includes("plan") || lower.includes("cost")) {
          reply =
            "VoltOps prototype demonstration pricing: Plan A ৳1,200/mo, Plan B ৳2,500/mo, and Plan C 24/7 Priority ৳4,000/mo. [Demo Support — Offline Prototype]";
        } else {
          reply =
            "Thank you for contacting VoltOps. [Demo Support — Offline Prototype]. In live production, this connects directly to our 24/7 central dispatch desk.";
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "assistant",
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 450);
  };

  return (
    <aside aria-label="Customer Support Assistant" className="fixed bottom-4 sm:bottom-5 right-3.5 sm:right-6 z-[60] select-none print:hidden">
      {/* ── Expandable Chat Panel ───────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-[calc(100vw-1.75rem)] sm:w-[350px] max-w-[370px] h-[450px] max-h-[calc(100vh-6.5rem)] rounded-[24px] border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden mb-3 backdrop-blur-2xl"
            style={{
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              boxShadow: "0 24px 60px -12px rgba(0,0,0,0.4), 0 0 0 1px var(--border)",
            }}
          >
            {/* Header */}
            <div
              className="px-3.5 py-3 border-b border-[var(--border)] flex items-center justify-between shrink-0"
              style={{ background: "var(--bg-surface-2)" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-sm shadow-sm">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-heading font-extrabold text-xs text-[var(--text-primary)]">
                      VoltOps Support
                    </h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Customer Assistance • Demo Support Offline
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Language Switcher */}
                <div className="flex items-center p-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => handleLanguageChange("EN")}
                    className={`px-1.5 py-0.5 rounded transition-all ${
                      language === "EN"
                        ? "bg-emerald-600 text-white"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange("BN")}
                    className={`px-1.5 py-0.5 rounded transition-all ${
                      language === "BN"
                        ? "bg-emerald-600 text-white"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    বাং
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                  aria-label="Close Support Chat"
                >
                  <XIcon size={16} />
                </button>
              </div>
            </div>

            {/* Offline Prototype Notice Banner */}
            <div className="px-3.5 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-[10px] text-amber-800 dark:text-amber-300 font-medium flex items-center justify-between">
              <span>Prototype Assistance Mode</span>
              <span className="font-mono text-[9px] uppercase font-bold text-amber-600">Offline Engine</span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed text-xs ${
                      m.sender === "user"
                        ? "bg-emerald-600 text-white rounded-br-none shadow-sm"
                        : "bg-[var(--bg-surface-2)] text-[var(--text-primary)] border border-[var(--border)] rounded-bl-none shadow-sm"
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[9px] text-[var(--text-muted)] mt-1 px-1">
                    {m.time}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div className="px-3 py-2 border-t border-[var(--border)] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {quickPrompts[language].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSendMessage(chip)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-semibold border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 whitespace-nowrap transition-all active:scale-95 shrink-0"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Composer Input Area */}
            <div
              className="p-3 border-t border-[var(--border)]"
              style={{ background: "var(--bg-surface-2)" }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                {/* Visual affordance icon (Attachment) */}
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
                  title="Attach file (Affordance)"
                  aria-label="Attach File"
                >
                  📎
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={language === "BN" ? "আপনার বার্তা লিখুন..." : "Type your message..."}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}
                />

                {/* Visual affordance icon (Emoji) */}
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
                  title="Emoji (Affordance)"
                  aria-label="Insert Emoji"
                >
                  😊
                </button>

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 transition-all shadow-sm active:scale-95 shrink-0"
                  title="Send message"
                  aria-label="Send Message"
                >
                  <SendIcon size={14} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Launcher Button (Emerald VoltOps Styling) ─────────── */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={shouldReduceMotion ? {} : { scale: 1.06 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.94 }}
        className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shadow-xl shadow-emerald-500/30 flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 relative"
        title="VoltOps Customer Support"
        aria-label="Toggle Support Chat"
      >
        {isOpen ? (
          <XIcon size={22} className="text-slate-950" />
        ) : (
          <div className="relative flex items-center justify-center">
            <span className="text-xl">💬</span>
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white dark:border-slate-950 animate-pulse" />
            )}
          </div>
        )}
      </motion.button>
    </aside>
  );
}
export default SupportChatWidget;
