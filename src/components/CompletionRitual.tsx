"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";

type CompletionRitualProps = {
  isVisible: boolean;
  onComplete: () => void;
};

export function CompletionRitual({
  isVisible,
  onComplete,
}: CompletionRitualProps) {
  const [step, setStep] = useState<"enter" | "syncing" | "synced" | "exit">(
    "enter"
  );

  useEffect(() => {
    if (isVisible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Animation sequence requires synchronous state updates
      setStep("enter");

      // Sequence
      const t1 = setTimeout(() => setStep("syncing"), 500);
      const t2 = setTimeout(() => setStep("synced"), 2000);
      const t3 = setTimeout(() => {
        setStep("exit");
        setTimeout(onComplete, 800); // Wait for exit animation
      }, 3500);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 10, 12, 0.85)",
          backdropFilter: "blur(16px)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-sans)",
        }}
      >
        {/* Logo Container */}
        <motion.div
          animate={{
            scale: step === "synced" ? 1.2 : [1, 1.05, 1],
            opacity: step === "exit" ? 0 : 1,
            filter:
              step === "synced"
                ? "drop-shadow(0 0 20px rgba(59,130,246,0.6))"
                : "none",
          }}
          transition={{
            scale: { duration: 0.5 },
            opacity: { duration: 0.5 },
            default: {
              repeat: step === "syncing" ? Infinity : 0,
              duration: 1.5,
            },
          }}
          style={{
            marginBottom: "2rem",
            position: "relative",
          }}
        >
          <Image
            src="/logo-v3.png"
            alt="Mind OS"
            width={80}
            height={80}
            style={{
              borderRadius: "14px",
            }}
          />
        </motion.div>

        {/* Text Status */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
          style={{
            textAlign: "center",
          }}
        >
          {step === "enter" && (
            <span
              style={{
                fontSize: "1rem",
                color: "var(--color-text-secondary)",
                letterSpacing: "0.1em",
              }}
            >
              PROCESSING...
            </span>
          )}
          {step === "syncing" && (
            <span
              style={{
                fontSize: "1rem",
                color: "var(--color-text-primary)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Syncing Mind OS
            </span>
          )}
          {step === "synced" && (
            <span
              style={{
                fontSize: "1.25rem",
                color: "#60a5fa",
                letterSpacing: "0.2em",
                fontWeight: 600,
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Check size={20} /> Synchronized
            </span>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
