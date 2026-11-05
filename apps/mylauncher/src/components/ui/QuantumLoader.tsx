"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ShieldCheck, Storefront } from "@phosphor-icons/react";

export interface QuantumLoaderProps {
  text?: string;
  subtext?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * QuantumLoader — Animasi loading khas Stokis dengan dua kapsul berotasi
 * dinamis dan saling mengejar di sudut-sudut kotak persegi.
 */
export function QuantumLoader({
  text,
  subtext,
  className,
  size = "md",
}: QuantumLoaderProps) {
  const sizeMap = {
    sm: 40,
    md: 52,
    lg: 64,
  };
  const px = sizeMap[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3.5",
        className
      )}
    >
      <div
        className="relative text-accent"
        style={{ width: px, height: px }}
        aria-hidden="true"
      >
        <span
          className="absolute rounded-[50px] animate-quantum"
          style={{ boxShadow: "inset 0 0 0 3px currentColor" }}
        />
        <span
          className="absolute rounded-[50px] animate-quantum animation-delay-quantum"
          style={{ boxShadow: "inset 0 0 0 3px currentColor" }}
        />
      </div>

      {(text || subtext) && (
        <div className="flex flex-col items-center text-center gap-1">
          {text && (
            <p className="text-xs sm:text-sm font-semibold text-ink tracking-tight">
              {text}
            </p>
          )}
          {subtext && (
            <p className="text-[11px] sm:text-xs text-ash leading-relaxed max-w-[260px]">
              {subtext}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * QuantumLoaderMini — Versi kompak 20x20px inline untuk tombol dan badge
 */
export function QuantumLoaderMini({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center relative shrink-0",
        className
      )}
      style={{ width: 20, height: 20 }}
      aria-hidden="true"
    >
      <span
        className="absolute rounded-[50px] animate-quantum-mini"
        style={{ boxShadow: "inset 0 0 0 2px currentColor" }}
      />
      <span
        className="absolute rounded-[50px] animate-quantum-mini animation-delay-quantum"
        style={{ boxShadow: "inset 0 0 0 2px currentColor" }}
      />
    </div>
  );
}

/**
 * QuantumLoaderFull — Versi terpusat layar
 */
export function QuantumLoaderFull({ text }: { text?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6">
      <QuantumLoader text={text || "Memuat..."} size="lg" />
    </div>
  );
}

export interface SsoLaunchingOverlayProps {
  isOpen: boolean;
  appName: string;
  category?: string;
  branchName?: string;
}

/**
 * SsoLaunchingOverlay — Modal overlay transisi SSO ala Stokis
 * dengan QuantumLoader, backdrop blur, dan visual doppel card.
 */
export function SsoLaunchingOverlay({
  isOpen,
  appName,
  category,
  branchName,
}: SsoLaunchingOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/40 backdrop-blur-md p-4 sm:p-6"
          role="alertdialog"
          aria-busy="true"
          aria-live="polite"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="doppel-outer w-full max-w-sm rounded-[1.75rem] shadow-2xl"
          >
            <div className="doppel-inner p-6 sm:p-8 flex flex-col items-center text-center space-y-5 rounded-[calc(1.75rem-0.375rem)]">
              {/* Quantum Loader */}
              <div className="py-2">
                <QuantumLoader size="md" />
              </div>

              {/* Title & App Info */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                  <ShieldCheck size={13} weight="fill" />
                  <span>Single Sign-On</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-ink">
                  Membuka {appName}...
                </h3>
                <p className="text-xs text-ash leading-relaxed">
                  Menyiapkan tiket SSO & autentikasi sesi ekosistem secara aman
                </p>
              </div>

              {/* Context Pill */}
              {(branchName || category) && (
                <div className="w-full flex items-center justify-between rounded-xl border border-hairline bg-sunken/70 px-3.5 py-2 text-xs">
                  <div className="flex items-center gap-1.5 text-ash">
                    <Storefront size={14} weight="duotone" className="text-accent" />
                    <span className="truncate font-medium">{branchName || "Outlet Terverifikasi"}</span>
                  </div>
                  {category && (
                    <span className="text-[10px] font-semibold uppercase text-mist">
                      {category}
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
