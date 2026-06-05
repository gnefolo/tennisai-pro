// src/components/ui/WizardModal.tsx
// Glassmorphism wizard modal — reusable container for multi-step flows
// Uses CSS animations defined in index.css (.wizard-*)

import React, { useEffect, useRef, useCallback, useState } from "react";
import { CloseIcon, CheckIcon, ArrowRightIcon } from "./icons";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WizardStep {
  id: string;
  label: string;
  /** Short label for mobile */
  short?: string;
}

export interface WizardModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called to close the modal */
  onClose: () => void;
  /** Step definitions */
  steps: WizardStep[];
  /** Current step index (0-based) */
  currentStep: number;
  /** Step title displayed in header */
  stepTitle?: string;
  /** Step subtitle/description */
  stepSubtitle?: string;
  /** Content for the current step */
  children: React.ReactNode;
  /** Footer left action (Back button) — null to hide */
  onBack?: (() => void) | null;
  /** Footer right action (Next/Confirm button) */
  onNext?: (() => void) | null;
  /** Label for the next button */
  nextLabel?: string;
  /** Whether next button is disabled */
  nextDisabled?: boolean;
  /** Whether to show a loading state */
  loading?: boolean;
  /** Hide footer entirely */
  hideFooter?: boolean;
  /** Direction of step transition: "forward" | "backward" */
  direction?: "forward" | "backward";
}

// ─── Component ──────────────────────────────────────────────────────────────

export const WizardModal: React.FC<WizardModalProps> = ({
  open,
  onClose,
  steps,
  currentStep,
  stepTitle,
  stepSubtitle,
  children,
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled = false,
  loading = false,
  hideFooter = false,
  direction = "forward",
}) => {
  const [closing, setClosing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef(currentStep);

  // Close with animation
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 180); // match --dur-fast
  }, [onClose]);

  // ESC key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Track step direction via ref
  useEffect(() => {
    prevStepRef.current = currentStep;
  }, [currentStep]);

  if (!open && !closing) return null;

  const stepAnimClass = direction === "backward" ? "wizard-step-reverse" : "wizard-step";

  return (
    <>
      {/* Backdrop */}
      <div
        className={`wizard-backdrop ${closing ? "closing" : ""}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Container */}
      <div className="wizard-container" role="dialog" aria-modal="true">
        <div
          ref={cardRef}
          className={`wizard-card ${closing ? "closing" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ───────────────────────────────────── */}
          <div className="wizard-card-header">
            <div className="flex flex-col gap-1">
              {stepTitle && (
                <h3 className="font-head text-[17px] font-bold text-[#F7F8FA] leading-tight">
                  {stepTitle}
                </h3>
              )}
              {stepSubtitle && (
                <p className="text-[12px] text-[#C9CFDA]/60 leading-snug">
                  {stepSubtitle}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[#C9CFDA]/50 hover:text-[#F7F8FA] transition-all shrink-0"
              aria-label="Close wizard"
            >
              <CloseIcon size={16} />
            </button>
          </div>

          {/* ── Progress dots ────────────────────────────── */}
          <div className="flex items-center justify-center gap-2 px-6 pt-4 pb-1">
            {steps.map((step, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`wizard-progress-dot ${
                        active ? "active" : done ? "done" : "pending"
                      }`}
                      title={step.label}
                    />
                    <span
                      className={`text-[9px] font-semibold tracking-wide transition-colors ${
                        active
                          ? "text-[#D4FF3A]"
                          : done
                          ? "text-[#22C55E]/70"
                          : "text-[#C9CFDA]/25"
                      }`}
                    >
                      {step.short || step.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`wizard-progress-line -mt-3 ${
                        i < currentStep
                          ? "bg-[#22C55E]/40"
                          : "bg-white/[0.06]"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* ── Body ─────────────────────────────────────── */}
          <div className="wizard-card-body">
            <div className="wizard-step-wrapper">
              <div key={`step-${currentStep}`} className={stepAnimClass}>
                {children}
              </div>
            </div>
          </div>

          {/* ── Footer ───────────────────────────────────── */}
          {!hideFooter && (
            <div className="wizard-card-footer">
              {/* Back button */}
              {onBack ? (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] border border-white/[0.08] bg-white/[0.02] text-[12px] font-semibold text-[#C9CFDA]/60 hover:border-white/[0.15] hover:text-[#F7F8FA] transition-all"
                >
                  <ArrowRightIcon size={13} className="rotate-180" />
                  Back
                </button>
              ) : (
                <div />
              )}

              {/* Next button */}
              {onNext && (
                <button
                  onClick={onNext}
                  disabled={nextDisabled || loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#D4FF3A] text-[#0B1220] text-[13px] font-bold hover:bg-[#C4EF2A] hover:scale-[1.01] transition-all shadow-[0_4px_16px_rgba(212,255,58,0.25)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#0B1220]/30 border-t-[#0B1220] rounded-full animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      {nextLabel}
                      {nextLabel !== "Finish" && <ArrowRightIcon size={13} />}
                      {nextLabel === "Finish" && <CheckIcon size={13} />}
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default WizardModal;
