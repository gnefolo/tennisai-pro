import React from "react";

interface SpinnerFABProps {
  onClick: () => void;
}

// Standalone FAB for non-Live-Match tabs — same style as COURT/SHARE buttons
export const SpinnerFAB: React.FC<SpinnerFABProps> = ({ onClick }) => {
  return (
    <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-30">
      <button
        onClick={onClick}
        aria-label="Apri Spinner AI Coach"
        className="flex flex-col items-center gap-1.5 rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-yellow-400 shadow-[0_4px_20px_rgba(250,204,21,0.15)] hover:bg-yellow-400/20 hover:border-yellow-400/60 active:scale-95 transition-all backdrop-blur-sm"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path d="M3.5 8.5 Q8 12 3.5 15.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M20.5 8.5 Q16 12 20.5 15.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
        <span className="text-[10px] font-bold uppercase tracking-wider">Spinner</span>
      </button>
    </div>
  );
};

export default SpinnerFAB;
