"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

export function CodeBlock({
  code,
  filename,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-base-300 overflow-hidden bg-base-200/50">
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-base-300 bg-base-200">
          <span className="text-xs font-mono font-semibold text-base-content/60">
            {filename}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-base-content/40 hover:text-base-content/70 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-success" />
                <span className="text-success">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-xs leading-relaxed">
        <code className="font-mono text-base-content/80">{code}</code>
      </pre>
    </div>
  );
}
