"use client";

import { useState } from "react";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/Logo";

interface LoginFormProps {
  initialError?: string | null;
}

export function LoginForm({ initialError }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    const cleanPin = pin.trim();

    if (!cleanUsername) {
      setError("Username atau NIK wajib diisi");
      return;
    }
    if (!cleanPin) {
      setError("PIN wajib diisi");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, pin: cleanPin }),
      });

      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
      } | null;

      if (!res.ok || !data?.success) {
        setError(data?.message || "Gagal masuk ke sistem. Periksa kembali username dan PIN Anda.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      window.location.reload();
    } catch {
      setError("Terjadi gangguan jaringan saat menghubungi server.");
      setLoading(false);
    }
  }

  function fillDemo(user: string) {
    setUsername(user);
    setPin("1234");
    setError(null);
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="card bg-base-100 border border-base-300 shadow-sm rounded-lg">
        <div className="card-body p-6 sm:p-7">
          {/* Brand Header */}
          <div className="mb-5 text-left">
            <div className="mb-3">
              <Logo size="md" />
            </div>
            <p className="mt-1 text-xs text-base-content/70">
              Masuk dengan akun staf untuk mengakses ekosistem outlet
            </p>
          </div>

          {/* Error Alert Box */}
          {error && (
            <div className="alert alert-error text-xs mb-4 rounded-md shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Alert Box */}
          {success && (
            <div className="alert alert-success text-xs mb-4 rounded-md shadow-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Autentikasi berhasil, mengalihkan ke portal…</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / NIK */}
            <div className="form-control">
              <label htmlFor="username" className="label py-1">
                <span className="label-text font-medium text-xs text-base-content/80">
                  Username atau NIK staf
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/40">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading || success}
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="Contoh: admin, candra, prita, dll"
                  className="input input-bordered w-full pl-9 text-sm focus:outline-none focus:border-primary disabled:opacity-60 active:border-primary"
                />
              </div>
            </div>

            {/* PIN */}
            <div className="form-control">
              <div className="flex items-center justify-between py-1">
                <label
                  htmlFor="pin"
                  className="label-text font-medium text-xs text-base-content/80"
                >
                  PIN akses
                </label>
                <span className="text-[11px] text-base-content/50">4-8 digit angka</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/40">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="pin"
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  disabled={loading || success}
                  placeholder="••••"
                  className="input input-bordered w-full pl-9 pr-10 font-mono text-sm focus:outline-none focus:border-primary disabled:opacity-60 active:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content/40 hover:text-base-content focus-visible:outline-none focus-visible:text-primary transition-colors active:scale-95"
                  aria-label={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || success}
                className="btn btn-primary w-full font-semibold gap-2 rounded-md whitespace-nowrap active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    <span>Memverifikasi…</span>
                  </>
                ) : (
                  <>
                    <span>Masuk</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Login Helper (Akun Operasional) */}
          <div className="mt-5 pt-4 border-t border-base-200">
            <p className="text-[11px] text-base-content/60 font-medium mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Akun operasional cabang (PIN: 1234):</span>
              </span>
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => fillDemo("admin")}
                className="btn btn-xs btn-outline btn-neutral rounded font-medium justify-between px-2"
                title="Admin Pusat & Master"
              >
                <span>admin</span>
                <span className="text-[9px] opacity-60">Pusat</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("candra")}
                className="btn btn-xs btn-outline btn-neutral rounded font-medium justify-between px-2"
                title="Supervisor Cabang Bandung"
              >
                <span>candra</span>
                <span className="text-[9px] opacity-60">BDG (SPV)</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("budi")}
                className="btn btn-xs btn-outline btn-neutral rounded font-medium justify-between px-2"
                title="Staff Kasir / SO Bandung"
              >
                <span>budi</span>
                <span className="text-[9px] opacity-60">BDG (Staff)</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("prita")}
                className="btn btn-xs btn-outline btn-neutral rounded font-medium justify-between px-2"
                title="Supervisor Cabang Cimahi"
              >
                <span>prita</span>
                <span className="text-[9px] opacity-60">CMH (SPV)</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("sabat")}
                className="btn btn-xs btn-outline btn-neutral rounded font-medium justify-between px-2"
                title="Supervisor Cabang Bekasi"
              >
                <span>sabat</span>
                <span className="text-[9px] opacity-60">BKS (SPV)</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("dimas")}
                className="btn btn-xs btn-outline btn-neutral rounded font-medium justify-between px-2"
                title="Staff Kasir / SO Bekasi"
              >
                <span>dimas</span>
                <span className="text-[9px] opacity-60">BKS (Staff)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
