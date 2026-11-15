"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Max height of the sheet (default: 85vh) */
  maxHeight?: string;
}

/**
 * Reusable bottom sheet component for mobile.
 * On desktop (md+), renders as a centered modal instead.
 *
 * Usage:
 * <BottomSheet open={show} onClose={close} title="Title" footer={<buttons />}>
 *   <div>Content here</div>
 * </BottomSheet>
 */
export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxHeight = "85vh",
}: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 md:hidden"
            onClick={onClose}
          />

          {/* Mobile: Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-base-100 rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex flex-col md:hidden"
            style={{ maxHeight }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-base-300" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 border-b border-base-300">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-base-content">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-base-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-base-content/40" />
                </button>
              </div>
              {subtitle && (
                <p className="text-xs text-base-content/60">{subtitle}</p>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-5 py-3 border-t border-base-300">
                {footer}
              </div>
            )}
          </motion.div>

          {/* Desktop: Centered Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="hidden md:flex fixed inset-0 z-[70] items-center justify-center bg-black/40"
            onClick={onClose}
          >
            <div
              className="bg-base-100 border border-base-300 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
                <div>
                  <h3 className="text-base font-bold text-base-content">{title}</h3>
                  {subtitle && (
                    <p className="text-xs text-base-content/50 mt-0.5">{subtitle}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-base-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-base-content/40" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="px-6 py-3 border-t border-base-300">
                  {footer}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
