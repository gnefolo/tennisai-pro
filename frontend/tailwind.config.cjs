/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ─── COLOR TOKENS ───────────────────────────────────────────
      colors: {
        'court-night': '#0B1220',
        'baseline': '#F7F8FA',
        'ace-lime': '#D4FF3A',
        'ace-lime-hover': '#C4EF2A',
        'clay-amber': '#E9A23B',
        'net-graphite': '#2A3142',
        'fog': '#C9CFDA',
        'line': '#E5E8EE',
        // Semantic
        'success': '#22C55E',
        'success-bg': '#F0FDF4',
        'warning': '#F59E0B',
        'warning-bg': '#FFFBEB',
        'error': '#EF4444',
        'error-bg': '#FEF2F2',
        'info': '#3B82F6',
        'info-bg': '#EFF6FF',
      },

      // ─── TYPOGRAPHY ─────────────────────────────────────────────
      fontFamily: {
        head: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
      },

      // ─── FONT SIZE ──────────────────────────────────────────────
      fontSize: {
        'display-xl': ['clamp(48px,7vw,88px)', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
        'display-lg': ['clamp(40px,6vw,80px)', { lineHeight: '0.98', letterSpacing: '-0.03em' }],
        'display-md': ['clamp(32px,4vw,48px)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-sm': ['clamp(28px,3.2vw,42px)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'eyebrow': ['12px', { lineHeight: '1', letterSpacing: '0.32em' }],
      },

      // ─── BORDER RADIUS ──────────────────────────────────────────
      borderRadius: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'pill': '999px',
      },

      // ─── BOX SHADOW (Elevation) ──────────────────────────────────
      boxShadow: {
        'e-0': 'none',
        'e-1': '0 1px 2px rgba(11,18,32,0.06)',
        'e-2': '0 8px 24px rgba(11,18,32,0.08)',
        'e-3': '0 20px 48px rgba(11,18,32,0.16)',
        'focus-lime': '0 0 0 3px rgba(212,255,58,0.4)',
        'lime-glow': '0 6px 20px rgba(212,255,58,0.35)',
      },

      // ─── TRANSITION DURATION ────────────────────────────────────
      transitionDuration: {
        'fast': '160ms',
        'med': '240ms',
        'slow': '400ms',
      },

      // ─── TRANSITION TIMING FUNCTION ─────────────────────────────
      transitionTimingFunction: {
        'tennis': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },

      // ─── SPACING additions ───────────────────────────────────────
      spacing: {
        '18': '72px',
        '22': '88px',
        '30': '120px',
      },

      // ─── BACKGROUND (soft lime overlay) ─────────────────────────
      backgroundColor: {
        'ace-lime-soft': 'rgba(212,255,58,0.12)',
      },
    },
  },
  plugins: [],
};
