// src/components/infosys/WizardStepScenario.tsx
// Wizard Step 1: Scenario configuration (v2 — simplified for Scoring Engine)
// Auto-managed fields removed: pointScore, set/game/pointNumber, pressure flags, momentum
// Added: "Who serves first" toggle (used by scoring engine)

import React from "react";
import type { DemoScenario } from "../../hooks/useInfosysDemoState";

// ─── Shared form types ──────────────────────────────────────────────────────

export interface ScenarioFormState {
  player1: string;
  player2: string;
  surface: "Hard" | "Clay" | "Grass";
  round: string;
  sets: string;
  pointScore: string;
  set: number;
  game: number;
  pointNumber: number;
  isOnServe: boolean;
  serveNumber: 1 | 2;
  svcPct: number;
  rtnPct: number;
  firstSvcPct: number;
  secondSvcPct: number;
  momentum: "HOT" | "NEUTRAL" | "COLD";
  isBreakPoint: boolean;
  isGamePoint: boolean;
  isGamePointAgainst: boolean;
}

export const DEFAULT_FORM: ScenarioFormState = {
  player1: "",
  player2: "",
  surface: "Hard",
  round: "QF",
  sets: "",
  pointScore: "0-0",
  set: 1,
  game: 1,
  pointNumber: 1,
  isOnServe: true,
  serveNumber: 1,
  svcPct: 64,
  rtnPct: 45,
  firstSvcPct: 72,
  secondSvcPct: 52,
  momentum: "NEUTRAL",
  isBreakPoint: false,
  isGamePoint: false,
  isGamePointAgainst: false,
};

const MOMENTUM_VALUES: Record<string, number> = {
  HOT: 0.8,
  NEUTRAL: 0.4,
  COLD: 0.2,
};

export function derivePressureState(
  isOnServe: boolean,
  isBreakPoint: boolean,
  isGamePoint: boolean,
  isGamePointAgainst: boolean
): string {
  if (isGamePointAgainst) return "GAME_POINT_AGAINST";
  if (isBreakPoint && isOnServe) return "BREAK_POINT_AGAINST";
  if (isBreakPoint && !isOnServe) return "BREAK_POINT_FOR";
  if (isGamePoint) return "GAME_POINT_FOR";
  return "NEUTRAL";
}

export function formToScenario(f: ScenarioFormState): DemoScenario {
  const pressureState = derivePressureState(
    f.isOnServe, f.isBreakPoint, f.isGamePoint, f.isGamePointAgainst
  );
  return {
    id: `custom_${Date.now()}`,
    label: f.player1 && f.player2 ? `${f.player1} vs ${f.player2}` : "Custom scenario",
    description: `${f.surface} · ${f.round} · ${f.pointScore} · ${pressureState.replace(/_/g, " ")}`,
    surface: f.surface,
    round: f.round,
    player1: f.player1 || "Player",
    player2: f.player2 || "Opponent",
    score: f.sets || "0-0",
    pointScore: f.pointScore,
    pressureState,
    isOnServe: f.isOnServe,
    serveNumber: f.serveNumber,
    momentum: f.momentum,
    svcPct: f.svcPct / 100,
    rtnPct: f.rtnPct / 100,
    firstSvcPct: f.firstSvcPct / 100,
    secondSvcPct: f.secondSvcPct / 100,
    momentumLast5: MOMENTUM_VALUES[f.momentum],
    isBreakPoint: f.isBreakPoint,
    isGamePoint: f.isGamePoint,
    isGamePointAgainst: f.isGamePointAgainst,
    set: f.set,
    game: f.game,
    pointNumber: f.pointNumber,
  };
}

export function scenarioToForm(s: DemoScenario): ScenarioFormState {
  const mom = s.momentumLast5 >= 0.65 ? "HOT" : s.momentumLast5 <= 0.3 ? "COLD" : "NEUTRAL";
  return {
    player1: s.player1,
    player2: s.player2,
    surface: s.surface as "Hard" | "Clay" | "Grass",
    round: s.round,
    sets: s.score,
    pointScore: s.pointScore,
    set: s.set,
    game: s.game,
    pointNumber: s.pointNumber,
    isOnServe: s.isOnServe,
    serveNumber: s.serveNumber,
    svcPct: Math.round(s.svcPct * 100),
    rtnPct: Math.round(s.rtnPct * 100),
    firstSvcPct: Math.round(s.firstSvcPct * 100),
    secondSvcPct: Math.round(s.secondSvcPct * 100),
    momentum: mom,
    isBreakPoint: s.isBreakPoint,
    isGamePoint: s.isGamePoint,
    isGamePointAgainst: s.isGamePointAgainst,
  };
}

// ─── Style constants ────────────────────────────────────────────────────────

const label = "text-[10px] uppercase tracking-[0.22em] text-[#C9CFDA]/50 font-semibold font-head";

// ─── Shared form widgets ────────────────────────────────────────────────────

function FieldRow({ label: lbl, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.18em] text-[#C9CFDA]/40 font-semibold">{lbl}</span>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[8px] px-2.5 py-1.5 text-[12px] text-[#F7F8FA] placeholder-[#C9CFDA]/25 focus:outline-none focus:border-[#D4FF3A]/40 transition-colors"
    />
  );
}

