"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getSessionUser } from "@/utils/session";
import { isClientSsoConnected, getClientCookie } from "@/lib/sso";

interface BranchContextValue {
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
  isSsoLocked: boolean;
}

const BranchContext = createContext<BranchContextValue>({
  selectedBranch: "",
  setSelectedBranch: () => {},
  isSsoLocked: false,
});

export function BranchProvider({ children }: { children: ReactNode }) {
  const [selectedBranch, setSelectedBranchState] = useState("");
  const [isSsoLocked, setIsSsoLocked] = useState(false);

  useEffect(() => {
    const ssoActive = isClientSsoConnected();
    setIsSsoLocked(ssoActive);

    const session = getSessionUser();
    if (ssoActive) {
      const ssoCode = getClientCookie("mochikin_active_branch_code") || session?.branch;
      if (ssoCode) {
        setSelectedBranchState(ssoCode);
        return;
      }
    }

    if (session?.branch) {
      setSelectedBranchState(session.branch);
    } else {
      try {
        const stored = localStorage.getItem("mycustomer_selected_branch");
        if (stored) setSelectedBranchState(stored);
      } catch {}
    }
  }, []);

  const setSelectedBranch = (branch: string) => {
    if (isSsoLocked) return;
    setSelectedBranchState(branch);
    try {
      localStorage.setItem("mycustomer_selected_branch", branch);
    } catch {}
  };

  return (
    <BranchContext.Provider value={{ selectedBranch, setSelectedBranch, isSsoLocked }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
