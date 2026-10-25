"use client";

import { DocsLayout } from "@/components/docs/DocsLayout";
import { DocsTOCProvider } from "@/lib/DocsTOCContext";

export default function DocsRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DocsTOCProvider>
      <DocsLayout>{children}</DocsLayout>
    </DocsTOCProvider>
  );
}
