import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Sparkles } from "lucide-react";
import labelingImage from "@/assets/labeling-task.jpg";

type Phase = "transition" | "dashboard" | "labeling";

const labelingOptions = [
  "Futuristic City",
  "Neon Street",
  "Cyberpunk Alley",
  "Night Market",
];

const Earn = () => {
  const [phase, setPhase] = useState<Phase>("transition");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  useEffect(() => {
    if (phase === "transition") {
      const timer = setTimeout(() => setPhase("dashboard"), 1200);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const handleStart = () => {
    setPhase("labeling");
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        {/* Phase 1: Transition */}
        {phase === "transition" && (
          <motion.div
            key="transition"
            className="absolute inset-0 flex items-center justify-center z-50"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Radial gradient expanding */}
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle, hsl(var(--ig-purple)) 0%, hsl(var(--ig-purple) / 0.6) 50%, hsl(var(--background)) 100%)",
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 2.5, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            {/* Text slide up */}
            <motion.h1
              className="relative z-10 text-4xl md:text-6xl font-extrabold text-white tracking-tight"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.45, ease: "easeOut" }}
            >
              Start Earning
            </motion.h1>
          </motion.div>
        )}

        {/* Phase 2: Dashboard */}
        {phase === "dashboard" && (
          <motion.div
            key="dashboard"
            className="flex flex-col items-center justify-center min-h-screen px-5 py-12 gap-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            {/* Wallet Card */}
            <motion.div
              className="relative w-full max-w-md rounded-2xl p-8 text-center"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--ig-elevated)) 0%, hsl(0 0% 10%) 100%)",
                boxShadow:
                  "0 0 40px hsl(var(--ig-orange-glow)), 0 0 80px hsl(var(--ig-orange-glow)), inset 0 1px 0 hsl(0 0% 100% / 0.08)",
                backdropFilter: "blur(20px)",
                border: "1px solid hsl(0 0% 100% / 0.1)",
              }}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <p className="text-sm font-medium text-muted-foreground mb-2 tracking-widest uppercase">
                Current Funds
              </p>
              <h2 className="text-5xl font-extrabold text-foreground mb-1">
                2.40 SOL
              </h2>
              <p className="text-sm text-muted-foreground">≈ $240.50 USD</p>
            </motion.div>

            {/* Start Button */}
            <motion.button
              onClick={handleStart}
              className="relative w-28 h-28 rounded-full flex items-center justify-center group cursor-pointer"
              style={{
                background: "hsl(var(--ig-elevated))",
                border: "3px solid hsl(var(--ig-orange))",
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              {/* Pulsing border ring */}
              <motion.span
                className="absolute inset-[-6px] rounded-full"
                style={{
                  border: "2px solid hsl(var(--ig-orange))",
                }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <Play className="w-10 h-10 text-ig-orange ml-1" />
            </motion.button>
            <p className="text-sm text-muted-foreground -mt-4">
              Tap to start labeling
            </p>
          </motion.div>
        )}

        {/* Phase 3: Labeling Task */}
        {phase === "labeling" && (
          <motion.div
            key="labeling"
            className="flex flex-col items-center justify-center min-h-screen px-5 py-12 gap-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Task Image */}
            <motion.div
              className="w-full max-w-sm aspect-square rounded-xl overflow-hidden border border-border"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <img
                src={labelingImage}
                alt="Labeling task"
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* 2x2 Options Grid */}
            <motion.div
              className="grid grid-cols-2 gap-3 w-full max-w-sm"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              {labelingOptions.map((option, i) => (
                <motion.button
                  key={option}
                  onClick={() => setSelectedOption(i)}
                  className={`px-4 py-4 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                    selectedOption === i
                      ? "bg-ig-orange text-white border-ig-orange shadow-lg"
                      : "bg-ig-elevated text-foreground border-border hover:border-ig-purple hover:shadow-[0_0_16px_hsl(var(--ig-purple-glow))]"
                  }`}
                  whileTap={{ scale: 0.96 }}
                >
                  {option}
                </motion.button>
              ))}
            </motion.div>

            {/* Advice Button */}
            <motion.button
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-muted-foreground bg-ig-elevated border border-border hover:border-ig-purple hover:text-foreground transition-colors self-end max-w-sm w-full justify-center sm:justify-end sm:w-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ask Vaultic for advice
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Earn;
