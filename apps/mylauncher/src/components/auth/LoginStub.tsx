"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDomainStore } from "@/stores/useLauncherStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, User } from "lucide-react";
import { toast } from "sonner";

export function LoginStub() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const hydrateSession = useDomainStore((s) => s.hydrateSession);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    void (async () => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, pin }),
        });
        const result = await response.json() as {
          message?: string;
          employee?: {
            employee_id: string;
            username: string;
            name: string;
            role: string;
            status: string;
            base_branch: string;
          };
          session?: {
            roleId: string;
            roleName: string;
            permissions: string[];
            expiresAt: number;
          };
        };
        if (!response.ok || !result.employee || !result.session) {
          throw new Error(result.message || "Unable to sign in");
        }
        hydrateSession({
          employee: result.employee,
          roleId: result.session.roleId,
          roleName: result.session.roleName,
          permissions: result.session.permissions,
          expiresAt: result.session.expiresAt,
        });
        toast.success("Login successful");
        router.push("/launcher");
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to sign in";
        setError(message);
        toast.error(message);
      }
    })();
  }

  return (
    <div className="flex items-center justify-center min-h-full">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-ink">MOCHIKIN LAUNCHER</h1>
          <p className="text-sm text-ink-soft">Masuk untuk mengakses aplikasi Anda</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm text-ink-soft">
              Pengguna
            </label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mist"
                aria-hidden="true"
              />
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="pl-10"
                autoComplete="username"
                required
                aria-invalid={error ? true : undefined}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="pin" className="text-sm text-ink-soft">
              PIN
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mist"
                aria-hidden="true"
              />
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="pl-10"
                autoComplete="current-password"
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>
          </div>

          {error && (
          <p id="login-error" className="text-sm text-rose" role="alert">
            {error}
          </p>
        )}

          <Button type="submit" className="w-full">
            Masuk
          </Button>
        </form>

        <p className="text-xs text-mist text-center">Gunakan pengguna dan PIN yang ditetapkan untuk Anda.</p>
      </div>
    </div>
  );
}
