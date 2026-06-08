import React, { useState, useRef, useEffect, useCallback } from "react";

type AppMode = "live" | "liveArchive" | "infosysDemo";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface SpinnerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  mode: AppMode;
}

const QUICK_CHIPS: Record<AppMode, string[]> = {
  live: ["Come sto servendo?", "Cosa cambio adesso?", "Analizza il momentum", "Pattern da sfruttare"],
  liveArchive: ["Riassumi il match", "Pattern principali", "Punti di svolta?", "Cosa migliorare?"],
  infosysDemo: ["Chi è in vantaggio?", "Analizza il momentum", "Cosa vedi nel match?", "Punti chiave?"],
};

function buildMatchContext(mode: AppMode): string {
  try {
    if (mode === "live") {
      const raw = localStorage.getItem("tennisai_live_active_state");
      if (!raw) return "";
      const s = JSON.parse(raw);
      const pts: any[] = s.recordedPoints || [];
      const last5 = pts.slice(-5);
      const lines: string[] = [];
      lines.push(`SET ${s.setsMe ?? 0}-${s.setsOpp ?? 0} | GIOCHI ${s.gamesMe ?? 0}-${s.gamesOpp ?? 0} | PUNTI ${s.pointScoreMe ?? "0"}-${s.pointScoreOpp ?? "0"}`);
      lines.push(`Punti totali registrati: ${pts.length}`);
      if (pts.length > 0) {
        const won = pts.filter((p) => p.isPointWon).length;
        lines.push(`Punti vinti: ${won}/${pts.length} (${Math.round((won / pts.length) * 100)}%)`);
        const srvPts = pts.filter((p) => p.isOnServe);
        const rtnPts = pts.filter((p) => !p.isOnServe);
        if (srvPts.length) lines.push(`Servizio: ${Math.round((srvPts.filter((p) => p.isPointWon).length / srvPts.length) * 100)}% vinti`);
        if (rtnPts.length) lines.push(`Risposta: ${Math.round((rtnPts.filter((p) => p.isPointWon).length / rtnPts.length) * 100)}% vinti`);
        const short = pts.filter((p) => p.rallyBucket === "SHORT").length;
        const medium = pts.filter((p) => p.rallyBucket === "MEDIUM").length;
        const long = pts.filter((p) => p.rallyBucket === "LONG").length;
        lines.push(`Scambi: Corti ${short} | Medi ${medium} | Lunghi ${long}`);
        if (last5.length) {
          const l5w = last5.filter((p) => p.isPointWon).length;
          lines.push(`Ultimi 5: ${l5w} vinti, ${5 - l5w} persi`);
          const prob = last5[last5.length - 1]?.modelPointWinProbability;
          if (prob !== undefined) lines.push(`Win prob prossimo punto: ${Math.round(prob * 100)}%`);
        }
      }
      return lines.join("\n");
    }
    if (mode === "infosysDemo") {
      const raw = localStorage.getItem("tennisai_infosys_context");
      if (!raw) return "";
      const s = JSON.parse(raw);
      const lines: string[] = [];
      if (s.player1 && s.player2) lines.push(`Match: ${s.player1} vs ${s.player2}`);
      if (s.surface) lines.push(`Superficie: ${s.surface}`);
      if (s.score) lines.push(`Punteggio: ${s.score}`);
      if (s.totalPoints !== undefined) lines.push(`Punti giocati: ${s.totalPoints}`);
      if (s.winRate !== undefined) lines.push(`Win rate: ${s.winRate}%`);
      if (s.prediction !== undefined) lines.push(`Win prob prossimo punto: ${Math.round(s.prediction * 100)}%`);
      if (s.momentum) lines.push(`Momentum: ${s.momentum}`);
      if (s.patternName) lines.push(`Pattern suggerito: ${s.patternName}`);
      return lines.join("\n");
    }
    return "";
  } catch {
    return "";
  }
}

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export const SpinnerPanel: React.FC<SpinnerPanelProps> = ({ isOpen, onClose, mode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: "greeting",
        role: "assistant",
        content: "Ciao! Sono Spinner, il tuo coach AI. Chiedimi tutto sul match in corso, sulla tattica o sulle tue statistiche.",
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 350);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim() };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", streaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);

    const history = [...messages.filter((m) => !m.streaming), { role: "user" as const, content: text.trim() }];

    try {
      abortRef.current = new AbortController();
      const res = await fetch(`${API_BASE}/api/spinner/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          match_context: buildMatchContext(mode) || undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const { text: chunk } = JSON.parse(payload);
            accumulated += chunk;
            setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m));
          } catch {}
        }
      }
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, streaming: false } : m));
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages((prev) => prev.map((m) =>
        m.id === assistantId ? { ...m, content: "Errore di connessione. Verifica che il backend sia attivo.", streaming: false } : m
      ));
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [messages, isStreaming, mode]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleClear = () => {
    abortRef.current?.abort();
    setMessages([{ id: "reset", role: "assistant", content: "Chat azzerata. Come posso aiutarti?" }]);
    setIsStreaming(false);
  };

  const chips = QUICK_CHIPS[mode];

  return (
    <>
      {/* Subtle backdrop — semi-transparent, doesn't cover UI */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={onClose}
        />
      )}

      {/* Floating panel — anchored bottom-right, above button group */}
      <div
        className={`
          fixed z-[90]
          right-4 lg:right-[88px]
          bottom-[76px] lg:bottom-6
          w-[320px] lg:w-[360px]
          flex flex-col
          bg-[#111827]/98 backdrop-blur-2xl
          border border-white/[0.18]
          rounded-3xl
          shadow-[0_8px_48px_rgba(0,0,0,0.85),0_0_0_1px_rgba(250,204,21,0.15)]
          transition-all duration-250 ease-out
          origin-bottom-right
          ${isOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 translate-y-2 pointer-events-none"
          }
        `}
        style={{ maxHeight: "min(560px, calc(100vh - 180px))" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#facc15" strokeWidth="2" />
                <path d="M3.5 8.5 Q8 12 3.5 15.5" stroke="#facc15" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                <path d="M20.5 8.5 Q16 12 20.5 15.5" stroke="#facc15" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-extrabold text-baseline tracking-tight">Spinner</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-yellow-400/70 bg-yellow-400/10 px-1.5 py-0.5 rounded-full">AI Coach</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] text-fog/40">Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleClear}
              className="text-[10px] text-fog/30 hover:text-fog/60 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.04]"
            >
              Azzera
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center text-fog/40 hover:text-baseline hover:border-white/20 transition-all"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick chips */}
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto shrink-0" style={{ scrollbarWidth: "none" }}>
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => sendMessage(chip)}
              disabled={isStreaming}
              className="shrink-0 text-[10px] font-semibold text-fog/50 border border-white/[0.07] bg-white/[0.03] hover:border-yellow-400/30 hover:text-yellow-300 hover:bg-yellow-400/[0.05] rounded-full px-2.5 py-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.05] mx-3 shrink-0" />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0" style={{ scrollbarWidth: "none" }}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 px-3 pb-3 pt-2 border-t border-white/[0.06] shrink-0"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Chiedi a Spinner..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[12px] text-baseline placeholder-fog/25 focus:outline-none focus:border-yellow-400/30 focus:bg-white/[0.06] transition-all disabled:opacity-50 min-h-[38px] max-h-[80px] leading-relaxed"
            style={{ scrollbarWidth: "none" }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="w-9 h-9 rounded-xl bg-yellow-500/80 hover:bg-yellow-500 flex items-center justify-center text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_2px_12px_rgba(250,204,21,0.20)] shrink-0"
          >
            {isStreaming ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </>
  );
};

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-1.5`}>
      {!isUser && (
        <div className="w-5 h-5 rounded-lg bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center shrink-0 mt-0.5">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#facc15" strokeWidth="2.5" />
            <path d="M3.5 8.5 Q8 12 3.5 15.5" stroke="#facc15" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M20.5 8.5 Q16 12 20.5 15.5" stroke="#facc15" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      )}
      <div
        className={`
          max-w-[82%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed
          ${isUser
            ? "bg-yellow-400/10 border border-yellow-400/15 text-baseline rounded-br-sm"
            : "bg-white/[0.04] border border-white/[0.05] text-fog/85 rounded-bl-sm"
          }
        `}
      >
        {message.content || (message.streaming ? (
          <span className="flex gap-1 items-center py-0.5">
            {[0, 150, 300].map((delay) => (
              <span key={delay} className="w-1 h-1 rounded-full bg-yellow-400/50 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
            ))}
          </span>
        ) : "")}
        {message.streaming && message.content && (
          <span className="inline-block w-0.5 h-3 bg-yellow-400/60 animate-pulse ml-0.5 align-middle" />
        )}
      </div>
    </div>
  );
}

export default SpinnerPanel;