function ToggleGroup<T extends string | number | boolean>({ options, value, onChange, small }: {
  options: { v: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  small?: boolean;
}) {
  return (
    <div className="flex gap-1 p-0.5 bg-white/[0.03] rounded-[8px]">
      {options.map((o) => (
        <button
          key={String(o.v)}
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-[6px] text-center transition-all
            ${small ? "px-1.5 py-1 text-[10px]" : "px-2 py-1.5 text-[11px]"}
            font-semibold
            ${value === o.v
              ? "bg-[#D4FF3A] text-[#0B1220]"
              : "text-[#C9CFDA]/50 hover:text-[#C9CFDA]/80"
            }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Preset chip ────────────────────────────────────────────────────────────

function PresetChip({ scenario, active, onClick }: {
  scenario: DemoScenario;
  active: boolean;
  onClick: () => void;
}) {
  const pressureColor = scenario.pressureState.includes("AGAINST")
    ? "text-[#EF4444]/70"
    : scenario.pressureState.includes("FOR")
    ? "text-[#22C55E]/70"
    : "text-[#C9CFDA]/40";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3.5 py-2.5 rounded-[12px] border transition-all
        ${active
          ? "border-[#D4FF3A]/40 bg-[#D4FF3A]/[0.06] ring-1 ring-[#D4FF3A]/20"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.03]"
        }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className={`text-[12px] font-semibold truncate ${active ? "text-[#F7F8FA]" : "text-[#C9CFDA]/70"}`}>
          {scenario.label}
        </span>
        <span className={`text-[11px] font-mono shrink-0 ${pressureColor}`}>
          {scenario.pointScore}
        </span>
      </div>
      <div className="text-[10px] text-[#C9CFDA]/40 mt-0.5 truncate">
        {scenario.player1} vs {scenario.player2} · {scenario.surface} · {scenario.round}
      </div>
    </button>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

interface WizardStepScenarioProps {
  form: ScenarioFormState;
  onChange: (patch: Partial<ScenarioFormState>) => void;
  presets: DemoScenario[];
  activePresetId: string | null;
  onPreset: (s: DemoScenario) => void;
}

export const WizardStepScenario: React.FC<WizardStepScenarioProps> = ({
  form,
  onChange,
  presets,
  activePresetId,
  onPreset,
}) => {
  return (
    <div className="flex flex-col gap-5">

      {/* ── Quick presets ──────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#D4FF3A]/50 font-semibold">
            ⚡ Quick presets
          </span>
          <div className="flex-1 h-px bg-white/[0.05]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {presets.map((s) => (
            <PresetChip
              key={s.id}
              scenario={s}
              active={activePresetId === s.id}
              onClick={() => onPreset(s)}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-[10px] text-[#C9CFDA]/30 uppercase tracking-widest">or customize</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      {/* ── Simplified form ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">

        {/* LEFT COLUMN — Players + Match context */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5">
            <span className={label}>Players</span>
            <FieldRow label="Server / Focus player">
              <TextInput value={form.player1} onChange={(v) => onChange({ player1: v })} placeholder="e.g. Sinner J." />
            </FieldRow>
            <FieldRow label="Opponent">
              <TextInput value={form.player2} onChange={(v) => onChange({ player2: v })} placeholder="e.g. Alcaraz C." />
            </FieldRow>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className={label}>Match context</span>
            <FieldRow label="Surface">
              <ToggleGroup
                options={[
                  { v: "Hard" as const, label: "Hard" },
                  { v: "Clay" as const, label: "Clay" },
                  { v: "Grass" as const, label: "Grass" },
                ]}
                value={form.surface}
                onChange={(v) => onChange({ surface: v })}
              />
            </FieldRow>
            <FieldRow label="Round">
              <TextInput value={form.round} onChange={(v) => onChange({ round: v })} placeholder="QF, SF, F…" />
            </FieldRow>
          </div>
        </div>

        {/* RIGHT COLUMN — Serve + Info */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5">
            <span className={label}>Match settings</span>
            <FieldRow label="Who serves first?">
              <ToggleGroup
                options={[
                  { v: true as unknown as string, label: `${form.player1 || "Player 1"} serves` },
                  { v: false as unknown as string, label: `${form.player2 || "Player 2"} serves` },
                ] as unknown as { v: string; label: string }[]}
                value={form.isOnServe as unknown as string}
                onChange={(v) => onChange({ isOnServe: v as unknown as boolean })}
              />
            </FieldRow>
          </div>

          {/* Info panel — what the scoring engine handles */}
          <div className="flex flex-col gap-2 px-3 py-3 rounded-[12px] border border-white/[0.06] bg-white/[0.02]">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#D4FF3A]/40 font-semibold">
              ✨ Auto-managed by scoring engine
            </span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {[
                "Score (0-0, 0-0)",
                "Serve rotation",
                "Game & Set tracking",
                "Break / Game point",
                "Set / Match point",
                "Running stats",
                "Momentum (last 5 pts)",
                "Deuce / Advantage",
              ].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-[10px] text-[#C9CFDA]/30">
                  <span className="text-[#22C55E]/50">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Initial stats (collapsed by default) */}
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer select-none">
              <span className={label}>Initial stats (optional)</span>
              <span className="text-[#C9CFDA]/20 text-[10px] group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <FieldRow label="Svc pts won">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={form.svcPct}
                    min={0}
                    max={100}
                    onChange={(e) => onChange({ svcPct: Number(e.target.value) })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[8px] px-2.5 py-1.5 text-[12px] text-[#F7F8FA] focus:outline-none focus:border-[#D4FF3A]/40 transition-colors"
                  />
                  <span className="text-[11px] text-[#C9CFDA]/40 shrink-0">%</span>
                </div>
              </FieldRow>
              <FieldRow label="Rtn pts won">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={form.rtnPct}
                    min={0}
                    max={100}
                    onChange={(e) => onChange({ rtnPct: Number(e.target.value) })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[8px] px-2.5 py-1.5 text-[12px] text-[#F7F8FA] focus:outline-none focus:border-[#D4FF3A]/40 transition-colors"
                  />
                  <span className="text-[11px] text-[#C9CFDA]/40 shrink-0">%</span>
                </div>
              </FieldRow>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default WizardStepScenario;
