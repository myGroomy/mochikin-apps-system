"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

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
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-md mx-auto"
    >
      <div className="card bg-base-100 shadow-2xl border border-base-200/80 backdrop-blur-sm">
        <div className="card-body p-6 sm:p-8">
          {/* Brand Header */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0.8, rotate: -6 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="inline-flex w-16 h-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-primary-content font-black text-3xl shadow-lg shadow-primary/25 mb-4"
            >
              M
            </motion.div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-black text-base-content tracking-tight">
                Mochikin Services
              </h1>
              <span className="badge badge-accent badge-sm font-bold uppercase">SSO</span>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-base-content/70">
              Gateway autentikasi terpadu ekosistem F&B Mochikin
            </p>
          </div>

          {/* Error Alert Box */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="alert alert-error text-xs sm:text-sm mb-4 rounded-xl shadow-xs"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Success Alert Box */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="alert alert-success text-xs sm:text-sm mb-4 rounded-xl shadow-xs"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Autentikasi berhasil! Mengalihkan ke portal...</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / NIK */}
            <div className="form-control">
              <label htmlFor="username" className="label py-1">
                <span className="label-text font-bold text-xs uppercase tracking-wider text-base-content/80">
                  Username / NIK Staf
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-base-content/40">
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
                  placeholder="Contoh: crew atau admin"
                  className="input input-bordered input-primary w-full pl-10 text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* PIN */}
            <div className="form-control">
              <div className="flex items-center justify-between py-1">
                <label
                  htmlFor="pin"
                  className="label-text font-bold text-xs uppercase tracking-wider text-base-content/80"
                >
                  PIN Akses
                </label>
                <span className="text-[11px] text-base-content/50">4-8 digit angka</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-base-content/40">
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
                  className="input input-bordered input-primary w-full pl-10 pr-11 font-mono tracking-widest text-sm focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-base-content/40 hover:text-base-content transition-colors"
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
                className="btn btn-primary w-full font-bold shadow-md shadow-primary/20 gap-2 rounded-xl"
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    <span>Memverifikasi SSO...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Sistem</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Helper Pills */}
          <div className="mt-6 pt-5 border-t border-base-200 text-center">
            <p className="text-xs text-base-content/60 font-medium mb-2.5 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Pilih Akun Demo Uji Coba (PIN: 1234):</span>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => fillDemo("admin")}
                className="btn btn-xs btn-outline btn-neutral rounded-lg font-semibold"
              >
                admin (Super Admin)
              </button>
              <button
                type="button"
                onClick={() => fillDemo("crew")}
                className="btn btn-xs btn-outline btn-neutral rounded-lg font-semibold"
              >
                crew (Operasional)
              </button>
              <button
                type="button"
                onClick={() => fillDemo("viewer")}
                className="btn btn-xs btn-outline btn-neutral rounded-lg font-semibold"
              >
                viewer (Eksekutif)
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}