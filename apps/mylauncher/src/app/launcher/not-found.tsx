import { AppShell } from "@/components/layout/AppShell";

export default function LauncherNotFound() {
  return (
    <AppShell>
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold text-ink">404</h1>
          <p className="text-lg text-ink-soft">Page not found</p>
        </div>
      </div>
    </AppShell>
  );
}
