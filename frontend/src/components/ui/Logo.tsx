// src/components/ui/Logo.tsx
// Componente logo ufficiale Tennis AI Pro
// Wordmark tipografico dal design system v2 — "tennis ai pro"
// con "ai" in ace-lime (#D4FF3A).
//
// VARIANTI:
//   wordmark  — logotype completo (default)
//   symbol    — solo simbolo T + dot lime (per favicon, avatar, spazi stretti)
//   stacked   — wordmark su due righe (uso futuro)
//
// DIMENSIONI:
//   sm  — 18px
//   md  — 22px (default)
//   lg  — 28px
//   xl  — 36px

import React from "react";

type LogoVariant = "wordmark" | "symbol";
type LogoSize    = "sm" | "md" | "lg" | "xl";

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  /** Forza il colore del testo baseline (utile su sfondi chiari) */
  onLight?: boolean;
}

const sizePx: Record<LogoSize, number> = {
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
};

// ── Wordmark: "tennis ai pro" ─────────────────────────────────────────────────
// Costruito inline con span per evitare dipendenze da font SVG.
// Il font viene dal CSS globale (Space Grotesk caricato in index.css).
const Wordmark: React.FC<{ sizePx: number; onLight: boolean }> = ({ sizePx, onLight }) => (
  <span
    className="font-head font-bold tracking-tight leading-none select-none"
    style={{ fontSize: sizePx }}
  >
    <span className={onLight ? "text-court-night" : "text-baseline"}>tennis </span>
    <span style={{ color: "#D4FF3A" }}>ai</span>
    <span className={onLight ? "text-court-night" : "text-baseline"}> pro</span>
  </span>
);

// ── Symbol: T + dot lime ──────────────────────────────────────────────────────
const Symbol: React.FC<{ sizePx: number }> = ({ sizePx }) => {
  const boxSize = Math.round(sizePx * 1.4);
  return (
    <span
      className="relative inline-flex items-center justify-center rounded-[var(--r-sm)] bg-court-night select-none"
      style={{ width: boxSize, height: boxSize }}
    >
      <span
        className="font-head font-bold text-baseline leading-none"
        style={{ fontSize: sizePx }}
      >
        T
      </span>
      {/* Dot lime — posizionato in basso a destra */}
      <span
        className="absolute bottom-0 right-0 rounded-full bg-ace-lime"
        style={{
          width:  Math.max(4, Math.round(sizePx * 0.28)),
          height: Math.max(4, Math.round(sizePx * 0.28)),
          transform: "translate(25%, 25%)",
        }}
      />
    </span>
  );
};

// ── Componente principale ─────────────────────────────────────────────────────
const Logo: React.FC<LogoProps> = ({
  variant  = "wordmark",
  size     = "md",
  className = "",
  onLight  = false,
}) => {
  const px = sizePx[size];

  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      aria-label="Tennis AI Pro"
      role="img"
    >
      {variant === "symbol" ? (
        <Symbol sizePx={px} />
      ) : (
        <Wordmark sizePx={px} onLight={onLight} />
      )}
    </span>
  );
};

export default Logo;
