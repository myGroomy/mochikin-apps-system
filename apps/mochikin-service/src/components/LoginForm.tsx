"use client";

import { useState } from "react";
import { Lock, User, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

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
      setError("Username / NIK wajib diisi");
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
    <div className="w-full max-w-md mx-auto">
      {/* Brand Card */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-9 shadow-xl shadow-slate-200/50">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white font-black text-3xl shadow-md shadow-amber-500/30 mb-4">
            M
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Mochikin Services
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Masuk untuk mengakses seluruh aplikasi operasional Mochikin
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-xs sm:text-sm text-red-700 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs sm:text-sm text-emerald-700 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <span>Autentikasi berhasil. Mengalihkan ke dashboard...</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username / NIK */}
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
            >
              Username / NIK
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="h-4 w-4" />
              </div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading || success}
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="Contoh: crew atau admin"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-400 disabled:opacity-60"
              />
            </div>
          </div>

          {/* PIN Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="pin"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                PIN Keamanan
              </label>
              <span className="text-[11px] text-slate-400">4-8 digit angka</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
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
                className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm tracking-widest font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-400 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 shadow-md shadow-slate-900/10 focus:outline-none focus:ring-2 focus:ring-slate-900/20 transition-all disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Memverifikasi...
              </>
            ) : (
              <>
                Masuk ke Sistem
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts Quick-Fill Helper */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-medium mb-2.5">
            Akun Demo Testing (PIN: 1234):
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fillDemo("admin")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              admin
            </button>
            <button
              type="button"
              onClick={() => fillDemo("crew")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              crew
            </button>
            <button
              type="button"
              onClick={() => fillDemo("viewer")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
