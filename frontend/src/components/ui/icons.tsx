// src/components/ui/icons.tsx
// Libreria icone Tennis AI Pro — Design System v2.0
// Tutte le icone dalla sezione "03 — Iconography": line icons, stroke 1.5
// Naming: PascalCase + "Icon" suffix per chiarezza negli import
//
// USO:
//   import { ChartIcon, TacticsIcon, UserIcon } from "../ui/icons";
//   <ChartIcon size={20} className="text-ace-lime" />
//
// DIMENSIONI consigliata dal DS: 16 · 20 · 24 · 32 · 48

import React from "react";

interface IconProps {
  size?:      number;
  className?: string;
  strokeWidth?: number;
}

// Helper base — garantisce stroke uniforme e currentColor
const Icon: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 24,
  className = "",
  strokeWidth = 1.5,
  children,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

// ─── Icone dal design system ──────────────────────────────────────────────────

/** Tavola / Dashboard */
export const GridIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M3 3h18v18H3z"/>
    <path d="M3 9h18M9 3v18"/>
  </Icon>
);

/** Pallina da tennis / Globe */
export const TacticsIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10"/>
    <path d="M2 12c5-3 15-3 20 0M2 12c5 3 15 3 20 0M12 2c3 5 3 15 0 20M12 2c-3 5-3 15 0 20"/>
  </Icon>
);

/** Grafico / Analytics */
export const ChartIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M3 3v18h18"/>
    <path d="M7 14l4-4 4 4 6-6"/>
  </Icon>
);

/** Video / Registrazione */
export const VideoIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M23 7l-7 5 7 5V7z"/>
    <rect x="1" y="5" width="15" height="14" rx="2"/>
  </Icon>
);

/** Cuore / Preferiti */
export const HeartIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
  </Icon>
);

/** Impostazioni / Settings */
export const SettingsIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </Icon>
);

/** Profilo / Utente */
export const UserIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </Icon>
);

/** Notifica / Campana */
export const BellIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </Icon>
);

/** Stella / Rating */
export const StarIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <polygon points="12 2 15 8.5 22 9.3 17 14 18 21 12 17.8 6 21 7 14 2 9.3 9 8.5 12 2"/>
  </Icon>
);

/** Calendario */
export const CalendarIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </Icon>
);

/** Messaggio / Chat */
export const MessageIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </Icon>
);

/** Orologio / Tempo */
export const ClockIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </Icon>
);

/** Layers / Pattern */
export const LayersIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
  </Icon>
);

/** Refresh / Undo */
export const RefreshIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
  </Icon>
);

/** Download */
export const DownloadIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </Icon>
);

/** Check / Conferma */
export const CheckIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <line x1="22" y1="11.08" x2="22" y2="12"/>
    <path d="M22 11.08A10 10 0 1118.42 3.6"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </Icon>
);

/** Cerca / Search */
export const SearchIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </Icon>
);

/** Volume / Audio */
export const VolumeIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"/>
  </Icon>
);

/** Location / Pin */
export const LocationIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="10" r="3"/>
    <path d="M12 2a8 8 0 00-8 8c0 1.892.402 3.13 1.5 4.5L12 22l6.5-7.5c1.098-1.37 1.5-2.608 1.5-4.5a8 8 0 00-8-8z"/>
  </Icon>
);

/** Chiudi / X */
export const CloseIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </Icon>
);

/** Freccia destra / Avanti */
export const ArrowRightIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </Icon>
);

/** Freccia giù / Dropdown */
export const ArrowDownIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <polyline points="5 12 12 19 19 12"/>
    <line x1="12" y1="19" x2="12" y2="5"/>
  </Icon>
);

/** Live / Punto in diretta */
export const LiveDotIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="12" r="8" strokeWidth="1.5" opacity="0.4"/>
  </Icon>
);

/** Share / Condividi */
export const ShareIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="18" cy="5" r="3"/>
    <circle cx="6" cy="12" r="3"/>
    <circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </Icon>
);

/** Racchetta / Tennis (custom) */
export const RacketIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="10" cy="10" r="6"/>
    <line x1="14.5" y1="14.5" x2="21" y2="21"/>
    <line x1="7" y1="10" x2="13" y2="10"/>
    <line x1="10" y1="7" x2="10" y2="13"/>
  </Icon>
);

/** Trofeo / Vittoria */
export const TrophyIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M6 2h12v6a6 6 0 01-12 0V2z"/>
    <path d="M6 4H3a2 2 0 000 4h3M18 4h3a2 2 0 010 4h-3"/>
    <line x1="12" y1="14" x2="12" y2="18"/>
    <rect x="8" y="18" width="8" height="2" rx="1"/>
  </Icon>
);

/** AI / Cervello (custom) */
export const AIIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M12 2C8 2 5 5 5 9c0 2 .8 3.8 2 5l-1 4h12l-1-4c1.2-1.2 2-3 2-5 0-4-3-7-7-7z"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
    <path d="M9 9h.01M15 9h.01"/>
  </Icon>
);
