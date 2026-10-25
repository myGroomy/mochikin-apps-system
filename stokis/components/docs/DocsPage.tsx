"use client";

import React from "react";
import { DocsPageNav } from "@/components/docs/DocsPageNav";
import { useDocsTOC } from "@/lib/DocsTOCContext";
import { useEffect } from "react";

interface DocsPageProps {
  children: React.ReactNode;
  tocItems?: { id: string; label: string; labelEn?: string; level: number }[];
  prev?: { href: string; label: string; labelEn?: string };
  next?: { href: string; label: string; labelEn?: string };
}

export function DocsPage({
  children,
  tocItems = [],
  prev,
  next,
}: DocsPageProps) {
  const { setTOCItems } = useDocsTOC();

  useEffect(() => {
    setTOCItems(tocItems);
    return () => setTOCItems([]);
  }, [tocItems, setTOCItems]);

  return (
    <div className="space-y-6">
      {children}
      <DocsPageNav prev={prev} next={next} />
    </div>
  );
}
