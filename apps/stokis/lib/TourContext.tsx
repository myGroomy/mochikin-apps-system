"use client";

import React, { createContext, useContext, useCallback, useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { OnboardingTour } from "@/components/OnboardingTour";
import { isTourDone, getTourStepsForRole } from "@/lib/tour";

interface TourContextValue {
  openTour: () => void;
  closeTour: () => void;
  isTourOpen: boolean;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Saring step yang tidak berlaku untuk role user (mis. dashboard admin-only).
  const steps = useMemo(() => getTourStepsForRole(user), [user]);

  const openTour = useCallback(() => setOpen(true), []);
  const closeTour = useCallback(() => setOpen(false), []);

  // Muncul otomatis pada login pertama pengguna (disimpan di localStorage).
  // Hanya auto-open sekali — setelah itu user harus klik tombol Tutorial manual.
  useEffect(() => {
    if (user && !isTourDone()) {
      const t = window.setTimeout(() => setOpen(true), 800);
      return () => window.clearTimeout(t);
    }
  }, [user]);

  return (
    <TourContext.Provider value={{ openTour, closeTour, isTourOpen: open }}>
      {children}
      {open && <OnboardingTour onClose={closeTour} steps={steps} />}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}
