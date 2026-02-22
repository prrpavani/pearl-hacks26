import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Sparkles, Loader2, CheckCircle2, Wallet, ArrowDown, TrendingUp, Zap } from "lucide-react";
import { getLabelingTask, submitLabel } from "@/lib/api";
import type { Task, SubmitResult } from "@/lib/api";

const LABELING_TENANT = "Instagram";

type Phase = "transition" | "dashboard" | "labeling";
type FinancialPhase = "task" | "financial-choice" | "financial-result";

const Earn = () => {
  const [phase, setPhase] = useState<Phase>("transition");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Task state
  const [task, setTask] = useState<Task | null>(null);
  const [isLoadingTask, setIsLoadingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [noMoreImages, setNoMoreImages] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);

  // Submission state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  // Session earnings & portfolio
  const [totalEarned, setTotalEarned] = useState(0);
  const [availableSOL, setAvailableSOL] = useState(0);
  const [investedSOL, setInvestedSOL] = useState(0);
  const [lastCoinSOL, setLastCoinSOL] = useState(0);

  // Financial literacy flow
  const [financialPhase, setFinancialPhase] = useState<FinancialPhase>("task");
  const [financialChoiceMessage, setFinancialChoiceMessage] = useState<string | null>(null);
  const pendingExcludeRef = useRef<string[]>([]);

  // Auto-advance from transition → dashboard
  useEffect(() => {
    if (phase === "transition") {
      const timer = setTimeout(() => setPhase("dashboard"), 1200);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // ---------------------------------------------------------------------------
  // Wallet
  // ---------------------------------------------------------------------------

  const connectWallet = async () => {
    if (!("solana" in window)) {
      window.open("https://phantom.app/", "_blank");
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp = await (window as any).solana.connect();
      setWalletAddress(resp.publicKey.toString());
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  };

  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : null;

  // ---------------------------------------------------------------------------
  // Task lifecycle
  // ---------------------------------------------------------------------------

  const loadNextTask = async (completedOverride?: string[]) => {
    setIsLoadingTask(true);
    setIsSubmitting(false);
    setSelectedOption(null);
    setResult(null);
    setSubmitError(null);
    setTask(null);
    setTaskError(null);
    setNoMoreImages(false);
    setFinancialPhase("task");
    const toExclude = completedOverride ?? completedTaskIds;
    if (completedOverride !== undefined) {
      setCompletedTaskIds(completedOverride);
    }
    try {
      const data = await getLabelingTask(LABELING_TENANT, toExclude);
      setTask(data);
    } catch (err) {
      console.error("Failed to load task:", err);
      const msg = err instanceof Error ? err.message : "Couldn't load task — tap retry";
      const isNoMore = /no more|no unverified|all images/i.test(msg);
      if (isNoMore) {
        setNoMoreImages(true);
        setTaskError(null);
      } else {
        setTaskError(msg);
      }
    } finally {
      setIsLoadingTask(false);
    }
  };

  const handleStart = async () => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }
    setPhase("labeling");
    setTotalEarned(0);
    setAvailableSOL(0);
    setInvestedSOL(0);
    await loadNextTask([]);
  };

  // ---------------------------------------------------------------------------
  // Submit label
  // ---------------------------------------------------------------------------

  const handleOptionClick = async (option: string) => {
    if (!task || !walletAddress || isSubmitting || result) return;
    setSelectedOption(option);
    setSubmitError(null);
    setIsSubmitting(true);
    const groundTruth = task.ground_truth;
    // task.task_id == relative image URL ("/uploads/foo.jpg") which is what
    // the backend stores in MongoDB — intentionally passed as imageUrl here.
    const taskIdToComplete = task.task_id;
    try {
      const res = await submitLabel(
        LABELING_TENANT,
        taskIdToComplete,
        option,
        walletAddress
      );
      const isCorrect = groundTruth != null && option.trim().toLowerCase() === groundTruth.trim().toLowerCase();
      const payoutStr = res.payout_sol > 0 ? ` +${res.payout_sol.toFixed(3)} SOL` : "";
      setResult({
        ...res,
        is_correct: isCorrect,
        message: `Coin deposited!${payoutStr}`,
      });
      setTotalEarned((prev) => prev + res.payout_sol);
      setAvailableSOL((prev) => prev + res.payout_sol);
      setLastCoinSOL(res.payout_sol);
      pendingExcludeRef.current = [...completedTaskIds, taskIdToComplete];
      // Show "coin deposited" overlay briefly, then open financial choice menu
      setTimeout(() => {
        setResult(null);
        setFinancialPhase("financial-choice");
      }, 1500);
    } catch (err) {
      console.error("Submit failed:", err);
      setSubmitError(err instanceof Error ? err.message : "Submit failed — try again");
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Financial literacy decision handler
  // ---------------------------------------------------------------------------

  const getFinancialMessage = (choice: string, amount: number): string => {
    const amt = amount.toFixed(3);
    const msgs: Record<string, string> = {
      "do-nothing": `You're HODLing your ${amt} SOL! 📊 "HODL" started as a typo and became a crypto strategy. SOL went from ~$1 to $260 in 2021 — people who held through the dips made life-changing gains. Staying patient while others panic is one of the hardest (and most profitable) skills in investing.`,
      withdraw: `You withdrew ${amt} SOL to your Phantom wallet. 💸 Taking profits is always valid! Just know that in crypto, frequent small withdrawals often mean missing big runs. Most experienced investors keep a core position long-term and only withdraw what they actually need — that way the rest keeps compounding.`,
      "low-risk": `You put ${amt} SOL into a stablecoin yield pool! 📈 Protocols like Aave or Compound let you earn 4–8% APY on USDC. Unlike volatile crypto, stablecoins hold their value while your balance quietly grows — think of it as a high-yield savings account that actually pays you back. Great for building your first financial cushion.`,
      "high-risk": `You staked ${amt} SOL in DeFi! ⚡ Liquid staking protocols like Marinade or Jito earn 7–12% APY by validating Solana transactions. But high APY = high risk: smart contract exploits, market crashes, and liquidity crunches are all real. The golden rule: never put in more than you could stomach losing entirely.`,
    };
    return msgs[choice] ?? "";
  };

  const handleFinancialChoice = (
    choice: "do-nothing" | "withdraw" | "low-risk" | "high-risk"
  ) => {
    if (choice === "withdraw") {
      setAvailableSOL((prev) => prev - lastCoinSOL);
    } else if (choice === "low-risk" || choice === "high-risk") {
      setAvailableSOL((prev) => prev - lastCoinSOL);
      setInvestedSOL((prev) => prev + lastCoinSOL);
    }
    // "do-nothing" leaves availableSOL unchanged
    setFinancialChoiceMessage(getFinancialMessage(choice, lastCoinSOL));
    setFinancialPhase("financial-result");
  };

  const handleCloseFinancialResult = () => {
    setFinancialPhase("task");
    setFinancialChoiceMessage(null);
    loadNextTask(pendingExcludeRef.current);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <AnimatePresence mode="wait">

        {/* ── Phase 1: Transition ─────────────────────────────────────────── */}
        {phase === "transition" && (
          <motion.div
            key="transition"
            className="absolute inset-0 flex items-center justify-center z-50"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
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

        {/* ── Phase 2: Dashboard ──────────────────────────────────────────── */}
        {phase === "dashboard" && (
          <motion.div
            key="dashboard"
            className="flex flex-col items-center justify-center min-h-screen px-5 py-12 gap-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            {/* Wallet / Earnings Card */}
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
                Session Earnings
              </p>
              <h2 className="text-5xl font-extrabold text-foreground mb-1">
                {totalEarned.toFixed(3)} SOL
              </h2>
              {walletAddress ? (
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                  {truncatedAddress}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  Connect wallet to earn
                </p>
              )}
            </motion.div>

            {/* Connect Wallet button (before wallet connected) */}
            {!walletAddress && (
              <motion.button
                onClick={connectWallet}
                className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-ig-elevated border border-ig-orange text-ig-orange hover:bg-ig-hover transition-colors"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.4 }}
              >
                <Wallet className="w-4 h-4" />
                Connect Phantom Wallet
              </motion.button>
            )}

            {/* Start button (after wallet connected) */}
            {walletAddress && (
              <motion.button
                onClick={handleStart}
                className="relative w-28 h-28 rounded-full flex items-center justify-center cursor-pointer"
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
                <motion.span
                  className="absolute inset-[-6px] rounded-full"
                  style={{ border: "2px solid hsl(var(--ig-orange))" }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <Play className="w-10 h-10 text-ig-orange ml-1" />
              </motion.button>
            )}

            <p className="text-sm text-muted-foreground -mt-4">
              {walletAddress ? "Tap to start labeling" : "Wallet needed to receive SOL"}
            </p>
          </motion.div>
        )}

        {/* ── Phase 3: Labeling Task ───────────────────────────────────────── */}
        {phase === "labeling" && (
          <motion.div
            key="labeling"
            className="relative flex flex-col items-center justify-center min-h-screen px-5 py-12 gap-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Session portfolio tracker */}
            <div className="flex flex-col items-center text-xs text-muted-foreground font-mono gap-0.5">
              <div>
                Wallet:{" "}
                <span className="text-ig-orange font-semibold">{availableSOL.toFixed(3)} SOL</span>
                {investedSOL > 0 && (
                  <>
                    {" · "}Invested:{" "}
                    <span className="text-green-400 font-semibold">{investedSOL.toFixed(3)} SOL</span>
                  </>
                )}
              </div>
              {walletAddress && <span className="opacity-50">{truncatedAddress}</span>}
            </div>

            {/* Task Image — next image fades in when task changes */}
            <motion.div
              className="w-full max-w-sm aspect-square rounded-xl overflow-hidden border border-border flex items-center justify-center bg-ig-elevated relative"
              initial={false}
              animate={{ opacity: 1 }}
            >
              {noMoreImages ? (
                <motion.div
                  key="all-done"
                  className="flex flex-col items-center justify-center gap-4 p-6 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <CheckCircle2 className="w-16 h-16 text-green-500" />
                  <p className="text-lg font-semibold text-foreground">
                    You've labeled all images!
                  </p>
                  <div className="text-sm font-mono space-y-0.5 text-center">
                    <p className="text-2xl font-bold text-ig-orange mb-2">
                      {totalEarned.toFixed(3)} SOL earned
                    </p>
                    <p className="text-muted-foreground">
                      In wallet:{" "}
                      <span className="text-ig-orange font-semibold">{availableSOL.toFixed(3)} SOL</span>
                    </p>
                    {investedSOL > 0 && (
                      <p className="text-muted-foreground">
                        Invested:{" "}
                        <span className="text-green-400 font-semibold">{investedSOL.toFixed(3)} SOL</span>
                      </p>
                    )}
                    {(totalEarned - availableSOL - investedSOL) > 0.00001 && (
                      <p className="text-muted-foreground">
                        Withdrawn:{" "}
                        <span className="font-semibold">
                          {(totalEarned - availableSOL - investedSOL).toFixed(3)} SOL
                        </span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setNoMoreImages(false);
                      setPhase("dashboard");
                    }}
                    className="px-5 py-2.5 rounded-full text-sm font-semibold bg-ig-orange text-white hover:opacity-90"
                  >
                    Done
                  </button>
                </motion.div>
              ) : isLoadingTask ? (
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
              ) : taskError ? (
                <div className="flex flex-col items-center gap-2 p-4 text-center">
                  <p className="text-sm text-muted-foreground">{taskError}</p>
                  <button
                    onClick={loadNextTask}
                    className="text-xs text-ig-orange underline"
                  >
                    Retry
                  </button>
                </div>
              ) : task ? (
                <motion.img
                  key={task.task_id}
                  src={task.image_url}
                  alt="Labeling task"
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35 }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://placehold.co/400x400/1a1a1a/666?text=Image+unavailable";
                  }}
                />
              ) : (
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
              )}

              {/* Result overlay: coin deposited, then fades out before next image */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center z-10 bg-black/40"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <motion.div
                      className="flex flex-col items-center gap-2 rounded-2xl px-8 py-6 backdrop-blur-md bg-green-950/95 border border-green-500 shadow-xl"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CheckCircle2 className="w-12 h-12 text-green-400" />
                      <p className="text-white font-semibold text-center text-base">
                        {result.message}
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Submit error (e.g. network / backend failure) */}
            {submitError && (
              <motion.p
                className="text-sm text-red-400 text-center max-w-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {submitError}
              </motion.p>
            )}

            {/* 2×2 Options Grid (hidden when no more images) */}
            {!noMoreImages && (
            <motion.div
              className="grid grid-cols-2 gap-3 w-full max-w-sm"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              {isLoadingTask
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 rounded-xl bg-ig-elevated border border-border animate-pulse"
                    />
                  ))
                : (task?.options ?? []).map((option) => (
                    <motion.button
                      key={option}
                      onClick={() => handleOptionClick(option)}
                      disabled={isSubmitting || !!result || !task}
                      className={`px-4 py-4 rounded-xl text-sm font-semibold transition-all duration-200 border disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedOption === option
                          ? "bg-ig-orange text-white border-ig-orange shadow-lg"
                          : "bg-ig-elevated text-foreground border-border hover:border-ig-purple hover:shadow-[0_0_16px_hsl(var(--ig-purple-glow))]"
                      }`}
                      whileTap={{ scale: 0.96 }}
                    >
                      {isSubmitting && selectedOption === option ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        option
                      )}
                    </motion.button>
                  ))}
            </motion.div>
            )}

            {/* ── Financial Literacy Overlay ────────────────────────────────── */}
            <AnimatePresence>
              {financialPhase !== "task" && (
                <motion.div
                  className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/[0.97] backdrop-blur-md px-6 py-8 overflow-y-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Choice menu */}
                  {financialPhase === "financial-choice" && (
                    <motion.div
                      className="w-full max-w-sm flex flex-col gap-3"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.15 }}
                    >
                      <div className="text-center mb-2">
                        <p className="text-3xl font-extrabold text-ig-orange mb-0.5">
                          +{lastCoinSOL.toFixed(3)} SOL
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Wallet: {availableSOL.toFixed(3)} SOL available
                        </p>
                        <p className="text-base font-semibold text-foreground mt-1">
                          What will you do with this coin?
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Tap to see what each option means
                        </p>
                      </div>

                      {/* HODL — always shown */}
                      <button
                        onClick={() => handleFinancialChoice("do-nothing")}
                        className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-ig-elevated hover:border-blue-400 transition-all text-left"
                      >
                        <div className="p-2.5 rounded-xl bg-blue-500/10 shrink-0">
                          <Wallet className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">HODL (Do Nothing)</p>
                          <p className="text-xs text-muted-foreground">Keep it in your app wallet</p>
                        </div>
                      </button>

                      {/* Withdraw — always shown */}
                      <button
                        onClick={() => handleFinancialChoice("withdraw")}
                        className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-ig-elevated hover:border-orange-400 transition-all text-left"
                      >
                        <div className="p-2.5 rounded-xl bg-orange-500/10 shrink-0">
                          <ArrowDown className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">Withdraw</p>
                          <p className="text-xs text-muted-foreground">Cash out to your Phantom wallet</p>
                        </div>
                      </button>

                      {/* Low-Risk — unlocked when availableSOL ≥ 0.002 */}
                      {availableSOL >= 0.002 && (
                        <button
                          onClick={() => handleFinancialChoice("low-risk")}
                          className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-ig-elevated hover:border-green-400 transition-all text-left"
                        >
                          <div className="p-2.5 rounded-xl bg-green-500/10 shrink-0">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">
                              Low-Risk Investment
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Stablecoin yield · 4–8% APY
                            </p>
                          </div>
                        </button>
                      )}

                      {/* High-Risk — unlocked when availableSOL ≥ 0.003 */}
                      {availableSOL >= 0.003 && (
                        <button
                          onClick={() => handleFinancialChoice("high-risk")}
                          className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-ig-elevated hover:border-purple-400 transition-all text-left"
                        >
                          <div className="p-2.5 rounded-xl bg-purple-500/10 shrink-0">
                            <Zap className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">
                              High-Risk Investment
                            </p>
                            <p className="text-xs text-muted-foreground">
                              DeFi / SOL staking · 15–40% APY
                            </p>
                          </div>
                        </button>
                      )}

                      {availableSOL < 0.002 && (
                        <p className="text-center text-xs text-muted-foreground/60 pt-1">
                          HODL more SOL to unlock investment options 🔒
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* Educational result — user closes manually */}
                  {financialPhase === "financial-result" && financialChoiceMessage && (
                    <motion.div
                      className="w-full max-w-sm flex flex-col items-center gap-5"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="p-4 rounded-full bg-ig-orange/10">
                        <Sparkles className="w-10 h-10 text-ig-orange" />
                      </div>
                      <p className="text-foreground font-medium text-sm leading-relaxed text-center">
                        {financialChoiceMessage}
                      </p>
                      <button
                        onClick={handleCloseFinancialResult}
                        className="w-full py-3 rounded-2xl font-semibold text-sm bg-ig-orange text-white hover:opacity-90 transition-opacity"
                      >
                        Got it! Continue →
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Earn;
