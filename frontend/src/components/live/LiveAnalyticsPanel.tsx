// src/components/live/LiveAnalyticsPanel.tsx
// Tab-based analytics hub: Performance · Tattica · Coaching · Storia
// Pure display — no +/- controls (stats are model-derived)

import React, { useState } from "react";
import type { LiveTaggedPointResponse, PredictionResponse, RecordedPoint } from "./liveTypes";
import WinProbabilityChart from "./WinProbabilityChart";
import RecentPointsTimeline from "./RecentPointsTimeline";
import RecordedPointsPanel from "./RecordedPointsPanel";
import { TacticsIcon, GridIcon, StarIcon } from "../ui/icons";

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = "perf" | "tattica" | "coaching" | "storia";

export interface LiveAnalyticsPanelProps {
  svcPct: number;
  rtnPct: number;
  firstPct: number;
  secondPct: number;
  momentumLast5: number;
  prediction: PredictionResponse | null;
  taggedPrediction: LiveTaggedPointResponse | null;
  probText: string;
  recordedPoints: RecordedPoint[];
  recentFivePoints: RecordedPoint[];
  onExportCsv: () => void;
  error?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clamp(v: number, mn: number, mx: number) { return Math.max(mn, Math.min(mx, v)); }
function fillPct(v: number, mn: number, mx: number) { return ((clamp(v, mn, mx) - mn) / (mx - mn)) * 100; }

const lbl = "text-[10px] uppercase tracking-[0.18em] text-fog/50 font-semibold";
const iCard = "rounded-[var(--r-md)] border border-white/[0.06] bg-white/[0.02] p-4";
const iCardSm = "rounded-[var(--r-md)] border border-white/[0.06] bg-white/[0.02] p-3";

function tone(conf?: string, map: Record<string, string> = {}, fallback = "border-white/10 bg-white/[0.04] text-fog") {
  return (conf && map[conf]) ? map[conf] : fallback;
}
const CONFIDENCE_TONE: Record<string, string> = {
  HIGH: "border-success/30 bg-success/10 text-success",
  MEDIUM: "border-clay-amber/30 bg-clay-amber/10 text-clay-amber",
  LOW: "border-error/30 bg-error/10 text-error",
};
const MOMENTUM_TONE: Record<string, string> = {
  HOT: "border-success/30 bg-success/10 text-success",
  COLD: "border-error/30 bg-error/10 text-error",
};
const PRESSURE_TONE: Record<string, string> = {
  BREAK_POINT_FOR: "border-success/30 bg-success/10 text-success",
  GAME_POINT_FOR: "border-success/30 bg-success/10 text-success",
  BREAK_POINT_AGAINST: "border-error/30 bg-error/10 text-error",
  GAME_POINT_AGAINST: "border-error/30 bg-error/10 text-error",
};
const RISK_TONE: Record<string, string> = {
  HIGH: "border-error/40 bg-error/15 text-error",
  LOW: "border-success/40 bg-success/15 text-success",
  MEDIUM: "border-clay-amber/40 bg-clay-amber/15 text-clay-amber",
};
const PRIORITY_TONE: Record<string, string> = {
  EXPLOIT: "border-success/40 bg-success/10 text-success",
  PROTECT: "border-clay-amber/40 bg-clay-amber/10 text-clay-amber",
  DISRUPT: "border-info/40 bg-info/10 text-info",
};

// ─── AccordionSection ─────────────────────────────────────────────────────────
function AccordionSection({ title, subtitle, children, defaultOpen = false }: {
  title: string; subtitle?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between px-3 py-2 rounded-[10px] border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`transition-transform duration-200 text-fog/40 shrink-0 ${open ? "rotate-90" : ""}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
          <span className="text-[11px] font-semibold text-fog/60 truncate">{title}</span>
          {subtitle && <span className="text-[9px] text-fog/25 truncate">{subtitle}</span>}
        </div>
        {!open && <span className="text-[9px] text-fog/25 uppercase tracking-wider shrink-0 ml-2">Espandi</span>}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

// ─── StatRow — pure display, no controls ─────────────────────────────────────
function StatRow({ code, label, value, min, max, barClass, numClass }: {
  code: string; label: string; value: number; min: number; max: number;
  barClass: string; numClass: string;
}) {
  const fill = fillPct(value, min, max);
  return (
    <div className="flex items-center gap-3 py-3 px-4">
      <div className="w-7 shrink-0">
        <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-fog/30">{code}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-medium text-fog/50 truncate mb-1.5">{label}</div>
        <div className="h-[5px] w-full rounded-full bg-white/[0.07] overflow-hidden">
          <div className={`h-full rounded-full ${barClass} transition-all duration-[600ms]`} style={{ width: `${fill}%` }} />
        </div>
      </div>
      <div className={`shrink-0 font-head text-[20px] font-bold tabular-nums leading-none ${numClass}`}>
        {value.toFixed(0)}<span className="text-[11px] opacity-50 font-semibold">%</span>
      </div>
    </div>
  );
}

// ─── SummaryPill — 3 derived metrics ─────────────────────────────────────────
function SummaryPill({ label, value, subLabel, valueClass }: {
  label: string; value: string; subLabel: string; valueClass: string;
}) {
  return (
    <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.025] p-3 flex flex-col gap-1.5">
      <span className="text-[8px] font-extrabold uppercase tracking-[0.18em] text-fog/35">{label}</span>
      <span className={`font-head text-[18px] font-bold leading-none ${valueClass}`}>{value}</span>
      <span className="text-[8px] text-fog/30 leading-tight">{subLabel}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export const LiveAnalyticsPanel: React.FC<LiveAnalyticsPanelProps> = ({
  svcPct, rtnPct, firstPct, secondPct, momentumLast5,
  prediction, taggedPrediction, probText,
  recordedPoints, recentFivePoints, onExportCsv, error,
}) => {
  const [tab, setTab] = useState<TabId>("perf");

  const serviceEdge = svcPct - rtnPct;
  const serveReliability = Math.round((firstPct * 0.6 + secondPct * 0.4) * 10) / 10;
  const momentumLabel = momentumLast5 >= 60 ? "Favorevole" : momentumLast5 <= 40 ? "Sfavorevole" : "Neutro";
  const momentumNumClass = momentumLast5 >= 60 ? "text-success" : momentumLast5 <= 40 ? "text-error" : "text-clay-amber";

  const hasPrediction = !!prediction;
  const hasHistory = recordedPoints.length > 0;

  const TABS: { id: TabId; label: string; dot?: boolean }[] = [
    { id: "perf",     label: "Performance" },
    { id: "tattica",  label: "Tattica",    dot: hasPrediction },
    { id: "coaching", label: "Coaching",   dot: hasPrediction },
    { id: "storia",   label: "Storia",     dot: hasHistory },
  ];

  return (
    <div className="bg-court-night/95 border border-white/[0.07] rounded-[24px] shadow-[var(--e-3)] flex flex-col overflow-hidden">

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-stretch border-b border-white/[0.07] px-4 pt-3 gap-0.5 overflow-x-auto scrollbar-none">
        {/* Eyebrow label */}
        <div className="self-center mr-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-ace-lime animate-pulse" />
            <span className="text-[8.5px] uppercase tracking-[0.24em] text-clay-amber/70 font-extrabold whitespace-nowrap">ATP · Live</span>
          </div>
        </div>

        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-1.5 px-3 pb-3 pt-1 text-[11px] font-semibold transition-colors whitespace-nowrap focus-visible:outline-none ${
              tab === t.id ? "text-baseline" : "text-fog/38 hover:text-fog/65"
            }`}
          >
            {t.dot && (
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${tab === t.id ? "bg-ace-lime" : "bg-ace-lime/50"}`} />
            )}
            {t.label}
            {tab === t.id && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-ace-lime" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────────── */}
      <div className="p-4 md:p-5 flex flex-col gap-3">

        {/* ══ PERFORMANCE ════════════════════════════════════════════════════ */}
        {tab === "perf" && (
          <div className="flex flex-col gap-3">

            {/* Summary row — 3 derived metrics */}
            <div className="grid grid-cols-3 gap-2">
              <SummaryPill
                label="Edge"
                value={`${serviceEdge > 0 ? "+" : ""}${serviceEdge.toFixed(0)}`}
                subLabel="Srv − Rtn"
                valueClass={serviceEdge >= 0 ? "text-success" : "text-error"}
              />
              <SummaryPill
                label="Reliability"
                value={`${serveReliability.toFixed(0)}%`}
                subLabel="Tenuta servizio"
                valueClass="text-ace-lime"
              />
              <SummaryPill
                label="Momentum"
                value={momentumLabel}
                subLabel="Ultimi 5 pt"
                valueClass={momentumNumClass}
              />
            </div>

            {/* Stat rows — no controls */}
            <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.015] divide-y divide-white/[0.05] overflow-hidden">
              <StatRow code="SRV" label="Punti vinti al servizio"  value={svcPct}        min={30} max={90} barClass="bg-ace-lime"    numClass="text-ace-lime" />
              <StatRow code="RTN" label="Punti vinti in risposta"   value={rtnPct}        min={10} max={60} barClass="bg-success"     numClass="text-success" />
              <StatRow code="1ST" label="Prima di servizio"         value={firstPct}      min={40} max={90} barClass="bg-clay-amber"  numClass="text-clay-amber" />
              <StatRow code="2ND" label="Seconda di servizio"       value={secondPct}     min={20} max={80} barClass="bg-info"        numClass="text-info" />
            </div>

            {/* Momentum gradient bar */}
            <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.015] px-4 py-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-fog/38">Momentum</span>
                  <span className="text-[9px] text-fog/25">· ultimi 5 punti</span>
                </div>
                <span className={`font-head text-[18px] font-bold tabular-nums leading-none ${momentumNumClass}`}>
                  {momentumLast5.toFixed(0)}<span className="text-[11px] opacity-50 font-semibold">%</span>
                </span>
              </div>
              <div className="h-[5px] w-full rounded-full bg-white/[0.07] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-error via-clay-amber to-success transition-all duration-[600ms]"
                  style={{ width: `${clamp(momentumLast5, 0, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[8px] text-fog/22">
                <span>Sfavorevole</span><span>Neutro</span><span>Favorevole</span>
              </div>
            </div>

            {error && (
              <div className="rounded-[var(--r-md)] border border-error/40 bg-error/5 px-4 py-3 text-[12px] text-error">{error}</div>
            )}
          </div>
        )}

        {/* ══ TATTICA ════════════════════════════════════════════════════════ */}
        {tab === "tattica" && (
          <div className="flex flex-col gap-3">
            {!prediction ? (
              <EmptyState text="Registra un punto per vedere i pattern e la lettura del contesto." />
            ) : (
              <>
                <div className={iCard}>
                  <div className={lbl}>Pattern principale</div>
                  <div className="mt-2 font-head text-sm font-semibold text-ace-lime">{prediction.pattern_fused.pattern_name}</div>
                  {prediction.pattern_fused.explanation && (
                    <div className="mt-2 text-[11px] text-fog/60 leading-relaxed">{prediction.pattern_fused.explanation}</div>
                  )}
                </div>
                {taggedPrediction && (
                  <>
                    <div className={iCard}>
                      <div className={lbl}>Pattern del punto registrato</div>
                      <div className="mt-2 font-head text-sm font-semibold text-clay-amber">{taggedPrediction.tagged_pattern}</div>
                    </div>
                    <div className={iCard}>
                      <div className={lbl}>Pattern probabile prossimo punto</div>
                      <div className="mt-2 font-head text-sm font-semibold text-success">{taggedPrediction.next_point_pattern_hint}</div>
                    </div>
                    <div className={iCard}>
                      <div className={lbl}>Descrizione automatica</div>
                      <div className="mt-2 text-[12px] text-fog leading-relaxed">{taggedPrediction.point_description}</div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ COACHING ═══════════════════════════════════════════════════════ */}
        {tab === "coaching" && (
          <div className="flex flex-col gap-3">
            {!prediction ? (
              <EmptyState text="Dopo la registrazione del punto vedrai qui lo stato tattico del motore live." />
            ) : (
              <>
                {/* Probability + state badges */}
                <div className="grid grid-cols-2 gap-2">
                  <div className={iCard}>
                    <div className={lbl}>Win probability</div>
                    <div className="mt-2 font-head text-2xl font-bold text-success">{probText}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className={iCardSm}>
                      <div className={lbl}>Confidence</div>
                      <div className="mt-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tone(prediction.tactical_confidence, CONFIDENCE_TONE)}`}>
                          {prediction.tactical_confidence || "N/A"}
                        </span>
                      </div>
                    </div>
                    <div className={iCardSm}>
                      <div className={lbl}>Momentum</div>
                      <div className="mt-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tone(prediction.momentum_state, MOMENTUM_TONE)}`}>
                          {prediction.momentum_state || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Serve state + Rally + Pressure */}
                <div className="grid grid-cols-3 gap-2">
                  <div className={iCardSm}>
                    <div className={lbl}>Serve</div>
                    <div className="mt-1.5 font-head text-xs font-semibold text-fog">{prediction.serve_state || "N/A"}</div>
                  </div>
                  <div className={iCardSm}>
                    <div className={lbl}>Rally</div>
                    <div className="mt-1.5 font-head text-xs font-semibold text-fog">{prediction.rally_profile || "N/A"}</div>
                  </div>
                  <div className={iCardSm}>
                    <div className={lbl}>Pressure</div>
                    <div className="mt-1.5">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${tone(prediction.pressure_state, PRESSURE_TONE)}`}>
                        {(prediction.pressure_state || "N/A").replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tactical call */}
                {(prediction.tactical_v3?.tactical_call_v3 || prediction.tactical_call) && (
                  <div className="rounded-[var(--r-md)] border border-ace-lime/20 bg-[linear-gradient(135deg,rgba(11,18,32,0.60),rgba(11,18,32,0.97),rgba(212,255,58,0.04))] px-4 py-4 shadow-[var(--e-1)]">
                    <div className="flex items-center gap-2 mb-2.5">
                      <TacticsIcon size={13} className="text-ace-lime shrink-0" />
                      <span className={lbl}>Call tattica immediata</span>
                      {prediction.risk_level && (
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${tone(prediction.risk_level, RISK_TONE)}`}>
                          Risk: {prediction.risk_level}
                        </span>
                      )}
                    </div>
                    <div className="font-body text-[13px] font-semibold leading-relaxed text-baseline">
                      {prediction.tactical_v3?.tactical_call_v3 || prediction.tactical_call}
                    </div>
                    {(prediction.tactical_v3?.tactical_rationale_v3 || prediction.tactical_explanation) && (
                      <div className="mt-2.5 pt-2.5 border-t border-ace-lime/10 text-[11px] italic text-ace-lime/55">
                        « {prediction.tactical_v3?.tactical_rationale_v3 || prediction.tactical_explanation} »
                      </div>
                    )}
                  </div>
                )}

                {/* Micro-strategy */}
                {prediction.tactical_v3 && (
                  <div className={iCard}>
                    <div className="flex items-center gap-2 mb-3">
                      <GridIcon size={13} className="text-fog/50 shrink-0" />
                      <span className={lbl}>Micro-strategia</span>
                      <span className="ml-auto px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border border-white/10 bg-white/[0.04] text-fog/45">LIV. 2</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="rounded-[var(--r-sm)] border border-success/20 bg-success/[0.05] p-2 text-center">
                        <div className="text-[8px] uppercase tracking-wider text-success/55 mb-1">Dominante</div>
                        <div className="text-[11px] font-semibold text-success">{prediction.tactical_v3.dominant_zone}</div>
                      </div>
                      <div className="rounded-[var(--r-sm)] border border-error/20 bg-error/[0.05] p-2 text-center">
                        <div className="text-[8px] uppercase tracking-wider text-error/55 mb-1">Vulnerabile</div>
                        <div className="text-[11px] font-semibold text-error">{prediction.tactical_v3.vulnerability_zone}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center rounded-[var(--r-sm)] px-3 py-2 border border-white/[0.06] bg-court-night">
                      <span className="text-[9px] text-fog/45">Intento raccomandato</span>
                      <span className="text-[11px] font-bold text-ace-lime">{prediction.tactical_v3.recommended_intent}</span>
                    </div>
                  </div>
                )}

                {/* Match plan */}
                {prediction.tactical_v3 && (
                  <div className="rounded-[var(--r-md)] border border-clay-amber/20 bg-[linear-gradient(135deg,rgba(233,162,59,0.05),rgba(11,18,32,0.96))] px-4 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <StarIcon size={13} className="text-clay-amber shrink-0" />
                      <span className={lbl}>Match plan</span>
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${tone(prediction.tactical_v3.strategic_priority, PRIORITY_TONE, "border-ace-lime/30 bg-ace-lime/10 text-ace-lime")}`}>
                        {prediction.tactical_v3.strategic_priority}
                      </span>
                    </div>
                    <div className="text-[12px] text-clay-amber/75 leading-relaxed italic">{prediction.tactical_v3.match_plan}</div>
                  </div>
                )}

                {/* Suggestions */}
                {(prediction.tactical_suggestion?.length ?? 0) > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {prediction.tactical_suggestion.slice(0, 3).map((txt, i) => (
                      <div key={i} className="rounded-[var(--r-sm)] border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-fog">{txt}</div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ STORIA ═════════════════════════════════════════════════════════ */}
        {tab === "storia" && (
          <div className="flex flex-col gap-4">
            <WinProbabilityChart recordedPoints={recordedPoints} />
            <AccordionSection title="Ultimi 5 punti" subtitle="Timeline recente" defaultOpen>
              <RecentPointsTimeline recentFivePoints={recentFivePoints} />
            </AccordionSection>
            <AccordionSection
              title="Log punti completo"
              subtitle={recordedPoints.length > 0 ? `${recordedPoints.length} punti registrati` : undefined}
            >
              <RecordedPointsPanel recordedPoints={recordedPoints} onExportCsv={onExportCsv} />
            </AccordionSection>
          </div>
        )}

      </div>
    </div>
  );
};

// ─── Empty state helper ───────────────────────────────────────────────────────
function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
      <div className="h-8 w-8 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-fog/30">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
        </svg>
      </div>
      <p className="text-[12px] text-fog/38 max-w-[220px] leading-relaxed">{text}</p>
    </div>
  );
}

export default LiveAnalyticsPanel;
