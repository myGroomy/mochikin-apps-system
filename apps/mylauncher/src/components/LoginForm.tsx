"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, WarningCircle, CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fadeUp, FLUID_EASE } from "@/lib/motion";
import { QuantumLoaderMini } from "@/components/ui/QuantumLoader";

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
        transition={{ duration: 0.8, ease: FLUID_EASE }}
        className="doppel-outer"
      >
        <div className="doppel-inner p-8 sm:p-10">
          {/* Brand Header */}
          <div className="mb-8 text-center">
            <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show">
              <Badge className="h-auto rounded-full border-hairline bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                Portal Staf
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              initial="hidden"
              animate="show"
              className="mt-4 text-2xl font-bold tracking-tight text-ink"
            >
              Mochikin Service
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} initial="hidden" animate="show" className="mt-2 text-sm text-ash">
              Masuk dengan akun staf untuk mengakses ekosistem outlet
            </motion.p>
          </div>

          {/* Error Alert Box */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-2xl border border-rose/20 bg-rose/10 p-4 mb-6 text-sm text-ink"
            >
              <WarningCircle className="w-5 h-5 shrink-0 text-rose" weight="bold" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Success Alert Box */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-2xl border border-emerald/20 bg-emerald/10 p-4 mb-6 text-sm text-emerald"
            >
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald" weight="bold" />
              <span>Autentikasi berhasil, mengalihkan ke portal…</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div variants={fadeUp} custom={3} initial="hidden" animate="show">
              <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wider text-ash mb-2">
                Username atau NIK
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Masukkan username atau NIK"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="h-12 rounded-2xl bg-white px-4 placeholder:text-mist"
              />
            </motion.div>

            <motion.div variants={fadeUp} custom={4} initial="hidden" animate="show">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ash mb-2 text-center sm:text-left">
                PIN Akses Staf (6 Digit)
              </label>
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 max-w-full mx-auto">
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
                    className="h-12 w-9 sm:h-14 sm:w-12 rounded-xl sm:rounded-2xl border border-hairline bg-white text-center text-lg sm:text-xl font-semibold text-ink transition-all duration-300 focus:border-accent/50 focus:outline-none focus:ring-4 focus:ring-accent/10"
                  />
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeUp} custom={5} initial="hidden" animate="show">
              <Button
                type="submit"
                disabled={loading || success}
                className="group h-auto w-full gap-3 rounded-full bg-white px-8 py-4 text-sm font-semibold text-ink shadow-[0_8px_24px_-12px_rgba(16,18,20,0.4)] ring-1 ring-ink/10 transition-all duration-700 hover:-translate-y-px active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <QuantumLoaderMini className="text-ink" />
                    <span>Memverifikasi…</span>
                  </div>
                ) : (
                  <>
                    <span>Masuk ke Sistem</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 transition-transform duration-500 group-hover:translate-x-0.5">
                      <ArrowRight size={16} weight="bold" className="text-accent" />
                    </span>
                  </>
                )}
              </Button>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
