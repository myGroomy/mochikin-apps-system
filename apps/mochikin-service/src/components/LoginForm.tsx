"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";

interface LoginFormProps {
  initialError?: string | null;
}

export function LoginForm({ initialError }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(initialError || null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    if (value && index < 5) {
      document.getElementById(`pin-${index + 1}`)?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      document.getElementById(`pin-${index - 1}`)?.focus();
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    const pinCode = pin.join('');

    if (!cleanUsername) {
      setError("Username atau NIK wajib diisi");
      return;
    }
    if (!pinCode) {
      setError("PIN wajib diisi");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, pin: pinCode }),
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
      window.location.href = "/";
    } catch {
      setError("Terjadi gangguan jaringan saat menghubungi server.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-3xl shadow-xl shadow-amber-900/5 border border-amber-100 p-8 sm:p-10"
      >
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 mb-4 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Mochikin Service
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Masuk dengan akun staf untuk mengakses ekosistem outlet
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 mb-6 text-sm text-red-800"
          >
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Success Alert Box */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 mb-6 text-sm text-emerald-800"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>Autentikasi berhasil, mengalihkan ke portal…</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
              Username atau NIK
            </label>
            <input
              id="username"
              type="text"
              placeholder="Masukkan username atau NIK"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full h-12 rounded-2xl border border-gray-200 bg-gray-50/50 px-4 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all duration-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
              PIN (Digit)
            </label>
            <div className="flex items-center justify-between gap-2">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  id={`pin-${i}`}
                  type="password"
                  maxLength={1}
                  inputMode="numeric"
                  pattern="[0-9]"
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                  className="h-14 w-12 rounded-2xl border border-gray-200 bg-gray-50/50 text-center text-xl font-semibold text-gray-900 transition-all duration-300 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10"
                />
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || success}
              className="group relative flex w-full items-center justify-center gap-3 rounded-full bg-amber-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-amber-600/25 transition-all duration-300 hover:bg-amber-700 hover:shadow-xl hover:shadow-amber-600/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:translate-x-1">
                    <ArrowRight size={16} className="text-white" />
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
