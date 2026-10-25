"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface TOCItem {
  id: string;
  label: string;
  labelEn?: string;
  level: number;
}

interface DocsTOCContextType {
  tocItems: TOCItem[];
  setTOCItems: (items: TOCItem[]) => void;
}

const DocsTOCContext = createContext<DocsTOCContextType>({
  tocItems: [],
  setTOCItems: () => {},
});

export function useDocsTOC() {
  return useContext(DocsTOCContext);
}

export function DocsTOCProvider({ children }: { children: React.ReactNode }) {
  const [tocItems, setTOCItemsState] = useState<TOCItem[]>([]);

  const setTOCItems = useCallback((items: TOCItem[]) => {
    setTOCItemsState(items);
  }, []);

  return (
    <DocsTOCContext.Provider value={{ tocItems, setTOCItems }}>
      {children}
    </DocsTOCContext.Provider>
  );
}
