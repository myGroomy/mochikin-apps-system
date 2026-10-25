"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useDomainStore } from "@/stores/useLauncherStore";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getAppDisplay } from "@/components/launcher/AppCard";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const apps = useDomainStore((s) => s.apps);
  const permissions = useDomainStore((s) => s.permissions);
  const isAuthenticated = useDomainStore((s) => s.isAuthenticated);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!isAuthenticated) return null;

  const accessible = apps.filter(
    (app) => app.status === "ACTIVE" && permissions.includes(app.required_permission)
  );

  function go(appId: string) {
    setOpen(false);
    router.push(`/launcher/${appId.toLowerCase()}`);
  }

  return (
    <>
      <Button
        variant="outline"
        className="hidden h-8 gap-2 text-xs text-ash sm:flex"
        onClick={() => setOpen(true)}
        aria-label="Search applications"
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        Search
        <kbd className="pointer-events-none ml-1 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-ash hover:text-ink sm:hidden"
        onClick={() => setOpen(true)}
        aria-label="Search applications"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search applications"
        description="Find and open an application"
      >
        <CommandInput placeholder="Type an app name or ID…" />
        <CommandList>
          <CommandEmpty>No applications found.</CommandEmpty>
          <CommandGroup heading="Applications">
            {accessible.map((app) => {
              const { Icon } = getAppDisplay(app.app_id, app.name);
              return (
                <CommandItem
                  key={app.app_id}
                  value={`${app.name} ${app.app_id}`}
                  onSelect={() => go(app.app_id)}
                >
                  <Icon className="h-4 w-4 text-mist" aria-hidden="true" />
                  <span>{app.name}</span>
                  <span className="text-xs text-muted-foreground">{app.app_id}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
