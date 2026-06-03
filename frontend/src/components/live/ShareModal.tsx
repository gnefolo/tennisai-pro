// src/components/live/ShareModal.tsx
// Modal di condivisione sessione live — URL spectator + QR code canvas

import React, { useEffect, useRef, useState } from "react";

interface ShareModalProps {
    sessionId: string;
    onClose: () => void;
}

function buildSpectatorUrl(sessionId: string): string {
    const base = window.location.origin + window.location.pathname;
    return `${base}?spectate=${encodeURIComponent(sessionId)}`;
}

// QR code minimale via canvas (pattern di box bianchi su sfondo scuro)
// Usa la Google Charts API per generare il QR code come immagine
function QRCode({ url }: { url: string }) {
    const [imgSrc, setImgSrc] = useState<string | null>(null);

    useEffect(() => {
        // Google Charts QR code API (no CORS, pubblica)
        const encoded = encodeURIComponent(url);
        const size = 200;
        setImgSrc(
            `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encoded}&choe=UTF-8&chld=M|2`
        );
    }, [url]);

    if (!imgSrc) return (
        <div className="w-[160px] h-[160px] rounded-xl border border-white/10 bg-white/[0.04] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-ace-lime/30 border-t-ace-lime rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="rounded-xl border border-white/10 overflow-hidden bg-white p-2">
            <img src={imgSrc} alt="QR Code spectator" className="w-[160px] h-[160px] block" />
        </div>
    );
}

const ShareModal: React.FC<ShareModalProps> = ({ sessionId, onClose }) => {
    const url = buildSpectatorUrl(sessionId);
    const [copied, setCopied] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            inputRef.current?.select();
            document.execCommand("copy");
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-court-night/80 backdrop-blur-sm" onClick={onClose} />

            {/* Modal card */}
            <div
                className="relative w-full max-w-md rounded-3xl border border-white/[0.08] bg-[rgba(11,18,32,0.98)] p-6 flex flex-col gap-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
                style={{ animation: "courtModeIn 0.25s cubic-bezier(0.2,0.8,0.2,1) both" }}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.22em] text-ace-lime/60 font-semibold">
                            Spectator Mode
                        </div>
                        <div className="font-head text-xl font-bold text-baseline mt-1">
                            Condividi il match
                        </div>
                        <div className="text-[13px] text-fog/50 mt-1">
                            Chi apre il link vede il match in tempo reale, in sola lettura.
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl border border-white/[0.10] bg-white/[0.04] text-fog/60 hover:text-fog hover:bg-white/[0.08] transition-all"
                        aria-label="Chiudi"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* QR + URL */}
                <div className="flex flex-col sm:flex-row items-center gap-5">
                    <QRCode url={url} />

                    <div className="flex-1 flex flex-col gap-3 w-full">
                        <div className="text-[11px] text-fog/50 font-semibold uppercase tracking-wide">
                            Link diretto
                        </div>
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                readOnly
                                value={url}
                                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[12px] font-mono text-fog/70 select-all focus:outline-none"
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                            />
                            <button
                                onClick={handleCopy}
                                className={`flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl border transition-all ${
                                    copied
                                        ? "border-success/50 bg-success/15 text-success"
                                        : "border-white/[0.08] bg-white/[0.03] text-fog hover:bg-white/[0.08] hover:border-white/20"
                                }`}
                                aria-label="Copia link"
                            >
                                {copied ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        <div className="text-[11px] text-fog/30 leading-relaxed">
                            Inquadra il QR con un altro dispositivo, oppure copia il link e invialo via WhatsApp o SMS.
                        </div>
                    </div>
                </div>

                {/* Info bar */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse flex-shrink-0" />
                    <span className="text-[12px] text-fog/60">
                        Il link rimane attivo finché il match è in corso. Gli spettatori vedono punteggio, schemi e indicazioni tattiche in tempo reale.
                    </span>
                </div>

                {/* CTA */}
                <button
                    onClick={handleCopy}
                    className={`w-full flex items-center justify-center gap-2 rounded-2xl min-h-[52px] font-bold text-[14px] transition-all ${
                        copied
                            ? "bg-success text-white"
                            : "bg-ace-lime text-court-night hover:bg-ace-lime/90 shadow-[0_4px_20px_rgba(212,255,58,0.25)]"
                    }`}
                >
                    {copied ? "✓ Link copiato!" : "Copia link"}
                </button>
            </div>
        </div>
    );
};

export default ShareModal;
