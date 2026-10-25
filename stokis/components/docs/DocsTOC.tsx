"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

interface TOCItem {
  id: string;
  label: string;
  labelEn?: string;
  level: number;
}

interface DocsTOCProps {
  items: TOCItem[];
}

export function DocsTOC({ items }: DocsTOCProps) {
  const { lang } = useLanguage();
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="hidden xl:block sticky top-24 w-56 flex-shrink-0 self-start py-8">
      <p className="text-xs font-bold uppercase tracking-wider text-base-content/40 mb-3 px-3">
        {lang === "en" ? "On this page" : "Di halaman ini"}
      </p>
      <ul className="space-y-0.5 border-l border-base-200">
        {items.map((item) => {
          const label = lang === "en" && item.labelEn ? item.labelEn : item.label;
          const isActive = activeId === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={`block text-xs py-1 transition-all border-l-2 -ml-px ${
                  item.level === 3 ? "pl-6" : "pl-3"
                } ${
                  isActive
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-base-content/45 hover:text-base-content/70 hover:border-base-300"
                }`}
              >
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
