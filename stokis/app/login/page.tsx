"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/lib/ToastContext";
import { useRouter } from "next/navigation";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { QuantumLoaderMini } from "@/components/ui/QuantumLoader";

const PIN_LENGTH = 6;

export default function LoginPage() {
  const { login, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const usernameRef = useRef<HTMLInputElement | null>(null);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!loading) usernameRef.current?.focus();
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <QuantumLoaderMini />
        <span className="ml-3 text-primary text-sm font-medium">Memuat...</span>
      </div>
    );
  }

  const canSubmit = username.trim().length > 0 && pin.length === PIN_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || pin.length < PIN_LENGTH) {
      const msg = "Username dan PIN 6 digit wajib diisi";
      setError(msg);
      toast.error("Validasi Gagal", msg);
      return;
    }
    setSubmitting(true);
    const result = await login(username.trim(), pin);
    setSubmitting(false);
    if (result.success) {
      toast.success("Login Berhasil", `Selamat datang, ${username}!`);
      router.push("/so/input");
    } else {
      const msg = result.error || "Login gagal. Periksa username dan PIN.";
      setError(msg);
      toast.error("Login Gagal", msg);
      setPin("");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="card bg-base-100 border border-base-300 shadow-md p-8">
          <div className="flex flex-col items-center mb-8">
            <motion.img
              src="/logo.jpg"
              alt="Stokis"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="w-16 h-16 rounded-2xl object-cover shadow-sm mb-4"
            />
            <h1 className="text-xl font-bold text-base-content">
              Masuk ke Stokis
            </h1>
            <p className="text-sm mt-1 text-base-content/50">
              Masukkan username dan PIN Anda
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <label className="block text-xs font-semibold mb-1.5 text-base-content/70">
                Username
              </label>
              <input
                ref={usernameRef}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                autoComplete="username"
                autoFocus
                className="input input-bordered w-full min-h-[44px] text-sm"
              />
            </motion.div>

            <motion.div
              key={shake ? 'shake' : 'idle'}
              initial={{ opacity: 0, x: -8 }}
              animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0], opacity: 1 } : { opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <label className="block text-xs font-semibold mb-1.5 text-base-content/70">
                PIN (6 Digit)
              </label>
              <div className="flex gap-2 justify-center">
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      if (el) pinRefs.current[i] = el;
                    }}
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]"
                    maxLength={1}
                    value={pin[i] || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val) {
                        const newPin = pin.split('');
                        newPin[i] = val;
                        setPin(newPin.join(''));
                        // Auto focus next box
                        if (i < PIN_LENGTH - 1) {
                          pinRefs.current[i + 1]?.focus();
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace') {
                        if (pin[i]) {
                          const newPin = pin.split('');
                          newPin[i] = '';
                          setPin(newPin.join(''));
                        } else if (i > 0) {
                          // Go to previous box if current is empty
                          pinRefs.current[i - 1]?.focus();
                        }
                      } else if (e.key === 'ArrowLeft' && i > 0) {
                        pinRefs.current[i - 1]?.focus();
                      } else if (e.key === 'ArrowRight' && i < PIN_LENGTH - 1) {
                        pinRefs.current[i + 1]?.focus();
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedData = e.clipboardData.getData('text').replace(/\D/g, "").slice(0, PIN_LENGTH);
                      if (pastedData) {
                        setPin(pastedData);
                        // Focus last filled or first empty
                        const nextIndex = Math.min(pastedData.length, PIN_LENGTH - 1);
                        pinRefs.current[nextIndex]?.focus();
                      }
                    }}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'login-error' : undefined}
                    className={`w-11 h-12 text-center text-xl font-bold font-mono tabular-nums input input-bordered ${error ? 'border-error' : ''}`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-base-content/40 mt-2 text-center">
                {pin.length}/{PIN_LENGTH} digit
              </p>
              {error ? (
                <p id="login-error" role="alert" className="text-xs text-error text-center mt-2">
                  {error}
                </p>
              ) : null}
            </motion.div>

            <motion.button
              type="submit"
              disabled={submitting || loading || !canSubmit}
              whileHover={canSubmit ? { scale: 1.01 } : undefined}
              whileTap={canSubmit ? { scale: 0.98 } : undefined}
              className={`btn btn-primary w-full min-h-[44px] text-sm gap-2 ${!canSubmit ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {submitting ? (
                <>
                  <QuantumLoaderMini />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk</span>
                </>
              )}
            </motion.button>
          </form>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="text-center text-xs mt-5 text-base-content/40"
        >
          Stokis v1.0 &middot; Sistem Stock Opname
        </motion.p>
      </motion.div>
    </div>
  );
}
