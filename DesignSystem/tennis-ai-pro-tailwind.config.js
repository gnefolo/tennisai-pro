/** ==================================================================
 *  Tennis AI Pro — Tailwind Config · v2.0
 *  Drop-in file for Next.js, Vite, Astro or any Tailwind project.
 *  ==================================================================
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  darkMode: ['class', '[data-theme="dark"]'],

  theme: {
    extend: {
      // ---------- COLORS ----------
      colors: {
        // Brand
        'court-night':     '#0B1220',
        'baseline':        '#F7F8FA',
        'ace-lime': {
          DEFAULT: '#D4FF3A',
          hover:   '#C4EF2A',
          soft:    'rgba(212, 255, 58, 0.12)',
        },
        'clay-amber':      '#E9A23B',
        'net-graphite':    '#2A3142',
        'fog':             '#C9CFDA',
        'line':            '#E5E8EE',

        // Semantic
        success: {
          DEFAULT: '#22C55E',
          bg:      '#F0FDF4',
        },
        warning: {
          DEFAULT: '#F59E0B',
          bg:      '#FFFBEB',
        },
        error: {
          DEFAULT: '#EF4444',
          bg:      '#FEF2F2',
        },
        info: {
          DEFAULT: '#3B82F6',
          bg:      '#EFF6FF',
        },
      },

      // ---------- TYPOGRAPHY ----------
      fontFamily: {
        head: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
      },

      fontSize: {
        // Matches the token scale exactly
        '11':  ['11px', { lineHeight: '1.5' }],
        '12':  ['12px', { lineHeight: '1.5' }],
        '13':  ['13px', { lineHeight: '1.5' }],
        '14':  ['14px', { lineHeight: '1.5' }],
        '16':  ['16px', { lineHeight: '1.5' }],
        '18':  ['18px', { lineHeight: '1.5' }],
        '20':  ['20px', { lineHeight: '1.4' }],
        '24':  ['24px', { lineHeight: '1.2' }],
        '28':  ['28px', { lineHeight: '1.15' }],
        '32':  ['32px', { lineHeight: '1.1' }],
        '40':  ['40px', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        '48':  ['48px', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        '56':  ['56px', { lineHeight: '1', letterSpacing: '-0.03em' }],
        '72':  ['72px', { lineHeight: '0.98', letterSpacing: '-0.03em' }],
      },

      letterSpacing: {
        tightest: '-0.03em',
        tighter:  '-0.02em',
        tight:    '-0.01em',
        wide:     '0.06em',
        wider:    '0.12em',
        widest:   '0.24em',
      },

      lineHeight: {
        tight:   '1.05',
        snug:    '1.15',
        normal:  '1.5',
        relaxed: '1.65',
      },

      // ---------- SPACING · base 4 ----------
      spacing: {
        // Tailwind already has 0,1,2,3,4... but we enforce our exact scale
        '4':   '4px',
        '8':   '8px',
        '12':  '12px',
        '16':  '16px',
        '20':  '20px',
        '24':  '24px',
        '32':  '32px',
        '48':  '48px',
        '64':  '64px',
        '96':  '96px',
        '128': '128px',
      },

      // ---------- RADIUS ----------
      borderRadius: {
        'xs':   '4px',
        'sm':   '8px',
        'md':   '16px',
        'lg':   '24px',
        'pill': '9999px',
      },

      // ---------- ELEVATION ----------
      boxShadow: {
        'e-0':        'none',
        'e-1':        '0 1px 2px rgba(11, 18, 32, 0.06)',
        'e-2':        '0 8px 24px rgba(11, 18, 32, 0.08)',
        'e-3':        '0 20px 48px rgba(11, 18, 32, 0.16)',
        'focus-ring': '0 0 0 3px rgba(212, 255, 58, 0.40)',
        // Dark mode luminous border shadows
        'dark-border':      '0 0 0 1px rgba(255, 255, 255, 0.08)',
        'dark-border-lime': '0 0 0 1px rgba(212, 255, 58, 0.15)',
      },

      // ---------- MOTION ----------
      transitionTimingFunction: {
        'tap': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },

      transitionDuration: {
        '160':  '160ms',
        '240':  '240ms',
        '400':  '400ms',
        '700':  '700ms',
      },

      // ---------- LAYOUT ----------
      maxWidth: {
        container: '1240px',
      },

      screens: {
        // Mobile-first: no 'mobile', it's default
        'tablet':  '768px',
        'desktop': '1024px',
        'wide':    '1280px',
      },

      // ---------- ANIMATIONS ----------
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'spin-ball': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-up':   'fade-up 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'spin-ball': 'spin-ball 700ms linear infinite',
      },
    },
  },

  plugins: [
    // Optional but recommended:
    // require('@tailwindcss/typography'),
    // require('@tailwindcss/forms'),
  ],
};

/* ===================================================================
   USAGE EXAMPLES

   <button class="
     bg-ace-lime hover:bg-ace-lime-hover
     text-court-night font-body font-semibold
     px-24 py-12 rounded-pill
     shadow-e-1 hover:shadow-e-2
     transition-all duration-160 ease-tap
   ">
     Analizza match
   </button>

   <h1 class="
     font-head font-bold
     text-56 tablet:text-72
     tracking-tightest leading-tight
     text-court-night
   ">
     Il tuo gioco, <span class="text-ace-lime">analizzato</span>.
   </h1>

   <div class="
     bg-white border border-line rounded-md
     p-24 shadow-e-1
     hover:shadow-e-2 transition-shadow duration-240 ease-tap
   ">
     Card content
   </div>

   =================================================================== */
