"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  type TourStep,
  ONBOARDING_TOUR,
  markTourDone,
} from "@/lib/tour";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

const PADDING = 8;
const POPOVER_GAP = 12;

function scrollIntoViewIfNeeded(el: Element) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  if (r.top < 0 || r.bottom > vh) {
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  } else if (r.left < 0 || r.right > vw) {
    el.scrollIntoView({ inline: "center", behavior: "smooth" });
  }
}

// Inline SVG icons (no external icon library)
function IconX({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function IconChevronLeft({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function IconChevronRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function IconCheck({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/**
 * Tur onboarding dengan efek "spotlight": menyorot satu elemen pada satu
 * waktu dan menampilkan popover penjelasan. Desain premium minimalis.
 */
export function OnboardingTour({
  onClose,
  steps = ONBOARDING_TOUR.steps,
}: {
  onClose: () => void;
  steps?: TourStep[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [probe, setProbe] = useState(0);
  const [missCount, setMissCount] = useState(0);

  const step = steps[stepIndex];
  const total = steps.length;
  const isLast = stepIndex === total - 1;

  useEffect(() => {
    if (total === 0) onClose();
  }, [total, onClose]);

  const needsNav = Boolean(step.path && step.path !== pathname);

  const measure = useCallback(() => {
    if (step.placement === "center" || !step.selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.selector);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width > 0 || r.height > 0) {
      setRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
        bottom: r.bottom,
        right: r.right,
      });
    }
  }, [step]);

  useEffect(() => {
    if (needsNav && step.path) {
      router.push(step.path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsNav, stepIndex]);

  useEffect(() => {
    if (needsNav) {
      const t = window.setTimeout(() => setProbe((p) => p + 1), 300);
      return () => window.clearTimeout(t);
    }
    const t0 = window.setTimeout(() => {
      if (step.placement === "center" || !step.selector) {
        setRect(null);
        return;
      }
      const el = document.querySelector(step.selector);
      if (el) scrollIntoViewIfNeeded(el);
      measure();
    }, 0);
    const t1 = window.setTimeout(measure, 250);
    const t2 = window.setTimeout(() => {
      if (step.selector && step.placement !== "center") {
        const el = document.querySelector(step.selector);
        if (!el) {
          setMissCount((c) => c + 1);
          return;
        }
      }
      measure();
    }, 900);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, pathname, probe, needsNav]);

  useEffect(() => {
    if (step.placement === "center" || !step.selector || needsNav) return;
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [step, needsNav, measure]);

  const goTo = (index: number) => {
    if (index < 0 || index >= total) return;
    setStepIndex(index);
    setRect(null);
  };

  const finish = () => {
    markTourDone();
    onClose();
  };

  useEffect(() => {
    if (missCount < 2) return;
    setMissCount(0);
    if (stepIndex < total - 1) {
      goTo(stepIndex + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missCount, stepIndex, total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight" && !isLast) goTo(stepIndex + 1);
      if (e.key === "ArrowLeft" && stepIndex > 0) goTo(stepIndex - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, isLast]);

  const isCenter = step.placement === "center" || (!step.selector && !needsNav);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100 }}
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
    >
      {/* Overlay */}
      {isCenter ? (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} />
      ) : (
        rect && (
          <div
            style={{
              position: "absolute",
              borderRadius: 8,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              outline: "2px solid #111111",
              outlineOffset: 2,
              left: rect.left - PADDING,
              top: rect.top - PADDING,
              width: rect.width + PADDING * 2,
              height: rect.height + PADDING * 2,
              transition: "all 200ms ease",
            }}
          />
        )
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "fixed",
            zIndex: 101,
            ...(isCenter
              ? { inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }
              : {}),
          }}
        >
          <div
            style={isCenter ? undefined : positionFor(step, rect)}
          >
            <div style={{
              background: "#FFFFFF",
              border: "1px solid #EAEAEA",
              borderRadius: 10,
              maxWidth: isCenter ? 360 : 340,
              width: "calc(100vw - 32px)",
              padding: "20px 22px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
            }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  color: "#9B9A97",
                  background: "#F7F6F3",
                  padding: "3px 8px",
                  borderRadius: 4,
                  textTransform: "uppercase",
                }}>
                  {stepIndex + 1} / {total}
                </span>
                <button
                  onClick={finish}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 28, height: 28, borderRadius: 6,
                    background: "transparent", border: "none",
                    color: "#9B9A97", cursor: "pointer",
                    transition: "color 150ms ease, background 150ms ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#111111"; e.currentTarget.style.background = "#F7F6F3"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#9B9A97"; e.currentTarget.style.background = "transparent"; }}
                  aria-label="Tutup tutorial"
                >
                  <IconX size={14} />
                </button>
              </div>

              {/* Title */}
              <h3 style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#111111",
                letterSpacing: "-0.01em",
                lineHeight: 1.3,
                margin: 0,
                marginBottom: 6,
              }}>
                {step.title}
              </h3>

              {/* Description */}
              <p style={{
                fontSize: 13,
                color: "#787774",
                lineHeight: 1.65,
                margin: 0,
              }}>
                {step.description}
              </p>

              {/* Dots */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 16 }}>
                {steps.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => goTo(i)}
                    aria-label={`Langkah ${i + 1}`}
                    aria-current={i === stepIndex ? "step" : undefined}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: 4, background: "transparent", border: "none", cursor: "pointer",
                      minWidth: 20, minHeight: 20,
                    }}
                  >
                    <span style={{
                      display: "block",
                      height: 4,
                      borderRadius: 9999,
                      transition: "all 200ms ease",
                      width: i === stepIndex ? 20 : 4,
                      background: i === stepIndex ? "#111111" : "#D5D3CF",
                    }} />
                  </button>
                ))}
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, gap: 8 }}>
                {stepIndex > 0 ? (
                  <button
                    onClick={() => goTo(stepIndex - 1)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "6px 12px", fontSize: 12, fontWeight: 500,
                      color: "#787774", background: "transparent",
                      border: "1px solid #EAEAEA", borderRadius: 6,
                      cursor: "pointer", transition: "all 150ms ease",
                    }}
                  >
                    <IconChevronLeft size={14} />
                    Kembali
                  </button>
                ) : <span />}

                <button
                  onClick={finish}
                  style={{
                    padding: "6px 12px", fontSize: 12, fontWeight: 500,
                    color: "#9B9A97", background: "transparent",
                    border: "none", borderRadius: 6,
                    cursor: "pointer", transition: "color 150ms ease",
                  }}
                >
                  Lewati
                </button>

                {isLast ? (
                  <button
                    onClick={finish}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "6px 14px", fontSize: 12, fontWeight: 600,
                      color: "#FFFFFF", background: "#111111",
                      border: "none", borderRadius: 6,
                      cursor: "pointer", transition: "background 150ms ease",
                    }}
                  >
                    <IconCheck size={14} />
                    Selesai
                  </button>
                ) : (
                  <button
                    onClick={() => goTo(stepIndex + 1)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "6px 14px", fontSize: 12, fontWeight: 600,
                      color: "#FFFFFF", background: "#111111",
                      border: "none", borderRadius: 6,
                      cursor: "pointer", transition: "background 150ms ease",
                    }}
                  >
                    Berikutnya
                    <IconChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function positionFor(step: TourStep, rect: Rect | null): React.CSSProperties {
  if (!rect) return {};
  switch (step.placement) {
    case "left":
      return {
        position: "fixed" as const,
        right: window.innerWidth - (rect.left - PADDING) + POPOVER_GAP,
        top: Math.max(8, rect.top),
      };
    case "right":
      return {
        position: "fixed" as const,
        left: rect.right + PADDING + POPOVER_GAP,
        top: Math.max(8, rect.top),
      };
    case "top":
      return {
        position: "fixed" as const,
        left: Math.max(8, rect.left + rect.width / 2 - 170),
        bottom: window.innerHeight - (rect.top - PADDING) + POPOVER_GAP,
      };
    default:
      return {
        position: "fixed" as const,
        left: Math.max(8, rect.left + rect.width / 2 - 170),
        top: rect.bottom + PADDING + POPOVER_GAP,
      };
  }
}
