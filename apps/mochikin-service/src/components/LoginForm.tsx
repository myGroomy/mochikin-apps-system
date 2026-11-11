"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, WarningCircle, CheckCircle } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fadeUp, FLUID_EASE } from "@/lib/motion";
import { QuantumLoaderMini } from "@/components/ui/QuantumLoader";
import { getClientBrandName, DEFAULT_BRAND_NAME } from "@mochikin/shared/sso";

interface LoginFormProps {
  initialError?: string | null;
}

export function LoginForm({ initialError }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(initialError || null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [brandName, setBrandName] = useState(DEFAULT_BRAND_NAME);

  useEffect(() => {
    setBrandName(getClientBrandName());
  }, []);

  const handlePinChange = (index: number, value: string) => {
    // If user pastes multi-character PIN (e.g. 3-6 digits)
    if (value.length > 2) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      if (digits.length > 0) {
        const newPin = [...pin];
        digits.forEach((d, idx) => {
          if (idx < 6) newPin[idx] = d;
        });
        setPin(newPin);
        const nextIdx = Math.min(digits.length, 5);
        document.getElementById(`pin-${nextIdx}`)?.focus();
        return;
      }
    }

    // Single digit input or overwrite of existing digit
    const cleanDigit = value.replace(/\D/g, "").slice(-1);
    const newPin = [...pin];
    newPin[index] = cleanDigit;
    setPin(newPin);
    if (cleanDigit && index < 5) {
      document.getElementById(`pin-${index + 1}`)?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      document.getElementById(`pin-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const digits = pasted.split("");
    const newPin = [...pin];
    digits.forEach((d, i) => {
      if (i < 6) newPin[i] = d;
    });
    setPin(newPin);
    const focusIdx = Math.min(digits.length, 5);
    document.getElementById(`pin-${focusIdx}`)?.focus();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    const pinCode = pin.join("");

    if (!cleanUsername) {
      setError("Username atau NIK staf wajib diisi");
      return;
    }
    if (pinCode.length < 4) {
      setError("PIN akses harus minimal 4 hingga 6 digit");
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
    <div className="w-full max-w-md mx-auto px-1 sm:px-0">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: FLUID_EASE }}
        className="doppel-outer shadow-sm"
      >
        <div className="doppel-inner p-5 sm:p-8">
          {/* Brand Header */}
          <div className="mb-6 text-center">
            <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show">
              <Badge className="h-auto rounded-full border-hairline bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                Portal Staf &bull; Single Sign-On
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              initial="hidden"
              animate="show"
              className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-ink font-display flex items-center justify-center gap-2"
            >
              <span className="text-accent font-extrabold">MyService</span>
              <span className="text-ash font-normal text-sm">&bull;</span>
              <span>{brandName}</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} initial="hidden" animate="show" className="mt-1 text-xs sm:text-sm text-ash">
              Autentikasi terpusat seluruh ekosistem aplikasi gerai
            </motion.p>
          </div>

          {/* Error Alert Box */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 rounded-xl border border-rose/20 bg-rose/10 p-3 mb-5 text-xs sm:text-sm text-rose"
            >
              <WarningCircle className="w-4 h-4 shrink-0" weight="bold" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Success Alert Box */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 rounded-xl border border-emerald/20 bg-emerald/10 p-3 mb-5 text-xs sm:text-sm text-emerald"
            >
              <CheckCircle className="w-4 h-4 shrink-0" weight="bold" />
              <span>Autentikasi berhasil, mengalihkan ke portal…</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <motion.div variants={fadeUp} custom={3} initial="hidden" animate="show">
              <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wider text-ash mb-1.5">
                Username atau NIK Staf
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Masukkan username atau NIK"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="h-11 sm:h-12 rounded-xl bg-surface px-3.5 text-sm placeholder:text-mist border-hairline focus:border-accent"
              />
            </motion.div>

            <motion.div variants={fadeUp} custom={4} initial="hidden" animate="show">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-ash">
                  PIN Akses Staf
                </label>
                <span className="text-[11px] text-mist font-mono">6 Digit PIN</span>
              </div>
              <div className="flex items-center justify-between gap-1.5 sm:gap-2 max-w-full mx-auto" onPaste={handlePaste}>
                {pin.map((digit, i) => (
                  <input
                    key={i}
                    id={`pin-${i}`}
                    type="password"
                    maxLength={1}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    value={digit}
                    onChange={(e) => handlePinChange(i, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(i, e)}
                    className="h-12 w-11 sm:h-13 sm:w-12 rounded-xl border border-hairline bg-surface text-center text-lg sm:text-xl font-bold text-ink transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none"
                  />
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeUp} custom={5} initial="hidden" animate="show" className="pt-2">
              <button
                type="submit"
                disabled={loading || success}
                className="group relative flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-soft active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <QuantumLoaderMini className="text-white" />
                    <span>Memverifikasi kredensial…</span>
                  </div>
                ) : (
                  <>
                    <span>Masuk ke Portal</span>
                    <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
