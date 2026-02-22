import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, User, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Login = () => {
  const [showModal, setShowModal] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (
      (usernameOrEmail === "remalik" || usernameOrEmail === "remalik@ncsu.edu") &&
      password === "123"
    ) {
      localStorage.setItem("isLoggedIn", "true");
      setError("");
      navigate("/");
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center px-16 relative">
        {/* Instagram Logo */}
        <div className="absolute top-8 left-8">
          <svg viewBox="0 0 24 24" className="w-32 h-32" fill="none" stroke="url(#ig-gradient)" strokeWidth="2">
            <defs>
              <linearGradient id="ig-gradient" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c13584" />
                <stop offset="50%" stopColor="#e1306c" />
                <stop offset="70%" stopColor="#f56040" />
                <stop offset="100%" stopColor="#f56040" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-gradient)" strokeWidth="2" fill="none" />
            <circle cx="12" cy="12" r="5" stroke="url(#ig-gradient)" strokeWidth="2" fill="none" />
            <circle cx="17.5" cy="6.5" r="1.5" fill="url(#ig-gradient)" stroke="none" />
          </svg>
        </div>

        <div className="max-w-2xl text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-light text-foreground leading-tight">
            See everyday moments from your{" "}
            <span className="bg-gradient-to-bl from-[#c13584] via-[#e1306c] to-[#f56040] bg-clip-text text-transparent font-normal">
              close friends
            </span>
            .
          </h1>
        </div>
      </div>

      {/* Right Side - Profile Card */}
      <div className="flex-1 lg:max-w-xl w-full flex flex-col items-center justify-center px-12 py-12 relative bg-[hsl(200,15%,13%)]">
        <button className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center space-y-6 w-full max-w-sm">
          {/* Avatar */}
          <div className="w-36 h-36 rounded-full bg-[hsl(200,10%,25%)] flex items-center justify-center">
            <User className="w-20 h-20 text-[hsl(200,10%,70%)]" />
          </div>

          <input
            type="text"
            placeholder="Username or Email"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            className="w-full py-3 px-4 rounded-lg bg-transparent border border-[hsl(210,80%,50%)] text-foreground placeholder:text-[hsl(210,80%,50%)] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(210,80%,50%)] mb-2"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full py-3 px-4 rounded-lg bg-transparent border border-[hsl(210,80%,50%)] text-foreground placeholder:text-[hsl(210,80%,50%)] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(210,80%,50%)] mb-2"
          />

          {/* Buttons */}
          <div className="w-full space-y-3">
            <button
              onClick={() => setShowModal(true)}
              className="w-full py-3 rounded-full bg-[hsl(210,100%,50%)] text-white font-semibold text-base hover:bg-[hsl(210,100%,45%)] transition-colors"
            >
              Continue
            </button>
            <button className="w-full py-3 rounded-full border border-[hsl(var(--ig-separator))] text-foreground font-normal text-base hover:bg-accent/10 transition-colors">
              Use another profile
            </button>
          </div>

          <div className="pt-4">
            <button className="w-full py-3 rounded-full border border-[hsl(210,100%,50%)/0.4] text-[hsl(210,100%,50%)] font-normal text-base hover:bg-accent/10 transition-colors px-20">
              Create new account
            </button>
          </div>

          <p className="text-muted-foreground text-sm tracking-widest pt-2">∞ Meta</p>
        </div>
      </div>

      {/* Login Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
            >
              <div className="bg-[hsl(200,15%,15%)] rounded-2xl p-8 relative border border-[hsl(var(--ig-separator))] w-full max-w-md mx-auto">
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="flex flex-col items-center space-y-5">
                  <div className="w-28 h-28 rounded-full bg-[hsl(200,10%,25%)] flex items-center justify-center">
                    <User className="w-16 h-16 text-[hsl(200,10%,70%)]" />
                  </div>

                  <p className="text-foreground text-lg font-normal">remalik2026</p>

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full py-3 px-4 rounded-lg bg-transparent border border-[hsl(210,80%,50%)] text-foreground placeholder:text-[hsl(210,80%,50%)] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(210,80%,50%)]"
          />
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

                  <button
                    onClick={handleLogin}
                    className="w-full py-3 rounded-full bg-[hsl(210,100%,50%)] text-white font-semibold text-base hover:bg-[hsl(210,100%,45%)] transition-colors"
                  >
                    Log in
                  </button>

                  <button className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                    Forgot password?
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;